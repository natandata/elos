-- Jogos: depois da partida do dia (que vale XP), dá pra jogar de novo quantas
-- vezes quiser como "treino": sem XP, sem carta, fora do ranking do Elo, mas
-- conta pra destravar a Arena.
alter table public.game_plays
  add column if not exists practice boolean not null default false,
  add column if not exists variant int not null default 0;

drop index if exists public.game_plays_daily;
create unique index if not exists game_plays_daily
  on public.game_plays (user_id, game, play_date, variant) where duel_id is null;

-- treino nunca paga XP, mesmo que alguém chame a RPC com valor
create or replace function public.game_finish(p_play uuid, p_xp int, p_type text)
returns int language plpgsql security definer set search_path = public as $fn$
declare
  v_user uuid;
  v_game text;
  v_practice boolean;
  v_xp int := greatest(coalesce(p_xp, 0), 0);
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_last date;
  v_streak int;
begin
  update public.game_plays
     set finished = true, finished_at = now(),
         xp_awarded = case when practice then 0 else v_xp end
   where id = p_play and finished = false
   returning user_id, game, practice into v_user, v_game, v_practice;
  if v_user is null then return -1; end if;
  if v_practice then v_xp := 0; end if;

  if v_xp > 0 then
    perform set_config('elos.xp_bypass', 'on', true);
    update public.profiles set xp = xp + v_xp where id = v_user;
    perform set_config('elos.xp_bypass', 'off', true);
    insert into public.xp_transactions (user_id, amount, type) values (v_user, v_xp, p_type);
  end if;

  if v_game <> 'chest' then
    select game_streak_date, game_streak into v_last, v_streak from public.profiles where id = v_user;
    if v_last is distinct from v_today then
      if v_last = v_today - 1 then v_streak := coalesce(v_streak, 0) + 1; else v_streak := 1; end if;
      perform set_config('elos.xp_bypass', 'on', true);
      update public.profiles set game_streak = v_streak, game_streak_date = v_today where id = v_user;
      perform set_config('elos.xp_bypass', 'off', true);
    end if;
  end if;

  perform public.check_and_grant_achievements(v_user);
  return v_xp;
end $fn$;

revoke execute on function public.game_finish(uuid, int, text) from public, anon, authenticated;
grant execute on function public.game_finish(uuid, int, text) to service_role;

-- Ranking do Elo e "jogos feitos hoje" só contam a partida valendo (não o treino).
do $do$
declare
  v_def text;
  fn text;
begin
  foreach fn in array array['public.game_week_ranking()', 'public.game_elo_board()'] loop
    v_def := pg_get_functiondef(fn::regprocedure);
    if position('gp.finished and gp.game in' in v_def) = 0 then raise exception 'padrão não achado em %', fn; end if;
    v_def := replace(v_def, 'gp.finished and gp.game in', 'gp.finished and not gp.practice and gp.game in');
    execute v_def;
  end loop;

  -- atividades recentes do admin: treino aparece marcado
  v_def := pg_get_functiondef('public.admin_recent_activity(uuid,integer)'::regprocedure);
  if position('|| '' · nota '' || gp.score' in v_def) = 0 then raise exception 'padrão não achado em admin_recent_activity'; end if;
  v_def := replace(v_def, '|| '' · nota '' || gp.score', '|| case when gp.practice then '' · treino'' else '''' end || '' · nota '' || gp.score');
  execute v_def;
end $do$;
