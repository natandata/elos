-- Arena dos Heróis: partida 1x1 em tempo real entre colegas do mesmo Elo.
-- Os dois aparelhos rodam o mesmo motor e trocam só as jogadas (Realtime);
-- no fim cada um manda um relatório e o servidor refaz a partida pra confirmar.
create table if not exists public.arena_pvp (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  seed integer not null,
  arena smallint not null default 0,
  challenger_deck text[] not null,
  opponent_deck text[],
  status text not null default 'invited' check (status in ('invited', 'accepted', 'finished', 'declined', 'disputed')),
  reports jsonb not null default '{}'::jsonb,
  first_report_at timestamptz,
  result text check (result in ('challenger', 'opponent', 'draw')),
  crowns_c int,
  crowns_o int,
  ticks int,
  why text,
  rewarded boolean not null default false,
  trophy_c int not null default 0,
  trophy_o int not null default 0,
  scrolls_c int not null default 0,
  scrolls_o int not null default 0,
  xp_c int not null default 0,
  xp_o int not null default 0,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  finished_at timestamptz,
  check (challenger_id <> opponent_id)
);
create index if not exists arena_pvp_challenger on public.arena_pvp (challenger_id, created_at desc);
create index if not exists arena_pvp_opponent on public.arena_pvp (opponent_id, created_at desc);

alter table public.arena_pvp enable row level security;
drop policy if exists arena_pvp_read on public.arena_pvp;
create policy arena_pvp_read on public.arena_pvp for select
  using (challenger_id = auth.uid() or opponent_id = auth.uid() or public.is_admin());

-- desafiar um colega do Elo (a semente é sorteada aqui, não pelo cliente)
create or replace function public.arena_pvp_create(p_opponent uuid, p_deck text[], p_arena int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid(); me_p record; op_p record; v_id uuid;
begin
  if me is null then raise exception 'auth'; end if;
  select role, elo_id into me_p from public.profiles where id = me;
  select role, elo_id into op_p from public.profiles where id = p_opponent;
  if me_p is null or op_p is null or me_p.role not in ('cria', 'leader') or op_p.role not in ('cria', 'leader') then
    raise exception 'not_allowed';
  end if;
  if me_p.elo_id is null or me_p.elo_id is distinct from op_p.elo_id or p_opponent = me then
    raise exception 'not_same_elo';
  end if;
  if (select count(*) from public.arena_pvp where challenger_id = me and created_at > now() - interval '24 hours') >= 8 then
    raise exception 'limit';
  end if;
  if exists (
    select 1 from public.arena_pvp
    where status in ('invited', 'accepted') and created_at > now() - interval '24 hours'
      and ((challenger_id = me and opponent_id = p_opponent) or (challenger_id = p_opponent and opponent_id = me))
  ) then
    raise exception 'already_open';
  end if;
  insert into public.arena_pvp (challenger_id, opponent_id, seed, arena, challenger_deck)
  values (me, p_opponent, 1 + floor(random() * 2147483000)::int, greatest(0, least(7, coalesce(p_arena, 0))), p_deck)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.arena_pvp_accept(p_id uuid, p_deck text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.arena_pvp
  set status = 'accepted', opponent_deck = p_deck, accepted_at = now()
  where id = p_id and opponent_id = auth.uid() and status = 'invited' and created_at > now() - interval '24 hours';
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.arena_pvp_decline(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.arena_pvp set status = 'declined'
  where id = p_id and opponent_id = auth.uid() and status = 'invited';
  if not found then raise exception 'not_found'; end if;
end $$;

-- cada jogador guarda o seu relatório uma vez só
create or replace function public.arena_pvp_report(p_id uuid, p_report jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare m record; v_role text;
begin
  select * into m from public.arena_pvp where id = p_id for update;
  if m is null or m.status <> 'accepted' then raise exception 'not_found'; end if;
  if auth.uid() = m.challenger_id then v_role := 'challenger';
  elsif auth.uid() = m.opponent_id then v_role := 'opponent';
  else raise exception 'not_found'; end if;
  if pg_column_size(p_report) > 80000 then raise exception 'too_big'; end if;
  if not (m.reports ? v_role) then
    update public.arena_pvp
    set reports = reports || jsonb_build_object(v_role, p_report), first_report_at = coalesce(first_report_at, now())
    where id = p_id;
  end if;
  return (select count(*) from jsonb_object_keys((select reports from public.arena_pvp where id = p_id)))::int;
end $$;

revoke all on function public.arena_pvp_create(uuid, text[], int) from public, anon;
revoke all on function public.arena_pvp_accept(uuid, text[]) from public, anon;
revoke all on function public.arena_pvp_decline(uuid) from public, anon;
revoke all on function public.arena_pvp_report(uuid, jsonb) from public, anon;
grant execute on function public.arena_pvp_create(uuid, text[], int) to authenticated;
grant execute on function public.arena_pvp_accept(uuid, text[]) to authenticated;
grant execute on function public.arena_pvp_decline(uuid) to authenticated;
grant execute on function public.arena_pvp_report(uuid, jsonb) to authenticated;
