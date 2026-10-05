-- Torneios da Arena dos Heróis: o admin cria, escolhe a arena (qualquer uma,
-- só vale pro torneio) e a premiação; os jogadores se inscrevem (1x1 ou em
-- duplas) e jogam em chaveamento eliminatório. Partidas de torneio usam as
-- mesmas salas em tempo real do 1x1 e das duplas, mas podem ser entre Elos
-- diferentes e não pagam troféus/XP por partida (só o prêmio do torneio).

create table if not exists public.arena_tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  description text not null default '',
  rules text not null default '',
  format text not null check (format in ('solo', 'duo')),
  arena smallint not null default 0 check (arena between 0 and 7),
  status text not null default 'open' check (status in ('open', 'running', 'finished', 'cancelled')),
  max_entries int check (max_entries is null or max_entries >= 2),
  -- { places: 1|2|3, p1: {xp, trophies, card, copies}, p2: {...}, p3: {...} }
  prizes jsonb not null default '{}'::jsonb,
  -- quem ficou em cada lugar e o que ganhou (preenchido ao terminar)
  results jsonb not null default '[]'::jsonb,
  starts_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.arena_tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.arena_tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- só nas duplas: o parceiro (do mesmo Elo) precisa confirmar
  partner_id uuid references public.profiles(id) on delete cascade,
  confirmed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id),
  check (partner_id is null or partner_id <> user_id)
);
create unique index if not exists arena_tournament_entries_partner
  on public.arena_tournament_entries (tournament_id, partner_id) where partner_id is not null;

create table if not exists public.arena_tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.arena_tournaments(id) on delete cascade,
  bracket text not null default 'main' check (bracket in ('main', 'bronze')),
  round int not null check (round >= 1),
  slot int not null check (slot >= 0),
  entry_a uuid references public.arena_tournament_entries(id) on delete set null,
  entry_b uuid references public.arena_tournament_entries(id) on delete set null,
  winner uuid references public.arena_tournament_entries(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'playing', 'done')),
  -- sala em uso (arena_pvp.id no 1x1, arena_duo.id nas duplas)
  room_id uuid,
  unique (tournament_id, bracket, round, slot)
);
create index if not exists arena_tournament_matches_t on public.arena_tournament_matches (tournament_id);

alter table public.arena_pvp add column if not exists tournament_match_id uuid references public.arena_tournament_matches(id) on delete set null;
alter table public.arena_duo add column if not exists tournament_match_id uuid references public.arena_tournament_matches(id) on delete set null;

-- leitura: todo cria/líder logado vê os torneios; escrita só pelo servidor (chave de serviço)
alter table public.arena_tournaments enable row level security;
alter table public.arena_tournament_entries enable row level security;
alter table public.arena_tournament_matches enable row level security;
drop policy if exists arena_tournaments_read on public.arena_tournaments;
create policy arena_tournaments_read on public.arena_tournaments for select using (auth.uid() is not null);
drop policy if exists arena_tournament_entries_read on public.arena_tournament_entries;
create policy arena_tournament_entries_read on public.arena_tournament_entries for select using (auth.uid() is not null);
drop policy if exists arena_tournament_matches_read on public.arena_tournament_matches;
create policy arena_tournament_matches_read on public.arena_tournament_matches for select using (auth.uid() is not null);

-- dá cópias de cartas (prêmio de torneio); só o servidor chama
create or replace function public.arena_grant_copies(p_user uuid, p_grants jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare g jsonb;
begin
  for g in select * from jsonb_array_elements(p_grants) loop
    insert into public.arena_card_levels (user_id, card, level, copies)
    values (p_user, g->>'card', 1, greatest(0, (g->>'n')::int))
    on conflict (user_id, card) do update set copies = public.arena_card_levels.copies + greatest(0, (g->>'n')::int);
  end loop;
end $$;
revoke all on function public.arena_grant_copies(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.arena_grant_copies(uuid, jsonb) to service_role;
