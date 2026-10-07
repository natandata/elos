-- ArenaSoccer: partidas contra o computador, estatísticas, entrada na Loja (compra abre em 01/11) e contagem no destaque semanal.
create table if not exists public.soccer_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('1v1','2v2','3v3','4v4')),
  level text not null check (level in ('easy','normal','hard')),
  goals_for integer not null check (goals_for between 0 and 30),
  goals_against integer not null check (goals_against between 0 and 30),
  result text not null check (result in ('win','loss','draw')),
  duration_s integer not null check (duration_s between 0 and 1800),
  created_at timestamptz not null default now()
);
create index if not exists soccer_matches_user_idx on public.soccer_matches (user_id, created_at desc);
alter table public.soccer_matches enable row level security;
drop policy if exists soccer_matches_read on public.soccer_matches;
create policy soccer_matches_read on public.soccer_matches for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.soccer_record(p_mode text, p_level text, p_for integer, p_against integer, p_secs integer)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); res text;
begin
  if uid is null then return jsonb_build_object('error', 'Entre na sua conta.'); end if;
  if p_mode not in ('1v1','2v2','3v3','4v4') or p_level not in ('easy','normal','hard') then return jsonb_build_object('error', 'Partida inválida.'); end if;
  if p_for < 0 or p_for > 30 or p_against < 0 or p_against > 30 or p_secs < 10 or p_secs > 1800 then return jsonb_build_object('error', 'Partida inválida.'); end if;
  if exists (select 1 from public.soccer_matches where user_id = uid and created_at > now() - interval '15 seconds') then return jsonb_build_object('error', 'Calma, uma partida de cada vez.'); end if;
  res := case when p_for > p_against then 'win' when p_for < p_against then 'loss' else 'draw' end;
  insert into public.soccer_matches (user_id, mode, level, goals_for, goals_against, result, duration_s) values (uid, p_mode, p_level, p_for, p_against, res, p_secs);
  return jsonb_build_object('ok', true);
end;
$fn$;
revoke execute on function public.soccer_record(text, text, integer, integer, integer) from anon, public;
grant execute on function public.soccer_record(text, text, integer, integer, integer) to authenticated;

create or replace function public.soccer_my_stats()
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object(
    'matches', count(*), 'wins', count(*) filter (where result = 'win'), 'losses', count(*) filter (where result = 'loss'),
    'draws', count(*) filter (where result = 'draw'), 'goals', coalesce(sum(goals_for), 0), 'minutes', round(coalesce(sum(duration_s), 0) / 60.0))
  from public.soccer_matches where user_id = auth.uid();
$fn$;
grant execute on function public.soccer_my_stats() to authenticated;
revoke execute on function public.soccer_my_stats() from anon, public;

-- Loja: o ArenaSoccer entra à venda a partir de 01/11 (quem comprar já pode jogar)
insert into public.store_items (title, emoji, blurb, cover, href, game_key, status, release_at, price_coins, active, sort)
select 'ArenaSoccer', '⚽', 'Futebol arcade 2D de física: um botão de chute, 1x1 até 4x4 contra o computador.', null, '/app/jogos/arenasoccer', 'arenasoccer', 'scheduled', timestamptz '2026-11-01 00:00:00-03', 5, true, 0
where not exists (select 1 from public.store_items where game_key = 'arenasoccer');

-- compra de item com data de lançamento só abre na data (admin pode testar antes)
create or replace function public.store_buy(p_item uuid)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  it public.store_items;
  uid uuid := auth.uid();
  nb integer;
begin
  if uid is null then return jsonb_build_object('error', 'Entre na sua conta para comprar.'); end if;
  select * into it from public.store_items where id = p_item and active;
  if not found then return jsonb_build_object('error', 'Este jogo não está disponível.'); end if;
  if it.price_coins is null then return jsonb_build_object('error', 'Este jogo ainda não está à venda.'); end if;
  if it.status = 'scheduled' and it.release_at is not null and it.release_at > now() and not public.is_admin() then
    return jsonb_build_object('error', 'A compra abre na data de lançamento.');
  end if;
  if exists (select 1 from public.game_purchases where user_id = uid and item_id = p_item) then
    return jsonb_build_object('error', 'Você já tem este jogo.');
  end if;
  insert into public.coin_wallets (user_id, balance) values (uid, 0) on conflict (user_id) do nothing;
  update public.coin_wallets set balance = balance - it.price_coins, updated_at = now()
   where user_id = uid and balance >= it.price_coins returning balance into nb;
  if not found then return jsonb_build_object('error', 'Denários insuficientes.'); end if;
  insert into public.coin_ledger (user_id, delta, reason, created_by) values (uid, -it.price_coins, 'Compra: ' || it.title, uid);
  insert into public.game_purchases (user_id, item_id, price) values (uid, p_item, it.price_coins);
  return jsonb_build_object('balance', nb);
end;
$fn$;

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
    union all
    select 'arenasoccer', m.user_id, m.id::text, least(m.duration_s, 600), true
      from public.soccer_matches m, wk where m.created_at >= wk.t
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
