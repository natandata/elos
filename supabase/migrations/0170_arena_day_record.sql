-- Placar do dia da Arena dos Heróis (vitórias, empates e derrotas de hoje, em todos os modos), no horário de Brasília.
create or replace function public.arena_day_record(p_date date default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  d date := coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date);
  w int := 0; l int := 0; e int := 0;
begin
  if uid is null then return jsonb_build_object('w', 0, 'l', 0, 'd', 0); end if;
  select count(*) filter (where r = 'win'), count(*) filter (where r = 'loss'), count(*) filter (where r = 'draw')
    into w, l, e
  from (
    select m.result as r from public.arena_matches m
     where m.user_id = uid and m.status = 'finished' and m.result is not null and m.play_date = d
    union all
    select c.result from public.arena_campaign_matches c
     where c.user_id = uid and c.status = 'finished' and c.result is not null and (c.finished_at at time zone 'America/Sao_Paulo')::date = d
    union all
    select case when v.result = 'draw' then 'draw'
                when v.result = (case when v.challenger_id = uid then 'challenger' else 'opponent' end) then 'win' else 'loss' end
      from public.arena_pvp v
     where v.status = 'finished' and uid in (v.challenger_id, v.opponent_id) and (v.finished_at at time zone 'America/Sao_Paulo')::date = d
    union all
    select o.outcome -> uid::text ->> 'res'
      from public.arena_duo o
     where o.status = 'finished' and uid = any(o.players) and (o.finished_at at time zone 'America/Sao_Paulo')::date = d
  ) t;
  return jsonb_build_object('w', w, 'l', l, 'd', e);
end;
$fn$;
grant execute on function public.arena_day_record(date) to authenticated;
