-- A faxina de arquivos órfãos precisa reconhecer as fotos extras do carrossel como "em uso".
create or replace function public.orphan_storage_paths()
 returns table(bucket_id text, name text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select o.bucket_id, o.name
    from storage.objects o
   where o.bucket_id in ('feed', 'stories', 'profile_gallery')
     -- só o que o chamador pode remover: admin apaga tudo, cada um apaga o seu
     and (public.is_admin() or (storage.foldername(o.name))[1] = auth.uid()::text)
     -- deixa um respiro pra upload em andamento (registro entra logo depois)
     and o.created_at < now() - interval '10 minutes'
     -- as fotos extras do carrossel também contam como "em uso"
     and not exists (select 1 from public.feed_posts p where p.image_path = o.name or o.name = any(p.extra_image_paths))
     and not exists (select 1 from public.story_posts s where s.image_path = o.name)
     and not exists (select 1 from public.profile_gallery_posts g where g.image_path = o.name)
$function$;
