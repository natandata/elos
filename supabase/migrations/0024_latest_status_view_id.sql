-- ELOS — v_latest_status passa a expor o id da resposta, necessário para
-- ligar o alerta de "Mal" ao registro de resolução (status_follow_ups).
drop view if exists public.v_latest_status;
create view public.v_latest_status
with (security_invoker = on) as
  select distinct on (user_id)
         id, user_id, emotional_status, spiritual_status, created_at
    from public.status_responses
   order by user_id, created_at desc;
