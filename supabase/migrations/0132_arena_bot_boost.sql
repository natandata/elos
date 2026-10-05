alter table public.arena_matches add column if not exists bot_boost numeric not null default 0;

-- Posição no ranking de troféus da Arena (1 = líder). Null se fora do ranking.
create or replace function public.arena_rank_of(p_user uuid)
returns int
language sql stable security definer set search_path = public as $fn$
  select case when me.trophies >= 30 and p.role in ('cria','leader') and not coalesce(p.is_test_account, false)
    then 1 + (
      select count(*) from public.arena_stats s2
        join public.profiles p2 on p2.id = s2.user_id
       where s2.trophies >= 30 and p2.role in ('cria','leader') and not coalesce(p2.is_test_account, false)
         and (s2.trophies > me.trophies or (s2.trophies = me.trophies and (s2.best > me.best or (s2.best = me.best and p2.full_name < p.full_name))))
    )::int
    else null end
    from public.arena_stats me join public.profiles p on p.id = me.user_id
   where me.user_id = p_user;
$fn$;
revoke execute on function public.arena_rank_of(uuid) from anon, authenticated, public;
grant execute on function public.arena_rank_of(uuid) to service_role;
