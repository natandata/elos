-- ELOS — card "Conteúdo relevante para a sua vida" no Início: 3 vídeos do YouTube por dia (vira à 00h de Brasília).
-- Lista curada à mão para a faixa etária do ELOS (juventude cristã). O admin pode desativar um vídeo (active = false).
-- Posição 1: sempre Israel Subira. Posição 2: alterna Cortes Jesuscopy / Luca Martini. Posição 3: alterna Cortes do HUB / Dunamis Hangout.

create table if not exists public.home_video_picks (
  video_id text primary key,
  source text not null check (source in ('subira', 'jesuscopy', 'luca', 'hub', 'dunamis')),
  title text not null,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.home_video_picks enable row level security;
drop policy if exists home_video_picks_read on public.home_video_picks;
create policy home_video_picks_read on public.home_video_picks for select to authenticated using (true);
drop policy if exists home_video_picks_admin on public.home_video_picks;
create policy home_video_picks_admin on public.home_video_picks for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.home_video_picks (source, video_id, title, sort) values
  ('subira', 'ekDzZSQ4Hsg', 'A humildade do jovem', 0),
  ('subira', '9_WEKarumi4', 'Chamado ao crescimento espiritual', 1),
  ('subira', 'yc9moz7aNOY', 'O sofrimento do cristão', 2),
  ('subira', '_4PfivwWT08', 'Mansidão, temor e esperança', 3),
  ('subira', '6eU1xYP3OIk', 'O exílio espiritual', 4),
  ('subira', 'K4PO_Ye8bWI', 'A ilusão das riquezas', 5),
  ('subira', 'gcnxD9iw8FY', 'A torre torta de hipocrisia', 6),
  ('subira', 'xcwgKHXIVJc', 'Tudo posso???', 7),
  ('subira', 'C3bt9w6LjAI', 'Performance ou relacionamento?', 8),
  ('subira', 'LBe8OzRRZog', 'O sentimento de Cristo', 9),
  ('subira', 'G_Uz78EdXvs', 'Evangelho que vale a pena viver', 10),
  ('subira', 'IhZ0LJsHo4E', 'Lança na minha conta', 11),
  ('subira', 'AgdK4fb7V8c', 'Sabedoria com os de fora', 12),
  ('subira', 'qGH65XUZuIU', 'As coisas do alto', 13),
  ('subira', 'XHOgoIJ3oLk', 'A vida real e a batalha espiritual', 14),
  ('subira', 'vUs1bY2FAhQ', 'A vida cristã exemplar', 15),
  ('subira', 'koAqa1izSSo', 'Colocando a casa em ordem', 16),
  ('subira', '6o4BHva-UDE', 'Enfrentando a zombaria dos últimos dias', 17),
  ('jesuscopy', 'r2lwGntO1cs', 'A batalha espiritual acontece na sua mente - Ana Paula Valadão', 18),
  ('jesuscopy', 'nGG_csBhbN0', 'Você está sendo formado pelo o que faz todos os dias - Alessandro Vilas Boas', 19),
  ('jesuscopy', 'O1IP3qKURy4', 'Seja mais sincero com Deus nas orações - Alessandro Vilas Boas', 20),
  ('jesuscopy', 'YXZ3uWUq7pg', 'O pecado que muita gente cai dentro e fora da igreja - Alessandro Vilas Boas', 21),
  ('jesuscopy', 'spiCyz_IaQE', 'Estamos vivendo um novo evangelho da prosperidade - Alessandro Vilas Boas', 22),
  ('jesuscopy', 'f6PC5C_iV40', 'Como se relacionar com Deus na rotina do dia a dia - Alessandro Vilas Boas', 23),
  ('jesuscopy', 'TnrFe6EynrY', 'Deus não te chamou para uma vida de conforto - Douglas Gonçalves', 24),
  ('jesuscopy', 'G-4LtNsJv2Q', 'Mentiras que te contam sobre identidade - Dani Cadore', 25),
  ('jesuscopy', '_iGftFH4CK4', 'Domine sua língua: o poder espiritual da língua - Dani Cadore', 26),
  ('jesuscopy', 'j7ONlO6FKDg', 'Como interpretar provérbios da maneira correta - Dani Cadore', 27),
  ('jesuscopy', 'q2Rq1PeMUyg', 'Testemunho de conversão - Dani Cadore', 28),
  ('jesuscopy', 'b5pNB17LGR8', 'Conversão de João Basques', 29),
  ('jesuscopy', 'LwjcvkkaR4Y', 'A grande comissão precisa voltar pra igreja local - Alessandro Vilas Boas', 30),
  ('jesuscopy', 'e4SV-pWtT74', 'Como o TDAH afetou meu cérebro na vida adulta - Julio Gioni', 31),
  ('jesuscopy', 'WUmS8R44OOU', 'Oração de arrependimento da igreja brasileira - Thamires Garcia', 32),
  ('jesuscopy', '3WlfP3BKUxg', 'A origem e significado real do batismo - Thamires Garcia', 33),
  ('jesuscopy', 'kXLNpZtosic', 'Como discernir a voz e presença de Deus na rotina - Thamires Garcia', 34),
  ('jesuscopy', 'pxv5eIOX6I4', 'Você entendeu errado o texto da mulher samaritana - Thamires Garcia', 35),
  ('hub', 'gD2-MzgECP4', 'Como Vencer a Tentação', 36),
  ('hub', 'smEINlwmTCc', 'Adoração em um nível mais profundo', 37),
  ('hub', 'WSLJkXB62YA', 'Eles vieram para o Brasil aprender sobre adoração', 38),
  ('hub', 'XwOzzuB-kmo', 'O que você precisa saber sobre o seu chamado', 39),
  ('hub', 'vPNWyQGtMlw', 'A maior dificuldade de um líder cristão', 40),
  ('hub', '37tbB7j_tTU', 'O começo de tudo (Testemunho de Conversão) - Ângelo Bazzo', 41),
  ('hub', 'URegwuuzDas', 'O maior milagre que você vai ver hoje!', 42),
  ('hub', 'USTYUy0CHQg', 'Aprenda qual é o verdadeiro papel do produtor musical - Hananiel Eduardo', 43),
  ('hub', 'mgP7yOjLOng', 'Esse jogo indie coloca você na batalha entre Céu e Inferno! - Review John Christian 3.0', 44),
  ('hub', 'X4nGYFDFQ6s', 'Discipulado como você nunca viu - com Arthur Marques do Jesuscopy', 45),
  ('hub', 'aIXUgSeQv3g', 'Testemunho Yudi Tamashiro', 46),
  ('hub', 'W6pdldY2oWg', 'A igreja precisa tomar cuidado com a hiper graça!', 47),
  ('hub', 'pXdElYCNOio', 'Os Cristãos tem que dominar em tudo?', 48),
  ('dunamis', 'w7nDIZc-ne4', 'Aprenda a fazer um devocional que te transforma', 49),
  ('dunamis', 'GZabX0DLLoE', 'Como Ouvir a Voz de Deus? Com Gabriel Namorato', 50),
  ('dunamis', '8iqbMcM773M', 'Como influenciar em uma geração viciada em validação', 51),
  ('dunamis', 'FKZvtOabOoA', 'Juventude, Influência e Pregação do Evangelho no Tik Tok Com JP Maia', 52),
  ('dunamis', 'sePsppnkJ8U', 'Meu Conselho para a Nova Geração. Conversa com Francis Chan', 53),
  ('dunamis', 'Levg76EpmS0', 'Dallas Jenkins, criador de The Chosen', 54),
  ('dunamis', 'OlF8jvquZOM', 'Por que orar e ler a Bíblia? Com Acyr de Gerone Junior', 55),
  ('dunamis', 't39R02nLlmw', 'Como levantar uma geração profética', 56),
  ('dunamis', 'qpanpNIKxUk', 'Como construir uma vida com Deus que atravessa gerações', 57),
  ('dunamis', 'MkxohHgz9wE', 'Um Dia Sem Reclamar Com Davi Lago', 58),
  ('dunamis', 'xlDnRFAsrgI', 'Testemunho Jottapê no Dunamis Hangout', 59),
  ('dunamis', 'Bo3U6n2Pmdg', 'Testemunho Isaque Valadão no Dunamis Hangout', 60),
  ('dunamis', '6WDymPBMI8s', 'O perigo de uma geração sem raiz bíblica', 61),
  ('dunamis', 'govdLozaB2g', 'Apologética x cultura: você sabe defender sua fé?', 62),
  ('dunamis', 'irUGDttJb0k', 'Como fazer a diferença mesmo sendo jovem? Com Gui Kilter, Nick Moretti e Krigner', 63),
  ('dunamis', '7WSmufQldcs', 'Da Bíblia ao Trap com 2METRO', 64),
  ('dunamis', 'l-8hAsjy6uk', 'Os Diretores do filme Quarto de Guerra e A Forja', 65),
  ('dunamis', 'bZ9eWYqdIjs', 'Por que fazer missões a curto prazo? Com Gabriel Borges e Gabriela Tápias', 66),
  ('dunamis', 'eM-ALBOwrAw', 'Evangelho nas ruas, Overmission e Avivamento na Europa. Com Luca Martini e Pedro Netto', 67),
  ('luca', 'SSTDJYGHm6M', 'Leia esse versículo para começar a semana diferente', 68),
  ('luca', 'VdA9Ux5goFU', 'Porque acho que seguir Jesus vai mudar sua vida', 69),
  ('luca', 'uVAA7On9z-g', 'Como ouvir a voz de Deus na bagunça da vida?', 70),
  ('luca', 'yXgpn-XnV-w', 'Como ter uma vida mais leve', 71),
  ('luca', '1ord61mNigo', 'O dia que riram da nossa cara quando falamos de Jesus', 72),
  ('luca', 'oHs7DwjFR4w', 'Quando te xingam no evangelismo', 73),
  ('luca', 'UH_E6DdFXu0', 'Maior satanista do Brasil se converteu', 74),
  ('luca', '2Ae_oPyAa6g', 'Descoberta sobre Deus abala cientistas', 75),
  ('luca', 'L_F-4N3GKuU', 'Mesmo doente, dias assim também contam', 76),
  ('luca', '2mx21xnHxOg', 'Milagre financeiro! O maior que já vivi', 77)
on conflict (video_id) do update set title = excluded.title, source = excluded.source, sort = excluded.sort;

-- Escolha do dia: o mesmo vídeo para todos, trocando à meia-noite de Brasília.
create or replace function public.home_daily_videos()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_day int := ((now() at time zone 'America/Sao_Paulo')::date - date '2026-01-01');
  v_src text[] := array['subira',
                        case when v_day % 2 = 0 then 'jesuscopy' else 'luca' end,
                        case when v_day % 2 = 0 then 'hub' else 'dunamis' end];
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
     offset (case when s = 'subira' then v_day else v_day / 2 end) % v_n limit 1;
    v_out := v_out || jsonb_build_object('source', s, 'video_id', v_pick.video_id, 'title', v_pick.title);
  end loop;
  return v_out;
end $fn$;
revoke execute on function public.home_daily_videos() from public, anon;
grant execute on function public.home_daily_videos() to authenticated;
