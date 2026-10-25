-- ELOS — Spot Cria: biblioteca compartilhada de músicas (links do YouTube tocados no player do app), curtidas e playlists pessoais.
-- Substitui o "Louvor do dia": os louvores já postados entram na biblioteca.

create table if not exists public.spot_tracks (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null,
  channel text not null default '',
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  play_count int not null default 0
);
create index if not exists spot_tracks_recent_idx on public.spot_tracks (created_at desc);
alter table public.spot_tracks enable row level security;
drop policy if exists spot_tracks_read on public.spot_tracks;
create policy spot_tracks_read on public.spot_tracks for select to authenticated using (true);
drop policy if exists spot_tracks_insert on public.spot_tracks;
create policy spot_tracks_insert on public.spot_tracks for insert to authenticated with check (added_by = auth.uid());
drop policy if exists spot_tracks_delete on public.spot_tracks;
create policy spot_tracks_delete on public.spot_tracks for delete to authenticated using (added_by = auth.uid() or public.is_admin());

create table if not exists public.spot_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.spot_tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
alter table public.spot_likes enable row level security;
drop policy if exists spot_likes_own on public.spot_likes;
create policy spot_likes_own on public.spot_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.spot_playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists spot_playlists_owner_idx on public.spot_playlists (owner_id);
alter table public.spot_playlists enable row level security;
drop policy if exists spot_playlists_own on public.spot_playlists;
create policy spot_playlists_own on public.spot_playlists for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.spot_playlist_tracks (
  playlist_id uuid not null references public.spot_playlists(id) on delete cascade,
  track_id uuid not null references public.spot_tracks(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);
alter table public.spot_playlist_tracks enable row level security;
drop policy if exists spot_playlist_tracks_own on public.spot_playlist_tracks;
create policy spot_playlist_tracks_own on public.spot_playlist_tracks for all to authenticated
  using (exists (select 1 from public.spot_playlists p where p.id = playlist_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.spot_playlists p where p.id = playlist_id and p.owner_id = auth.uid()));

-- cada reprodução (para "Mais ouvidas" e para o painel do admin); só a função escreve
create table if not exists public.spot_plays (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.spot_tracks(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists spot_plays_recent_idx on public.spot_plays (created_at desc);
alter table public.spot_plays enable row level security;
drop policy if exists spot_plays_admin_read on public.spot_plays;
create policy spot_plays_admin_read on public.spot_plays for select to authenticated using (public.is_admin());

create or replace function public.spot_play(p_track uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.spot_tracks where id = p_track) then return; end if;
  insert into public.spot_plays (user_id, track_id) values (auth.uid(), p_track);
  update public.spot_tracks set play_count = play_count + 1 where id = p_track;
end $fn$;
revoke execute on function public.spot_play(uuid) from public, anon;
grant execute on function public.spot_play(uuid) to authenticated;

-- lista de faixas com contadores. modo: recent | played | liked_top | mine_liked | added_by_me | search
create or replace function public.spot_list_tracks(p_mode text, p_q text default null, p_limit int default 30)
returns table (id uuid, video_id text, title text, channel text, added_by_name text, created_at timestamptz, play_count int, like_count int, liked boolean)
language plpgsql stable security definer set search_path = public as $fn$
declare v_q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  if auth.uid() is null then return; end if;
  return query
  select t.id, t.video_id, t.title, t.channel,
         case when pr.id is null then null else split_part(pr.full_name, ' ', 1) end,
         t.created_at, t.play_count,
         (select count(*)::int from public.spot_likes l where l.track_id = t.id),
         exists (select 1 from public.spot_likes l where l.track_id = t.id and l.user_id = auth.uid())
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
returns table (id uuid, video_id text, title text, channel text, added_by_name text, created_at timestamptz, play_count int, like_count int, liked boolean)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.spot_playlists p where p.id = p_playlist and p.owner_id = auth.uid()) then return; end if;
  return query
  select t.id, t.video_id, t.title, t.channel,
         case when pr.id is null then null else split_part(pr.full_name, ' ', 1) end,
         t.created_at, t.play_count,
         (select count(*)::int from public.spot_likes l where l.track_id = t.id),
         exists (select 1 from public.spot_likes l where l.track_id = t.id and l.user_id = auth.uid())
    from public.spot_playlist_tracks pt
    join public.spot_tracks t on t.id = pt.track_id
    left join public.profiles pr on pr.id = t.added_by
   where pt.playlist_id = p_playlist
   order by pt.added_at;
end $fn$;
revoke execute on function public.spot_playlist_items(uuid) from public, anon;
grant execute on function public.spot_playlist_items(uuid) to authenticated;

-- minhas playlists com contagem e até 4 capas
create or replace function public.spot_my_playlists()
returns table (id uuid, name text, track_count int, covers text[])
language sql stable security definer set search_path = public as $fn$
  select p.id, p.name,
         (select count(*)::int from public.spot_playlist_tracks pt where pt.playlist_id = p.id),
         coalesce((select array_agg(x.video_id) from (
            select t.video_id from public.spot_playlist_tracks pt join public.spot_tracks t on t.id = pt.track_id
             where pt.playlist_id = p.id order by pt.added_at limit 4) x), '{}')
    from public.spot_playlists p
   where p.owner_id = auth.uid()
   order by p.created_at desc;
$fn$;
revoke execute on function public.spot_my_playlists() from public, anon;
grant execute on function public.spot_my_playlists() to authenticated;

-- os louvores do dia já postados entram na biblioteca
insert into public.spot_tracks (video_id, title, channel, added_by, created_at)
select d.video_id, d.title, coalesce(d.channel, ''), d.user_id, d.created_at
  from public.daily_praise d
 where d.video_id ~ '^[A-Za-z0-9_-]{11}$'
on conflict (video_id) do nothing;
