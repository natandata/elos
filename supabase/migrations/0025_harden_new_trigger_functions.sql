-- ELOS — endurece as funções de trigger novas (0020/0021/0023): são
-- disparadas só pelo gatilho, nunca deveriam ser chamáveis via RPC direto.
revoke execute on function public.autofill_leader_crias_for_cria()   from anon, authenticated, public;
revoke execute on function public.autofill_leader_crias_for_leader() from anon, authenticated, public;
revoke execute on function public.log_profile_changes()              from anon, authenticated, public;
revoke execute on function public.log_profile_delete()                from anon, authenticated, public;
revoke execute on function public.sync_leader_crias_on_change()       from anon, authenticated, public;
