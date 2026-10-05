-- Arena dos Heróis: partida em DUPLAS (2x2) em tempo real entre colegas do mesmo Elo.
-- Cada jogador tem baralho, Maná e mão próprios; a equipe divide as torres.
create table if not exists public.arena_duo (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  -- [anfitrião, parceiro, adversário 1, adversário 2]; 1–2 = equipe 0, 3–4 = equipe 1
  players uuid[] not null check (cardinality(players) = 4),
  seed integer not null,
  arena smallint not null default 0,
  decks jsonb not null default '[null,null,null,null]'::jsonb,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'finished', 'declined', 'disputed')),
  reports jsonb not null default '{}'::jsonb,
  first_report_at timestamptz,
  result text check (result in ('team0', 'team1', 'draw')),
  crowns_0 int,
  crowns_1 int,
  ticks int,
  rewarded boolean not null default false,
  winners uuid[] not null default '{}',
  outcome jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists arena_duo_players on public.arena_duo using gin (players);
create index if not exists arena_duo_host on public.arena_duo (host_id, created_at desc);

alter table public.arena_duo enable row level security;
drop policy if exists arena_duo_read on public.arena_duo;
create policy arena_duo_read on public.arena_duo for select
  using (auth.uid() = any(players) or public.is_admin());

create or replace function public.arena_duo_create(p_partner uuid, p_opp1 uuid, p_opp2 uuid, p_deck text[], p_arena int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid(); ids uuid[]; v_n int; v_id uuid;
begin
  if me is null then raise exception 'auth'; end if;
  ids := array[me, p_partner, p_opp1, p_opp2];
  if null = any(ids) or (select count(distinct x) from unnest(ids) x) <> 4 then raise exception 'not_allowed'; end if;
  select count(*) into v_n from public.profiles where id = any(ids) and role in ('cria', 'leader') and elo_id is not null;
  if v_n <> 4 or (select count(distinct elo_id) from public.profiles where id = any(ids)) <> 1 then raise exception 'not_same_elo'; end if;
  if (select count(*) from public.arena_duo where host_id = me and created_at > now() - interval '24 hours') >= 6 then raise exception 'limit'; end if;
  if exists (
    select 1 from public.arena_duo
    where status in ('invited', 'accepted') and created_at > now() - interval '24 hours' and players && ids
  ) then raise exception 'already_open'; end if;
  insert into public.arena_duo (host_id, players, seed, arena, decks)
  values (me, ids, 1 + floor(random() * 2147483000)::int, greatest(0, least(7, coalesce(p_arena, 0))),
          jsonb_build_array(to_jsonb(p_deck), null, null, null))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.arena_duo_accept(p_id uuid, p_deck text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare d record; idx int;
begin
  select * into d from public.arena_duo where id = p_id for update;
  if d is null or d.status <> 'invited' or d.created_at < now() - interval '24 hours' then raise exception 'not_found'; end if;
  idx := array_position(d.players, auth.uid());
  if idx is null or idx = 1 then raise exception 'not_found'; end if;
  update public.arena_duo
  set decks = jsonb_set(decks, array[(idx - 1)::text], to_jsonb(p_deck))
  where id = p_id;
  update public.arena_duo
  set status = 'accepted'
  where id = p_id
    and jsonb_typeof(decks -> 0) = 'array' and jsonb_typeof(decks -> 1) = 'array'
    and jsonb_typeof(decks -> 2) = 'array' and jsonb_typeof(decks -> 3) = 'array';
end $$;

create or replace function public.arena_duo_decline(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.arena_duo set status = 'declined'
  where id = p_id and status = 'invited' and auth.uid() = any(players) and auth.uid() <> host_id;
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.arena_duo_report(p_id uuid, p_report jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare d record; idx int;
begin
  select * into d from public.arena_duo where id = p_id for update;
  if d is null or d.status <> 'accepted' then raise exception 'not_found'; end if;
  idx := array_position(d.players, auth.uid());
  if idx is null then raise exception 'not_found'; end if;
  if pg_column_size(p_report) > 120000 then raise exception 'too_big'; end if;
  if not (d.reports ? (idx - 1)::text) then
    update public.arena_duo
    set reports = reports || jsonb_build_object((idx - 1)::text, p_report), first_report_at = coalesce(first_report_at, now())
    where id = p_id;
  end if;
  return (select count(*) from jsonb_object_keys((select reports from public.arena_duo where id = p_id)))::int;
end $$;

revoke all on function public.arena_duo_create(uuid, uuid, uuid, text[], int) from public, anon;
revoke all on function public.arena_duo_accept(uuid, text[]) from public, anon;
revoke all on function public.arena_duo_decline(uuid) from public, anon;
revoke all on function public.arena_duo_report(uuid, jsonb) from public, anon;
grant execute on function public.arena_duo_create(uuid, uuid, uuid, text[], int) to authenticated;
grant execute on function public.arena_duo_accept(uuid, text[]) to authenticated;
grant execute on function public.arena_duo_decline(uuid) to authenticated;
grant execute on function public.arena_duo_report(uuid, jsonb) to authenticated;

-- duplas entram no ranking semanal Elo vs Elo (+2 por vitória) e na atividade do admin

create or replace function public.arena_user_week_points()
returns table(user_id uuid, points bigint)
language sql stable security definer set search_path = public as $fn$
  with wk as (
    select (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date as start_day
  ),
  wins as (
    select m.user_id as uid, m.play_date as d, 1 as pts
      from public.arena_matches m, wk
     where m.status = 'finished' and m.result = 'win' and m.trophy_delta > 0 and m.play_date >= wk.start_day
    union all
    select case when v.result = 'challenger' then v.challenger_id else v.opponent_id end,
           (v.finished_at at time zone 'America/Sao_Paulo')::date,
           2
      from public.arena_pvp v, wk
     where v.status = 'finished' and v.rewarded and v.result in ('challenger', 'opponent')
       and (v.finished_at at time zone 'America/Sao_Paulo')::date >= wk.start_day
    union all
    select w, (d.finished_at at time zone 'America/Sao_Paulo')::date, 2
      from public.arena_duo d, wk, unnest(d.winners) as w
     where d.status = 'finished' and d.rewarded
       and (d.finished_at at time zone 'America/Sao_Paulo')::date >= wk.start_day
  ),
  per_day as (
    select uid, d, least(sum(pts), 5) as p from wins group by uid, d
  )
  select uid, sum(p)::bigint from per_day group by uid;
$fn$;
revoke execute on function public.arena_user_week_points() from public, anon, authenticated;

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
    union all

    -- Arena em duplas (uma linha para cada jogador)
    select p.id, p.full_name, p.role::text, 'arena_duo',
           'Duplas · ' || coalesce(d.outcome -> p.id::text ->> 'res', 'sem resultado') || ' '
             || (case when d.players[1] = p.id or d.players[2] = p.id then coalesce(d.crowns_0, 0) else coalesce(d.crowns_1, 0) end)
             || 'x' || (case when d.players[1] = p.id or d.players[2] = p.id then coalesce(d.crowns_1, 0) else coalesce(d.crowns_0, 0) end)
             || case when not d.rewarded then ' · sem prêmio' else
                  coalesce(case when (d.outcome -> p.id::text ->> 'trophy')::int <> 0
                       then ' · ' || case when (d.outcome -> p.id::text ->> 'trophy')::int > 0 then '+' else '' end || (d.outcome -> p.id::text ->> 'trophy') || ' 🏆' end, '')
                  || coalesce(case when (d.outcome -> p.id::text ->> 'xp')::int > 0 then ' · +' || (d.outcome -> p.id::text ->> 'xp') || ' XP' end, '')
                end,
           d.finished_at
    from public.arena_duo d
    join public.profiles p on p.id = any(d.players)
    where d.status = 'finished'
  ) x
  where x.created_at is not null
    and x.created_at >= now() - interval '24 hours'
    and (p_exclude_user is null or x.actor_id <> p_exclude_user)
  order by x.created_at desc
  limit p_limit;
end;
$fn$;
