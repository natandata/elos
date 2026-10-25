-- ELOS — card de vídeos do Início sem repetição: cada canal mostra, a cada dia, o vídeo ainda não exibido (ou o exibido há mais tempo).
-- Assim, quando entram vídeos novos na lista (cron /api/cron/refresh-video-picks), eles aparecem logo na vez seguinte, sem bagunçar a ordem.
-- Trio fixo: Israel Subira, Luca Martini, Roberta Vicente. O dia vira à meia-noite de Brasília.

alter table public.home_video_picks add column if not exists last_shown date;
alter table public.home_video_picks add column if not exists auto_added boolean not null default false;

-- vídeos que estão no ar hoje continuam no ar
update public.home_video_picks set last_shown = (now() at time zone 'America/Sao_Paulo')::date
 where video_id in ('LBe8OzRRZog', 'L_F-4N3GKuU', 'jZyHzGAeuFM');

create or replace function public.home_daily_videos()
returns jsonb language plpgsql volatile security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_out jsonb := '[]'::jsonb;
  v_pick record; s text;
begin
  if auth.uid() is null then return null; end if;
  perform pg_advisory_xact_lock(hashtext('home_daily_videos'));
  foreach s in array array['subira', 'luca', 'roberta'] loop
    select * into v_pick from public.home_video_picks where source = s and active and last_shown = v_today limit 1;
    if not found then
      select * into v_pick from public.home_video_picks
       where source = s and active
       order by last_shown asc nulls first, sort, video_id
       limit 1;
      if not found then continue; end if;
      update public.home_video_picks set last_shown = v_today where video_id = v_pick.video_id;
    end if;
    v_out := v_out || jsonb_build_object('source', s, 'video_id', v_pick.video_id, 'title', v_pick.title);
  end loop;
  return v_out;
end $fn$;
revoke execute on function public.home_daily_videos() from public, anon;
grant execute on function public.home_daily_videos() to authenticated;
