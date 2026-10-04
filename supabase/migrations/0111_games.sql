-- Jogos bíblicos: quiz, versículo, quem sou eu, ordem, duelo, cartas, baú.
-- Todas as escritas passam por Server Actions com a chave de serviço (a
-- correção das respostas mora no servidor) — por isso as RPCs de escrita são
-- revogadas de anon/authenticated e só o service_role executa.

-- ------------------------------------------------------------ perfil
alter table public.profiles
  add column if not exists game_streak int not null default 0,
  add column if not exists game_streak_date date;

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role     := old.role;
    new.elo_id   := old.elo_id;
    new.approved := old.approved;
    new.is_test_account := old.is_test_account;
    if coalesce(current_setting('elos.xp_bypass', true), 'off') <> 'on' then
      new.xp := old.xp;
      new.status_streak := old.status_streak;
      new.status_streak_date := old.status_streak_date;
      new.last_login_bonus_on := old.last_login_bonus_on;
      new.devotional_streak := old.devotional_streak;
      new.devotional_streak_date := old.devotional_streak_date;
      new.feed_streak := old.feed_streak;
      new.feed_streak_date := old.feed_streak_date;
      new.game_streak := old.game_streak;
      new.game_streak_date := old.game_streak_date;
    end if;
  end if;
  return new;
end;
$fn$;

-- ------------------------------------------------------------ tabelas
create table if not exists public.game_plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null check (game in ('quiz','verse','who','order','duel','chest')),
  play_date date not null,
  duel_id uuid,
  answers jsonb not null default '[]'::jsonb,
  score int not null default 0,
  finished boolean not null default false,
  xp_awarded int not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index if not exists game_plays_daily
  on public.game_plays (user_id, game, play_date) where duel_id is null;
create unique index if not exists game_plays_duel
  on public.game_plays (user_id, duel_id) where duel_id is not null;
create index if not exists game_plays_week on public.game_plays (play_date, finished);

create table if not exists public.user_cards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_key text not null,
  source text not null default 'bau',
  earned_at timestamptz not null default now(),
  primary key (user_id, card_key)
);

create table if not exists public.game_duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  elo_id uuid references public.elos(id) on delete set null,
  status text not null default 'open' check (status in ('open','finished')),
  challenger_score int,
  opponent_score int,
  winner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  check (challenger_id <> opponent_id)
);
create index if not exists game_duels_challenger on public.game_duels (challenger_id);
create index if not exists game_duels_opponent on public.game_duels (opponent_id);

alter table public.game_plays enable row level security;
alter table public.user_cards enable row level security;
alter table public.game_duels enable row level security;

drop policy if exists game_plays_read on public.game_plays;
create policy game_plays_read on public.game_plays for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists user_cards_read on public.user_cards;
create policy user_cards_read on public.user_cards for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists game_duels_read on public.game_duels;
create policy game_duels_read on public.game_duels for select
  using (challenger_id = auth.uid() or opponent_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------ selos
insert into public.achievements (key, title, description, icon) values
  ('game_7',   'Mente Afiada',       '7 dias seguidos jogando',          '🧠'),
  ('game_30',  'Sábio do Elo',       '30 dias seguidos jogando',         '🦉'),
  ('cards_10', 'Colecionador',       '10 cartas na coleção',             '🃏'),
  ('cards_20', 'Mestre das Cartas',  '20 cartas na coleção',             '👑'),
  ('duel_win', 'Campeão de Duelo',   'Venceu um duelo bíblico',          '⚔️')
on conflict (key) do nothing;

create or replace function public.check_and_grant_achievements(p_user uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_streak int;
  v_devo_streak int;
  v_feed_streak int;
  v_game_streak int;
  v_approved int;
  v_posts int;
  v_cards int;
  v_wins int;
begin
  select status_streak, devotional_streak, feed_streak, game_streak
    into v_streak, v_devo_streak, v_feed_streak, v_game_streak
    from public.profiles where id = p_user;
  select count(*) into v_approved from public.mission_assignments where cria_id = p_user and status = 'approved';
  select count(*) into v_posts from public.feed_posts where author_id = p_user;
  select count(*) into v_cards from public.user_cards where user_id = p_user;
  select count(*) into v_wins from public.game_duels where winner_id = p_user and status = 'finished';

  if coalesce(v_streak,0) >= 7 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'streak_7') on conflict do nothing;
  end if;
  if coalesce(v_streak,0) >= 30 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'streak_30') on conflict do nothing;
  end if;
  if coalesce(v_posts,0) >= 1 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'first_feed_post') on conflict do nothing;
  end if;
  if coalesce(v_approved,0) >= 10 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'missions_10') on conflict do nothing;
  end if;
  if coalesce(v_approved,0) >= 30 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'missions_30') on conflict do nothing;
  end if;

  if coalesce(v_devo_streak,0) >= 7 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'devotional_7') on conflict do nothing;
  end if;
  if coalesce(v_devo_streak,0) >= 15 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'devotional_15') on conflict do nothing;
  end if;
  if coalesce(v_devo_streak,0) >= 30 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'devotional_30') on conflict do nothing;
  end if;
  if coalesce(v_devo_streak,0) >= 90 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'devotional_90') on conflict do nothing;
  end if;

  if coalesce(v_feed_streak,0) >= 3 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'feed_3') on conflict do nothing;
  end if;
  if coalesce(v_feed_streak,0) >= 7 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'feed_7') on conflict do nothing;
  end if;
  if coalesce(v_feed_streak,0) >= 15 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'feed_15') on conflict do nothing;
  end if;

  if coalesce(v_game_streak,0) >= 7 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'game_7') on conflict do nothing;
  end if;
  if coalesce(v_game_streak,0) >= 30 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'game_30') on conflict do nothing;
  end if;
  if coalesce(v_cards,0) >= 10 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'cards_10') on conflict do nothing;
  end if;
  if coalesce(v_cards,0) >= 20 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'cards_20') on conflict do nothing;
  end if;
  if coalesce(v_wins,0) >= 1 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'duel_win') on conflict do nothing;
  end if;
end;
$fn$;

-- ------------------------------------------------------------ RPCs (só service_role)

-- Fecha uma partida: marca como terminada UMA vez (idempotente), paga o XP,
-- avança a ofensiva de jogos e revê os selos. Devolve o XP pago, ou -1 se a
-- partida já tinha sido fechada antes.
create or replace function public.game_finish(p_play uuid, p_xp int, p_type text)
returns int language plpgsql security definer set search_path = public as $fn$
declare
  v_user uuid;
  v_game text;
  v_xp int := greatest(coalesce(p_xp, 0), 0);
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_last date;
  v_streak int;
begin
  update public.game_plays
     set finished = true, finished_at = now(), xp_awarded = v_xp
   where id = p_play and finished = false
   returning user_id, game into v_user, v_game;
  if v_user is null then return -1; end if;

  if v_xp > 0 then
    perform set_config('elos.xp_bypass', 'on', true);
    update public.profiles set xp = xp + v_xp where id = v_user;
    perform set_config('elos.xp_bypass', 'off', true);
    insert into public.xp_transactions (user_id, amount, type) values (v_user, v_xp, p_type);
  end if;

  if v_game <> 'chest' then
    select game_streak_date, game_streak into v_last, v_streak from public.profiles where id = v_user;
    if v_last is distinct from v_today then
      if v_last = v_today - 1 then v_streak := coalesce(v_streak, 0) + 1; else v_streak := 1; end if;
      perform set_config('elos.xp_bypass', 'on', true);
      update public.profiles set game_streak = v_streak, game_streak_date = v_today where id = v_user;
      perform set_config('elos.xp_bypass', 'off', true);
    end if;
  end if;

  perform public.check_and_grant_achievements(v_user);
  return v_xp;
end $fn$;

-- XP avulso (bônus de baú sem carta nova etc.).
create or replace function public.game_grant_xp(p_user uuid, p_amount int, p_type text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if coalesce(p_amount, 0) <= 0 then return; end if;
  perform set_config('elos.xp_bypass', 'on', true);
  update public.profiles set xp = xp + p_amount where id = p_user;
  perform set_config('elos.xp_bypass', 'off', true);
  insert into public.xp_transactions (user_id, amount, type) values (p_user, p_amount, p_type);
end $fn$;

-- Registra a nota de um jogador no duelo; se os dois já jogaram, fecha o
-- duelo, define o vencedor e paga o XP (vencedor +2, empate +1 pra cada).
create or replace function public.game_duel_submit(p_duel uuid, p_user uuid, p_score int)
returns table(duel_status text, challenger_score int, opponent_score int, winner_id uuid)
language plpgsql security definer set search_path = public as $fn$
declare
  d public.game_duels%rowtype;
  v_winner uuid;
begin
  select * into d from public.game_duels where id = p_duel for update;
  if not found then raise exception 'Duelo não encontrado'; end if;

  if d.challenger_id = p_user and d.challenger_score is null then
    update public.game_duels set challenger_score = p_score where id = p_duel;
  elsif d.opponent_id = p_user and d.opponent_score is null then
    update public.game_duels set opponent_score = p_score where id = p_duel;
  end if;

  select * into d from public.game_duels where id = p_duel;
  if d.status = 'open' and d.challenger_score is not null and d.opponent_score is not null then
    v_winner := case
      when d.challenger_score > d.opponent_score then d.challenger_id
      when d.opponent_score > d.challenger_score then d.opponent_id
      else null end;
    update public.game_duels
       set status = 'finished', winner_id = v_winner, finished_at = now()
     where id = p_duel;
    if v_winner is null then
      perform public.game_grant_xp(d.challenger_id, 1, 'game_duel');
      perform public.game_grant_xp(d.opponent_id, 1, 'game_duel');
    else
      perform public.game_grant_xp(v_winner, 2, 'game_duel');
      perform public.check_and_grant_achievements(v_winner);
    end if;
  end if;

  return query
    select g.status, g.challenger_score, g.opponent_score, g.winner_id
      from public.game_duels g where g.id = p_duel;
end $fn$;

revoke execute on function public.game_finish(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.game_grant_xp(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.game_duel_submit(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.game_finish(uuid, int, text) to service_role;
grant execute on function public.game_grant_xp(uuid, int, text) to service_role;
grant execute on function public.game_duel_submit(uuid, uuid, int) to service_role;

-- ------------------------------------------------------------ RPCs de leitura

-- Pontos de jogos por Elo na semana corrente (segunda a domingo, Brasília).
create or replace function public.game_week_ranking()
returns table(elo_id uuid, elo_name text, points bigint, players bigint)
language sql stable security definer set search_path = public as $fn$
  with wk as (
    select (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date as start_day
  )
  select e.id, e.name,
         coalesce(sum(gp.score), 0)::bigint as points,
         count(distinct gp.user_id)::bigint as players
    from public.elos e
    left join public.profiles p on p.elo_id = e.id and p.role in ('cria','leader')
    left join public.game_plays gp
           on gp.user_id = p.id and gp.finished and gp.game in ('quiz','verse','who','order','duel')
          and gp.play_date >= (select start_day from wk)
   group by e.id, e.name
   order by points desc, e.name;
$fn$;

-- Placar do Elo de quem chama: quem já jogou hoje e os pontos da semana.
create or replace function public.game_elo_board()
returns table(user_id uuid, full_name text, avatar_url text, today_done int, week_points bigint)
language sql stable security definer set search_path = public as $fn$
  with me as (select elo_id from public.profiles where id = auth.uid()),
  wk as (select (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date as start_day),
  today as (select (now() at time zone 'America/Sao_Paulo')::date as d)
  select p.id, p.full_name, p.avatar_url,
         count(*) filter (where gp.play_date = (select d from today))::int,
         coalesce(sum(gp.score) filter (where gp.play_date >= (select start_day from wk)), 0)::bigint
    from public.profiles p
    left join public.game_plays gp
           on gp.user_id = p.id and gp.finished and gp.game in ('quiz','verse','who','order','duel')
   where p.elo_id is not null
     and p.elo_id = (select elo_id from me)
     and p.role in ('cria','leader')
   group by p.id, p.full_name, p.avatar_url
   order by 5 desc, 2;
$fn$;

grant execute on function public.game_week_ranking() to authenticated;
grant execute on function public.game_elo_board() to authenticated;
revoke execute on function public.game_week_ranking() from anon, public;
revoke execute on function public.game_elo_board() from anon, public;
