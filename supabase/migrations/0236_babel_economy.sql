-- ELOS — Babel: retenção e recompensas (XP próprio, gemas, corações, congelar ofensiva, meta diária, missões, impulso de XP).
-- Economia SÓ do Babel: não mexe no XP do ELOS (english_finish continua pagando o XP pequeno de antes).
-- Escrita só por funções security definer (service_role, chamadas pelas server actions). O aluno só lê as próprias linhas.

create table if not exists public.babel_profile (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  xp_total int not null default 0,
  gems int not null default 30,
  hearts int not null default 5,
  hearts_at timestamptz not null default now(),
  freezes int not null default 0,
  goal int not null default 20,
  boost_until timestamptz,
  league int not null default 1,
  best_streak int not null default 0,
  streak_milestone int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.babel_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  xp int not null default 0,
  lessons int not null default 0,
  perfects int not null default 0,
  roleplays int not null default 0,
  practices int not null default 0,
  goal_met boolean not null default false,
  quests_claimed int[] not null default '{}',
  primary key (user_id, day)
);
create index if not exists babel_daily_day_idx on public.babel_daily (day, xp desc);

alter table public.babel_profile enable row level security;
alter table public.babel_daily enable row level security;
drop policy if exists babel_profile_select on public.babel_profile;
create policy babel_profile_select on public.babel_profile for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists babel_daily_select on public.babel_daily;
create policy babel_daily_select on public.babel_daily for select to authenticated using (user_id = auth.uid() or public.is_admin());

create or replace function public.babel_ensure(p_user uuid) returns void language sql security definer set search_path = public as $$
  insert into public.babel_profile (user_id) values (p_user) on conflict do nothing;
$$;

-- Atualiza os corações com a recarga (1 a cada 4 h) e devolve {hearts, next_at}.
create or replace function public.babel_sync_hearts(p_user uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare p public.babel_profile; n int;
begin
  perform public.babel_ensure(p_user);
  select * into p from public.babel_profile where user_id = p_user for update;
  if p.hearts >= 5 then
    update public.babel_profile set hearts = 5, hearts_at = now() where user_id = p_user;
    return jsonb_build_object('hearts', 5, 'next_at', null);
  end if;
  n := floor(extract(epoch from (now() - p.hearts_at)) / 14400);
  if n > 0 then
    p.hearts := least(5, p.hearts + n);
    p.hearts_at := case when p.hearts >= 5 then now() else p.hearts_at + n * interval '4 hours' end;
    update public.babel_profile set hearts = p.hearts, hearts_at = p.hearts_at where user_id = p_user;
  end if;
  return jsonb_build_object('hearts', p.hearts, 'next_at', case when p.hearts >= 5 then null else p.hearts_at + interval '4 hours' end);
end $fn$;

-- Perde 1 coração (um erro numa lição). Devolve {hearts, next_at}.
create or replace function public.babel_lose_heart(p_user uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare s jsonb; h int;
begin
  s := public.babel_sync_hearts(p_user);
  h := (s->>'hearts')::int;
  if h <= 0 then return s; end if;
  update public.babel_profile set hearts = h - 1, hearts_at = case when h >= 5 then now() else hearts_at end, updated_at = now() where user_id = p_user;
  return public.babel_sync_hearts(p_user);
end $fn$;

-- Paga XP, gemas e bônus de uma lição/conversa/treino válido. Chamada de dentro de english_finish.
create or replace function public.babel_finish_award(p_user uuid, p_kind text, p_wrong int, p_correct int, p_streak int, p_extended boolean)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  p public.babel_profile;
  d public.babel_daily;
  v_xp int := 0; v_gems int := 0; v_perfect boolean := (p_wrong = 0);
  v_goal_now boolean := false; v_mile_gems int := 0; v_heart_gain boolean := false;
  v_week jsonb; v_mon date;
begin
  perform public.babel_ensure(p_user);
  select * into p from public.babel_profile where user_id = p_user for update;
  insert into public.babel_daily (user_id, day) values (p_user, v_today) on conflict do nothing;
  select * into d from public.babel_daily where user_id = p_user and day = v_today for update;

  if p_kind = 'lesson' then v_xp := 10 + case when v_perfect then 5 else 0 end; v_gems := 5 + case when v_perfect then 5 else 0 end;
  elsif p_kind = 'legendary' then v_xp := 20 + case when v_perfect then 5 else 0 end; v_gems := 15;
  elsif p_kind = 'roleplay' then v_xp := 10 + case when p_correct >= 80 then 5 else 0 end; v_gems := 10;
  elsif p_kind = 'practice' then v_xp := 5;
  end if;
  if p.boost_until is not null and p.boost_until > now() then v_xp := v_xp * 2; end if;

  d.xp := d.xp + v_xp;
  if p_kind in ('lesson', 'legendary') then d.lessons := d.lessons + 1; if v_perfect then d.perfects := d.perfects + 1; end if;
  elsif p_kind = 'roleplay' then d.roleplays := d.roleplays + 1;
  elsif p_kind = 'practice' then d.practices := d.practices + 1;
  end if;

  if not d.goal_met and d.xp >= p.goal then d.goal_met := true; v_goal_now := true; v_gems := v_gems + 10; end if;

  -- treino de erros devolve 1 coração (até 5 treinos por dia)
  if p_kind = 'practice' and d.practices <= 5 then
    perform public.babel_sync_hearts(p_user);
    update public.babel_profile set hearts = least(5, hearts + 1) where user_id = p_user and hearts < 5;
    v_heart_gain := true;
  end if;

  -- marcos da ofensiva (ao estender a ofensiva)
  if p_streak < p.streak_milestone then p.streak_milestone := 0; end if;
  if p_extended then
    v_mile_gems := case when p_streak >= 365 and p.streak_milestone < 365 then 500 when p_streak >= 200 and p.streak_milestone < 200 then 300 when p_streak >= 100 and p.streak_milestone < 100 then 200 when p_streak >= 50 and p.streak_milestone < 50 then 100 when p_streak >= 30 and p.streak_milestone < 30 then 60 when p_streak >= 14 and p.streak_milestone < 14 then 40 when p_streak >= 7 and p.streak_milestone < 7 then 25 when p_streak >= 3 and p.streak_milestone < 3 then 10 else 0 end;
    if v_mile_gems > 0 then
      p.streak_milestone := case when p_streak >= 365 then 365 when p_streak >= 200 then 200 when p_streak >= 100 then 100 when p_streak >= 50 then 50 when p_streak >= 30 then 30 when p_streak >= 14 then 14 when p_streak >= 7 then 7 else 3 end;
      v_gems := v_gems + v_mile_gems;
    end if;
  end if;

  update public.babel_daily set xp = d.xp, lessons = d.lessons, perfects = d.perfects, roleplays = d.roleplays, practices = d.practices, goal_met = d.goal_met where user_id = p_user and day = v_today;
  update public.babel_profile
     set xp_total = xp_total + v_xp, gems = gems + v_gems, best_streak = greatest(best_streak, p_streak), streak_milestone = p.streak_milestone, updated_at = now()
   where user_id = p_user;

  -- semana (segunda a domingo) para o calendário da ofensiva
  v_mon := v_today - ((extract(isodow from v_today)::int) - 1);
  select jsonb_agg(coalesce((select xp > 0 from public.babel_daily where user_id = p_user and day = v_mon + g), false) order by g) into v_week from generate_series(0, 6) g;

  return jsonb_build_object('xp', v_xp, 'gems', v_gems, 'perfect', v_perfect, 'goal_now', v_goal_now, 'goal', p.goal, 'day_xp', d.xp,
    'milestone_gems', v_mile_gems, 'heart_gain', v_heart_gain, 'week', v_week, 'dow', extract(isodow from v_today)::int - 1,
    'boosted', (p.boost_until is not null and p.boost_until > now()));
end $fn$;

create or replace function public.babel_buy(p_user uuid, p_item text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare p public.babel_profile; s jsonb;
begin
  perform public.babel_ensure(p_user);
  s := public.babel_sync_hearts(p_user);
  select * into p from public.babel_profile where user_id = p_user for update;
  if p_item = 'freeze' then
    if p.freezes >= 2 then return jsonb_build_object('error', 'Você já tem 2 congelamentos.'); end if;
    if p.gems < 100 then return jsonb_build_object('error', 'Gemas insuficientes.'); end if;
    update public.babel_profile set gems = gems - 100, freezes = freezes + 1, updated_at = now() where user_id = p_user;
  elsif p_item = 'refill' then
    if (s->>'hearts')::int >= 5 then return jsonb_build_object('error', 'Seus corações já estão cheios.'); end if;
    if p.gems < 80 then return jsonb_build_object('error', 'Gemas insuficientes.'); end if;
    update public.babel_profile set gems = gems - 80, hearts = 5, hearts_at = now(), updated_at = now() where user_id = p_user;
  elsif p_item = 'boost' then
    if p.gems < 50 then return jsonb_build_object('error', 'Gemas insuficientes.'); end if;
    update public.babel_profile set gems = gems - 50, boost_until = greatest(now(), coalesce(boost_until, now())) + interval '15 minutes', updated_at = now() where user_id = p_user;
  else
    return jsonb_build_object('error', 'Item inválido.');
  end if;
  return jsonb_build_object('ok', true);
end $fn$;

create or replace function public.babel_set_goal(p_user uuid, p_goal int) returns void language plpgsql security definer set search_path = public as $fn$
begin
  if p_goal not in (10, 20, 30, 50) then raise exception 'meta inválida'; end if;
  perform public.babel_ensure(p_user);
  update public.babel_profile set goal = p_goal, updated_at = now() where user_id = p_user;
end $fn$;

-- Resgata uma missão (idx 0..2) ou o baú diário (idx 9). A elegibilidade é conferida pela server action.
create or replace function public.babel_claim(p_user uuid, p_idx int, p_gems int) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_today date := (now() at time zone 'America/Sao_Paulo')::date; d public.babel_daily;
begin
  perform public.babel_ensure(p_user);
  insert into public.babel_daily (user_id, day) values (p_user, v_today) on conflict do nothing;
  select * into d from public.babel_daily where user_id = p_user and day = v_today for update;
  if p_idx = any (d.quests_claimed) then return jsonb_build_object('error', 'Já resgatado.'); end if;
  update public.babel_daily set quests_claimed = array_append(quests_claimed, p_idx) where user_id = p_user and day = v_today;
  update public.babel_profile set gems = gems + greatest(0, least(p_gems, 200)), updated_at = now() where user_id = p_user;
  return jsonb_build_object('ok', true);
end $fn$;

revoke execute on function public.babel_ensure(uuid), public.babel_sync_hearts(uuid), public.babel_lose_heart(uuid), public.babel_finish_award(uuid, text, int, int, int, boolean), public.babel_buy(uuid, text), public.babel_set_goal(uuid, int), public.babel_claim(uuid, int, int) from public, anon, authenticated;
grant execute on function public.babel_ensure(uuid), public.babel_sync_hearts(uuid), public.babel_lose_heart(uuid), public.babel_finish_award(uuid, text, int, int, int, boolean), public.babel_buy(uuid, text), public.babel_set_goal(uuid, int), public.babel_claim(uuid, int, int) to service_role;

-- english_finish: ofensiva com congelamento + economia do Babel. Mesma assinatura; o retorno ganha a chave "babel".
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
  v_ext boolean := false;
  v_froze boolean := false;
  v_freezes int;
  v_babel jsonb := null;
begin
  if p_kind not in ('lesson', 'legendary', 'roleplay', 'practice', 'placement') then
    raise exception 'tipo inválido';
  end if;

  insert into public.english_profile (user_id) values (p_user) on conflict do nothing;
  perform public.babel_ensure(p_user);
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

  -- ofensiva do inglês e dia "feito" (lição, nível lendário ou conversa válidos); 1 congelamento cobre 1 dia perdido
  if p_kind in ('lesson', 'legendary', 'roleplay') and v_valid then
    if v_prof.streak_date is distinct from v_today then
      select freezes into v_freezes from public.babel_profile where user_id = p_user;
      if v_prof.streak_date = v_today - 1 then
        v_prof.streak := v_prof.streak + 1;
      elsif v_prof.streak_date = v_today - 2 and coalesce(v_freezes, 0) > 0 and v_prof.streak > 0 then
        v_prof.streak := v_prof.streak + 1; v_froze := true;
        update public.babel_profile set freezes = freezes - 1 where user_id = p_user;
      else
        v_prof.streak := 1;
      end if;
      v_prof.streak_date := v_today;
      v_ext := true;
    end if;
    v_prof.last_done_date := v_today;
    v_prof.total_done := v_prof.total_done + 1;

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

  if v_valid and p_kind in ('lesson', 'legendary', 'roleplay', 'practice') then
    v_babel := public.babel_finish_award(p_user, p_kind, v_wrong, coalesce(p_correct, 0), v_prof.streak, v_ext);
    v_babel := v_babel || jsonb_build_object('extended', v_ext, 'froze', v_froze, 'streak', v_prof.streak);
  end if;

  if v_xp > 0 then
    perform public.game_grant_xp(p_user, v_xp, 'game_english');
    perform public.check_and_grant_achievements(p_user);
  end if;

  return jsonb_build_object('xp', v_xp, 'stars', v_stars, 'streak', v_prof.streak, 'valid', v_valid, 'babel', v_babel);
end $fn$;
revoke execute on function public.english_finish(uuid, text, text, int, int, int, jsonb, jsonb, int, jsonb, int) from public, anon, authenticated;
grant execute on function public.english_finish(uuid, text, text, int, int, int, jsonb, jsonb, int, jsonb, int) to service_role;
