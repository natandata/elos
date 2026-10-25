-- ELOS — Spot Cria: as listas de faixas passam a informar se a faixa foi adicionada pela própria pessoa (para mostrar "Remover").

drop function if exists public.spot_list_tracks(text, text, int);
drop function if exists public.spot_playlist_items(uuid);

create or replace function public.spot_list_tracks(p_mode text, p_q text default null, p_limit int default 30)
returns table (id uuid, video_id text, title text, channel text, added_by_name text, created_at timestamptz, play_count int, like_count int, liked boolean, mine boolean)
language plpgsql stable security definer set search_path = public as $fn$
declare v_q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  if auth.uid() is null then return; end if;
  return query
  select t.id, t.video_id, t.title, t.channel,
         case when pr.id is null then null else split_part(pr.full_name, ' ', 1) end,
         t.created_at, t.play_count,
         (select count(*)::int from public.spot_likes l where l.track_id = t.id),
         exists (select 1 from public.spot_likes l where l.track_id = t.id and l.user_id = auth.uid()),
         t.added_by = auth.uid()
    from public.spot_tracks t
    left join public.profiles pr on pr.id = t.added_by
   where (p_mode <> 'mine_liked' or exists (select 1 from public.spot_likes l where l.track_id = t.id and l.user_id = auth.uid()))
     and (p_mode <> 'added_by_me' or t.added_by = auth.uid())
     and (v_q is null or t.title ilike '%' || v_q || '%' or t.channel ilike '%' || v_q || '%')
   order by
     case when p_mode = 'played' then t.play_count end desc nulls last,
     case when p_mode = 'liked_top' then (select count(*) from public.spot_likes l where l.track_id = t.id) end desc nulls last,
     t.created_at desc
   limit greatest(1, least(coalesce(p_limit, 30), 200));
end $fn$;
revoke execute on function public.spot_list_tracks(text, text, int) from public, anon;
grant execute on function public.spot_list_tracks(text, text, int) to authenticated;

create or replace function public.spot_playlist_items(p_playlist uuid)
returns table (id uuid, video_id text, title text, channel text, added_by_name text, created_at timestamptz, play_count int, like_count int, liked boolean, mine boolean)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.spot_playlists p where p.id = p_playlist and p.owner_id = auth.uid()) then return; end if;
  return query
  select t.id, t.video_id, t.title, t.channel,
         case when pr.id is null then null else split_part(pr.full_name, ' ', 1) end,
         t.created_at, t.play_count,
         (select count(*)::int from public.spot_likes l where l.track_id = t.id),
         exists (select 1 from public.spot_likes l where l.track_id = t.id and l.user_id = auth.uid()),
         t.added_by = auth.uid()
    from public.spot_playlist_tracks pt
    join public.spot_tracks t on t.id = pt.track_id
    left join public.profiles pr on pr.id = t.added_by
   where pt.playlist_id = p_playlist
   order by pt.added_at;
end $fn$;
revoke execute on function public.spot_playlist_items(uuid) from public, anon;
grant execute on function public.spot_playlist_items(uuid) to authenticated;
