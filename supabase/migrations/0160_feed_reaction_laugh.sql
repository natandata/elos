-- Explorar: a reação "like" passa a ser exibida como coração (❤️) e entra a reação de risada ("laugh").
alter table public.feed_likes drop constraint feed_likes_kind_check;
alter table public.feed_likes add constraint feed_likes_kind_check check (kind = any (array['like','pray','fire','clap','laugh']));
