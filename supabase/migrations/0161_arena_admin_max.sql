-- Arena dos Heróis: o admin tem tudo no máximo (todas as arenas, todos os heróis no nível 15).
-- Ele nunca entra em ranking de usuário (os rankings só listam crias e líderes).
create or replace function public.arena_max_admin(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.arena_stats (user_id, trophies, best) values (p_user, 20000, 20000)
    on conflict (user_id) do update set trophies = 20000, best = greatest(public.arena_stats.best, 20000), updated_at = now();
  insert into public.arena_card_levels (user_id, card, level, copies)
    select p_user, k, 15, 99999
      from unnest(array['davi','sansao','gideao','miguel','moises','josue','noe','jesus','salomao','ester','jose','maria','daniel','joao','fogo','mar','adao','eva','jaco','isaque','isaias','jeremias','nabucodonosor','trombetas']) as k
    on conflict (user_id, card) do update set level = 15, copies = 99999, upgraded_at = coalesce(public.arena_card_levels.upgraded_at, now());
end $$;
revoke all on function public.arena_max_admin(uuid) from public, anon, authenticated;
grant execute on function public.arena_max_admin(uuid) to service_role;

-- resultado de partida: o admin continua no máximo (nada sobe nem desce)
create or replace function public.arena_apply_result(p_user uuid, p_delta int, p_result text, p_copies int default 0, p_card text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_new int;
begin
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    perform public.arena_max_admin(p_user);
    return 20000;
  end if;
  insert into public.arena_stats (user_id, trophies, best, wins, losses)
  values (p_user, greatest(0, p_delta), greatest(0, p_delta), (p_result = 'win')::int, (p_result = 'loss')::int)
  on conflict (user_id) do update set
    trophies = greatest(0, public.arena_stats.trophies + p_delta),
    best = greatest(public.arena_stats.best, public.arena_stats.trophies + p_delta),
    wins = public.arena_stats.wins + (p_result = 'win')::int,
    losses = public.arena_stats.losses + (p_result = 'loss')::int,
    updated_at = now()
  returning trophies into v_new;

  if p_card is not null and coalesce(p_copies, 0) > 0 then
    insert into public.arena_card_levels (user_id, card, level, copies) values (p_user, p_card, 1, p_copies)
    on conflict (user_id, card) do update set copies = public.arena_card_levels.copies + p_copies;
  end if;
  return v_new;
end $$;
revoke all on function public.arena_apply_result(uuid, int, text, int, text) from public, anon, authenticated;
grant execute on function public.arena_apply_result(uuid, int, text, int, text) to service_role;

-- baú: o admin não gasta troféus nem precisa esperar o baú do dia
create or replace function public.arena_open_chest(p_user uuid, p_daily boolean, p_cost int, p_grants jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_tr int;
  v_chest date;
  g jsonb;
begin
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    perform public.arena_max_admin(p_user);
    return 20000;
  end if;
  insert into public.arena_stats (user_id) values (p_user) on conflict (user_id) do nothing;
  select trophies, chest_date into v_tr, v_chest from public.arena_stats where user_id = p_user for update;

  if p_daily then
    if v_chest = v_today then return -1; end if;
    update public.arena_stats set chest_date = v_today, updated_at = now() where user_id = p_user;
  else
    if v_tr < greatest(coalesce(p_cost, 0), 1) then return -2; end if;
    update public.arena_stats set trophies = trophies - p_cost, updated_at = now() where user_id = p_user;
    v_tr := v_tr - p_cost;
  end if;

  for g in select * from jsonb_array_elements(p_grants) loop
    insert into public.arena_card_levels (user_id, card, level, copies)
    values (p_user, g->>'card', 1, (g->>'n')::int)
    on conflict (user_id, card) do update set copies = public.arena_card_levels.copies + (g->>'n')::int;
  end loop;
  return v_tr;
end $$;
revoke all on function public.arena_open_chest(uuid, boolean, int, jsonb) from public, anon, authenticated;
grant execute on function public.arena_open_chest(uuid, boolean, int, jsonb) to service_role;

-- aplica agora em todo admin existente
select public.arena_max_admin(id) from public.profiles where role = 'admin';
