-- ArenaSoccer online em equipe (2x2, 3x3, 4x4) com times de verdade: só a lista de salas abertas fica no banco;
-- quem está na sala conversa por um canal de Realtime (a partida roda no aparelho de quem criou a sala).
create table if not exists public.soccer_team_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  host_name text not null,
  per int not null check (per in (2, 3, 4)),
  label text not null,
  humans int not null default 1,
  status text not null default 'open' check (status in ('open','playing','finished','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists soccer_team_rooms_open_idx on public.soccer_team_rooms (status, created_at desc);
alter table public.soccer_team_rooms enable row level security;
drop policy if exists soccer_team_rooms_read on public.soccer_team_rooms;
create policy soccer_team_rooms_read on public.soccer_team_rooms for select using (host_id = auth.uid() or public.is_admin());

create or replace function public.soccer_team_room_create(p_per int, p_label text)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); nm text; rid uuid;
begin
  if uid is null or not public.soccer_can_play() then return jsonb_build_object('error', 'Entre na sua conta.'); end if;
  if p_per not in (2, 3, 4) then return jsonb_build_object('error', 'Tamanho inválido.'); end if;
  select split_part(coalesce(nullif(trim(full_name), ''), 'Jogador'), ' ', 1) into nm from public.profiles where id = uid;
  update public.soccer_team_rooms set status = 'cancelled' where host_id = uid and status in ('open','playing');
  insert into public.soccer_team_rooms (host_id, host_name, per, label) values (uid, coalesce(nm, 'Jogador'), p_per, left(coalesce(p_label, ''), 80)) returning id into rid;
  return jsonb_build_object('id', rid, 'name', coalesce(nm, 'Jogador'));
end;
$fn$;

create or replace function public.soccer_team_rooms_open()
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'host', r.host_name, 'per', r.per, 'label', r.label, 'humans', r.humans) order by r.created_at desc), '[]'::jsonb)
    from public.soccer_team_rooms r
   where r.status = 'open' and r.host_id <> auth.uid() and r.humans < r.per * 2 and r.created_at > now() - interval '20 minutes' and public.soccer_can_play();
$fn$;

create or replace function public.soccer_team_room_set(p_room uuid, p_humans int, p_status text)
returns void
language sql security definer set search_path = public as $fn$
  update public.soccer_team_rooms
     set humans = greatest(1, least(coalesce(p_humans, humans), per * 2)),
         status = case when p_status in ('open','playing','finished','cancelled') then p_status else status end
   where id = p_room and host_id = auth.uid();
$fn$;

do $$ declare f text; begin
  foreach f in array array['soccer_team_room_create(int,text)','soccer_team_rooms_open()','soccer_team_room_set(uuid,int,text)'] loop
    execute format('revoke execute on function public.%s from anon, public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
