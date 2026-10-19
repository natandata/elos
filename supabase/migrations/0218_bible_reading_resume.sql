-- ELOS — o timer da Bíblia pausa quando a pessoa sai da tela e retoma de onde parou.
-- p_resume = true: "voltei agora" (entrou na Bíblia ou a aba voltou a ficar visível). Só marca o instante, sem creditar
-- nada pelo tempo em que esteve fora (antes, uma saída e volta em menos de 40 s ainda rendia até 20 s).
-- O último aviso antes de sair (p_resume = false) credita os segundos finais de leitura.

drop function if exists public.record_bible_reading();

create or replace function public.record_bible_reading(p_resume boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_need constant int := 300;
  v_role text;
  v_row public.bible_reading_daily;
  v_gap numeric;
  v_add int := 0;
  v_total int;
  v_xp int := 0;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('cria', 'leader') then
    return jsonb_build_object('seconds', v_need, 'required', v_need, 'unlocked', true, 'xp', 0);
  end if;

  insert into public.bible_reading_daily (user_id, day) values (auth.uid(), v_day) on conflict do nothing;
  select * into v_row from public.bible_reading_daily where user_id = auth.uid() and day = v_day for update;

  if v_row.unlocked_at is not null then
    return jsonb_build_object('seconds', v_row.seconds, 'required', v_need, 'unlocked', true, 'xp', 0);
  end if;

  if not coalesce(p_resume, false) and v_row.last_ping is not null then
    v_gap := extract(epoch from (now() - v_row.last_ping));
    if v_gap >= 1 and v_gap <= 40 then v_add := round(least(v_gap, 20))::int; end if;
  end if;
  v_total := v_row.seconds + v_add;

  update public.bible_reading_daily
     set seconds = v_total,
         last_ping = now(),
         unlocked_at = case when v_total >= v_need then now() else null end
   where user_id = auth.uid() and day = v_day;

  if v_total >= v_need then
    perform public.game_grant_xp(auth.uid(), 1, 'bible_reading');
    v_xp := 1;
  end if;

  return jsonb_build_object('seconds', v_total, 'required', v_need, 'unlocked', v_total >= v_need, 'xp', v_xp);
end $fn$;
revoke execute on function public.record_bible_reading(boolean) from anon, public;
grant execute on function public.record_bible_reading(boolean) to authenticated;
