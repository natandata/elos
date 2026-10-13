-- Corrige o carrossel: a regra de leitura do bucket "feed" só liberava a capa (image_path).
-- Agora libera também as fotos extras (extra_image_paths) pra todo mundo, nas 24h do post.
drop policy if exists feed_storage_read on storage.objects;
create policy feed_storage_read on storage.objects for select
  using (
    bucket_id = 'feed'
    and exists (
      select 1 from public.feed_posts p
       where (p.image_path = objects.name or objects.name = any(p.extra_image_paths))
         and p.created_at > now() - interval '24 hours'
    )
  );

drop policy if exists feed_storage_read_orphan_owner on storage.objects;
create policy feed_storage_read_orphan_owner on storage.objects for select
  using (
    bucket_id = 'feed'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
    and not exists (
      select 1 from public.feed_posts p
       where p.image_path = objects.name or objects.name = any(p.extra_image_paths)
    )
  );
