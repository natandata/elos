-- ELOS — Inglês em Ação (jogo educativo de inglês com conversação): progresso, erros para revisar, conversas e XP.
-- Escrita só pela função english_finish (service_role, chamada pela server action). O aluno só lê as próprias linhas.
-- XP: +1 por lição (no máximo 3 lições pagas por dia) e +2 pela conversa (1 vez por dia), sempre com tempo mínimo.

create table if not exists public.english_profile (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  start_unit int not null default 1,
  placement_done boolean not null default false,
  streak int not null default 0,
  streak_date date,
  last_done_date date,
  total_done int not null default 0,
  xp_day date,
  xp_lessons int not null default 0,
  xp_roleplay boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.english_lessons_done (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  stars int not null default 1,
  best_score int not null default 0,
  attempts int not null default 0,
  first_done_at timestamptz not null default now(),
  last_done_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.english_mistakes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ex_id text not null,
  wrong_count int not null default 1,
  right_streak int not null default 0,
  mastered_at timestamptz,
  last_wrong_at timestamptz not null default now(),
  primary key (user_id, ex_id)
);

create table if not exists public.english_roleplay_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario text not null,
  accuracy int not null default 0,
  complexity int not null default 0,
  turns jsonb,
  created_at timestamptz not null default now()
);
create index if not exists english_runs_user_idx on public.english_roleplay_runs (user_id, created_at desc);

alter table public.english_profile enable row level security;
alter table public.english_lessons_done enable row level security;
alter table public.english_mistakes enable row level security;
alter table public.english_roleplay_runs enable row level security;

drop policy if exists english_profile_select on public.english_profile;
create policy english_profile_select on public.english_profile for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists english_done_select on public.english_lessons_done;
create policy english_done_select on public.english_lessons_done for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists english_mistakes_select on public.english_mistakes;
create policy english_mistakes_select on public.english_mistakes for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists english_runs_select on public.english_roleplay_runs;
create policy english_runs_select on public.english_roleplay_runs for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Fecha uma lição, nível lendário, conversa, treino ou o nivelamento. Devolve {xp, stars, streak, valid}.
-- p_wrong: ids dos exercícios errados de primeira; p_fixed: ids que o aluno acertou numa revisão de erros.
create or replace function public.english_finish(
  p_user uuid, p_kind text, p_key text, p_correct int, p_total int, p_secs int,
  p_wrong jsonb default '[]'::jsonb, p_fixed jsonb default '[]'::jsonb,
  p_complexity int default 0, p_turns jsonb default null, p_start_unit int default null
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_prof public.english_profile;
  v_valid boolean;
  v_xp int := 0;
  v_stars int := 1;
  v_wrong int := coalesce(jsonb_array_length(p_wrong), 0);
  v_id text;
  v_last date;
  v_gs int;
begin
  if p_kind not in ('lesson', 'legendary', 'roleplay', 'practice', 'placement') then
    raise exception 'tipo inválido';
  end if;

  insert into public.english_profile (user_id) values (p_user) on conflict do nothing;
  select * into v_prof from public.english_profile where user_id = p_user for update;

  if v_prof.xp_day is distinct from v_today then
    v_prof.xp_day := v_today; v_prof.xp_lessons := 0; v_prof.xp_roleplay := false;
  end if;

  -- uma lição de verdade leva tempo: pelo menos 3 s por exercício (10 s no mínimo)
  v_valid := coalesce(p_secs, 0) >= greatest(10, coalesce(p_total, 0) * 3);

  if p_kind in ('lesson', 'legendary') then
    v_stars := case when v_wrong <= 1 then 3 when v_wrong <= 3 then 2 else 1 end;
    insert into public.english_lessons_done (user_id, lesson_id, stars, best_score, attempts)
    values (p_user, left(p_key, 40), v_stars, greatest(p_correct, 0), 1)
    on conflict (user_id, lesson_id) do update
      set stars = greatest(public.english_lessons_done.stars, excluded.stars),
          best_score = greatest(public.english_lessons_done.best_score, excluded.best_score),
          attempts = public.english_lessons_done.attempts + 1,
          last_done_at = now();
    if v_valid and v_prof.xp_lessons < 3 then v_xp := 1; v_prof.xp_lessons := v_prof.xp_lessons + 1; end if;
  elsif p_kind = 'roleplay' then
    insert into public.english_roleplay_runs (user_id, scenario, accuracy, complexity, turns)
    values (p_user, left(p_key, 40), greatest(0, least(100, coalesce(p_correct, 0))), greatest(0, least(100, coalesce(p_complexity, 0))), p_turns);
    if v_valid and not v_prof.xp_roleplay then v_xp := 2; v_prof.xp_roleplay := true; end if;
  elsif p_kind = 'placement' then
    update public.english_profile set start_unit = greatest(1, least(4, coalesce(p_start_unit, 1))), placement_done = true where user_id = p_user;
    v_prof.start_unit := greatest(1, least(4, coalesce(p_start_unit, 1)));
  end if;

  -- erros para revisar (lição, conversa e treino) e erros já corrigidos
  for v_id in select jsonb_array_elements_text(coalesce(p_wrong, '[]'::jsonb)) loop
    insert into public.english_mistakes (user_id, ex_id) values (p_user, left(v_id, 40))
    on conflict (user_id, ex_id) do update
      set wrong_count = public.english_mistakes.wrong_count + 1, right_streak = 0, mastered_at = null, last_wrong_at = now();
  end loop;
  for v_id in select jsonb_array_elements_text(coalesce(p_fixed, '[]'::jsonb)) loop
    update public.english_mistakes
       set right_streak = right_streak + 1,
           mastered_at = case when right_streak + 1 >= 2 then now() else mastered_at end
     where user_id = p_user and ex_id = left(v_id, 40);
  end loop;

  -- ofensiva do inglês e dia "feito" (lição, nível lendário ou conversa válidos)
  if p_kind in ('lesson', 'legendary', 'roleplay') and v_valid then
    if v_prof.streak_date is distinct from v_today then
      v_prof.streak := case when v_prof.streak_date = v_today - 1 then v_prof.streak + 1 else 1 end;
      v_prof.streak_date := v_today;
    end if;
    v_prof.last_done_date := v_today;
    v_prof.total_done := v_prof.total_done + 1;

    -- ofensiva geral dos jogos (a mesma que o resto da Sala de Jogos usa)
    select game_streak_date, game_streak into v_last, v_gs from public.profiles where id = p_user;
    if v_last is distinct from v_today then
      v_gs := case when v_last = v_today - 1 then coalesce(v_gs, 0) + 1 else 1 end;
      perform set_config('elos.xp_bypass', 'on', true);
      update public.profiles set game_streak = v_gs, game_streak_date = v_today where id = p_user;
      perform set_config('elos.xp_bypass', 'off', true);
    end if;
  end if;

  update public.english_profile
     set streak = v_prof.streak, streak_date = v_prof.streak_date, last_done_date = v_prof.last_done_date,
         total_done = v_prof.total_done, xp_day = v_prof.xp_day, xp_lessons = v_prof.xp_lessons,
         xp_roleplay = v_prof.xp_roleplay, updated_at = now()
   where user_id = p_user;

  if v_xp > 0 then
    perform public.game_grant_xp(p_user, v_xp, 'game_english');
    perform public.check_and_grant_achievements(p_user);
  end if;

  return jsonb_build_object('xp', v_xp, 'stars', v_stars, 'streak', v_prof.streak, 'valid', v_valid);
end $fn$;
revoke execute on function public.english_finish(uuid, text, text, int, int, int, jsonb, jsonb, int, jsonb, int) from public, anon, authenticated;
grant execute on function public.english_finish(uuid, text, text, int, int, int, jsonb, jsonb, int, jsonb, int) to service_role;
