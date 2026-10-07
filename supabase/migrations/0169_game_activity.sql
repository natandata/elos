-- Atividades de TODOS os jogos no painel do admin ("Atividade recente").
-- 1) game_activity: registro genérico, qualquer jogo (inclusive os futuros e os que guardam tudo no aparelho, como MineArena e Bible Rush).
-- 2) admin_recent_game_activity: junta o registro genérico com as tabelas próprias de cada jogo (Memória, Vista o Herói, ArenaSoccer, Campanha da Arena, Loja).
create table if not exists public.game_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  action text not null default 'play',
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists game_activity_recent_idx on public.game_activity (created_at desc);
create index if not exists game_activity_dedupe_idx on public.game_activity (user_id, game, action, created_at desc);
alter table public.game_activity enable row level security;
drop policy if exists game_activity_admin_read on public.game_activity;
create policy game_activity_admin_read on public.game_activity for select using (public.is_admin());

create or replace function public.log_game_activity(p_user uuid, p_game text, p_action text, p_detail text, p_dedupe_min int default 0)
returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if p_user is null or coalesce(p_game, '') = '' then return; end if;
  if p_dedupe_min > 0 and exists (
    select 1 from public.game_activity a
     where a.user_id = p_user and a.game = p_game and a.action = coalesce(p_action, 'play') and a.detail = left(coalesce(p_detail, ''), 200)
       and a.created_at > now() - make_interval(mins => p_dedupe_min)
  ) then return; end if;
  insert into public.game_activity (user_id, game, action, detail) values (p_user, p_game, coalesce(p_action, 'play'), left(coalesce(p_detail, ''), 200));
end;
$fn$;
revoke execute on function public.log_game_activity(uuid, text, text, text, int) from public, anon, authenticated;
grant execute on function public.log_game_activity(uuid, text, text, text, int) to service_role;

create or replace function public.admin_recent_game_activity(p_exclude_user uuid default null, p_limit int default 1000)
returns table(actor_id uuid, actor_name text, actor_role text, action text, detail text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão.';
  end if;

  return query
  select x.actor_id, x.actor_name, x.actor_role, x.action, x.detail, x.created_at
  from (
    -- registro genérico (qualquer jogo, atual ou futuro)
    select p.id as actor_id, p.full_name as actor_name, p.role::text as actor_role, 'game:' || a.game as action, a.detail, a.created_at
      from public.game_activity a join public.profiles p on p.id = a.user_id

    union all
    select p.id, p.full_name, p.role::text, 'game:memory',
           'Treino solo · ' || r.pairs || ' pares', r.started_at
      from public.memory_solo_runs r join public.profiles p on p.id = r.user_id
     where r.finished

    union all
    select p.id, p.full_name, p.role::text, 'game:memory',
           'Duelo vs ' || coalesce(o.full_name, 'colega') || ' · ' || case when d.winner_id is null then 'empate' when d.winner_id = p.id then 'venceu' else 'perdeu' end,
           d.finished_at
      from public.memory_duels d
      join public.profiles p on p.id in (d.challenger_id, d.opponent_id)
      left join public.profiles o on o.id = case when d.challenger_id = p.id then d.opponent_id else d.challenger_id end
     where d.status = 'finished'

    union all
    select p.id, p.full_name, p.role::text, 'game:dress',
           case when dp.variant = 0 then 'Desafio do dia' else 'Treino' end || ' · nota ' || dp.score
             || case when dp.tickets_awarded > 0 then ' · +' || dp.tickets_awarded || ' 🎫' else '' end,
           coalesce(dp.finished_at, dp.created_at)
      from public.dress_plays dp join public.profiles p on p.id = dp.user_id
     where dp.finished

    union all
    select p.id, p.full_name, p.role::text, 'game:dress',
           'Publicou um look na Passarela (' || l.theme_character || ')', l.created_at
      from public.dress_runway_looks l join public.profiles p on p.id = l.user_id

    union all
    select p.id, p.full_name, p.role::text, 'game:dress', 'Votou na Passarela', v.created_at
      from public.dress_runway_votes v join public.profiles p on p.id = v.voter_id

    union all
    select p.id, p.full_name, p.role::text, 'game:arenasoccer',
           m.mode || ' · ' || case m.result when 'win' then 'vitória' when 'loss' then 'derrota' else 'empate' end
             || ' ' || m.goals_for || 'x' || m.goals_against || ' (' || m.level || ')', m.created_at
      from public.soccer_matches m join public.profiles p on p.id = m.user_id

    union all
    select p.id, p.full_name, p.role::text, 'game:arenasoccer', 'Mundo aberto · ' || f.text, f.at
      from public.soccer_world_feed f join public.profiles p on p.id = f.user_id
     where f.user_id is not null

    union all
    select p.id, p.full_name, p.role::text, 'game:arenacampanha',
           'Arena ' || (c.stage + 1) || ' · batalha ' || (c.tier + 1) || ' · ' || case c.result when 'win' then 'vitória' when 'loss' then 'derrota' else 'empate' end,
           c.finished_at
      from public.arena_campaign_matches c join public.profiles p on p.id = c.user_id
     where c.status = 'finished' and c.result is not null

    union all
    select p.id, p.full_name, p.role::text, 'game:store',
           'Comprou "' || coalesce(si.title, 'item') || '" por ' || gp.price, gp.created_at
      from public.game_purchases gp
      join public.profiles p on p.id = gp.user_id
      left join public.store_items si on si.id = gp.item_id
  ) x
  where x.created_at is not null
    and x.created_at >= now() - interval '24 hours'
    and (p_exclude_user is null or x.actor_id <> p_exclude_user)
  order by x.created_at desc
  limit p_limit;
end;
$fn$;
grant execute on function public.admin_recent_game_activity(uuid, int) to authenticated;

-- Complemento: torneios, missões da Arena e entrada no Mundo aberto do ArenaSoccer.
create or replace function public.admin_recent_game_activity_extra(p_exclude_user uuid default null, p_limit int default 1000)
returns table(actor_id uuid, actor_name text, actor_role text, action text, detail text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão.';
  end if;
  return query
  select x.actor_id, x.actor_name, x.actor_role, x.action, x.detail, x.created_at
  from (
    select p.id as actor_id, p.full_name as actor_name, p.role::text as actor_role, 'game:arena'::text as action,
           'Inscreveu-se no torneio "' || coalesce(t.name, 'torneio') || '"' as detail, e.created_at
      from public.arena_tournament_entries e
      join public.profiles p on p.id = e.user_id
      left join public.arena_tournaments t on t.id = e.tournament_id
     where e.confirmed
    union all
    select p.id, p.full_name, p.role::text, 'game:arena', 'Missão da Arena · +' || c.trophies || ' 🏆', c.claimed_at
      from public.arena_mission_claims c join public.profiles p on p.id = c.user_id
    union all
    select p.id, p.full_name, p.role::text, 'game:arenasoccer', 'Entrou no Mundo aberto como ' || w.name || ' (' || w.league || ')', w.created_at
      from public.soccer_world_players w join public.profiles p on p.id = w.user_id
  ) x
  where x.created_at is not null
    and x.created_at >= now() - interval '24 hours'
    and (p_exclude_user is null or x.actor_id <> p_exclude_user)
  order by x.created_at desc
  limit p_limit;
end;
$fn$;
grant execute on function public.admin_recent_game_activity_extra(uuid, int) to authenticated;
