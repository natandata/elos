-- Marcações (@) no Elogram e no chat do Elo.
-- O texto guarda a marcação como @[Nome](id): os limites do banco ficam maiores que os que a pessoa vê.
alter table public.feed_posts drop constraint if exists feed_posts_caption_check;
alter table public.feed_posts add constraint feed_posts_caption_check check (char_length(caption) <= 900);
alter table public.feed_comments drop constraint if exists feed_comments_body_check;
alter table public.feed_comments add constraint feed_comments_body_check check (char_length(trim(both from body)) > 0 and char_length(body) <= 1200);
alter table public.chat_messages drop constraint if exists chat_messages_body_check;
alter table public.chat_messages add constraint chat_messages_body_check check (char_length(trim(both from body)) > 0 and char_length(body) <= 3500);

create table if not exists public.elogram_mentions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  target_id  uuid not null references public.profiles(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  in_comment boolean not null default false,
  body       text,
  created_at timestamptz not null default now()
);
create index if not exists elogram_mentions_target_idx on public.elogram_mentions (target_id, created_at desc);
alter table public.elogram_mentions enable row level security;

-- (elogram_activity ganhou o trecho "mention": ver a definição aplicada no banco)
