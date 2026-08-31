-- Registro de lembretes de agenda já enviados (3 dias e 1 dia antes), pra
-- não duplicar o envio se o cron rodar mais de uma vez no mesmo dia.
create table if not exists public.event_reminder_log (
  event_id uuid not null references public.events(id) on delete cascade,
  days_before int not null check (days_before in (1, 3)),
  sent_at timestamptz not null default now(),
  primary key (event_id, days_before)
);
alter table public.event_reminder_log enable row level security;
-- só a rotina automática (chave de serviço, bypassa RLS) mexe aqui — sem
-- policy nenhuma, ninguém autenticado via app consegue ler/escrever.
