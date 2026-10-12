-- Carrossel no Elogram: o post tem a foto principal (image_path) + até 9 fotos extras, na ordem.
alter table public.feed_posts
  add column if not exists extra_image_paths text[] not null default '{}';
alter table public.feed_posts
  drop constraint if exists feed_posts_extra_images_chk;
alter table public.feed_posts
  add constraint feed_posts_extra_images_chk check (cardinality(extra_image_paths) <= 9);
