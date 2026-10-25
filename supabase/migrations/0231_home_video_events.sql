-- ELOS — métricas do card "Conteúdo relevante para a sua vida": quem viu o card e quem abriu cada vídeo (player interno).
-- view: 1 por pessoa/vídeo/dia (registrada quando o card é montado). play: cada vez que a pessoa abre um vídeo.

create table if not exists public.home_video_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id text not null,
  kind text not null check (kind in ('view', 'play')),
  day date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  created_at timestamptz not null default now()
);
create unique index if not exists home_video_events_view_uq on public.home_video_events (user_id, video_id, day) where kind = 'view';
create index if not exists home_video_events_day_idx on public.home_video_events (day, kind);
alter table public.home_video_events enable row level security;
drop policy if exists home_video_events_admin_read on public.home_video_events;
create policy home_video_events_admin_read on public.home_video_events for select to authenticated using (public.is_admin());
-- sem política de escrita: só as funções abaixo gravam.

create or replace function public.home_video_play(p_video text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.home_video_picks where video_id = p_video) then return; end if;
  insert into public.home_video_events (user_id, video_id, kind) values (auth.uid(), p_video, 'play');
end $fn$;
revoke execute on function public.home_video_play(text) from public, anon;
grant execute on function public.home_video_play(text) to authenticated;

-- o card conta como "visto" quando a lista do dia é entregue à pessoa
create or replace function public.home_daily_videos()
returns jsonb language plpgsql volatile security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_out jsonb := '[]'::jsonb;
  v_pick record; s text;
begin
  if auth.uid() is null then return null; end if;
  perform pg_advisory_xact_lock(hashtext('home_daily_videos'));
  foreach s in array array['subira', 'luca', 'roberta'] loop
    select * into v_pick from public.home_video_picks where source = s and active and last_shown = v_today limit 1;
    if not found then
      select * into v_pick from public.home_video_picks
       where source = s and active
       order by last_shown asc nulls first, sort, video_id
       limit 1;
      if not found then continue; end if;
      update public.home_video_picks set last_shown = v_today where video_id = v_pick.video_id;
    end if;
    insert into public.home_video_events (user_id, video_id, kind) values (auth.uid(), v_pick.video_id, 'view') on conflict do nothing;
    v_out := v_out || jsonb_build_object('source', s, 'video_id', v_pick.video_id, 'title', v_pick.title);
  end loop;
  return v_out;
end $fn$;
revoke execute on function public.home_daily_videos() from public, anon;
grant execute on function public.home_daily_videos() to authenticated;

-- painel do admin (só cria/líder reais: sem admin e sem contas de teste)
create or replace function public.admin_home_video_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_audience int;
  v_res jsonb;
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  select count(*) into v_audience from public.profiles where role in ('cria', 'leader') and not coalesce(is_test_account, false);

  with ev as (
    select e.*, p.full_name from public.home_video_events e
      join public.profiles p on p.id = e.user_id
     where p.role in ('cria', 'leader') and not coalesce(p.is_test_account, false)
  )
  select jsonb_build_object(
    'audience', v_audience,
    'today', jsonb_build_object(
      'viewers', (select count(distinct user_id) from ev where kind = 'view' and day = v_today),
      'clickers', (select count(distinct user_id) from ev where kind = 'play' and day = v_today),
      'plays', (select count(*) from ev where kind = 'play' and day = v_today)),
    'week', jsonb_build_object(
      'viewers', (select count(distinct user_id) from ev where kind = 'view' and day >= v_today - 6),
      'clickers', (select count(distinct user_id) from ev where kind = 'play' and day >= v_today - 6),
      'plays', (select count(*) from ev where kind = 'play' and day >= v_today - 6)),
    'recent', coalesce((
      select jsonb_agg(x order by x.at desc) from (
        select ev.full_name as name, coalesce(h.title, ev.video_id) as title, h.source as source, ev.created_at as at
          from ev left join public.home_video_picks h on h.video_id = ev.video_id
         where ev.kind = 'play'
         order by ev.created_at desc limit 25) x), '[]'::jsonb)
  ) into v_res;
  return v_res;
end $fn$;
revoke execute on function public.admin_home_video_stats() from public, anon;
grant execute on function public.admin_home_video_stats() to authenticated;
