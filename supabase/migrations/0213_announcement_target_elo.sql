-- ELOS — aviso em card que mira num Elo só (null = todo mundo, como sempre foi).
alter table public.announcements add column if not exists elo_id uuid references public.elos(id) on delete cascade;

-- Aviso da penalidade de XP do Elo Masculino 16–17 (aparece no próximo acesso de cada integrante, 1 vez).
insert into public.announcements (title, body, active, elo_id)
select '⚠️ O seu Elo perdeu XP',
       'O ' || e.name || ' perdeu 265 XP no total porque um integrante ganhou o XP do Tema do dia mais de uma vez no mesmo dia.' || E'\n\n' ||
       'Todos os integrantes tiveram uma parte do XP descontada (15%), e quem fez isso perdeu 35%. O valor que saiu de você está na sua notificação (o sininho).' || E'\n\n' ||
       'Daqui pra frente o XP do Tema do dia vale 1 vez por dia: é 1 XP por pessoa a cada dia. Vamos juntos recuperar esse XP! 💪',
       true, e.id
  from public.elos e
 where e.id = (select elo_id from public.profiles where full_name = 'Miguel Tripoli' limit 1);
