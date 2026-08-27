-- ELOS — "Missão Geral": admin cria uma missão pra absolutamente todo mundo
-- (todos os líderes aprovados + todos os crias da plataforma, tirando ele
-- mesmo). Reaproveita a mesma coluna audience já usada pra "Missão da
-- Liderança" (0034), só adicionando o valor 'general'.
alter table public.missions drop constraint if exists missions_audience_check;
alter table public.missions add constraint missions_audience_check check (audience in ('crias', 'leaders', 'general'));
