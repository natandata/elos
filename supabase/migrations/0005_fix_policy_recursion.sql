-- ELOS — corrige a recursão infinita entre missions e mission_assignments.
--
-- A policy de missions consultava mission_assignments e a de mission_assignments
-- consultava missions, e cada consulta reavaliava a policy da outra tabela.
-- As duas checagens passam agora por funções SECURITY DEFINER, que não disparam
-- RLS — sem afetar a regra: cada uma continua olhando só o auth.uid() atual.

create or replace function public.is_mission_creator(p_mission uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.missions m
     where m.id = p_mission and m.created_by = auth.uid()
  )
$fn$;

create or replace function public.has_assignment(p_mission uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.mission_assignments ma
     where ma.mission_id = p_mission and ma.cria_id = auth.uid()
  )
$fn$;

revoke execute on function public.is_mission_creator(uuid) from anon, public;
revoke execute on function public.has_assignment(uuid)     from anon, public;
grant  execute on function public.is_mission_creator(uuid) to authenticated;
grant  execute on function public.has_assignment(uuid)     to authenticated;

drop policy if exists missions_read on public.missions;
create policy missions_read on public.missions for select to authenticated using (
  public.is_admin()
  or created_by = auth.uid()
  or (elo_id is not null and elo_id = public.my_elo())
  or public.has_assignment(id)
);

drop policy if exists assignments_read on public.mission_assignments;
create policy assignments_read on public.mission_assignments for select to authenticated using (
  cria_id = auth.uid()
  or public.is_admin()
  or public.is_leader_of(cria_id)
  or public.is_mission_creator(mission_id)
);

drop policy if exists assignments_insert on public.mission_assignments;
create policy assignments_insert on public.mission_assignments for insert to authenticated
  with check (public.is_admin() or public.is_mission_creator(mission_id));

drop policy if exists assignments_delete on public.mission_assignments;
create policy assignments_delete on public.mission_assignments for delete to authenticated
  using (public.is_admin() or public.is_mission_creator(mission_id));
