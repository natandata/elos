-- ELOS — o admin passa a inserir notificações direto pra outros usuários
-- (aviso de novo evento na agenda, contagem regressiva manual) a partir de
-- uma Server Action com client autenticado por cookie, não só por RPC
-- SECURITY DEFINER ou pelo cron com service role. Sem essa policy, o RLS
-- bloqueava qualquer insert com user_id diferente do próprio admin.
create policy notifications_admin_insert on public.notifications
  for insert to authenticated with check (public.is_admin());
