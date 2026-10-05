-- Baralho salvo de cada jogador na Arena dos Heróis (8 cartas; validado na Server Action).
create table if not exists public.arena_decks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  deck text[] not null,
  updated_at timestamptz not null default now()
);
alter table public.arena_decks enable row level security;
drop policy if exists arena_decks_read on public.arena_decks;
create policy arena_decks_read on public.arena_decks for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists arena_decks_insert on public.arena_decks;
create policy arena_decks_insert on public.arena_decks for insert with check (user_id = auth.uid());
drop policy if exists arena_decks_update on public.arena_decks;
create policy arena_decks_update on public.arena_decks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
