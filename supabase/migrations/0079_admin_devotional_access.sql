-- Acesso do admin ao Meu Devocional: hoje devotional_entries (diário) e
-- devotional_favorites (versículos favoritos) só permitem leitura pelo
-- próprio dono — prayer_requests já seguia o padrão certo (dono OU admin).
-- Sem isso a tela de monitoramento do admin não enxergaria nada.

drop policy if exists devotional_entries_owner on public.devotional_entries;
create policy devotional_entries_select on public.devotional_entries for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy devotional_entries_write on public.devotional_entries for insert to authenticated
  with check (user_id = auth.uid());
create policy devotional_entries_update on public.devotional_entries for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy devotional_entries_delete on public.devotional_entries for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists devotional_favorites_owner on public.devotional_favorites;
create policy devotional_favorites_select on public.devotional_favorites for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy devotional_favorites_write on public.devotional_favorites for insert to authenticated
  with check (user_id = auth.uid());
create policy devotional_favorites_delete on public.devotional_favorites for delete to authenticated
  using (user_id = auth.uid());
