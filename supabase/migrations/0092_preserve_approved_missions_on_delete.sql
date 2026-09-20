-- ELOS — excluir uma missão não pode tirar de ninguém o que já foi aprovado.
-- Hoje mission_assignments.mission_id é "on delete cascade": apagar a missão
-- apagava TODAS as atribuições, inclusive as aprovadas — o XP em
-- profiles.xp/xp_transactions continuava intacto (nunca foi revertido em
-- lugar nenhum), mas o próprio registro de "eu fiz essa missão e foi
-- aprovada" sumia da conta do cria/líder sem deixar rastro.
--
-- Agora: mission_id vira nullable com "on delete set null", e a ação de
-- excluir (src/lib/actions/missions.ts) apaga só as atribuições SEM XP
-- ganho (pendente/aguardando/recusada) antes de apagar a missão — as
-- aprovadas sobrevivem com mission_id = null, preservando o histórico.

alter table public.mission_assignments alter column mission_id drop not null;

alter table public.mission_assignments
  drop constraint mission_assignments_mission_id_fkey,
  add constraint mission_assignments_mission_id_fkey
    foreign key (mission_id) references public.missions(id) on delete set null;

-- Sem isso, o próprio cria perderia a leitura do seu registro aprovado assim
-- que mission_id virasse null (a cláusula antiga exigia achar a missão viva
-- pra liberar o select) — um registro preservado é sempre legível por quem é
-- dono dele.
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
);
