-- Duelo 1x1: XP com teto diário por pessoa (2 XP/dia = uma vitória), pra um Elo
-- com mais gente ou duelos combinados não ganhar XP sem limite sobre os outros.
create or replace function public.game_duel_grant(p_user uuid, p_amount int)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_used int;
  v_give int;
begin
  select coalesce(sum(amount), 0) into v_used
    from public.xp_transactions
   where user_id = p_user and type = 'game_duel'
     and (created_at at time zone 'America/Sao_Paulo')::date = v_today;
  v_give := least(coalesce(p_amount, 0), greatest(2 - v_used, 0));
  if v_give > 0 then
    perform public.game_grant_xp(p_user, v_give, 'game_duel');
  end if;
end $fn$;

revoke execute on function public.game_duel_grant(uuid, int) from public, anon, authenticated;
grant execute on function public.game_duel_grant(uuid, int) to service_role;

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
      perform public.game_duel_grant(d.challenger_id, 1);
      perform public.game_duel_grant(d.opponent_id, 1);
    else
      perform public.game_duel_grant(v_winner, 2);
      perform public.check_and_grant_achievements(v_winner);
    end if;
  end if;

  return query
    select g.status, g.challenger_score, g.opponent_score, g.winner_id
      from public.game_duels g where g.id = p_duel;
end $fn$;

revoke execute on function public.game_duel_submit(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.game_duel_submit(uuid, uuid, int) to service_role;
