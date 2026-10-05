-- Desafiar um colega (1x1 e duplas) não tem trava de batalhas nem limite apertado:
-- só um teto alto por dia pra evitar spam de convites.
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
  if (select count(*) from public.arena_pvp where challenger_id = me and created_at > now() - interval '24 hours') >= 200 then
    raise exception 'limit';
  end if;
  if exists (
    select 1 from public.arena_pvp
    where ((status = 'invited' and created_at > now() - interval '24 hours')
        or (status = 'accepted' and created_at > now() - interval '3 hours'))
      and ((challenger_id = me and opponent_id = p_opponent) or (challenger_id = p_opponent and opponent_id = me))
  ) then
    raise exception 'already_open';
  end if;
  insert into public.arena_pvp (challenger_id, opponent_id, seed, arena, challenger_deck)
  values (me, p_opponent, 1 + floor(random() * 2147483000)::int, greatest(0, least(7, coalesce(p_arena, 0))), p_deck)
  returning id into v_id;
  return v_id;
end $$;

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
  if (select count(*) from public.arena_duo where host_id = me and created_at > now() - interval '24 hours') >= 200 then raise exception 'limit'; end if;
  if exists (
    select 1 from public.arena_duo
    where ((status = 'invited' and created_at > now() - interval '24 hours')
        or (status = 'accepted' and created_at > now() - interval '3 hours'))
      and players && ids
  ) then raise exception 'already_open'; end if;
  insert into public.arena_duo (host_id, players, seed, arena, decks)
  values (me, ids, 1 + floor(random() * 2147483000)::int, greatest(0, least(7, coalesce(p_arena, 0))),
          jsonb_build_array(to_jsonb(p_deck), null, null, null))
  returning id into v_id;
  return v_id;
end $$;
