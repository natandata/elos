-- Acesso antecipado a jogos ainda não lançados, concedido pelo admin a usuários específicos.
create table if not exists public.game_early_access (
  game text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (game, user_id)
);
alter table public.game_early_access enable row level security;
drop policy if exists game_early_access_admin on public.game_early_access;
create policy game_early_access_admin on public.game_early_access for all
  using (public.is_admin()) with check (public.is_admin());
