-- Campanha da Arena dos Heróis: 8 arenas em ordem, cada uma vencida libera a próxima.
create table if not exists public.arena_campaign_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stage int not null check (stage between 0 and 7),
  seed int not null,
  status text not null default 'open' check (status in ('open','finished','abandoned')),
  result text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists arena_campaign_matches_user_idx on public.arena_campaign_matches (user_id, status);
alter table public.arena_campaign_matches enable row level security;
drop policy if exists arena_campaign_matches_read on public.arena_campaign_matches;
create policy arena_campaign_matches_read on public.arena_campaign_matches for select using (user_id = auth.uid() or public.is_admin());

create table if not exists public.arena_campaign_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  stage int not null check (stage between 0 and 7),
  wins int not null default 1,
  xp_awarded int not null default 0,
  first_won_at timestamptz not null default now(),
  primary key (user_id, stage)
);
alter table public.arena_campaign_progress enable row level security;
drop policy if exists arena_campaign_progress_read on public.arena_campaign_progress;
create policy arena_campaign_progress_read on public.arena_campaign_progress for select using (user_id = auth.uid() or public.is_admin());
