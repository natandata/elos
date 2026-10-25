-- ELOS — card de vídeos do Início: a 3ª posição agora é sempre a Roberta Vicente (vídeos bons para adolescentes).
-- Dunamis Hangout sai da rotação (os vídeos continuam na tabela, sem uso). 1ª: Israel Subira. 2ª: alterna Cortes Jesuscopy / Luca Martini.

alter table public.home_video_picks drop constraint if exists home_video_picks_source_check;
alter table public.home_video_picks add constraint home_video_picks_source_check check (source in ('subira', 'jesuscopy', 'luca', 'hub', 'dunamis', 'roberta'));

insert into public.home_video_picks (source, video_id, title, sort) values
  ('roberta', 'cJCrbDMbd4Q', 'O que eu faço quando meu coração tá uma bagunça', 100),
  ('roberta', 'KJLA0infWQU', 'Por que você ainda se sente indigna do amor de Deus', 101),
  ('roberta', '0QQ3JEa7c4M', 'Jesus não tratou as pessoas como elas mereciam', 102),
  ('roberta', 'sC9W45Dtiqs', 'Para todos aqueles que pararam de escutar a Deus', 103),
  ('roberta', '0SoL3Z7kfFA', 'É por isso que você precisa sair do seu casulo', 104),
  ('roberta', 'oxfkunAuAdM', 'Como eu parei de perder os meus dias nas redes sociais', 105),
  ('roberta', '-01rw4Ubf_I', 'Tudo o que eu penso sobre música secular', 106),
  ('roberta', 'Rp2ScGTIzIc', 'Se ninguém te corrige, não é comunhão', 107),
  ('roberta', 'hiF9ZHv5U0k', 'Difícil não significa ruim', 108),
  ('roberta', 'jZyHzGAeuFM', 'Além dos rótulos: por que Cristo importa mais do que o seu temperamento e sua linguagem do amor', 109),
  ('roberta', '3lTzlPn-r0c', 'Cansada de ser uma grande frustração (como o TDAH afeta minha fé)', 110),
  ('roberta', 'JCv8RSkg5Tc', 'É TDAH ou você tá usando demais o seu celular?', 111)
on conflict (video_id) do update set title = excluded.title, source = excluded.source, sort = excluded.sort;

create or replace function public.home_daily_videos()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_day int := ((now() at time zone 'America/Sao_Paulo')::date - date '2026-01-01');
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
