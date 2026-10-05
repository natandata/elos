-- Arena dos Heróis (fase 1: partida contra o computador).
-- A partida roda no navegador; o servidor guarda a semente e, ao final, refaz
-- a partida com as mesmas jogadas pra confirmar o resultado antes de pagar XP.
create table if not exists public.arena_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  seed integer not null,
  deck text[] not null,
  status text not null default 'open' check (status in ('open', 'finished')),
  result text check (result in ('win', 'loss', 'draw')),
  crowns_me int,
  crowns_bot int,
  xp_awarded int not null default 0,
  play_date date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists arena_matches_user_day on public.arena_matches (user_id, play_date);

alter table public.arena_matches enable row level security;

drop policy if exists arena_matches_read on public.arena_matches;
create policy arena_matches_read on public.arena_matches for select
  using (user_id = auth.uid() or public.is_admin());

-- o jogador abre a própria partida (semente sorteada pela Server Action);
-- fechar e pagar XP só o servidor faz, com a chave de serviço.
drop policy if exists arena_matches_insert on public.arena_matches;
create policy arena_matches_insert on public.arena_matches for insert
  with check (user_id = auth.uid() and status = 'open' and xp_awarded = 0 and result is null);
