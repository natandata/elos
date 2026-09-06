-- Deixa a Liturgia mais estruturada: cada item ganha um tipo (com ícone
-- próprio na UI) e uma duração opcional, pra mostrar a duração total
-- estimada do culto — antes era só um campo de título livre.
alter table public.planned_event_liturgy_items
  add column if not exists item_type text not null default 'outro'
    check (item_type in ('abertura','louvor','oracao','oferta','palavra','ceia','testemunho','encerramento','outro')),
  add column if not exists duration_minutes int check (duration_minutes is null or duration_minutes > 0);
