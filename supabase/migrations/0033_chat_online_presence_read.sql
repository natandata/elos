-- ELOS — pra mostrar quem do Elo está online no Chat, membros do mesmo Elo
-- precisam poder ler a presença uns dos outros (antes só o próprio usuário
-- e o admin liam user_presence). Continua sem vazar presença entre ELOS
-- diferentes.
drop policy if exists user_presence_read on public.user_presence;
create policy user_presence_read on public.user_presence for select to authenticated using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.profiles p
     where p.id = user_presence.user_id
       and p.elo_id is not null
       and p.elo_id = public.my_elo()
  )
);
