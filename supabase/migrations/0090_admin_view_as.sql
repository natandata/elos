-- ELOS — "Visualizar como": admin escolhe um usuário e passa a enxergar o
-- app com o perfil dele (nav, tema, dados) usando a própria sessão real do
-- admin — sem impersonar login. A maioria das tabelas já tem "or is_admin()"
-- nas policies de leitura, então o app já funciona certinho só trocando qual
-- profile as páginas usam (ver requireProfile em src/lib/auth.ts). A exceção
-- é notifications, que só permitia user_id = auth.uid() — sem essa policy,
-- o admin não conseguiria ver as notificações do usuário visualizado.
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
