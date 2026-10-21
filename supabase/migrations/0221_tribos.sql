-- ELOS — Clash of Tribos (jogo de construir a vila e atacar outras vilas, estilo Clash of Clans, com os heróis da Arena).
-- Fase 1: tribo, recursos e construções com tempo real. Escrita só pelo servidor (service_role); o jogador só lê a própria vila.

create table if not exists public.tribos_player (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tribe text not null check (tribe in ('feras', 'bravos', 'reliquias')),
  gold bigint not null default 0 check (gold >= 0),
  mana bigint not null default 0 check (mana >= 0),
  gems int not null default 0 check (gems >= 0),
  xp int not null default 0,
  trophies int not null default 0,
  shield_until timestamptz,
  rev int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tribos_building (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  level int not null default 0,
  x int not null,
  y int not null,
  up_to int,
  up_started timestamptz,
  up_ends timestamptz,
  stored double precision not null default 0,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists tribos_building_user_idx on public.tribos_building (user_id);

alter table public.tribos_player enable row level security;
alter table public.tribos_building enable row level security;

drop policy if exists tribos_player_select on public.tribos_player;
create policy tribos_player_select on public.tribos_player for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists tribos_building_select on public.tribos_building;
create policy tribos_building_select on public.tribos_building for select to authenticated using (user_id = auth.uid() or public.is_admin());
