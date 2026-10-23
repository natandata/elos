-- ELOS — card de vídeos do Início: a 3ª posição é sempre o Dunamis Hangout (antes alternava com o HUB).
-- 1ª: Israel Subira (muda todo dia). 2ª: alterna Cortes Jesuscopy / Luca Martini. 3ª: Dunamis Hangout (muda todo dia).

create or replace function public.home_daily_videos()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_day int := ((now() at time zone 'America/Sao_Paulo')::date - date '2026-01-01');
  v_src text[] := array['subira', case when v_day % 2 = 0 then 'jesuscopy' else 'luca' end, 'dunamis'];
  v_out jsonb := '[]'::jsonb;
  v_n int; v_pick record; s text;
begin
  if auth.uid() is null then return null; end if;
  foreach s in array v_src loop
    select count(*) into v_n from public.home_video_picks where source = s and active;
    if v_n = 0 then continue; end if;
    select * into v_pick from public.home_video_picks
     where source = s and active
     order by sort, video_id
     offset (case when s in ('subira', 'dunamis') then v_day else v_day / 2 end) % v_n limit 1;
    v_out := v_out || jsonb_build_object('source', s, 'video_id', v_pick.video_id, 'title', v_pick.title);
  end loop;
  return v_out;
end $fn$;
