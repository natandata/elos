-- ELOS — schema base, triggers e helpers
-- Roda uma vez em um projeto Supabase novo.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
do $$ begin
  create type public.user_role as enum ('admin','leader','cria');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.gender_t as enum ('male','female');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.age_range_t as enum ('12-14','15-16','17');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.status_level as enum ('bad','ok','good');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.mission_type as enum ('individual','collective');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.assignment_status as enum ('pending','awaiting_approval','approved','rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- tabelas
create table if not exists public.elos (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  gender      public.gender_t not null,
  age_range   public.age_range_t not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (gender, age_range)
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  age_range   public.age_range_t,
  gender      public.gender_t,
  role        public.user_role not null default 'cria',
  elo_id      uuid references public.elos(id) on delete set null,
  avatar_url  text,
  xp          integer not null default 0 check (xp >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_elo_idx  on public.profiles(elo_id);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_xp_idx   on public.profiles(elo_id, xp desc);

-- vínculo líder -> cria em tabela própria (permite múltiplos vínculos no futuro)
create table if not exists public.leader_crias (
  id         uuid primary key default gen_random_uuid(),
  leader_id  uuid not null references public.profiles(id) on delete cascade,
  cria_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (leader_id, cria_id)
);
create index if not exists leader_crias_leader_idx on public.leader_crias(leader_id);
create index if not exists leader_crias_cria_idx   on public.leader_crias(cria_id);

create table if not exists public.status_responses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  emotional_status  public.status_level not null,
  spiritual_status  public.status_level not null,
  created_at        timestamptz not null default now()
);
create index if not exists status_responses_user_idx on public.status_responses(user_id, created_at desc);

create table if not exists public.missions (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  type        public.mission_type not null default 'individual',
  xp          integer not null default 0 check (xp >= 0),
  start_date  date,
  due_date    date,
  elo_id      uuid references public.elos(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists missions_creator_idx on public.missions(created_by);
create index if not exists missions_elo_idx     on public.missions(elo_id);

create table if not exists public.mission_assignments (
  id               uuid primary key default gen_random_uuid(),
  mission_id       uuid not null references public.missions(id) on delete cascade,
  cria_id          uuid not null references public.profiles(id) on delete cascade,
  status           public.assignment_status not null default 'pending',
  submitted_at     timestamptz,
  approved_at      timestamptz,
  approved_by      uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  unique (mission_id, cria_id)
);
create index if not exists assignments_cria_idx    on public.mission_assignments(cria_id, status);
create index if not exists assignments_mission_idx on public.mission_assignments(mission_id);

-- histórico de XP: uma linha por concessão, com trava contra duplicidade (Regra 2)
create table if not exists public.xp_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  mission_id    uuid references public.missions(id) on delete set null,
  assignment_id uuid unique references public.mission_assignments(id) on delete set null,
  amount        integer not null,
  type          text not null default 'mission_approved',
  created_at    timestamptz not null default now()
);
create index if not exists xp_tx_user_idx on public.xp_transactions(user_id, created_at desc);

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references public.profiles(id) on delete set null,
  title       text not null,
  description text,
  event_date  date not null,
  event_time  time,
  location    text,
  elo_id      uuid references public.elos(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists events_date_idx on public.events(event_date);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read, created_at desc);

-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin new.updated_at = now(); return new; end $fn$;

do $blk$
declare t text;
begin
  foreach t in array array['elos','profiles','missions','events'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $blk$;

-- ---------------------------------------------------------------- helpers
create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = public as $fn$
  select role from public.profiles where id = auth.uid()
$fn$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$fn$;

create or replace function public.my_elo()
returns uuid language sql stable security definer set search_path = public as $fn$
  select elo_id from public.profiles where id = auth.uid()
$fn$;

create or replace function public.is_leader_of(target uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.leader_crias
    where leader_id = auth.uid() and cria_id = target
  )
$fn$;

-- Elo sugerido a partir de gênero + faixa etária (Regra 8)
create or replace function public.suggest_elo(g public.gender_t, a public.age_range_t)
returns uuid language sql stable security definer set search_path = public as $fn$
  select id from public.elos where gender = g and age_range = a limit 1
$fn$;

-- Contadores da tela de login, sem expor dados dos usuários
create or replace function public.public_stats()
returns table (total_users bigint, total_crias bigint, total_leaders bigint)
language sql stable security definer set search_path = public as $fn$
  select count(*)::bigint,
         count(*) filter (where role = 'cria')::bigint,
         count(*) filter (where role = 'leader')::bigint
  from public.profiles
$fn$;
grant execute on function public.public_stats() to anon, authenticated;

-- ---------------------------------------------------------------- novo usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  g public.gender_t;
  a public.age_range_t;
begin
  begin g := (new.raw_user_meta_data->>'gender')::public.gender_t;
  exception when others then g := null; end;
  begin a := (new.raw_user_meta_data->>'age_range')::public.age_range_t;
  exception when others then a := null; end;

  insert into public.profiles (id, full_name, gender, age_range)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    g, a
  )
  on conflict (id) do nothing;
  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Regras 6/7: o próprio usuário não altera role, Elo nem XP
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    new.role   := old.role;
    new.elo_id := old.elo_id;
    new.xp     := old.xp;
  end if;
  return new;
end $fn$;

-- Elo automático quando gênero + faixa etária estão definidos e não há Elo ainda
create or replace function public.autofill_elo()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.elo_id is null and new.gender is not null and new.age_range is not null then
    new.elo_id := public.suggest_elo(new.gender, new.age_range);
  end if;
  return new;
end $fn$;

-- ordem importa: o guard roda primeiro, o autofill depois
drop trigger if exists trg_a_guard_profile on public.profiles;
create trigger trg_a_guard_profile
  before update on public.profiles
  for each row execute function public.guard_profile_update();

drop trigger if exists trg_b_autofill_elo on public.profiles;
create trigger trg_b_autofill_elo
  before insert or update on public.profiles
  for each row execute function public.autofill_elo();
