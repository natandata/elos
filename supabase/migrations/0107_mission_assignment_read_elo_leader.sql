-- ELOS — review_assignment() já deixa qualquer líder do MESMO Elo do cria
-- aprovar/recusar uma missão (não só quem tem vínculo direto via
-- leader_crias, nem só quem criou a missão — ver a cláusula "líder do
-- mesmo Elo" dentro da própria função). Mas a policy de LEITURA de
-- mission_assignments não cobria esse mesmo caso.
--
-- Resultado prático: a aprovação em si funcionava (a RPC é security
-- definer e faz sua própria checagem, mais ampla), mas a Server Action que
-- chama a RPC primeiro faz um SELECT pra saber o cria_id/título da missão
-- — esse SELECT voltava vazio (RLS barrando, sem erro nenhum) pra um líder
-- nessa situação específica, e o bloco que credita conquista e manda o
-- push "Fulano aprovou sua missão!" ficava pulado silenciosamente, mesmo
-- com a missão corretamente aprovada e o XP corretamente creditado.
drop policy if exists assignments_read on public.mission_assignments;
create policy assignments_read on public.mission_assignments for select to authenticated using (
  (
    cria_id = auth.uid()
    and (
      mission_id is null
      or exists (
        select 1 from public.missions m
         where m.id = mission_assignments.mission_id
           and (m.publish_at is null or m.publish_at <= now())
      )
    )
  )
  or public.is_admin()
  or public.is_leader_of(cria_id)
  or public.is_mission_creator(mission_id)
  or exists (
    select 1
      from public.profiles lp
      join public.profiles cp on cp.id = mission_assignments.cria_id
     where lp.id = auth.uid()
       and lp.role = 'leader'
       and lp.elo_id is not null
       and lp.elo_id = cp.elo_id
  )
);
