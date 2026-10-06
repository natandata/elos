-- Visibilidade de cada jogo, controlada pelo admin: auto (segue a data de lançamento), visible (aberto a todos) ou hidden (só admin).
create table if not exists public.game_settings (
  game text primary key,
  visibility text not null default 'auto' check (visibility in ('auto', 'visible', 'hidden')),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.game_settings enable row level security;
drop policy if exists game_settings_read on public.game_settings;
create policy game_settings_read on public.game_settings for select using (auth.uid() is not null);
drop policy if exists game_settings_admin on public.game_settings;
create policy game_settings_admin on public.game_settings for all using (public.is_admin()) with check (public.is_admin());
