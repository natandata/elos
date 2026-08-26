-- ELOS — endurecimento das funções (Supabase security advisor)
--
-- 1. Funções de trigger e helpers internos não devem ser chamáveis pela API REST.
--    Triggers continuam funcionando: o privilégio EXECUTE é checado na criação
--    do trigger, não a cada disparo.
-- 2. Helpers usados dentro das políticas RLS (is_admin, my_role, my_elo,
--    is_leader_of) precisam continuar executáveis por `authenticated`, porque a
--    política é avaliada com o papel de quem consulta — mas não por `anon`.

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $fn$
begin new.updated_at = now(); return new; end $fn$;

-- funções de trigger: ninguém chama pela API
revoke execute on function public.touch_updated_at()        from anon, authenticated, public;
revoke execute on function public.handle_new_user()         from anon, authenticated, public;
revoke execute on function public.guard_profile_update()    from anon, authenticated, public;
revoke execute on function public.autofill_elo()            from anon, authenticated, public;
revoke execute on function public.notify_new_assignment()   from anon, authenticated, public;

-- helper interno, usado apenas dentro de autofill_elo
revoke execute on function public.suggest_elo(public.gender_t, public.age_range_t)
  from anon, authenticated, public;

-- helpers de RLS: só para quem está autenticado
revoke execute on function public.is_admin()            from anon, public;
revoke execute on function public.my_role()             from anon, public;
revoke execute on function public.my_elo()              from anon, public;
revoke execute on function public.is_leader_of(uuid)    from anon, public;
grant  execute on function public.is_admin()            to authenticated;
grant  execute on function public.my_role()             to authenticated;
grant  execute on function public.my_elo()              to authenticated;
grant  execute on function public.is_leader_of(uuid)    to authenticated;

-- RPCs de negócio: só autenticado
revoke execute on function public.submit_assignment(uuid)                from anon, public;
revoke execute on function public.review_assignment(uuid, boolean, text) from anon, public;
revoke execute on function public.elo_rankings()                         from anon, public;
grant  execute on function public.submit_assignment(uuid)                to authenticated;
grant  execute on function public.review_assignment(uuid, boolean, text) to authenticated;
grant  execute on function public.elo_rankings()                         to authenticated;

-- contadores da tela de login: precisam ficar acessíveis sem sessão
grant execute on function public.public_stats() to anon, authenticated;

-- O guard de profiles só se aplica a chamadas com sessão de usuário.
-- Sem auth.uid() (SQL Editor, service role, seeds) ele bloqueava até o seed do
-- admin, que ficava com role 'cria'.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role   := old.role;
    new.elo_id := old.elo_id;
    if coalesce(current_setting('elos.xp_bypass', true), 'off') <> 'on' then
      new.xp := old.xp;
    end if;
  end if;
  return new;
end $fn$;

revoke execute on function public.guard_profile_update() from anon, authenticated, public;
