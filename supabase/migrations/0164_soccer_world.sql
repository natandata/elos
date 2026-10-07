-- ArenaSoccer: Mundo aberto (carreira online). Os jogadores vivem no mesmo campeonato, com datas fixas
-- (segunda, terça, quinta e sábado à noite). Só o servidor escreve; todo jogador do jogo lê.
create table if not exists public.soccer_world_players (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  name text not null,
  pos text not null check (pos in ('FW','MF','DF')),
  num int not null,
  age int not null default 19,
  league text not null check (league in ('br','es','en','fr')),
  team text not null,
  ovr int not null default 64,
  xp int not null default 0,
  rep numeric not null default 18,
  form jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint soccer_world_players_size check (pg_column_size(data) < 60000)
);

create table if not exists public.soccer_world_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  league text not null,
  season int not null,
  team text not null,
  goals int not null default 0,
  assists int not null default 0,
  apps int not null default 0,
  wins int not null default 0,
  rating_sum numeric not null default 0,
  primary key (user_id, league, season)
);

create table if not exists public.soccer_world_state (
  league text primary key,
  season int not null default 1,
  next_round int not null default 0
);
insert into public.soccer_world_state (league) values ('br'), ('es'), ('en'), ('fr') on conflict do nothing;

create table if not exists public.soccer_world_results (
  league text not null,
  season int not null,
  round int not null,
  idx int not null,
  hg int not null,
  ag int not null,
  goals jsonb not null default '[]'::jsonb,
  by_user uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (league, season, round, idx)
);

create table if not exists public.soccer_world_feed (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid references public.profiles(id) on delete set null,
  league text,
  kind text not null,
  text text not null
);
create index if not exists soccer_world_feed_at_idx on public.soccer_world_feed (at desc);

do $$ declare t text; begin
  foreach t in array array['soccer_world_players','soccer_world_stats','soccer_world_state','soccer_world_results','soccer_world_feed'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select using (public.soccer_can_play())', t || '_read', t);
  end loop;
end $$;
