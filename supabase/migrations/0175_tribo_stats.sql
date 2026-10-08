-- A Última Tribo (aplicada via MCP): progresso do jogador. Só o servidor grava (service role); cada um lê o seu.
create table if not exists public.tribo_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  xp integer not null default 0,
  matches integer not null default 0,
  wins integer not null default 0,
  kills integer not null default 0,
  best_place integer,
  lore text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.tribo_stats enable row level security;
drop policy if exists tribo_stats_select_own on public.tribo_stats;
create policy tribo_stats_select_own on public.tribo_stats for select to authenticated using (user_id = (select auth.uid()));
