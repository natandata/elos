-- Arena no ranking semanal Elo vs Elo (segunda a domingo, horário de Brasília).
-- Vitória confirmada contra o computador (partida de 75 s ou mais) = 1 ponto;
-- vitória 1x1 com prêmio = 2 pontos. No máximo 5 pontos por jogador por dia.
create or replace function public.arena_user_week_points()
returns table(user_id uuid, points bigint)
language sql stable security definer set search_path = public as $fn$
  with wk as (
    select (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date as start_day
  ),
  wins as (
    select m.user_id as uid, m.play_date as d, 1 as pts
      from public.arena_matches m, wk
     where m.status = 'finished' and m.result = 'win' and m.trophy_delta > 0 and m.play_date >= wk.start_day
    union all
    select case when v.result = 'challenger' then v.challenger_id else v.opponent_id end,
           (v.finished_at at time zone 'America/Sao_Paulo')::date,
           2
      from public.arena_pvp v, wk
     where v.status = 'finished' and v.rewarded and v.result in ('challenger', 'opponent')
       and (v.finished_at at time zone 'America/Sao_Paulo')::date >= wk.start_day
  ),
  per_day as (
    select uid, d, least(sum(pts), 5) as p from wins group by uid, d
  )
  select uid, sum(p)::bigint from per_day group by uid;
$fn$;
revoke execute on function public.arena_user_week_points() from public, anon, authenticated;

-- ranking geral dos jogos agora soma a Arena
create or replace function public.game_week_ranking()
returns table(elo_id uuid, elo_name text, points bigint, players bigint)
language sql stable security definer set search_path = public as $fn$
  with wk as (
    select (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date as start_day
  ),
  g as (
    select p.id as uid, p.elo_id, coalesce(sum(gp.score), 0)::bigint as pts
      from public.profiles p
      join public.game_plays gp
        on gp.user_id = p.id and gp.finished and gp.game in ('quiz','verse','who','order','duel')
       and gp.play_date >= (select start_day from wk)
     where p.elo_id is not null and p.role in ('cria','leader')
     group by p.id, p.elo_id
  ),
  a as (
    select p.id as uid, p.elo_id, w.points as pts
      from public.arena_user_week_points() w
      join public.profiles p on p.id = w.user_id
     where p.elo_id is not null and p.role in ('cria','leader')
  ),
  per_user as (
    select coalesce(g.uid, a.uid) as uid, coalesce(g.elo_id, a.elo_id) as elo_id,
           coalesce(g.pts, 0) + coalesce(a.pts, 0) as pts
      from g full join a on a.uid = g.uid
  )
  select e.id, e.name,
         coalesce(sum(u.pts), 0)::bigint as points,
         count(u.uid)::bigint as players
    from public.elos e
    left join per_user u on u.elo_id = e.id
   group by e.id, e.name
   order by points desc, e.name;
$fn$;

-- placar do Elo de quem chama: pontos da semana incluem a Arena
create or replace function public.game_elo_board()
returns table(user_id uuid, full_name text, avatar_url text, today_done int, week_points bigint)
language sql stable security definer set search_path = public as $fn$
  with me as (select elo_id from public.profiles where id = auth.uid()),
  wk as (select (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date as start_day),
  today as (select (now() at time zone 'America/Sao_Paulo')::date as d),
  ap as (select w.user_id as uid, w.points from public.arena_user_week_points() w)
  select p.id, p.full_name, p.avatar_url,
         count(*) filter (where gp.play_date = (select d from today))::int,
         (coalesce(sum(gp.score) filter (where gp.play_date >= (select start_day from wk)), 0)
          + coalesce(max((select ap.points from ap where ap.uid = p.id)), 0))::bigint
    from public.profiles p
    left join public.game_plays gp
           on gp.user_id = p.id and gp.finished and gp.game in ('quiz','verse','who','order','duel')
   where p.elo_id is not null
     and p.elo_id = (select elo_id from me)
     and p.role in ('cria','leader')
   group by p.id, p.full_name, p.avatar_url
   order by 5 desc, 2;
$fn$;

-- ranking só da Arena (pontos de Arena por Elo na semana)
create or replace function public.arena_week_ranking()
returns table(elo_id uuid, elo_name text, points bigint, players bigint)
language sql stable security definer set search_path = public as $fn$
  select e.id, e.name,
         coalesce(sum(w.points), 0)::bigint as points,
         count(w.user_id)::bigint as players
    from public.elos e
    left join public.profiles p on p.elo_id = e.id and p.role in ('cria','leader')
    left join public.arena_user_week_points() w on w.user_id = p.id
   group by e.id, e.name
   order by points desc, e.name;
$fn$;
grant execute on function public.arena_week_ranking() to authenticated;
revoke execute on function public.arena_week_ranking() from anon, public;
