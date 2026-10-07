-- Loja da Sala de Jogos: vitrine de jogos com data de lançamento marcada ou em produção, montada pelo admin.
-- (Mais tarde: preço em moedas, comprado com XP; a coluna price_coins já fica reservada.)
create table if not exists public.store_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  emoji text not null default '🎮',
  blurb text not null default '',
  cover text,
  href text,
  status text not null default 'dev' check (status in ('scheduled', 'dev')),
  release_at timestamptz,
  price_coins integer check (price_coins is null or price_coins >= 0),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.store_items enable row level security;
drop policy if exists store_items_read on public.store_items;
create policy store_items_read on public.store_items for select using (auth.uid() is not null and (active or public.is_admin()));
drop policy if exists store_items_admin on public.store_items;
create policy store_items_admin on public.store_items for all using (public.is_admin()) with check (public.is_admin());

insert into public.store_items (title, emoji, blurb, cover, href, status, release_at, active, sort)
select * from (values
  ('Vista o Herói', '👗', 'Jogo de vestir bíblico: monte o visual de cada herói e ganhe Bilhetes Dourados.', '/dress/capa.webp', '/app/jogos/vestir', 'scheduled', timestamptz '2026-10-09 00:00:00-03', true, 1),
  ('MineArena', '⛏️', 'Sandbox 3D: construa, explore e viva as histórias do Modo História.', '/minearena/capa.webp', '/app/jogos/minearena', 'scheduled', timestamptz '2026-11-01 00:00:00-03', true, 2),
  ('Bible Rush', '🛶', 'Gerenciamento de tempo bíblico: Noé e a reunião dos animais.', null, '/app/jogos/biblerush', 'dev', null, false, 3)
) as v(title, emoji, blurb, cover, href, status, release_at, active, sort)
where not exists (select 1 from public.store_items);
