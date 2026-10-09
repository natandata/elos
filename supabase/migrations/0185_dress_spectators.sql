-- Vista o Herói ao vivo: espectadoras. Entram na sala sem jogar, ficam invisíveis para as jogadoras (que só recebem um aviso discreto)
-- e assistem às jogadoras andando no salão e ao desfile. Não votam, não ganham prêmio e não ocupam vaga.

create table if not exists public.dress_room_spectators (
  room_id   uuid not null references public.dress_rooms(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  name      text not null,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table public.dress_room_spectators enable row level security;

create or replace function public._dress_room_watch(p_user uuid, p_code text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare r public.dress_rooms; v_name text; v_count integer;
begin
  select * into r from public.dress_rooms where code = upper(trim(p_code)) for update;
  if not found or r.phase = 'closed' then return jsonb_build_object('error', 'Sala não encontrada. Confira o código.'); end if;
  if exists (select 1 from public.dress_room_players where room_id = r.id and user_id = p_user) then
    return jsonb_build_object('error', 'Você está jogando nesta sala. Saia dela antes de assistir.');
  end if;
  delete from public.dress_room_spectators where room_id = r.id and last_seen < p_now - interval '5 minutes';
  if not exists (select 1 from public.dress_room_spectators where room_id = r.id and user_id = p_user) then
    select count(*) into v_count from public.dress_room_spectators where room_id = r.id;
    if v_count >= 100 then return jsonb_build_object('error', 'A plateia desta sala está lotada.'); end if;
    select coalesce(nullif(trim(full_name), ''), 'Jogadora') into v_name from public.profiles where id = p_user;
    if v_name is null then return jsonb_build_object('error', 'Perfil não encontrado.'); end if;
    delete from public.dress_room_players where user_id = p_user;
    delete from public.dress_room_spectators where user_id = p_user;
    insert into public.dress_room_spectators (room_id, user_id, name, joined_at, last_seen) values (r.id, p_user, v_name, p_now, p_now);
  else
    update public.dress_room_spectators set last_seen = p_now where room_id = r.id and user_id = p_user;
  end if;
  return jsonb_build_object('ok', true);
end $fn$;

create or replace function public.dress_room_watch(p_code text)
returns jsonb language sql security definer set search_path to 'public' as $fn$
  select public._dress_room_watch(public._dress_uid(), p_code, now())
$fn$;

-- Mega Desfile: assistir sem jogar
create or replace function public.dress_mega_watch()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_now timestamptz := now(); ev timestamptz := public._dress_mega_event(now()); r public.dress_rooms; res jsonb;
begin
  if v_now < ev - interval '30 minutes' then
    return jsonb_build_object('error', 'A sala do Mega Desfile abre 30 minutos antes (domingo, 15h).');
  end if;
  if v_now > ev + interval '30 minutes' then
    return jsonb_build_object('error', 'O Mega Desfile desta semana já terminou. Volte no próximo domingo!');
  end if;
  select * into r from public.dress_rooms where code = 'MEGA';
  if found and (r.settings->>'event_start')::timestamptz is distinct from ev then
    delete from public.dress_rooms where id = r.id;
    r := null;
  end if;
  if r.id is null then
    begin
      insert into public.dress_rooms (code, host_id, is_public, phase, phase_started_at, phase_ends_at, settings, updated_at)
      values ('MEGA', v_uid, false, 'lobby', v_now, ev,
              jsonb_build_object('mega', true, 'event_start', ev, 'max_players', 60, 'min_players', 3, 'runway', 15, 'voting', 15, 'intermission', 15), v_now);
    exception when unique_violation then
      null;
    end;
  end if;
  res := public._dress_room_watch(v_uid, 'MEGA', v_now);
  if res ? 'error' then return res; end if;
  return jsonb_build_object('ok', true, 'code', 'MEGA');
end $fn$;

do $mig$
declare d text; a text; b text;
begin
  -- quem vira jogadora deixa de ser plateia
  d := pg_get_functiondef('public._dress_room_join'::regproc);
  a := '  delete from public.dress_room_players where user_id = p_user;';
  if position(a in d) = 0 then raise exception 'join: nao encontrado'; end if;
  d := replace(d, a, a || chr(10) || '  delete from public.dress_room_spectators where user_id = p_user;');
  execute d;
  d := pg_get_functiondef('public._dress_room_create'::regproc);
  if position(a in d) = 0 then raise exception 'create: nao encontrado'; end if;
  d := replace(d, a, a || chr(10) || '  delete from public.dress_room_spectators where user_id = p_user;');
  execute d;

  -- estado: a plateia também consulta (sem aparecer para as jogadoras) e as jogadoras veem quem está assistindo
  d := pg_get_functiondef('public._dress_room_state'::regproc);
  a := 'declare r public.dress_rooms; v_hide boolean;';
  if position(a in d) = 0 then raise exception 'state: declare nao encontrado'; end if;
  d := replace(d, a, 'declare r public.dress_rooms; v_spec boolean; v_hide boolean;');
  a := '  if not exists (select 1 from public.dress_room_players where room_id = r.id and user_id = p_user) then' || chr(10)
    || '    return jsonb_build_object(''error'', ''Você não está nesta sala.'');' || chr(10)
    || '  end if;' || chr(10)
    || '  update public.dress_room_players set last_seen = p_now where room_id = r.id and user_id = p_user;';
  if position(a in d) = 0 then raise exception 'state: bloco nao encontrado'; end if;
  b := '  v_spec := not exists (select 1 from public.dress_room_players where room_id = r.id and user_id = p_user);' || chr(10)
    || '  if v_spec then' || chr(10)
    || '    if not exists (select 1 from public.dress_room_spectators where room_id = r.id and user_id = p_user) then' || chr(10)
    || '      return jsonb_build_object(''error'', ''Você não está nesta sala.'');' || chr(10)
    || '    end if;' || chr(10)
    || '    update public.dress_room_spectators set last_seen = p_now where room_id = r.id and user_id = p_user;' || chr(10)
    || '  else' || chr(10)
    || '    update public.dress_room_players set last_seen = p_now where room_id = r.id and user_id = p_user;' || chr(10)
    || '  end if;';
  d := replace(d, a, b);
  a := '  return jsonb_build_object(' || chr(10) || '    ''code'', r.code,';
  if position(a in d) = 0 then raise exception 'state: return nao encontrado'; end if;
  b := '  if v_me is null then' || chr(10)
    || '    v_me := jsonb_build_object(''id'', p_user, ''eligible'', false, ''ready'', false, ''look'', ''{}''::jsonb, ''beauty'', ''{}''::jsonb, ''pose'', ''modelo'', ''tickets'', coalesce(v_tickets, 0), ''voted'', ''[]''::jsonb);' || chr(10)
    || '  end if;' || chr(10) || a;
  d := replace(d, a, b);
  a := '''mega'', coalesce(';
  if position(a in d) = 0 then raise exception 'state: mega nao encontrado'; end if;
  b := '''spectator'', v_spec, ''spectators'', coalesce((select jsonb_agg(jsonb_build_object(''id'', sp.user_id, ''name'', sp.name) order by sp.joined_at) from public.dress_room_spectators sp where sp.room_id = r.id and sp.last_seen > p_now - interval ''25 seconds''), ''[]''::jsonb), ' || a;
  d := replace(d, a, b);
  execute d;
end $mig$;

revoke all on function public.dress_room_watch(text) from public, anon;
revoke all on function public.dress_mega_watch() from public, anon;
grant execute on function public.dress_room_watch(text) to authenticated;
grant execute on function public.dress_mega_watch() to authenticated;
