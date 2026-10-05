-- ELOS — as atividades de Jogos (quiz, versículo, quem sou eu, ordem, baú,
-- duelo, Arena contra o computador e Arena 1x1) entram na "Atividade recente"
-- do dashboard do admin, junto com as demais.
create or replace function public.admin_recent_activity(p_exclude_user uuid default null, p_limit integer default 1000)
returns table (
  actor_id   uuid,
  actor_name text,
  actor_role text,
  action     text,
  detail     text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão.';
  end if;

  return query
  select x.actor_id, x.actor_name, x.actor_role, x.action, x.detail, x.created_at
  from (
    select p.id as actor_id, p.full_name as actor_name, p.role::text as actor_role,
           'status'::text as action,
           'Emocional: ' || public.status_label(s.emotional_status)
             || ' · Espiritual: ' || public.status_label(s.spiritual_status) as detail,
           s.created_at
    from public.status_responses s
    join public.profiles p on p.id = s.user_id

    union all

    select p.id, p.full_name, p.role::text, 'mission_submitted',
           m.title, ma.submitted_at
    from public.mission_assignments ma
    join public.profiles p on p.id = ma.cria_id
    join public.missions m on m.id = ma.mission_id
    where ma.submitted_at is not null

    union all

    select p.id, p.full_name, p.role::text,
           case ma.status when 'approved' then 'mission_approved' else 'mission_rejected' end,
           m.title, ma.approved_at
    from public.mission_assignments ma
    join public.profiles p on p.id = ma.cria_id
    join public.missions m on m.id = ma.mission_id
    where ma.approved_at is not null and ma.status in ('approved', 'rejected')

    union all

    select p.id, p.full_name, p.role::text, 'feed_post',
           coalesce(nullif(f.caption, ''), 'sem legenda'), f.created_at
    from public.feed_posts f
    join public.profiles p on p.id = f.author_id

    union all

    select p.id, p.full_name, p.role::text, 'story_post',
           coalesce(nullif(st.caption, ''), 'sem legenda'), st.created_at
    from public.story_posts st
    join public.profiles p on p.id = st.author_id

    union all

    select p.id, p.full_name, p.role::text, 'devotional_entry',
           'Anotação no diário devocional', d.created_at
    from public.devotional_entries d
    join public.profiles p on p.id = d.user_id

    union all

    select p.id, p.full_name, p.role::text, 'prayer_request',
           pr.title, pr.created_at
    from public.prayer_requests pr
    join public.profiles p on p.id = pr.user_id

    -- ---------------------------------------------------------------- jogos
    union all

    -- quiz, versículo, quem sou eu, ordem
    select p.id, p.full_name, p.role::text, 'game_play',
           case gp.game
             when 'quiz' then 'Quiz do Dia'
             when 'verse' then 'Complete o Versículo'
             when 'who' then 'Quem Sou Eu?'
             when 'order' then 'Ordene os Fatos'
           end
             || coalesce(' · ' || case gp.difficulty when 'facil' then 'Fácil' when 'medio' then 'Médio' when 'dificil' then 'Difícil' end, '')
             || ' · nota ' || gp.score
             || case when gp.xp_awarded > 0 then ' · +' || gp.xp_awarded || ' XP' else '' end,
           coalesce(gp.finished_at, gp.created_at)
    from public.game_plays gp
    join public.profiles p on p.id = gp.user_id
    where gp.finished and gp.game in ('quiz', 'verse', 'who', 'order')

    union all

    -- baú diário
    select p.id, p.full_name, p.role::text, 'game_chest',
           'Baú diário' || case when gp.xp_awarded > 0 then ' · +' || gp.xp_awarded || ' XP' else '' end,
           coalesce(gp.finished_at, gp.created_at)
    from public.game_plays gp
    join public.profiles p on p.id = gp.user_id
    where gp.finished and gp.game = 'chest'

    union all

    -- duelo (uma linha para cada jogador)
    select p.id, p.full_name, p.role::text, 'game_duel',
           'Duelo vs ' || coalesce(o.full_name, 'colega') || ' · '
             || (case when d.challenger_id = p.id then d.challenger_score else d.opponent_score end)
             || ' x '
             || (case when d.challenger_id = p.id then d.opponent_score else d.challenger_score end)
             || (case when d.winner_id is null then ' · empate' when d.winner_id = p.id then ' · venceu' else ' · perdeu' end),
           d.finished_at
    from public.game_duels d
    join public.profiles p on p.id in (d.challenger_id, d.opponent_id)
    left join public.profiles o on o.id = case when d.challenger_id = p.id then d.opponent_id else d.challenger_id end
    where d.status = 'finished'

    union all

    -- Arena contra o computador
    select p.id, p.full_name, p.role::text, 'arena_match',
           (array['Jardim do Éden','Monte Ararate','Deserto do Sinai','Muralhas de Jericó','Vale de Elá','Mar da Galileia','Jerusalém','Nova Jerusalém'])[least(8, greatest(1, m.arena + 1))]
             || ' · ' || case m.result when 'win' then 'vitória' when 'loss' then 'derrota' else 'empate' end
             || ' ' || coalesce(m.crowns_me, 0) || 'x' || coalesce(m.crowns_bot, 0)
             || case when m.trophy_delta <> 0 then ' · ' || case when m.trophy_delta > 0 then '+' else '' end || m.trophy_delta || ' 🏆' else '' end
             || case when m.xp_awarded > 0 then ' · +' || m.xp_awarded || ' XP' else '' end,
           m.finished_at
    from public.arena_matches m
    join public.profiles p on p.id = m.user_id
    where m.status = 'finished' and m.result is not null

    union all

    -- Arena 1x1 (uma linha para cada jogador)
    select p.id, p.full_name, p.role::text, 'arena_pvp',
           'vs ' || coalesce(o.full_name, 'colega') || ' · '
             || case when v.result = 'draw' then 'empate'
                     when v.result = (case when v.challenger_id = p.id then 'challenger' else 'opponent' end) then 'vitória'
                     else 'derrota' end
             || ' ' || (case when v.challenger_id = p.id then coalesce(v.crowns_c, 0) else coalesce(v.crowns_o, 0) end)
             || 'x' || (case when v.challenger_id = p.id then coalesce(v.crowns_o, 0) else coalesce(v.crowns_c, 0) end)
             || case when not v.rewarded then ' · sem prêmio'
                     else (case when (case when v.challenger_id = p.id then v.trophy_c else v.trophy_o end) <> 0
                                then ' · ' || (case when (case when v.challenger_id = p.id then v.trophy_c else v.trophy_o end) > 0 then '+' else '' end)
                                     || (case when v.challenger_id = p.id then v.trophy_c else v.trophy_o end) || ' 🏆' else '' end)
                          || (case when (case when v.challenger_id = p.id then v.xp_c else v.xp_o end) > 0
                                   then ' · +' || (case when v.challenger_id = p.id then v.xp_c else v.xp_o end) || ' XP' else '' end)
                end,
           v.finished_at
    from public.arena_pvp v
    join public.profiles p on p.id in (v.challenger_id, v.opponent_id)
    left join public.profiles o on o.id = case when v.challenger_id = p.id then v.opponent_id else v.challenger_id end
    where v.status = 'finished'
  ) x
  where x.created_at is not null
    and x.created_at >= now() - interval '24 hours'
    and (p_exclude_user is null or x.actor_id <> p_exclude_user)
  order by x.created_at desc
  limit p_limit;
end;
$fn$;
