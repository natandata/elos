-- Top 3 de troféus da Arena para o card da tela inicial (sem contas de teste).
create or replace function public.trophy_top3()
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object('name', t.full_name, 'avatar', t.avatar_url, 'trophies', t.trophies) order by t.trophies desc, t.best desc, t.full_name), '[]'::jsonb)
    from (
      select p.full_name, p.avatar_url, s.trophies, s.best
        from public.arena_stats s
        join public.profiles p on p.id = s.user_id
       where s.trophies > 0
         and p.role in ('cria', 'leader')
         and not coalesce(p.is_test_account, false)
         and exists (select 1 from public.profiles me where me.id = auth.uid())
       order by s.trophies desc, s.best desc, p.full_name
       limit 3
    ) t;
$fn$;
grant execute on function public.trophy_top3() to authenticated;
revoke execute on function public.trophy_top3() from anon, public;
