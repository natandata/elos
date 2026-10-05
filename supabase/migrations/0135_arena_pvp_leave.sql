create or replace function public.arena_pvp_leave(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.arena_pvp set status = 'declined'
   where id = p_id
     and tournament_match_id is null
     and auth.uid() in (challenger_id, opponent_id)
     and (status = 'invited' or (status = 'accepted' and first_report_at is null));
  if not found then raise exception 'not_found'; end if;
end $$;
revoke all on function public.arena_pvp_leave(uuid) from public, anon;
grant execute on function public.arena_pvp_leave(uuid) to authenticated;
