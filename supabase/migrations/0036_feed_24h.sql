-- ELOS — Feed global de fotos (líderes e crias postam, todo mundo vê,
-- mesma regra de expiração do chat: 24h e "reseta" de verdade, o próprio
-- admin também perde acesso à foto depois disso — não é um "espaço público
-- pra sempre", é efêmero por design (fotos de adolescentes).

-- ---------------------------------------------------------------- storage
-- bucket privado (ao contrário de avatars): a foto não pode ficar acessível
-- por link direto depois de expirar, então nunca é pública — sempre via URL
-- assinada de curta duração, gerada só quando o post ainda está visível.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feed', 'feed', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- ---------------------------------------------------------------- posts
create table if not exists public.feed_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  image_path text not null,
  caption    text check (char_length(caption) <= 280),
  created_at timestamptz not null default now()
);
create index if not exists feed_posts_created_idx on public.feed_posts(created_at);

alter table public.feed_posts enable row level security;

drop policy if exists feed_posts_read on public.feed_posts;
create policy feed_posts_read on public.feed_posts for select to authenticated using (
  created_at > now() - interval '24 hours'
);

drop policy if exists feed_posts_insert on public.feed_posts;
create policy feed_posts_insert on public.feed_posts for insert to authenticated with check (
  author_id = auth.uid() and public.my_role() in ('leader', 'cria')
);

drop policy if exists feed_posts_delete on public.feed_posts;
create policy feed_posts_delete on public.feed_posts for delete to authenticated using (
  public.is_admin() or author_id = auth.uid()
);

-- ---------------------------------------------------------------- storage policies (depende de feed_posts acima)
drop policy if exists feed_storage_insert_own on storage.objects;
create policy feed_storage_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'feed'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.my_role() in ('leader', 'cria')
  );

drop policy if exists feed_storage_read on storage.objects;
create policy feed_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'feed'
  and exists (
    select 1 from public.feed_posts p
     where p.image_path = storage.objects.name
       and p.created_at > now() - interval '24 hours'
  )
);

drop policy if exists feed_storage_delete on storage.objects;
create policy feed_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'feed'
  and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

-- ---------------------------------------------------------------- curtidas
create table if not exists public.feed_likes (
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.feed_likes enable row level security;

drop policy if exists feed_likes_read on public.feed_likes;
create policy feed_likes_read on public.feed_likes for select to authenticated using (true);

drop policy if exists feed_likes_insert on public.feed_likes;
create policy feed_likes_insert on public.feed_likes for insert to authenticated with check (
  user_id = auth.uid() and public.my_role() in ('leader', 'cria')
);

drop policy if exists feed_likes_delete on public.feed_likes;
create policy feed_likes_delete on public.feed_likes for delete to authenticated using (
  user_id = auth.uid()
);

-- ---------------------------------------------------------------- comentários
create table if not exists public.feed_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(trim(body)) > 0 and char_length(body) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists feed_comments_post_idx on public.feed_comments(post_id, created_at);

alter table public.feed_comments enable row level security;

drop policy if exists feed_comments_read on public.feed_comments;
create policy feed_comments_read on public.feed_comments for select to authenticated using (true);

drop policy if exists feed_comments_insert on public.feed_comments;
create policy feed_comments_insert on public.feed_comments for insert to authenticated with check (
  author_id = auth.uid() and public.my_role() in ('leader', 'cria')
);

drop policy if exists feed_comments_delete on public.feed_comments;
create policy feed_comments_delete on public.feed_comments for delete to authenticated using (
  public.is_admin() or author_id = auth.uid()
);

-- ---------------------------------------------------------------- expiração de verdade
-- Mesmo padrão do chat (0032): RLS já esconde na hora, isso aqui só evita
-- acumular arquivo/linha morta que ninguém mais pode ver.
create or replace function public.purge_expired_feed()
returns void language plpgsql security definer set search_path = public as $fn$
begin
  delete from storage.objects
   where bucket_id = 'feed'
     and name in (select image_path from public.feed_posts where created_at < now() - interval '24 hours');

  delete from public.feed_posts where created_at < now() - interval '24 hours';
end $fn$;

-- só o cron deveria chamar isso (postgres/superuser, que ignora grants) —
-- sem isso, o Postgres concede EXECUTE a PUBLIC por padrão numa função nova.
revoke execute on function public.purge_expired_feed() from anon, authenticated, public;

do $$
begin
  perform cron.unschedule('elos-feed-24h-purge');
exception when others then null;
end $$;

select cron.schedule('elos-feed-24h-purge', '*/15 * * * *', $$select public.purge_expired_feed();$$);
