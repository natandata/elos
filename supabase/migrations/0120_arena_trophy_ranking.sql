-- Ranking de jogadores da Arena por troféus (só quem tem 30 ou mais).
-- Crias e líderes veem o ranking de todos os jogadores; contas de teste não entram.
create or replace function public.arena_trophy_ranking(p_min int default 30, p_limit int default 100)
returns table(user_id uuid, full_name text, avatar_url text, elo_name text, role text, trophies int)
language sql stable security definer set search_path = public as $fn$
  select p.id, p.full_name, p.avatar_url, e.name, p.role::text, s.trophies
    from public.arena_stats s
    join public.profiles p on p.id = s.user_id
    left join public.elos e on e.id = p.elo_id
   where s.trophies >= greatest(p_min, 30)
     and p.role in ('cria', 'leader')
     and not coalesce(p.is_test_account, false)
     and exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('cria', 'leader', 'admin'))
   order by s.trophies desc, s.best desc, p.full_name
   limit least(coalesce(p_limit, 100), 200);
$fn$;
grant execute on function public.arena_trophy_ranking(int, int) to authenticated;
revoke execute on function public.arena_trophy_ranking(int, int) from anon, public;
