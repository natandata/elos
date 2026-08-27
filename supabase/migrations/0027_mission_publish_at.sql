-- ELOS — missão agendada: admin/líder criam a missão já, mas ela só fica
-- visível pros crias a partir de publish_at. Antes disso, só quem criou,
-- outros líderes/admin do Elo enxergam (pra poder gerenciar antes de "sair
-- do forno").

alter table public.missions
  add column if not exists publish_at timestamptz;

drop policy if exists missions_read on public.missions;
create policy missions_read on public.missions for select to authenticated using (
  public.is_admin()
  or created_by = auth.uid()
  or (
    elo_id is not null and elo_id = public.my_elo()
    and (public.my_role() <> 'cria' or publish_at is null or publish_at <= now())
  )
  or (public.has_assignment(id) and (publish_at is null or publish_at <= now()))
);

-- sem isso, o cria enxergaria a atribuição (mission_assignments) mesmo sem
-- poder ler a missão em si — um card vazio/quebrado em vez de ficar oculto
drop policy if exists assignments_read on public.mission_assignments;
create policy assignments_read on public.mission_assignments for select to authenticated using (
  (
    cria_id = auth.uid()
    and exists (
      select 1 from public.missions m
       where m.id = mission_assignments.mission_id
         and (m.publish_at is null or m.publish_at <= now())
    )
  )
  or public.is_admin()
  or public.is_leader_of(cria_id)
  or public.is_mission_creator(mission_id)
);
