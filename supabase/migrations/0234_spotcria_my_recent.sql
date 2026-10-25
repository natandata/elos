-- ELOS — Spot Cria: modo "my_recent" (o que a própria pessoa ouviu por último) para a prateleira "Volte a ouvir".

drop function if exists public.spot_list_tracks(text, text, int);

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
     and (p_mode <> 'my_recent' or exists (select 1 from public.spot_plays sp where sp.track_id = t.id and sp.user_id = auth.uid()))
     and (v_q is null or t.title ilike '%' || v_q || '%' or t.channel ilike '%' || v_q || '%')
   order by
     case when p_mode = 'my_recent' then (select max(sp.created_at) from public.spot_plays sp where sp.track_id = t.id and sp.user_id = auth.uid()) end desc nulls last,
     case when p_mode = 'played' then t.play_count end desc nulls last,
     case when p_mode = 'liked_top' then (select count(*) from public.spot_likes l where l.track_id = t.id) end desc nulls last,
     t.created_at desc
   limit greatest(1, least(coalesce(p_limit, 30), 200));
end $fn$;
revoke execute on function public.spot_list_tracks(text, text, int) from public, anon;
grant execute on function public.spot_list_tracks(text, text, int) to authenticated;
