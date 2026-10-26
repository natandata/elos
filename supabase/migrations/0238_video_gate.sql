-- ELOS — Sala de Jogos: o desbloqueio do dia alterna entre ler a Bíblia (5 min) e assistir um "conteúdo relevante" inteiro no player do app.
-- Dias pares (contados desde 01/01/2026, dia de Brasília) = leitura; dias ímpares = vídeo.
-- O progresso de cada vídeo é guardado por blocos de 5 s (para retomar e para detectar pulos); ir ao YouTube sem terminar tranca a Sala
-- até o vídeo ser assistido inteiro no player do app.

create table if not exists public.video_watch (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id text not null,
  duration int not null default 0,
  covered int[] not null default '{}',
  last_pos int not null default 0,
  completed_on date,
  penalty boolean not null default false,
  penalty_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index if not exists video_watch_done_idx on public.video_watch (user_id, completed_on);

alter table public.video_watch enable row level security;
drop policy if exists video_watch_select on public.video_watch;
create policy video_watch_select on public.video_watch for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- sem política de escrita: só as funções abaixo gravam.

create or replace function public.gate_kind(p_day date) returns text language sql immutable as $$
  select case when (p_day - date '2026-01-01') % 2 = 0 then 'reading' else 'video' end;
$$;

-- Primeiro bloco de 5 s ainda não assistido (em segundos), ou null se não há buraco.
create or replace function public.video_gap_sec(p_covered int[], p_dur int) returns int language sql immutable as $$
  select (select g * 5 from generate_series(0, greatest(ceil(p_dur / 5.0)::int - 1, 0)) g where not (g = any (p_covered)) order by g limit 1);
$$;

-- Registra o que a pessoa assistiu: p_blocks = blocos de 5 s vistos desde o último aviso; p_ended = o vídeo chegou ao fim.
create or replace function public.video_watch_ping(p_video text, p_pos int, p_dur int, p_blocks int[], p_ended boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  r public.video_watch;
  v_elapsed numeric; v_allowed int; v_new int[]; v_total int; v_cov int; v_done boolean := false;
begin
  if v_uid is null then return null; end if;
  if not exists (select 1 from public.home_video_picks where video_id = p_video) then return null; end if;
  if p_dur is null or p_dur < 10 or p_dur > 14400 then return null; end if;

  insert into public.video_watch (user_id, video_id, duration) values (v_uid, p_video, p_dur) on conflict do nothing;
  select * into r from public.video_watch where user_id = v_uid and video_id = p_video for update;

  -- o relógio limita quanto vídeo pode ser "assistido" entre dois avisos (nada de marcar tudo de uma vez)
  v_elapsed := least(60, greatest(0, extract(epoch from (now() - r.updated_at))));
  v_allowed := ceil(v_elapsed / 5.0 * 1.3)::int + 3;
  v_total := ceil(p_dur / 5.0)::int;
  select coalesce(array_agg(b order by b), '{}') into v_new from (
    select distinct b from unnest(coalesce(p_blocks, '{}')) b
     where b between 0 and v_total - 1 and not (b = any (r.covered)) order by b limit v_allowed) s;
  r.covered := (select coalesce(array_agg(b order by b), '{}') from (select distinct unnest(r.covered || v_new) b) s);
  v_cov := cardinality(r.covered);
  r.duration := p_dur;
  r.last_pos := greatest(0, least(coalesce(p_pos, 0), p_dur));

  if coalesce(p_ended, false) and v_cov >= ceil(v_total * 0.95)::int then
    v_done := true;
    if r.completed_on is distinct from v_today then r.completed_on := v_today; end if;
    r.penalty := false;
  end if;

  update public.video_watch set duration = r.duration, covered = r.covered, last_pos = r.last_pos, completed_on = r.completed_on, penalty = r.penalty, updated_at = now()
   where user_id = v_uid and video_id = p_video;

  return jsonb_build_object('pct', round(v_cov * 100.0 / greatest(v_total, 1)), 'last_pos', r.last_pos, 'done', v_done,
    'completed_today', r.completed_on = v_today, 'gap_sec', public.video_gap_sec(r.covered, p_dur), 'duration', p_dur);
end $fn$;

-- "Voltar do início": zera o progresso (se o vídeo ainda não foi concluído hoje).
create or replace function public.video_watch_reset(p_video text) returns void language plpgsql security definer set search_path = public as $fn$
declare v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if auth.uid() is null then return; end if;
  update public.video_watch set covered = '{}', last_pos = 0, updated_at = now()
   where user_id = auth.uid() and video_id = p_video and completed_on is distinct from v_today;
end $fn$;

-- Foi assistir no YouTube: só pesa em dia de vídeo e se o conteúdo ainda não foi concluído hoje. Tranca a Sala até concluir no player do app.
create or replace function public.video_watch_external(p_video text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid(); v_today date := (now() at time zone 'America/Sao_Paulo')::date; v_penalty boolean := false;
begin
  if v_uid is null then return null; end if;
  if not exists (select 1 from public.home_video_picks where video_id = p_video) then return null; end if;
  if public.gate_kind(v_today) = 'video' then
    insert into public.video_watch (user_id, video_id) values (v_uid, p_video) on conflict do nothing;
    update public.video_watch set penalty = true, penalty_at = now()
     where user_id = v_uid and video_id = p_video and completed_on is distinct from v_today;
    v_penalty := found;
  end if;
  return jsonb_build_object('penalty', v_penalty);
end $fn$;

revoke execute on function public.video_watch_ping(text, int, int, int[], boolean), public.video_watch_reset(text), public.video_watch_external(text) from public, anon;
grant execute on function public.video_watch_ping(text, int, int, int[], boolean), public.video_watch_reset(text), public.video_watch_external(text) to authenticated;
