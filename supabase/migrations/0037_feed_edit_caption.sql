-- ELOS — dono do post pode editar a própria legenda (excluir já existia).
drop policy if exists feed_posts_update on public.feed_posts;
create policy feed_posts_update on public.feed_posts for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
