-- ELOS — Babel: ligas semanais (10 divisões, grupos de 30; sobe o top 10, desce o fim da tabela).
-- O XP da semana vem de babel_daily. O fechamento da semana é feito sob demanda (quando a pessoa abre a liga) pelo servidor,
-- que calcula a posição (incluindo os "adversários de reserva" que completam o grupo) e chama babel_league_settle.

create table if not exists public.babel_league_groups (
  id uuid primary key default gen_random_uuid(),
  week date not null,
  tier int not null check (tier between 1 and 10),
  created_at timestamptz not null default now()
);
create index if not exists babel_league_groups_idx on public.babel_league_groups (week, tier);

create table if not exists public.babel_league_members (
  group_id uuid not null references public.babel_league_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  week date not null,
  tier int not null,
  rank int,
  result text,
  settled boolean not null default false,
  primary key (user_id, week)
);
create index if not exists babel_league_members_group_idx on public.babel_league_members (group_id);

alter table public.babel_league_groups enable row level security;
alter table public.babel_league_members enable row level security;
drop policy if exists babel_league_members_select on public.babel_league_members;
create policy babel_league_members_select on public.babel_league_members for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists babel_league_groups_select on public.babel_league_groups;
create policy babel_league_groups_select on public.babel_league_groups for select to authenticated using (public.is_admin());

-- Coloca a pessoa num grupo da semana/divisão (até 15 pessoas de verdade por grupo; o resto é completado pelo servidor).
create or replace function public.babel_league_join(p_user uuid, p_week date, p_tier int) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_group uuid;
begin
  select group_id into v_group from public.babel_league_members where user_id = p_user and week = p_week;
  if v_group is not null then return v_group; end if;
  select g.id into v_group
    from public.babel_league_groups g
    left join public.babel_league_members m on m.group_id = g.id
   where g.week = p_week and g.tier = p_tier
   group by g.id
  having count(m.user_id) < 15
   order by count(m.user_id) desc
   limit 1;
  if v_group is null then
    insert into public.babel_league_groups (week, tier) values (p_week, p_tier) returning id into v_group;
  end if;
  insert into public.babel_league_members (group_id, user_id, week, tier) values (v_group, p_user, p_week, p_tier) on conflict do nothing;
  perform public.babel_ensure(p_user);
  update public.babel_profile set league = p_tier where user_id = p_user;
  return v_group;
end $fn$;

-- Fecha a semana de uma pessoa: guarda posição/resultado, ajusta a divisão e paga as gemas.
create or replace function public.babel_league_settle(p_user uuid, p_week date, p_rank int, p_new_tier int, p_result text, p_gems int) returns void language plpgsql security definer set search_path = public as $fn$
declare v_done boolean;
begin
  select settled into v_done from public.babel_league_members where user_id = p_user and week = p_week for update;
  if v_done is null or v_done then return; end if;
  update public.babel_league_members set settled = true, rank = p_rank, result = p_result where user_id = p_user and week = p_week;
  perform public.babel_ensure(p_user);
  update public.babel_profile set league = greatest(1, least(10, p_new_tier)), gems = gems + greatest(0, least(p_gems, 200)), updated_at = now() where user_id = p_user;
end $fn$;

revoke execute on function public.babel_league_join(uuid, date, int), public.babel_league_settle(uuid, date, int, int, text, int) from public, anon, authenticated;
grant execute on function public.babel_league_join(uuid, date, int), public.babel_league_settle(uuid, date, int, int, text, int) to service_role;
