-- Vista o Herói — SALAS AO VIVO (competição de moda em tempo real, no jeito do Dress to Impress).
--
-- A autoridade é o banco: a fase, o relógio, o tema, a ordem do desfile, os votos, a pontuação e os prêmios
-- são decididos aqui. O aparelho só mostra e pede. Não há servidor de jogo rodando: o relógio anda de forma
-- "preguiçosa" — qualquer jogador que consulta a sala chama _dress_room_tick, que avança a fase SE o tempo já
-- venceu (com a linha da sala travada, então dois pedidos juntos não avançam duas vezes).
--
-- Fases: lobby → intermission → theme → dressing → prep → runway → voting → calc → podium → rewards → (próxima)
-- Toda função "_..." recebe o usuário e a hora por parâmetro (dá para testar o jogo inteiro avançando o relógio);
-- as funções públicas usam auth.uid() e now().

-- ------------------------------------------------------------------ tabelas
create table if not exists public.dress_live_themes (
  id     text primary key,
  active boolean not null default true
);
-- os mesmos ids de src/lib/games/dress/themes.ts (o texto do tema fica no app; aqui só o sorteio)
insert into public.dress_live_themes (id) values
  ('ester'),('maria'),('eva'),('rute'),('miria'),('rebeca'),('raquel'),('saba'),('jael'),('betania'),('dorcas'),('lidia'),
  ('raabe'),('ana'),('abigail'),('mulher_virtuosa'),('pastora_ovelhas'),('viajante_deserto'),('pesca_galileia'),
  ('princesa_israel'),('peregrina_jerusalem'),('mercadora_jerusalem'),('festa_israel'),('noite_belem')
on conflict (id) do nothing;

create table if not exists public.dress_rooms (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  host_id          uuid not null references public.profiles(id) on delete cascade,
  is_public        boolean not null default true,
  phase            text not null default 'lobby'
                   check (phase in ('lobby','intermission','theme','dressing','prep','runway','voting','calc','podium','rewards','closed')),
  phase_started_at timestamptz not null default now(),
  phase_ends_at    timestamptz,
  round            integer not null default 0,
  theme_id         text,
  used_themes      text[] not null default '{}',
  runway_order     uuid[] not null default '{}',
  runway_idx       integer not null default 0,
  -- tempos em segundos e limites; o que faltar usa o padrão de _dress_cfg
  settings         jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists dress_rooms_open_idx on public.dress_rooms(phase, is_public);

create table if not exists public.dress_room_players (
  room_id      uuid not null references public.dress_rooms(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  joined_at    timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  -- participa da rodada em andamento (quem entra no meio assiste e joga a próxima)
  eligible     boolean not null default false,
  ready        boolean not null default false,
  ready_at     timestamptz,
  look         jsonb not null default '{}',
  beauty       jsonb not null default '{}',
  pose         text not null default 'modelo',
  -- o look "congelado" no fim do camarim: é este que desfila
  final_look   jsonb,
  final_beauty jsonb,
  final_pose   text,
  primary key (room_id, user_id)
);
create index if not exists dress_room_players_user_idx on public.dress_room_players(user_id);

create table if not exists public.dress_room_votes (
  room_id    uuid not null references public.dress_rooms(id) on delete cascade,
  round      integer not null,
  voter_id   uuid not null references public.profiles(id) on delete cascade,
  target_id  uuid not null references public.profiles(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (room_id, round, voter_id, target_id),
  check (voter_id <> target_id)
);

-- histórico das rodadas: fica mesmo depois que a sala é apagada (por isso room_id não é chave estrangeira)
create table if not exists public.dress_room_results (
  room_id    uuid not null,
  round      integer not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  theme_id   text,
  place      integer not null,
  score      numeric(5,3) not null,
  votes      integer not null,
  stars_sum  integer not null,
  fives      integer not null,
  tickets    integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (room_id, round, user_id)
);
create index if not exists dress_room_results_user_idx on public.dress_room_results(user_id, created_at desc);

-- ninguém lê nem escreve direto: tudo passa pelas funções abaixo
alter table public.dress_live_themes   enable row level security;
alter table public.dress_rooms         enable row level security;
alter table public.dress_room_players  enable row level security;
alter table public.dress_room_votes    enable row level security;
alter table public.dress_room_results  enable row level security;

-- ------------------------------------------------------------------ configuração (um lugar só)
create or replace function public._dress_cfg(p_settings jsonb, p_key text)
returns integer language sql immutable as $fn$
  select coalesce(
    nullif(p_settings->>p_key, '')::integer,
    case p_key
      when 'intermission' then 20   -- intervalo no lobby
      when 'theme'        then 8    -- revelação do tema
      when 'dressing'     then 360  -- camarim: 6 minutos
      when 'prep'         then 5    -- "preparando a passarela"
      when 'runway'       then 14   -- cada modelo na passarela
      when 'voting'       then 12   -- últimos votos
      when 'calc'         then 3    -- apuração
      when 'podium'       then 12
      when 'rewards'      then 10
      when 'min_players'  then 2
      when 'max_players'  then 8
      when 'daily_rounds' then 12   -- rodadas por dia que pagam bilhetes (anti-farm)
      else 10
    end)
$fn$;

-- ------------------------------------------------------------------ apuração (pontuação e prêmios)
-- Nota de cada look = média amortecida: (soma das estrelas + 3) / (votos + 1).
--   * quem não recebeu voto fica com 3,000 (neutro) — nunca ganha 5 de graça;
--   * poucos votos pesam menos do que muitos, então quantidades diferentes de votos são comparáveis.
-- Desempate, nesta ordem: mais votos, mais notas 5, quem ficou pronto primeiro, id (estável).
-- Bilhetes: 3 por participar + bônus do pódio (10/6/4; o último colocado nunca leva bônus) + 1 por ter
-- avaliado todos os outros. Depois de `daily_rounds` rodadas no dia, a rodada vale 0 (mas fica no histórico).
create or replace function public._dress_room_settle(p_room uuid, p_now timestamptz)
returns void language plpgsql security definer set search_path = public as $fn$
declare r public.dress_rooms; v_paid integer;
begin
  select * into r from public.dress_rooms where id = p_room;
  with base as (
    select pl.user_id, pl.ready_at,
           coalesce(v.n, 0) as n, coalesce(v.s, 0) as s, coalesce(v.fives, 0) as fives,
           round((coalesce(v.s, 0) + 3.0) / (coalesce(v.n, 0) + 1), 3) as score,
           (select count(*) from public.dress_room_votes c
             where c.room_id = p_room and c.round = r.round and c.voter_id = pl.user_id) as voted,
           (select count(*) from public.dress_room_results rr
             where rr.user_id = pl.user_id
               and (rr.created_at at time zone 'America/Sao_Paulo')::date = (p_now at time zone 'America/Sao_Paulo')::date) as today
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
           case when k.total < 2 or k.today >= public._dress_cfg(r.settings, 'daily_rounds') then 0
                else 3
                   + case when k.place <= least(3, k.total - 1) then (array[10, 6, 4])[k.place::int] else 0 end
                   + case when k.voted >= k.total - 1 then 1 else 0 end
           end,
           p_now
      from ranked k
    on conflict (room_id, round, user_id) do nothing
    returning user_id, tickets
  )
  select count(public.dress_apply_result(i.user_id, i.tickets, false)) into v_paid from ins i where i.tickets > 0;
end $fn$;

-- ------------------------------------------------------------------ o relógio da partida
create or replace function public._dress_room_tick(p_room uuid, p_now timestamptz)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  r public.dress_rooms;
  v_guard integer := 0;
  v_online integer;
  v_min integer;
  v_theme text;
  v_reset boolean;
  v_total integer;
  v_pending integer;
  v_len integer;
  v_target uuid;
  v_order uuid[];
begin
  loop
    v_guard := v_guard + 1;
    exit when v_guard > 16;
    select * into r from public.dress_rooms where id = p_room for update;
    if not found or r.phase = 'closed' then return; end if;
    v_min := public._dress_cfg(r.settings, 'min_players');
    select count(*) into v_online from public.dress_room_players
     where room_id = p_room and last_seen > p_now - interval '25 seconds';

    if r.phase = 'lobby' then
      -- quem sumiu há mais de 2 minutos sai da sala
      delete from public.dress_room_players where room_id = p_room and last_seen < p_now - interval '120 seconds';
      if not exists (select 1 from public.dress_room_players where room_id = p_room) and r.updated_at < p_now - interval '10 minutes' then
        update public.dress_rooms set phase = 'closed', updated_at = p_now where id = p_room;
        return;
      end if;
      exit when v_online < v_min;
      update public.dress_rooms set phase = 'intermission', phase_started_at = p_now,
             phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'intermission')), updated_at = p_now
       where id = p_room;

    elsif r.phase = 'intermission' then
      if v_online < v_min then
        update public.dress_rooms set phase = 'lobby', phase_started_at = p_now, phase_ends_at = null, updated_at = p_now where id = p_room;
        exit;
      end if;
      exit when p_now < r.phase_ends_at;
      -- começa a rodada: tema novo (sem repetir até acabar a lista) e quem está na sala agora participa
      select id into v_theme from public.dress_live_themes
       where active and not (id = any(r.used_themes)) order by random() limit 1;
      v_reset := v_theme is null;
      if v_reset then
        select id into v_theme from public.dress_live_themes where active order by random() limit 1;
      end if;
      update public.dress_room_players
         set eligible = (last_seen > p_now - interval '25 seconds'),
             ready = false, ready_at = null, look = '{}'::jsonb,
             final_look = null, final_beauty = null, final_pose = null
       where room_id = p_room;
      update public.dress_rooms
         set round = round + 1, theme_id = v_theme,
             used_themes = case when v_reset then array[v_theme] else used_themes || v_theme end,
             runway_order = '{}', runway_idx = 0,
             phase = 'theme', phase_started_at = p_now,
             phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'theme')), updated_at = p_now
       where id = p_room;

    elsif r.phase = 'theme' then
      exit when p_now < r.phase_ends_at;
      update public.dress_rooms set phase = 'dressing', phase_started_at = p_now,
             phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'dressing')), updated_at = p_now
       where id = p_room;

    elsif r.phase = 'dressing' then
      select count(*), count(*) filter (where not ready and last_seen > p_now - interval '25 seconds')
        into v_total, v_pending
        from public.dress_room_players where room_id = p_room and eligible;
      -- acaba no tempo, ou antes se todo mundo que está online já marcou "pronto"
      exit when p_now < r.phase_ends_at and not (v_total > 0 and v_pending = 0);
      update public.dress_room_players
         set final_look = look, final_beauty = beauty, final_pose = pose
       where room_id = p_room and eligible;
      select coalesce(array_agg(user_id order by random()), '{}') into v_order
        from public.dress_room_players where room_id = p_room and eligible;
      update public.dress_rooms set runway_order = v_order, runway_idx = 0,
             phase = 'prep', phase_started_at = p_now,
             phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'prep')), updated_at = p_now
       where id = p_room;

    elsif r.phase = 'prep' then
      exit when p_now < r.phase_ends_at;
      if coalesce(array_length(r.runway_order, 1), 0) = 0 then
        update public.dress_rooms set phase = 'lobby', phase_started_at = p_now, phase_ends_at = null, updated_at = p_now where id = p_room;
      else
        update public.dress_rooms set runway_idx = 1, phase = 'runway', phase_started_at = p_now,
               phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'runway')), updated_at = p_now
         where id = p_room;
      end if;

    elsif r.phase = 'runway' then
      v_len := coalesce(array_length(r.runway_order, 1), 0);
      v_target := r.runway_order[r.runway_idx];
      select count(*) into v_pending
        from public.dress_room_players p
       where p.room_id = p_room and p.eligible and p.user_id <> v_target
         and p.last_seen > p_now - interval '25 seconds'
         and not exists (select 1 from public.dress_room_votes v
                          where v.room_id = p_room and v.round = r.round and v.voter_id = p.user_id and v.target_id = v_target);
      -- cada modelo fica o tempo todo; só adianta se todos já votaram E ela já desfilou pelo menos 6 s
      exit when p_now < r.phase_ends_at and not (v_pending = 0 and p_now >= r.phase_started_at + interval '6 seconds');
      if r.runway_idx < v_len then
        update public.dress_rooms set runway_idx = runway_idx + 1, phase_started_at = p_now,
               phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'runway')), updated_at = p_now
         where id = p_room;
      else
        update public.dress_rooms set phase = 'voting', phase_started_at = p_now,
               phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'voting')), updated_at = p_now
         where id = p_room;
      end if;

    elsif r.phase = 'voting' then
      select count(*) into v_pending
        from public.dress_room_players a
        join public.dress_room_players b on b.room_id = a.room_id and b.eligible and b.user_id <> a.user_id
       where a.room_id = p_room and a.eligible and a.last_seen > p_now - interval '25 seconds'
         and not exists (select 1 from public.dress_room_votes v
                          where v.room_id = p_room and v.round = r.round and v.voter_id = a.user_id and v.target_id = b.user_id);
      exit when p_now < r.phase_ends_at and not (v_pending = 0 and p_now >= r.phase_started_at + interval '3 seconds');
      perform public._dress_room_settle(p_room, p_now);
      update public.dress_rooms set phase = 'calc', phase_started_at = p_now,
             phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'calc')), updated_at = p_now
       where id = p_room;

    elsif r.phase = 'calc' then
      exit when p_now < r.phase_ends_at;
      update public.dress_rooms set phase = 'podium', phase_started_at = p_now,
             phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'podium')), updated_at = p_now
       where id = p_room;

    elsif r.phase = 'podium' then
      exit when p_now < r.phase_ends_at;
      update public.dress_rooms set phase = 'rewards', phase_started_at = p_now,
             phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'rewards')), updated_at = p_now
       where id = p_room;

    elsif r.phase = 'rewards' then
      exit when p_now < r.phase_ends_at;
      -- próxima rodada: de volta ao intervalo (ou ao lobby, se sobrou gente de menos)
      if v_online >= v_min then
        update public.dress_rooms set phase = 'intermission', phase_started_at = p_now,
               phase_ends_at = p_now + make_interval(secs => public._dress_cfg(r.settings, 'intermission')), updated_at = p_now
         where id = p_room;
      else
        update public.dress_rooms set phase = 'lobby', phase_started_at = p_now, phase_ends_at = null, updated_at = p_now where id = p_room;
      end if;
      exit;
    else
      exit;
    end if;
  end loop;
end $fn$;

-- ------------------------------------------------------------------ entrar, sair, criar
create or replace function public._dress_room_create(p_user uuid, p_public boolean, p_now timestamptz, p_settings jsonb default '{}')
returns text language plpgsql security definer set search_path = public as $fn$
declare v_code text; v_room uuid; v_name text; v_try integer := 0;
begin
  select coalesce(nullif(trim(full_name), ''), 'Jogadora') into v_name from public.profiles where id = p_user;
  if v_name is null then raise exception 'Perfil não encontrado.'; end if;
  delete from public.dress_room_players where user_id = p_user;
  loop
    v_try := v_try + 1;
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') into v_code from generate_series(1, 4);
    begin
      insert into public.dress_rooms (code, host_id, is_public, settings, phase_started_at, updated_at)
      values (v_code, p_user, coalesce(p_public, true), coalesce(p_settings, '{}'), p_now, p_now)
      returning id into v_room;
      exit;
    exception when unique_violation then
      if v_try > 20 then raise exception 'Não foi possível criar a sala. Tente de novo.'; end if;
    end;
  end loop;
  insert into public.dress_room_players (room_id, user_id, name, joined_at, last_seen) values (v_room, p_user, v_name, p_now, p_now);
  return v_code;
end $fn$;

create or replace function public._dress_room_join(p_user uuid, p_code text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare r public.dress_rooms; v_name text; v_count integer;
begin
  select * into r from public.dress_rooms where code = upper(trim(p_code)) for update;
  if not found or r.phase = 'closed' then return jsonb_build_object('error', 'Sala não encontrada. Confira o código.'); end if;
  if exists (select 1 from public.dress_room_players where room_id = r.id and user_id = p_user) then
    update public.dress_room_players set last_seen = p_now where room_id = r.id and user_id = p_user;
    return jsonb_build_object('ok', true);
  end if;
  select count(*) into v_count from public.dress_room_players where room_id = r.id;
  if v_count >= public._dress_cfg(r.settings, 'max_players') then return jsonb_build_object('error', 'A sala está cheia.'); end if;
  select coalesce(nullif(trim(full_name), ''), 'Jogadora') into v_name from public.profiles where id = p_user;
  if v_name is null then return jsonb_build_object('error', 'Perfil não encontrado.'); end if;
  delete from public.dress_room_players where user_id = p_user;
  insert into public.dress_room_players (room_id, user_id, name, joined_at, last_seen) values (r.id, p_user, v_name, p_now, p_now);
  update public.dress_rooms set updated_at = p_now where id = r.id;
  return jsonb_build_object('ok', true);
end $fn$;

create or replace function public._dress_room_leave(p_user uuid, p_code text, p_now timestamptz)
returns void language plpgsql security definer set search_path = public as $fn$
declare r public.dress_rooms;
begin
  select * into r from public.dress_rooms where code = upper(trim(p_code)) for update;
  if not found then return; end if;
  if r.phase in ('lobby', 'intermission') then
    delete from public.dress_room_players where room_id = r.id and user_id = p_user;
  else
    -- no meio da rodada o look fica (ela ainda desfila e é avaliada); só deixa de contar como presente
    update public.dress_room_players set last_seen = p_now - interval '1 hour' where room_id = r.id and user_id = p_user;
  end if;
  update public.dress_rooms set updated_at = p_now where id = r.id;
end $fn$;

-- ------------------------------------------------------------------ look (só no camarim) e voto
create or replace function public._dress_room_set_look(p_user uuid, p_code text, p_look jsonb, p_beauty jsonb, p_pose text, p_ready boolean, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare r public.dress_rooms; v_n integer;
begin
  select * into r from public.dress_rooms where code = upper(trim(p_code));
  if not found then return jsonb_build_object('error', 'Sala não encontrada.'); end if;
  perform public._dress_room_tick(r.id, p_now);
  select * into r from public.dress_rooms where id = r.id;
  if r.phase <> 'dressing' then return jsonb_build_object('error', 'O tempo do camarim acabou: o look já foi registrado.'); end if;
  update public.dress_room_players
     set look = coalesce(p_look, '{}'), beauty = coalesce(p_beauty, '{}'), pose = coalesce(nullif(p_pose, ''), 'modelo'),
         ready_at = case when p_ready and not ready then p_now when not p_ready then null else ready_at end,
         ready = coalesce(p_ready, false), last_seen = p_now
   where room_id = r.id and user_id = p_user and eligible;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('error', 'Você entra na próxima rodada.'); end if;
  perform public._dress_room_tick(r.id, p_now);
  return jsonb_build_object('ok', true);
end $fn$;

create or replace function public._dress_room_vote(p_user uuid, p_code text, p_target uuid, p_stars integer, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $fn$
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
  -- na passarela só dá para avaliar quem já desfilou ou está desfilando
  if r.phase = 'runway' and v_pos > r.runway_idx then return jsonb_build_object('error', 'Esse look ainda não desfilou.'); end if;
  begin
    insert into public.dress_room_votes (room_id, round, voter_id, target_id, stars, created_at)
    values (r.id, r.round, p_user, p_target, p_stars, p_now);
  exception when unique_violation then
    return jsonb_build_object('error', 'Você já avaliou este look.');
  end;
  update public.dress_room_players set last_seen = p_now where room_id = r.id and user_id = p_user;
  perform public._dress_room_tick(r.id, p_now);
  return jsonb_build_object('ok', true);
end $fn$;

-- ------------------------------------------------------------------ estado (o que o aparelho mostra)
create or replace function public._dress_room_state(p_user uuid, p_code text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare r public.dress_rooms; v_hide boolean; v_players jsonb; v_results jsonb; v_me jsonb; v_tickets integer;
begin
  select * into r from public.dress_rooms where code = upper(trim(p_code));
  if not found or r.phase = 'closed' then return jsonb_build_object('error', 'Sala não encontrada.'); end if;
  if not exists (select 1 from public.dress_room_players where room_id = r.id and user_id = p_user) then
    return jsonb_build_object('error', 'Você não está nesta sala.');
  end if;
  update public.dress_room_players set last_seen = p_now where room_id = r.id and user_id = p_user;
  perform public._dress_room_tick(r.id, p_now);
  select * into r from public.dress_rooms where id = r.id;
  -- durante o tema e o camarim ninguém vê o look das outras (só no desfile)
  v_hide := r.phase in ('theme', 'dressing');
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.user_id, 'name', p.name, 'eligible', p.eligible, 'ready', p.ready,
           'online', p.last_seen > p_now - interval '25 seconds',
           'look', case when v_hide then null else p.final_look end,
           'beauty', case when v_hide and p.user_id <> p_user then null else coalesce(p.final_beauty, p.beauty) end,
           'pose', case when v_hide then null else p.final_pose end
         ) order by p.joined_at, p.user_id), '[]'::jsonb)
    into v_players from public.dress_room_players p where p.room_id = r.id;
  -- o resultado só aparece a partir do pódio (a apuração é suspense)
  if r.phase in ('podium', 'rewards', 'intermission', 'lobby') and r.round > 0 then
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', x.user_id, 'place', x.place, 'score', x.score, 'votes', x.votes,
             'avg', case when x.votes > 0 then round(x.stars_sum::numeric / x.votes, 2) else null end,
             'tickets', x.tickets) order by x.place), '[]'::jsonb)
      into v_results from public.dress_room_results x where x.room_id = r.id and x.round = r.round;
  end if;
  select tickets into v_tickets from public.dress_stats where user_id = p_user;
  select jsonb_build_object(
           'id', p.user_id, 'eligible', p.eligible, 'ready', p.ready,
           'look', p.look, 'beauty', p.beauty, 'pose', p.pose,
           'tickets', coalesce(v_tickets, 0),
           'voted', coalesce((select jsonb_agg(v.target_id) from public.dress_room_votes v
                               where v.room_id = r.id and v.round = r.round and v.voter_id = p_user), '[]'::jsonb))
    into v_me from public.dress_room_players p where p.room_id = r.id and p.user_id = p_user;
  return jsonb_build_object(
    'code', r.code, 'phase', r.phase, 'round', r.round, 'theme', r.theme_id, 'public', r.is_public, 'host', r.host_id,
    'left_ms', case when r.phase_ends_at is null then null else greatest(0, floor(extract(epoch from (r.phase_ends_at - p_now)) * 1000))::bigint end,
    'total_ms', case when r.phase_ends_at is null then null else floor(extract(epoch from (r.phase_ends_at - r.phase_started_at)) * 1000)::bigint end,
    'order', to_jsonb(r.runway_order), 'idx', r.runway_idx,
    'min_players', public._dress_cfg(r.settings, 'min_players'), 'max_players', public._dress_cfg(r.settings, 'max_players'),
    'players', v_players, 'results', coalesce(v_results, '[]'::jsonb), 'me', v_me);
end $fn$;

-- ------------------------------------------------------------------ funções públicas (usuário logado)
create or replace function public._dress_uid()
returns uuid language plpgsql stable security definer set search_path = public as $fn$
declare v uuid := auth.uid();
begin
  if v is null or not exists (select 1 from public.profiles where id = v and role in ('cria', 'leader', 'admin')) then
    raise exception 'Entre de novo para jogar.';
  end if;
  return v;
end $fn$;

create or replace function public.dress_room_create(p_public boolean default true)
returns text language sql security definer set search_path = public as $fn$
  select public._dress_room_create(public._dress_uid(), p_public, now())
$fn$;

create or replace function public.dress_room_join(p_code text)
returns jsonb language sql security definer set search_path = public as $fn$
  select public._dress_room_join(public._dress_uid(), p_code, now())
$fn$;

create or replace function public.dress_room_leave(p_code text)
returns void language sql security definer set search_path = public as $fn$
  select public._dress_room_leave(public._dress_uid(), p_code, now())
$fn$;

create or replace function public.dress_room_vote(p_code text, p_target uuid, p_stars integer)
returns jsonb language sql security definer set search_path = public as $fn$
  select public._dress_room_vote(public._dress_uid(), p_code, p_target, p_stars, now())
$fn$;

create or replace function public.dress_room_state(p_code text)
returns jsonb language sql security definer set search_path = public as $fn$
  select public._dress_room_state(public._dress_uid(), p_code, now())
$fn$;

-- salas públicas esperando gente (e uma faxina das salas velhas)
create or replace function public.dress_rooms_open()
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v jsonb; v_uid uuid := public._dress_uid();
begin
  delete from public.dress_rooms where updated_at < now() - interval '1 day';
  update public.dress_rooms set phase = 'closed', updated_at = now()
   where phase <> 'closed' and updated_at < now() - interval '30 minutes'
     and not exists (select 1 from public.dress_room_players p where p.room_id = dress_rooms.id and p.last_seen > now() - interval '5 minutes');
  select coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'host', x.host_name, 'players', x.n, 'max', x.mx, 'phase', x.phase) order by x.n desc), '[]'::jsonb) into v
    from (
      select r.code, r.phase, public._dress_cfg(r.settings, 'max_players') as mx,
             (select split_part(p.full_name, ' ', 1) from public.profiles p where p.id = r.host_id) as host_name,
             (select count(*) from public.dress_room_players pl where pl.room_id = r.id and pl.last_seen > now() - interval '25 seconds') as n
        from public.dress_rooms r
       where r.is_public and r.phase <> 'closed'
    ) x
   where x.n > 0 and x.n < x.mx;
  return v;
end $fn$;

-- ------------------------------------------------------------------ permissões
-- as internas ("_...") não são de ninguém de fora: só as públicas chamam (o look passa pela Server Action,
-- que confere as peças no catálogo e chama _dress_room_set_look com a chave de serviço)
revoke all on function public._dress_cfg(jsonb, text) from public, anon, authenticated;
revoke all on function public._dress_room_settle(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._dress_room_tick(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._dress_room_create(uuid, boolean, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public._dress_room_join(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public._dress_room_leave(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public._dress_room_set_look(uuid, text, jsonb, jsonb, text, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public._dress_room_vote(uuid, text, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public._dress_room_state(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public._dress_uid() from public, anon, authenticated;
grant execute on function public._dress_room_set_look(uuid, text, jsonb, jsonb, text, boolean, timestamptz) to service_role;

revoke all on function public.dress_room_create(boolean) from public, anon;
revoke all on function public.dress_room_join(text) from public, anon;
revoke all on function public.dress_room_leave(text) from public, anon;
revoke all on function public.dress_room_vote(text, uuid, integer) from public, anon;
revoke all on function public.dress_room_state(text) from public, anon;
revoke all on function public.dress_rooms_open() from public, anon;
grant execute on function public.dress_room_create(boolean) to authenticated;
grant execute on function public.dress_room_join(text) to authenticated;
grant execute on function public.dress_room_leave(text) to authenticated;
grant execute on function public.dress_room_vote(text, uuid, integer) to authenticated;
grant execute on function public.dress_room_state(text) to authenticated;
grant execute on function public.dress_rooms_open() to authenticated;
