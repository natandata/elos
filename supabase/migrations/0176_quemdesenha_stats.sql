-- Quem Desenha? (aplicada via MCP): progresso do jogador. Só o servidor grava (service role); cada um lê o seu.
create table if not exists public.qd_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stars integer not null default 0,
  matches integer not null default 0,
  wins integer not null default 0,
  drawings integer not null default 0,
  guesses integer not null default 0,
  win_streak integer not null default 0,
  best_streak integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.qd_stats enable row level security;
drop policy if exists qd_stats_select_own on public.qd_stats;
create policy qd_stats_select_own on public.qd_stats for select to authenticated using (user_id = (select auth.uid()));
