-- ELOS — líderes enxergam as missões em curso de outros líderes, com opção de
-- desligar essa visão. A preferência fica no próprio perfil, por líder.

alter table public.profiles
  add column if not exists show_other_leader_missions boolean not null default true;

-- ---------------------------------------------------------------- RLS
-- Antes, um líder só via missões próprias, do seu Elo, ou em que tinha um cria
-- atribuído. Agora qualquer líder aprovado enxerga todas as missões (leitura),
-- para ter visão de conjunto — a preferência acima só controla o que a
-- interface exibe, a leitura no banco continua liberada para todos os líderes.
drop policy if exists missions_read on public.missions;
create policy missions_read on public.missions for select to authenticated using (
  public.is_admin()
  or created_by = auth.uid()
  or (elo_id is not null and elo_id = public.my_elo())
  or public.has_assignment(id)
  or (public.my_role() = 'leader' and public.is_approved())
);
