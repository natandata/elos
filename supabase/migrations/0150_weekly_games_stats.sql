-- Balanço da semana (domingo 00h BRT até o domingo seguinte) por jogo: partidas, minutos e quem mais jogou.
create or replace function public.weekly_games_stats()
returns jsonb
language sql stable security definer set search_path = public as $fn$
  with wk as (
    select ((date_trunc('week', (now() at time zone 'America/Sao_Paulo') + interval '1 day') - interval '1 day') at time zone 'America/Sao_Paulo') as t
  ),
  ev as (
    select gp.game::text as game, gp.user_id, gp.id::text as mid, least(coalesce(extract(epoch from (gp.finished_at - gp.created_at)), 0), 240) as secs, true as lead
      from public.game_plays gp, wk
     where gp.finished and gp.game in ('quiz','verse','who','order','duel') and gp.created_at >= wk.t
    union all
    select 'memory', r.user_id, r.id::text, 0, true
      from public.memory_solo_runs r, wk where r.finished and r.started_at >= wk.t
    union all
    select 'memory', d.challenger_id, d.id::text, least(coalesce(d.c_ms, 0) / 1000.0, 240), true
      from public.memory_duels d, wk where d.status = 'finished' and d.created_at >= wk.t
    union all
    select 'memory', d.opponent_id, d.id::text, least(coalesce(d.o_ms, 0) / 1000.0, 240), false
      from public.memory_duels d, wk where d.status = 'finished' and d.created_at >= wk.t
    union all
    select 'arena', m.user_id, m.id::text, least(coalesce(extract(epoch from (m.finished_at - m.started_at)), 0), 240), true
      from public.arena_matches m, wk where m.status = 'finished' and m.started_at >= wk.t
    union all
    select 'arena', a.challenger_id, a.id::text, coalesce(a.ticks, 0) / 20.0, true
      from public.arena_pvp a, wk where a.status = 'finished' and a.created_at >= wk.t
    union all
    select 'arena', a.opponent_id, a.id::text, 0, false
      from public.arena_pvp a, wk where a.status = 'finished' and a.created_at >= wk.t and a.opponent_id is not null
    union all
    select 'arena', a.host_id, a.id::text, coalesce(a.ticks, 0) / 20.0, true
      from public.arena_duo a, wk where a.status = 'finished' and a.created_at >= wk.t
    union all
    select 'dress', d.user_id, d.id::text, least(coalesce(extract(epoch from (d.finished_at - d.created_at)), 0), 300), true
      from public.dress_plays d, wk where d.finished and d.created_at >= wk.t
  ),
  clean as (
    select e.* from ev e join public.profiles p on p.id = e.user_id where not coalesce(p.is_test_account, false)
  ),
  per_game as (
    select game,
           count(*) filter (where lead) as matches,
           round(coalesce(sum(secs) filter (where lead), 0) / 60.0) as minutes,
           count(distinct user_id) as players
      from clean group by game
  ),
  per_user as (
    select game, user_id, count(*) as plays, sum(secs) as secs,
           row_number() over (partition by game order by count(*) desc, sum(secs) desc, user_id) as rk
      from clean group by game, user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'game', g.game, 'matches', g.matches, 'minutes', g.minutes, 'players', g.players,
      'top', (select jsonb_build_object('name', p.full_name, 'avatar', p.avatar_url, 'plays', u.plays)
                from per_user u join public.profiles p on p.id = u.user_id where u.game = g.game and u.rk = 1)
    ) order by g.matches desc), '[]'::jsonb)
  from per_game g
  where exists (select 1 from public.profiles me where me.id = auth.uid());
$fn$;
grant execute on function public.weekly_games_stats() to authenticated;
revoke execute on function public.weekly_games_stats() from anon, public;
