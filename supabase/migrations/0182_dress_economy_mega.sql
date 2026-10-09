-- Vista o Herói: só com as amigas (3 a 10 jogadoras), economia nova, missões, troca por XP e o Mega Desfile (domingo 15h).
--
-- Economia: 1º lugar 30 bilhetes, 2º 20, 3º 10 (no Mega Desfile vale o dobro). 300 bilhetes = 1 XP.
-- A 1ª vitória do dia vale 1 XP (só 1 XP por dia vindo de vitórias).

-- ------------------------------------------------------------------ limites e tempos
create or replace function public._dress_cfg(p_settings jsonb, p_key text)
returns integer language sql immutable as $fn$
  select coalesce(
    nullif(p_settings->>p_key, '')::integer,
    case p_key
      when 'intermission' then 20
      when 'theme'        then 8
      when 'dressing'     then 360
      when 'prep'         then 5
      when 'runway'       then 30
      when 'voting'       then 10
      when 'calc'         then 3
      when 'podium'       then 12
      when 'rewards'      then 10
      when 'min_players'  then 3
      when 'max_players'  then 10
      when 'daily_rounds' then 10
      else 10
    end)
$fn$;

-- ------------------------------------------------------------------ progresso (missões) e resgates
create table if not exists public.dress_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day     date not null,
  games   integer not null default 0,
  wins    integer not null default 0,
  podiums integer not null default 0,
  votes   integer not null default 0,
  mega    integer not null default 0,
  xp_won  boolean not null default false,
  primary key (user_id, day)
);
create table if not exists public.dress_mission_claims (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  mission    text not null,
  period     text not null,
  tickets    integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, mission, period)
);
alter table public.dress_daily enable row level security;
alter table public.dress_mission_claims enable row level security;
drop policy if exists dress_daily_read on public.dress_daily;
create policy dress_daily_read on public.dress_daily for select to authenticated using (user_id = auth.uid());
drop policy if exists dress_claims_read on public.dress_mission_claims;
create policy dress_claims_read on public.dress_mission_claims for select to authenticated using (user_id = auth.uid());

-- ------------------------------------------------------------------ voto: conta para as missões
create or replace function public._dress_room_vote(p_user uuid, p_code text, p_target uuid, p_stars integer, p_now timestamp with time zone)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare r public.dress_rooms; v_pos integer;
begin
  select * into r from public.dress_rooms where code = upper(trim(p_code));
  if not found then return jsonb_build_object('error', 'Sala não encontrada.'); end if;
  perform public._dress_room_tick(r.id, p_now);
  select * into r from public.dress_rooms where id = r.id;
  if p_stars is null or p_stars < 1 or p_stars > 5 then return jsonb_build_object('error', 'Escolha de 1 a 5 estrelas.'); end if;
  if r.phase not in ('runway', 'voting') then return jsonb_build_object('error', 'A votação está fechada.'); end if;
  if p_target = p_user then return jsonb_build_object('error', 'Você não pode avaliar o seu próprio look.'); end if;
  if not exists (select 1 from public.dress_room_players where room_id = r.id and user_id = p_user and eligible) then
    return jsonb_build_object('error', 'Só quem está na rodada pode avaliar.');
  end if;
  v_pos := array_position(r.runway_order, p_target);
  if v_pos is null then return jsonb_build_object('error', 'Esse look não está na rodada.'); end if;
  if r.phase = 'runway' and v_pos > r.runway_idx then return jsonb_build_object('error', 'Esse look ainda não desfilou.'); end if;
  begin
    insert into public.dress_room_votes (room_id, round, voter_id, target_id, stars, created_at)
    values (r.id, r.round, p_user, p_target, p_stars, p_now);
  exception when unique_violation then
    return jsonb_build_object('error', 'Você já avaliou este look.');
  end;
  insert into public.dress_daily (user_id, day, votes) values (p_user, (p_now at time zone 'America/Sao_Paulo')::date, 1)
    on conflict (user_id, day) do update set votes = public.dress_daily.votes + 1;
  update public.dress_room_players set last_seen = p_now where room_id = r.id and user_id = p_user;
  perform public._dress_room_tick(r.id, p_now);
  return jsonb_build_object('ok', true);
end $fn$;

-- ------------------------------------------------------------------ apuração: 30/20/10 bilhetes, 1 XP na 1ª vitória do dia
create or replace function public._dress_room_settle(p_room uuid, p_now timestamp with time zone)
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare r public.dress_rooms; v_paid integer; v_prog integer; v_mega boolean; v_day date; w record;
begin
  select * into r from public.dress_rooms where id = p_room;
  v_mega := coalesce((r.settings->>'mega')::boolean, false);
  v_day := (p_now at time zone 'America/Sao_Paulo')::date;
  with base as (
    select pl.user_id, pl.ready_at,
           coalesce(v.n, 0) as n, coalesce(v.s, 0) as s, coalesce(v.fives, 0) as fives,
           round((coalesce(v.s, 0) + 3.0) / (coalesce(v.n, 0) + 1), 3) as score,
           (select count(*) from public.dress_room_results rr
             where rr.user_id = pl.user_id
               and (rr.created_at at time zone 'America/Sao_Paulo')::date = v_day) as today
      from public.dress_room_players pl
      left join lateral (
        select count(*)::int as n, sum(stars)::int as s, count(*) filter (where stars = 5)::int as fives
          from public.dress_room_votes vv
         where vv.room_id = p_room and vv.round = r.round and vv.target_id = pl.user_id
      ) v on true
     where pl.room_id = p_room and pl.eligible
  ), ranked as (
    select b.*, row_number() over (order by b.score desc, b.n desc, b.fives desc, b.ready_at asc nulls last, b.user_id) as place,
           count(*) over () as total
      from base b
  ), ins as (
    insert into public.dress_room_results (room_id, round, user_id, theme_id, place, score, votes, stars_sum, fives, tickets, created_at)
    select p_room, r.round, k.user_id, r.theme_id, k.place, k.score, k.n, k.s, k.fives,
           case when k.total < 3 or (not v_mega and k.today >= public._dress_cfg(r.settings, 'daily_rounds')) then 0
                else (case k.place when 1 then 30 when 2 then 20 when 3 then 10 else 0 end) * (case when v_mega then 2 else 1 end)
           end,
           p_now
      from ranked k
    on conflict (room_id, round, user_id) do nothing
    returning user_id, place, tickets
  ), n as (
    select count(*)::int as c from ins
  ), paid as (
    select public.dress_apply_result(i.user_id, i.tickets, false) from ins i where i.tickets > 0
  ), prog as (
    insert into public.dress_daily (user_id, day, games, wins, podiums, mega)
    select i.user_id, v_day, 1,
           case when i.place = 1 and n.c >= 3 then 1 else 0 end,
           case when i.place <= 3 and n.c >= 3 then 1 else 0 end,
           case when v_mega then 1 else 0 end
      from ins i cross join n
    on conflict (user_id, day) do update
      set games = public.dress_daily.games + 1,
          wins = public.dress_daily.wins + excluded.wins,
          podiums = public.dress_daily.podiums + excluded.podiums,
          mega = public.dress_daily.mega + excluded.mega
    returning user_id
  )
  select (select count(*) from paid), (select count(*) from prog) into v_paid, v_prog;

  -- 1 XP na primeira vitória do dia (só vale com pelo menos 3 jogadoras na rodada)
  for w in
    select x.user_id from public.dress_room_results x
     where x.room_id = p_room and x.round = r.round and x.place = 1
       and (select count(*) from public.dress_room_results y where y.room_id = p_room and y.round = r.round) >= 3
  loop
    update public.dress_daily set xp_won = true where user_id = w.user_id and day = v_day and not xp_won;
    if found then perform public.game_grant_xp(w.user_id, 1, 'game_dress'); end if;
  end loop;
end $fn$;

-- ------------------------------------------------------------------ missões
create or replace function public._dress_mission_defs()
returns jsonb language sql immutable as $fn$
  select '[
    {"key":"d_play3","period":"day","metric":"games","target":3,"reward":6},
    {"key":"d_vote15","period":"day","metric":"votes","target":15,"reward":5},
    {"key":"d_podium","period":"day","metric":"podiums","target":1,"reward":10},
    {"key":"w_play10","period":"week","metric":"games","target":10,"reward":30},
    {"key":"w_play25","period":"week","metric":"games","target":25,"reward":80},
    {"key":"w_win2","period":"week","metric":"wins","target":2,"reward":40},
    {"key":"w_vote60","period":"week","metric":"votes","target":60,"reward":20},
    {"key":"w_mega","period":"week","metric":"mega","target":1,"reward":30},
    {"key":"o_firstwin","period":"once","metric":"wins","target":1,"reward":20}
  ]'::jsonb
$fn$;

create or replace function public._dress_mission_progress(p_user uuid, p_period text, p_metric text, p_now timestamptz)
returns integer language plpgsql stable security definer set search_path to 'public' as $fn$
declare v_day date := (p_now at time zone 'America/Sao_Paulo')::date; v_from date; v_n integer;
begin
  v_from := case p_period when 'day' then v_day when 'week' then v_day - ((extract(isodow from v_day)::int) - 1) else date '2000-01-01' end;
  select case p_metric
           when 'games' then coalesce(sum(games), 0)
           when 'wins' then coalesce(sum(wins), 0)
           when 'podiums' then coalesce(sum(podiums), 0)
           when 'votes' then coalesce(sum(votes), 0)
           when 'mega' then coalesce(sum(mega), 0)
           else 0 end::int
    into v_n
    from public.dress_daily where user_id = p_user and day >= v_from and (p_period <> 'day' or day = v_day);
  return coalesce(v_n, 0);
end $fn$;

create or replace function public._dress_period_key(p_period text, p_now timestamptz)
returns text language sql immutable as $fn$
  select case p_period
    when 'day' then ((p_now at time zone 'America/Sao_Paulo')::date)::text
    when 'week' then ((p_now at time zone 'America/Sao_Paulo')::date - ((extract(isodow from (p_now at time zone 'America/Sao_Paulo')::date)::int) - 1))::text
    else 'once' end
$fn$;

create or replace function public.dress_missions()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_now timestamptz := now(); d jsonb; out jsonb := '[]'::jsonb; prog integer; claimed boolean;
begin
  for d in select * from jsonb_array_elements(public._dress_mission_defs()) loop
    prog := public._dress_mission_progress(v_uid, d->>'period', d->>'metric', v_now);
    select exists (select 1 from public.dress_mission_claims c where c.user_id = v_uid and c.mission = d->>'key' and c.period = public._dress_period_key(d->>'period', v_now)) into claimed;
    out := out || jsonb_build_object('key', d->>'key', 'period', d->>'period', 'target', (d->>'target')::int, 'reward', (d->>'reward')::int,
                                     'progress', least(prog, (d->>'target')::int), 'claimed', claimed);
  end loop;
  return out;
end $fn$;

create or replace function public.dress_mission_claim(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_now timestamptz := now(); d jsonb; prog integer; v_period text; v_new integer;
begin
  select e into d from jsonb_array_elements(public._dress_mission_defs()) e where e->>'key' = p_key;
  if d is null then return jsonb_build_object('error', 'Missão não encontrada.'); end if;
  prog := public._dress_mission_progress(v_uid, d->>'period', d->>'metric', v_now);
  if prog < (d->>'target')::int then return jsonb_build_object('error', 'A missão ainda não foi cumprida.'); end if;
  v_period := public._dress_period_key(d->>'period', v_now);
  begin
    insert into public.dress_mission_claims (user_id, mission, period, tickets) values (v_uid, p_key, v_period, (d->>'reward')::int);
  exception when unique_violation then
    return jsonb_build_object('error', 'Você já resgatou esta missão.');
  end;
  v_new := public.dress_apply_result(v_uid, (d->>'reward')::int, false);
  return jsonb_build_object('ok', true, 'reward', (d->>'reward')::int, 'tickets', v_new);
end $fn$;

-- tutorial concluído: 10 bilhetes, uma vez só
create or replace function public.dress_tutorial_done()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_new integer;
begin
  begin
    insert into public.dress_mission_claims (user_id, mission, period, tickets) values (v_uid, 'o_tutorial', 'once', 10);
  exception when unique_violation then
    return jsonb_build_object('ok', true, 'reward', 0);
  end;
  v_new := public.dress_apply_result(v_uid, 10, false);
  return jsonb_build_object('ok', true, 'reward', 10, 'tickets', v_new);
end $fn$;

-- 300 bilhetes = 1 XP
create or replace function public.dress_exchange_tickets(p_xp integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_cost integer; v_have integer; v_new integer;
begin
  if p_xp is null or p_xp < 1 or p_xp > 20 then return jsonb_build_object('error', 'Escolha de 1 a 20 XP.'); end if;
  v_cost := p_xp * 300;
  select tickets into v_have from public.dress_stats where user_id = v_uid for update;
  if coalesce(v_have, 0) < v_cost then return jsonb_build_object('error', 'Você precisa de ' || v_cost || ' bilhetes para trocar por ' || p_xp || ' XP.'); end if;
  v_new := public.dress_apply_result(v_uid, -v_cost, false);
  perform public.game_grant_xp(v_uid, p_xp, 'game_dress');
  return jsonb_build_object('ok', true, 'tickets', v_new, 'xp', p_xp);
end $fn$;

-- ------------------------------------------------------------------ Mega Desfile: domingo às 15h (Brasília)
create or replace function public._dress_mega_event(p_now timestamptz)
returns timestamptz language plpgsql immutable as $fn$
declare loc timestamp := p_now at time zone 'America/Sao_Paulo'; sun date; ev timestamptz;
begin
  sun := loc::date - extract(dow from loc)::int;
  ev := (sun + time '15:00') at time zone 'America/Sao_Paulo';
  if p_now > ev + interval '45 minutes' then ev := ((sun + 7) + time '15:00') at time zone 'America/Sao_Paulo'; end if;
  return ev;
end $fn$;

create or replace function public.dress_mega_info()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_now timestamptz := now(); ev timestamptz := public._dress_mega_event(now()); r public.dress_rooms; n integer := 0; v_in boolean := false;
begin
  select * into r from public.dress_rooms where code = 'MEGA' and (settings->>'event_start')::timestamptz = ev;
  if found then
    select count(*) into n from public.dress_room_players where room_id = r.id and last_seen > v_now - interval '25 seconds';
    select exists (select 1 from public.dress_room_players where room_id = r.id and user_id = v_uid) into v_in;
  end if;
  return jsonb_build_object('event_at', ev, 'enter_from', ev - interval '30 minutes', 'enter_until', ev + interval '30 minutes',
                            'open', v_now >= ev - interval '30 minutes' and v_now <= ev + interval '30 minutes',
                            'players', n, 'joined', v_in, 'now', v_now);
end $fn$;

create or replace function public.dress_mega_join()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_now timestamptz := now(); ev timestamptz := public._dress_mega_event(now()); r public.dress_rooms; res jsonb;
begin
  if v_now < ev - interval '30 minutes' then
    return jsonb_build_object('error', 'A sala do Mega Desfile abre 30 minutos antes (domingo, 15h).');
  end if;
  if v_now > ev + interval '30 minutes' then
    return jsonb_build_object('error', 'A entrada do Mega Desfile desta semana já fechou. Volte no próximo domingo!');
  end if;
  select * into r from public.dress_rooms where code = 'MEGA';
  if found and (r.settings->>'event_start')::timestamptz is distinct from ev then
    delete from public.dress_rooms where id = r.id;
    r := null;
  end if;
  if r.id is null then
    begin
      insert into public.dress_rooms (code, host_id, is_public, phase, phase_started_at, phase_ends_at, settings, updated_at)
      values ('MEGA', v_uid, false, 'lobby', v_now, ev,
              jsonb_build_object('mega', true, 'event_start', ev, 'max_players', 60, 'min_players', 3, 'runway', 15, 'voting', 15, 'intermission', 15), v_now);
    exception when unique_violation then
      null;
    end;
  end if;
  res := public._dress_room_join(v_uid, 'MEGA', v_now);
  if res ? 'error' then return res; end if;
  return jsonb_build_object('ok', true, 'code', 'MEGA');
end $fn$;

-- ------------------------------------------------------------------ patches nas funções longas
do $mig$
declare d text; a text; b text;
begin
  -- relógio: o Mega Desfile espera a hora marcada e só tem 1 rodada
  d := pg_get_functiondef('public._dress_room_tick'::regproc);
  a := '      exit when v_online < v_min;';
  b := '      if coalesce((r.settings->>''mega'')::boolean, false) and p_now < (r.settings->>''event_start'')::timestamptz then' || chr(10)
    || '        if r.phase_ends_at is distinct from (r.settings->>''event_start'')::timestamptz then' || chr(10)
    || '          update public.dress_rooms set phase_ends_at = (r.settings->>''event_start'')::timestamptz where id = p_room;' || chr(10)
    || '        end if;' || chr(10)
    || '        exit;' || chr(10)
    || '      end if;' || chr(10)
    || '      exit when v_online < v_min;';
  if position(a in d) = 0 then raise exception 'tick: lobby nao encontrado'; end if;
  d := replace(d, a, b);
  a := '    elsif r.phase = ''rewards'' then' || chr(10) || '      exit when p_now < r.phase_ends_at;';
  b := '    elsif r.phase = ''rewards'' then' || chr(10) || '      if coalesce((r.settings->>''mega'')::boolean, false) then exit; end if;' || chr(10) || '      exit when p_now < r.phase_ends_at;';
  if position(a in d) = 0 then raise exception 'tick: rewards nao encontrado'; end if;
  d := replace(d, a, b);
  execute d;

  -- estado: avisa se a sala é o Mega Desfile e a hora marcada
  d := pg_get_functiondef('public._dress_room_state'::regproc);
  a := '''min_players'', public._dress_cfg(r.settings, ''min_players''),';
  b := '''mega'', coalesce((r.settings->>''mega'')::boolean, false), ''event_at'', r.settings->>''event_start'', ' || a;
  if position(a in d) = 0 then raise exception 'state: nao encontrado'; end if;
  d := replace(d, a, b);
  execute d;
end $mig$;

revoke all on function public.dress_mega_join() from public, anon;
revoke all on function public.dress_mega_info() from public, anon;
revoke all on function public.dress_missions() from public, anon;
revoke all on function public.dress_mission_claim(text) from public, anon;
revoke all on function public.dress_tutorial_done() from public, anon;
revoke all on function public.dress_exchange_tickets(integer) from public, anon;
grant execute on function public.dress_mega_join() to authenticated;
grant execute on function public.dress_mega_info() to authenticated;
grant execute on function public.dress_missions() to authenticated;
grant execute on function public.dress_mission_claim(text) to authenticated;
grant execute on function public.dress_tutorial_done() to authenticated;
grant execute on function public.dress_exchange_tickets(integer) to authenticated;
