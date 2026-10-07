-- Dificuldade geral da Arena dos Heróis contra o computador (multiplicador de vida e dano do computador), ajustada pelo admin.
create table if not exists public.arena_settings (
  id int primary key default 1 check (id = 1),
  bot_difficulty numeric not null default 1.25 check (bot_difficulty between 0.5 and 2.5),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.arena_settings (id) values (1) on conflict (id) do nothing;
alter table public.arena_settings enable row level security;
drop policy if exists arena_settings_read on public.arena_settings;
create policy arena_settings_read on public.arena_settings for select using (auth.uid() is not null);
drop policy if exists arena_settings_admin on public.arena_settings;
create policy arena_settings_admin on public.arena_settings for all using (public.is_admin()) with check (public.is_admin());
