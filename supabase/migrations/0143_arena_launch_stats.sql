-- Números do primeiro dia da Arena dos Heróis (card da tela inicial).
-- Janela: do início do jogo até 05/10/2026 23:59 (Brasília). Contas de teste ficam de fora.
-- Minutos: batalha vs computador = duração limitada a 4 min (a partida pode ficar aberta);
-- 1x1 e duplas = ticks/20 s de jogo real.
create or replace function public.arena_launch_stats()
returns jsonb
language sql stable security definer set search_path = public as $fn$
  with cut as (select timestamptz '2026-10-06 03:00:00+00' as t),
  pve as (
    select m.user_id, least(extract(epoch from (m.finished_at - m.started_at)), 240) as secs
      from public.arena_matches m join public.profiles p on p.id = m.user_id, cut
     where m.status = 'finished' and m.started_at < cut.t and not coalesce(p.is_test_account, false)
  ),
  pvp as (
    select coalesce(a.ticks, 0) / 20.0 as secs
      from public.arena_pvp a join public.profiles p on p.id = a.challenger_id, cut
     where a.status = 'finished' and a.created_at < cut.t and not coalesce(p.is_test_account, false)
  ),
  duo as (
    select coalesce(a.ticks, 0) / 20.0 as secs
      from public.arena_duo a join public.profiles p on p.id = a.host_id, cut
     where a.status = 'finished' and a.created_at < cut.t and not coalesce(p.is_test_account, false)
  )
  select jsonb_build_object(
    'matches', (select count(*) from pve) + (select count(*) from pvp) + (select count(*) from duo),
    'minutes', round(((select coalesce(sum(secs), 0) from pve) + (select coalesce(sum(secs), 0) from pvp) + (select coalesce(sum(secs), 0) from duo)) / 60.0),
    'players', (select count(distinct user_id) from pve)
  )
  where exists (select 1 from public.profiles me where me.id = auth.uid());
$fn$;
grant execute on function public.arena_launch_stats() to authenticated;
revoke execute on function public.arena_launch_stats() from anon, public;
