-- Quem faz 18 anos vira "Alternativa": no dia seguinte ao aniversario a tela de inicio mostra so o aviso, e a conta e excluida 30 dias depois do aviso (a rotina liga o aviso em aniversario + 1 dia).
-- (aplicado no banco como alternativa_18_anos + audit_log_actor_set_null; ver funcao public.alternativa_sync(), cron elos-alternativa-sync 03:20 UTC)
alter table public.profiles add column if not exists alt_notice_on date, add column if not exists alt_delete_on date, add column if not exists alt_exempt boolean not null default false;
alter table public.audit_log drop constraint if exists audit_log_actor_id_fkey;
alter table public.audit_log add constraint audit_log_actor_id_fkey foreign key (actor_id) references public.profiles(id) on delete set null;
