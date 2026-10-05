-- Missões da Arena dos Heróis (do jogo, separadas das missões do aplicativo):
-- diárias, com troféus de prêmio (no máximo 5 por missão). O progresso é
-- calculado das partidas e evoluções do dia; aqui só ficam as já resgatadas.
create table if not exists public.arena_mission_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission text not null,
  day date not null,
  trophies int not null check (trophies between 0 and 5),
  claimed_at timestamptz not null default now(),
  primary key (user_id, mission, day)
);
alter table public.arena_mission_claims enable row level security;
drop policy if exists arena_mission_claims_read on public.arena_mission_claims;
create policy arena_mission_claims_read on public.arena_mission_claims for select using (user_id = auth.uid() or public.is_admin());

-- quando a carta foi evoluída pela última vez (pra missão "evolua um herói")
alter table public.arena_card_levels add column if not exists upgraded_at timestamptz;

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
  insert into public.arena_card_levels (user_id, card, level, copies, upgraded_at) values (p_user, p_card, v_level + 1, 0, now())
    on conflict (user_id, card) do update set level = v_level + 1, copies = public.arena_card_levels.copies - p_cost, upgraded_at = now();
  return v_level + 1;
end $$;
revoke all on function public.arena_upgrade_card(uuid, text, int) from public, anon, authenticated;
grant execute on function public.arena_upgrade_card(uuid, text, int) to service_role;
