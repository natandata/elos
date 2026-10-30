-- ELOS — Evento das tribos (Acampadentro, 13/11/2026): tribos Feras, Bravos e Relíquias.
-- Cria e líder são sorteados de forma equilibrada por Elo (o admin fica de fora). A tribo só aparece depois de `reveal_at`
-- (a surpresa é garantida AQUI, no banco) e some depois de `ends_at`. A tribo pontua com missões especiais lançadas pelo admin.
-- `active = false` é o interruptor: o app volta ao normal na hora.

create table if not exists public.event_settings (
  id boolean primary key default true check (id),
  name text not null default 'Acampadentro',
  active boolean not null default false,
  reveal_at timestamptz not null default now(),
  ends_at timestamptz not null default '2026-11-14T02:59:59Z',   -- 13/11/2026 23:59:59 em Brasília
  event_date date not null default '2026-11-13',
  drawn_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.event_settings (id) values (true) on conflict do nothing;

create table if not exists public.event_tribes (
  key text primary key,
  name text not null,
  animal text not null,
  color text not null,
  sort int not null default 0
);
insert into public.event_tribes (key, name, animal, color, sort) values
  ('feras', 'Feras', 'Tigre', '#F2B318', 1),
  ('bravos', 'Bravos', 'Tubarão', '#2FA866', 2),
  ('reliquias', 'Relíquias', 'Panda', '#D93A41', 3)
on conflict (key) do nothing;

create table if not exists public.event_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tribe text not null references public.event_tribes(key),
  source text not null default 'draw' check (source in ('draw', 'late', 'admin')),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id) on delete set null
);
create index if not exists event_members_tribe_idx on public.event_members (tribe);

create table if not exists public.event_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 400),
  points int not null check (points between 1 and 1000),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_points (
  id uuid primary key default gen_random_uuid(),
  tribe text not null references public.event_tribes(key),
  points int not null check (points between -1000 and 1000 and points <> 0),
  reason text not null check (char_length(reason) between 1 and 160),
  mission_id uuid references public.event_missions(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists event_points_tribe_idx on public.event_points (tribe, created_at desc);

-- Quem enxerga o evento: admin e contas de teste sempre; os demais só com o evento ligado, depois de `reveal_at` e antes de `ends_at`.
create or replace function public.event_visible() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or coalesce((select p.is_test_account from public.profiles p where p.id = auth.uid()), false)
      or exists (select 1 from public.event_settings s where s.active and now() >= s.reveal_at and now() < s.ends_at);
$$;
revoke execute on function public.event_visible() from public, anon;
grant execute on function public.event_visible() to authenticated;

alter table public.event_settings enable row level security;
alter table public.event_tribes enable row level security;
alter table public.event_members enable row level security;
alter table public.event_missions enable row level security;
alter table public.event_points enable row level security;

drop policy if exists event_settings_read on public.event_settings;
create policy event_settings_read on public.event_settings for select to authenticated using (public.is_admin());
drop policy if exists event_settings_admin on public.event_settings;
create policy event_settings_admin on public.event_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists event_tribes_read on public.event_tribes;
create policy event_tribes_read on public.event_tribes for select to authenticated using (true);

drop policy if exists event_members_read on public.event_members;
create policy event_members_read on public.event_members for select to authenticated using (public.event_visible());
drop policy if exists event_members_admin on public.event_members;
create policy event_members_admin on public.event_members for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists event_missions_read on public.event_missions;
create policy event_missions_read on public.event_missions for select to authenticated using (public.event_visible());
drop policy if exists event_missions_admin on public.event_missions;
create policy event_missions_admin on public.event_missions for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists event_points_read on public.event_points;
create policy event_points_read on public.event_points for select to authenticated using (public.event_visible());
drop policy if exists event_points_admin on public.event_points;
create policy event_points_admin on public.event_points for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Estado do evento para a tela: placar das tribos, a tribo de quem pergunta e quantos dias faltam.
create or replace function public.event_state() returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare s public.event_settings; v_me text; v_tribes jsonb;
begin
  select * into s from public.event_settings limit 1;
  if s is null or not public.event_visible() then return jsonb_build_object('visible', false); end if;
  select tribe into v_me from public.event_members where user_id = auth.uid();
  select coalesce(jsonb_agg(jsonb_build_object('key', x.key, 'name', x.name, 'animal', x.animal, 'color', x.color, 'points', x.pts, 'members', x.mem, 'rank', x.rk) order by x.sort), '[]'::jsonb) into v_tribes
  from (select t.key, t.name, t.animal, t.color, t.sort,
               coalesce((select sum(p.points) from public.event_points p where p.tribe = t.key), 0)::int as pts,
               (select count(*) from public.event_members m where m.tribe = t.key)::int as mem,
               dense_rank() over (order by coalesce((select sum(p.points) from public.event_points p where p.tribe = t.key), 0) desc)::int as rk
          from public.event_tribes t) x;
  return jsonb_build_object(
    'visible', true, 'name', s.name, 'event_date', s.event_date, 'ends_at', s.ends_at, 'active', s.active, 'me', v_me, 'tribes', v_tribes,
    'days_left', greatest(0, s.event_date - (now() at time zone 'America/Sao_Paulo')::date));
end $fn$;
revoke execute on function public.event_state() from public, anon;
grant execute on function public.event_state() to authenticated;

-- Quem entra depois do sorteio (conta nova ou líder aprovado) vai para a tribo com menos gente do próprio Elo e, no empate, menos gente no total.
create or replace function public.event_assign_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $fn$
declare p record; v_tribe text;
begin
  select id, role, approved, elo_id, coalesce(is_test_account, false) as test into p from public.profiles where id = p_user;
  if not found or p.test or p.role not in ('cria', 'leader') then return; end if;
  if p.role = 'leader' and not p.approved then return; end if;
  if exists (select 1 from public.event_members where user_id = p_user) then return; end if;
  if not exists (select 1 from public.event_settings where drawn_at is not null) then return; end if;
  select t.key into v_tribe
    from public.event_tribes t
    left join (select m.tribe, count(*) c from public.event_members m join public.profiles q on q.id = m.user_id where q.elo_id is not distinct from p.elo_id group by m.tribe) e on e.tribe = t.key
    left join (select tribe, count(*) c from public.event_members group by tribe) g on g.tribe = t.key
   order by coalesce(e.c, 0), coalesce(g.c, 0), random() limit 1;
  insert into public.event_members (user_id, tribe, source) values (p_user, v_tribe, 'late') on conflict do nothing;
end $fn$;
revoke execute on function public.event_assign_user(uuid) from public, anon, authenticated;

create or replace function public.event_assign_trg() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  perform public.event_assign_user(new.id);
  return new;
end $fn$;
revoke execute on function public.event_assign_trg() from public, anon, authenticated;
drop trigger if exists event_assign on public.profiles;
create trigger event_assign after insert or update of role, approved, elo_id on public.profiles for each row execute function public.event_assign_trg();
