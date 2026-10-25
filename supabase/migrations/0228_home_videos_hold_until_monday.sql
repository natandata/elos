-- ELOS — card de vídeos: troca já (sábado 24/10/2026) e segura o mesmo trio até a meia-noite de segunda (26/10); depois volta a trocar todo dia.

create or replace function public.home_daily_videos()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_date date := (now() at time zone 'America/Sao_Paulo')::date;
  v_day int := case when v_date between date '2026-10-24' and date '2026-10-25' then 297 else (v_date - date '2026-01-01') end;
  v_src text[] := array['subira', case when v_day % 2 = 0 then 'jesuscopy' else 'luca' end, 'roberta'];
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
     offset (case when s in ('subira', 'roberta') then v_day else v_day / 2 end) % v_n limit 1;
    v_out := v_out || jsonb_build_object('source', s, 'video_id', v_pick.video_id, 'title', v_pick.title);
  end loop;
  return v_out;
end $fn$;
