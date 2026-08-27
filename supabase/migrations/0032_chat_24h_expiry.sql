-- ELOS — mensagens do chat "expiram" em 24h: depois disso, ninguém mais
-- enxerga (nem admin monitorando) e a linha é apagada de verdade.
--
-- Dois mecanismos, de propósito redundantes:
--  1) RLS: filtra created_at > now() - 24h na leitura — garante o "reset"
--     instantâneo, exatamente na hora, sem depender do cron já ter rodado.
--  2) pg_cron: apaga de fato as linhas expiradas a cada 15 minutos — evita
--     acumular histórico morto que ninguém pode mais ler mesmo.

create extension if not exists pg_cron;

drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages for select to authenticated using (
  created_at > now() - interval '24 hours'
  and (
    public.is_admin()
    or (elo_id is not null and elo_id = public.my_elo())
  )
);

-- idempotente: reagendar não deve duplicar o job numa reaplicação da migration
do $$
begin
  perform cron.unschedule('elos-chat-24h-purge');
exception when others then null;
end $$;

select cron.schedule(
  'elos-chat-24h-purge',
  '*/15 * * * *',
  $$delete from public.chat_messages where created_at < now() - interval '24 hours';$$
);
