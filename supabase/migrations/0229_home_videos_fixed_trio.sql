-- ELOS — card de vídeos do Início: trio fixo todos os dias (Israel Subira, Luca Martini, Roberta Vicente); o vídeo de cada um troca à meia-noite de Brasília.
-- Substitui a regra de alternar Cortes Jesuscopy / Luca e a pausa até segunda (0228).

create or replace function public.home_daily_videos()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_day int := ((now() at time zone 'America/Sao_Paulo')::date - date '2026-01-01');
  v_out jsonb := '[]'::jsonb;
  v_n int; v_pick record; s text;
begin
  if auth.uid() is null then return null; end if;
  foreach s in array array['subira', 'luca', 'roberta'] loop
    select count(*) into v_n from public.home_video_picks where source = s and active;
    if v_n = 0 then continue; end if;
    select * into v_pick from public.home_video_picks
     where source = s and active
     order by sort, video_id
     offset v_day % v_n limit 1;
    v_out := v_out || jsonb_build_object('source', s, 'video_id', v_pick.video_id, 'title', v_pick.title);
  end loop;
  return v_out;
end $fn$;
