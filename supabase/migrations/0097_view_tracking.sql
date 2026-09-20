-- ELOS — o cria quer ver quem já viu a foto dele no Explorar e quem já viu
-- os stories dele. Duas tabelas de marcação simples (post/story + quem viu),
-- espelhando o padrão já usado pra "quem visualizou a missão".

create table if not exists public.feed_post_views (
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  viewer_id  uuid not null references public.profiles(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (post_id, viewer_id)
);
alter table public.feed_post_views enable row level security;

create policy feed_post_views_insert on public.feed_post_views for insert to authenticated
  with check (viewer_id = auth.uid());

create policy feed_post_views_read on public.feed_post_views for select to authenticated using (
  viewer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.feed_posts fp
     where fp.id = feed_post_views.post_id and fp.author_id = auth.uid()
  )
);

create table if not exists public.story_views (
  story_id   uuid not null references public.story_posts(id) on delete cascade,
  viewer_id  uuid not null references public.profiles(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (story_id, viewer_id)
);
alter table public.story_views enable row level security;

create policy story_views_insert on public.story_views for insert to authenticated
  with check (viewer_id = auth.uid());

create policy story_views_read on public.story_views for select to authenticated using (
  viewer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.story_posts sp
     where sp.id = story_views.story_id and sp.author_id = auth.uid()
  )
);
