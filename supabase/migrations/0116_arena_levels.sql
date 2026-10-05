-- Níveis de carta e Pergaminhos (moeda da Arena).
alter table public.arena_stats add column if not exists scrolls int not null default 0 check (scrolls >= 0);
alter table public.arena_matches add column if not exists levels jsonb not null default '{}'::jsonb;
alter table public.arena_matches add column if not exists scrolls_awarded int not null default 0;

create table if not exists public.arena_card_levels (
  user_id uuid not null references public.profiles(id) on delete cascade,
  card text not null,
  level smallint not null default 1 check (level between 1 and 5),
  primary key (user_id, card)
);
alter table public.arena_card_levels enable row level security;
drop policy if exists arena_card_levels_read on public.arena_card_levels;
create policy arena_card_levels_read on public.arena_card_levels for select using (user_id = auth.uid() or public.is_admin());

-- resultado da partida agora também paga Pergaminhos
drop function if exists public.arena_apply_result(uuid, int, text);
create or replace function public.arena_apply_result(p_user uuid, p_delta int, p_result text, p_scrolls int default 0)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_new int;
begin
  insert into public.arena_stats (user_id, trophies, best, wins, losses, scrolls)
  values (p_user, greatest(0, p_delta), greatest(0, p_delta), (p_result = 'win')::int, (p_result = 'loss')::int, greatest(0, p_scrolls))
  on conflict (user_id) do update set
    trophies = greatest(0, public.arena_stats.trophies + p_delta),
    best = greatest(public.arena_stats.best, public.arena_stats.trophies + p_delta),
    wins = public.arena_stats.wins + (p_result = 'win')::int,
    losses = public.arena_stats.losses + (p_result = 'loss')::int,
    scrolls = public.arena_stats.scrolls + greatest(0, p_scrolls),
    updated_at = now()
  returning trophies into v_new;
  return v_new;
end $$;
revoke all on function public.arena_apply_result(uuid, int, text, int) from public, anon, authenticated;
grant execute on function public.arena_apply_result(uuid, int, text, int) to service_role;

-- evoluir uma carta: debita os Pergaminhos e sobe o nível numa transação só
create or replace function public.arena_upgrade_card(p_user uuid, p_card text, p_cost int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_level int; v_scrolls int;
begin
  select scrolls into v_scrolls from public.arena_stats where user_id = p_user for update;
  if v_scrolls is null or v_scrolls < p_cost then return -1; end if;
  select level into v_level from public.arena_card_levels where user_id = p_user and card = p_card;
  v_level := coalesce(v_level, 1);
  if v_level >= 5 then return -2; end if;
  update public.arena_stats set scrolls = scrolls - p_cost, updated_at = now() where user_id = p_user;
  insert into public.arena_card_levels (user_id, card, level) values (p_user, p_card, v_level + 1)
    on conflict (user_id, card) do update set level = v_level + 1;
  return v_level + 1;
end $$;
revoke all on function public.arena_upgrade_card(uuid, text, int) from public, anon, authenticated;
grant execute on function public.arena_upgrade_card(uuid, text, int) to service_role;
