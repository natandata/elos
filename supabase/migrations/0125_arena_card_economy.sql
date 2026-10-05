-- Economia do Arena dos Heróis estilo "cartas pra evoluir":
-- cada carta junta cópias; ao juntar o bastante, evolui (até o nível 15).
-- Cópias vêm de vitórias/derrotas, do baú diário da Arena e de baús comprados
-- com troféus. Os Pergaminhos deixam de existir (saldo vira cópias).

-- ------------------------------------------------------------ colunas
alter table public.arena_card_levels add column if not exists copies int not null default 0 check (copies >= 0);
alter table public.arena_card_levels drop constraint if exists arena_card_levels_level_check;
alter table public.arena_card_levels add constraint arena_card_levels_level_check check (level between 1 and 15);

alter table public.arena_stats add column if not exists chest_date date;

alter table public.arena_matches rename column scrolls_awarded to copies_awarded;
alter table public.arena_matches add column if not exists reward_card text;
alter table public.arena_pvp rename column scrolls_c to copies_c;
alter table public.arena_pvp rename column scrolls_o to copies_o;
alter table public.arena_pvp add column if not exists card_c text;
alter table public.arena_pvp add column if not exists card_o text;

-- ------------------------------------------------------------ saldo antigo de Pergaminhos vira cópias
-- (dividido igualmente entre as 8 cartas do baralho inicial)
insert into public.arena_card_levels (user_id, card, level, copies)
select s.user_id, c.card, 1, s.scrolls / 8
  from public.arena_stats s
 cross join (values ('davi'), ('joao'), ('jose'), ('gideao'), ('sansao'), ('maria'), ('mar'), ('trombetas')) as c(card)
 where s.scrolls >= 8
on conflict (user_id, card) do update set copies = public.arena_card_levels.copies + excluded.copies;

alter table public.arena_stats drop column if exists scrolls;

-- ------------------------------------------------------------ resultado da partida
drop function if exists public.arena_apply_result(uuid, int, text, int);
create or replace function public.arena_apply_result(p_user uuid, p_delta int, p_result text, p_copies int default 0, p_card text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_new int;
begin
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

-- ------------------------------------------------------------ baús
-- Abre um baú: o baú do dia só uma vez por dia; os demais custam troféus
-- (sai do total atual, nunca do recorde). Devolve os troféus que sobraram,
-- -1 se o baú do dia já foi aberto, -2 se faltam troféus.
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

-- ------------------------------------------------------------ evoluir carta (gasta cópias)
drop function if exists public.arena_upgrade_card(uuid, text, int);
create or replace function public.arena_upgrade_card(p_user uuid, p_card text, p_cost int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_level int; v_copies int;
begin
  select level, copies into v_level, v_copies from public.arena_card_levels where user_id = p_user and card = p_card for update;
  v_level := coalesce(v_level, 1);
  v_copies := coalesce(v_copies, 0);
  if v_level >= 15 then return -2; end if;
  if v_copies < p_cost then return -1; end if;
  insert into public.arena_card_levels (user_id, card, level, copies) values (p_user, p_card, v_level + 1, 0)
    on conflict (user_id, card) do update set level = v_level + 1, copies = public.arena_card_levels.copies - p_cost;
  return v_level + 1;
end $$;
revoke all on function public.arena_upgrade_card(uuid, text, int) from public, anon, authenticated;
grant execute on function public.arena_upgrade_card(uuid, text, int) to service_role;
