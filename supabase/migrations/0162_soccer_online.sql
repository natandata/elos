-- ArenaSoccer online: salas 1x1 entre jogadores de qualquer Elo (a partida roda no aparelho de quem criou a sala; o Realtime leva as jogadas e o estado).
alter table public.soccer_matches drop constraint if exists soccer_matches_level_check;
alter table public.soccer_matches add constraint soccer_matches_level_check check (level in ('easy','normal','hard','online'));

create or replace function public.soccer_record(p_mode text, p_level text, p_for integer, p_against integer, p_secs integer)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); res text;
begin
  if uid is null then return jsonb_build_object('error', 'Entre na sua conta.'); end if;
  if p_mode not in ('1v1','2v2','3v3','4v4') or p_level not in ('easy','normal','hard','online') then return jsonb_build_object('error', 'Partida inválida.'); end if;
  if p_for < 0 or p_for > 30 or p_against < 0 or p_against > 30 or p_secs < 10 or p_secs > 1800 then return jsonb_build_object('error', 'Partida inválida.'); end if;
  if exists (select 1 from public.soccer_matches where user_id = uid and created_at > now() - interval '15 seconds') then return jsonb_build_object('error', 'Calma, uma partida de cada vez.'); end if;
  res := case when p_for > p_against then 'win' when p_for < p_against then 'loss' else 'draw' end;
  insert into public.soccer_matches (user_id, mode, level, goals_for, goals_against, result, duration_s) values (uid, p_mode, p_level, p_for, p_against, res, p_secs);
  return jsonb_build_object('ok', true);
end;
$fn$;

create table if not exists public.soccer_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  host_name text not null,
  host_color text not null default '#3b82f6',
  guest_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  status text not null default 'open' check (status in ('open','playing','finished','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists soccer_rooms_open_idx on public.soccer_rooms (status, created_at desc);
alter table public.soccer_rooms enable row level security;
-- só quem participa lê a própria sala; a lista de salas abertas sai por função
drop policy if exists soccer_rooms_read on public.soccer_rooms;
create policy soccer_rooms_read on public.soccer_rooms for select using (host_id = auth.uid() or guest_id = auth.uid() or public.is_admin());

create or replace function public.soccer_can_play() returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('cria','leader','admin'));
$fn$;

-- cria uma sala (cancela as suas salas abertas antigas)
create or replace function public.soccer_room_create(p_color text)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); nm text; rid uuid;
begin
  if uid is null or not public.soccer_can_play() then return jsonb_build_object('error', 'Entre na sua conta.'); end if;
  select split_part(coalesce(nullif(trim(full_name), ''), 'Jogador'), ' ', 1) into nm from public.profiles where id = uid;
  update public.soccer_rooms set status = 'cancelled' where host_id = uid and status in ('open','playing');
  insert into public.soccer_rooms (host_id, host_name, host_color) values (uid, coalesce(nm, 'Jogador'), case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else '#3b82f6' end) returning id into rid;
  return jsonb_build_object('id', rid);
end;
$fn$;

-- salas abertas nos últimos 10 minutos, de qualquer Elo (sem a minha)
create or replace function public.soccer_rooms_open()
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'host', r.host_name, 'color', r.host_color, 'since', r.created_at) order by r.created_at desc), '[]'::jsonb)
    from public.soccer_rooms r
   where r.status = 'open' and r.guest_id is null and r.host_id <> auth.uid() and r.created_at > now() - interval '10 minutes' and public.soccer_can_play();
$fn$;

-- entra numa sala aberta (só um entra)
create or replace function public.soccer_room_join(p_room uuid)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); nm text; r public.soccer_rooms;
begin
  if uid is null or not public.soccer_can_play() then return jsonb_build_object('error', 'Entre na sua conta.'); end if;
  select split_part(coalesce(nullif(trim(full_name), ''), 'Jogador'), ' ', 1) into nm from public.profiles where id = uid;
  update public.soccer_rooms set guest_id = uid, guest_name = coalesce(nm, 'Jogador'), status = 'playing'
   where id = p_room and status = 'open' and guest_id is null and host_id <> uid and created_at > now() - interval '10 minutes'
   returning * into r;
  if not found then return jsonb_build_object('error', 'Essa sala já não está disponível.'); end if;
  return jsonb_build_object('id', r.id, 'host', r.host_name, 'color', r.host_color);
end;
$fn$;

-- estado da minha sala (o criador espera alguém entrar)
create or replace function public.soccer_room_state(p_room uuid)
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object('status', r.status, 'guest', r.guest_name)
    from public.soccer_rooms r where r.id = p_room and (r.host_id = auth.uid() or r.guest_id = auth.uid());
$fn$;

create or replace function public.soccer_room_close(p_room uuid, p_status text)
returns void
language sql security definer set search_path = public as $fn$
  update public.soccer_rooms set status = case when p_status = 'finished' then 'finished' else 'cancelled' end
   where id = p_room and (host_id = auth.uid() or guest_id = auth.uid()) and status in ('open','playing');
$fn$;

do $$ declare f text; begin
  foreach f in array array['soccer_can_play()','soccer_room_create(text)','soccer_rooms_open()','soccer_room_join(uuid)','soccer_room_state(uuid)','soccer_room_close(uuid,text)'] loop
    execute format('revoke execute on function public.%s from anon, public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
