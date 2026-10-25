-- ELOS — Spot Cria: a mesma pessoa não soma duas reproduções da mesma faixa em menos de 30 segundos (anti-inflação do contador).

create or replace function public.spot_play(p_track uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.spot_tracks where id = p_track) then return; end if;
  if exists (select 1 from public.spot_plays where user_id = auth.uid() and track_id = p_track and created_at > now() - interval '30 seconds') then return; end if;
  insert into public.spot_plays (user_id, track_id) values (auth.uid(), p_track);
  update public.spot_tracks set play_count = play_count + 1 where id = p_track;
end $fn$;
revoke execute on function public.spot_play(uuid) from public, anon;
grant execute on function public.spot_play(uuid) to authenticated;
