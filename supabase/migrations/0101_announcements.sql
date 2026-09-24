-- ELOS — avisos do admin: card mostrado a todo usuário no próximo acesso.
-- Cada aviso tem uma "version"; o admin pode republicar (version+1) pra
-- mostrar de novo a quem já viu. Quem já dispensou a version atual não vê.
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  active     boolean not null default true,
  version    int not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcement_seen (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  seen_version    int not null,
  seen_at         timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcements enable row level security;
alter table public.announcement_seen enable row level security;

create policy announcements_read on public.announcements
  for select to authenticated using (active or public.is_admin());
create policy announcements_admin_write on public.announcements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy announcement_seen_own_read on public.announcement_seen
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy announcement_seen_own_insert on public.announcement_seen
  for insert to authenticated with check (user_id = auth.uid());
create policy announcement_seen_own_update on public.announcement_seen
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
