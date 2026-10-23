-- ELOS — o tempo de leitura da Bíblia segue contando depois dos 5 min do dia (antes parava ao liberar).
-- Assim o destaque "mais minutos lendo a Bíblia" soma toda a leitura desde o lançamento. XP e liberação continuam uma vez por dia.

drop function if exists public.record_bible_reading(boolean);

create or replace function public.record_bible_reading(p_resume boolean default false, p_ref text default null)
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
  v_ref text := nullif(left(regexp_replace(coalesce(p_ref, ''), '[^[:alnum:] .]', '', 'g'), 40), '');
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('cria', 'leader') then
    return jsonb_build_object('seconds', v_need, 'required', v_need, 'unlocked', true, 'xp', 0);
  end if;

  insert into public.bible_reading_daily (user_id, day) values (auth.uid(), v_day) on conflict do nothing;
  select * into v_row from public.bible_reading_daily where user_id = auth.uid() and day = v_day for update;

  if not coalesce(p_resume, false) and v_row.last_ping is not null then
    v_gap := extract(epoch from (now() - v_row.last_ping));
    if v_gap >= 1 and v_gap <= 40 then v_add := round(least(v_gap, 20))::int; end if;
  end if;
  v_total := v_row.seconds + v_add;

  update public.bible_reading_daily
     set seconds = v_total,
         last_ping = now(),
         last_ref = coalesce(v_ref, last_ref),
         unlocked_at = case when v_total >= v_need then coalesce(unlocked_at, now()) else null end
   where user_id = auth.uid() and day = v_day;

  if v_total >= v_need and v_row.unlocked_at is null then
    perform public.game_grant_xp(auth.uid(), 1, 'bible_reading');
    v_xp := 1;
  end if;

  return jsonb_build_object('seconds', v_total, 'required', v_need, 'unlocked', v_total >= v_need, 'xp', v_xp);
end $fn$;
revoke execute on function public.record_bible_reading(boolean, text) from anon, public;
grant execute on function public.record_bible_reading(boolean, text) to authenticated;
