-- Marca quais eventos pertencem à mesma série recorrente (semanal/quinzenal/
-- mensal) — cada ocorrência continua sendo uma linha própria em `events`
-- (editável/excluível individualmente), só ganham um id em comum pra saber
-- que vieram do mesmo "criar evento".
alter table public.events add column if not exists recurrence_group_id uuid;
alter table public.events add column if not exists recurrence_rule text
  check (recurrence_rule in ('weekly', 'biweekly', 'monthly'));
create index if not exists events_recurrence_group_idx on public.events(recurrence_group_id) where recurrence_group_id is not null;
