-- Vista o Herói ao vivo: o mínimo por partida passa de 3 para 2 jogadoras (o máximo continua 10; o Mega Desfile também começa com 2).
create or replace function public._dress_cfg(p_settings jsonb, p_key text)
returns integer language sql immutable as $fn$
  select coalesce(
    nullif(p_settings->>p_key, '')::integer,
    case p_key
      when 'intermission' then 20
      when 'theme'        then 8
      when 'dressing'     then 360
      when 'prep'         then 5
      when 'runway'       then 30
      when 'voting'       then 10
      when 'calc'         then 3
      when 'podium'       then 12
      when 'rewards'      then 10
      when 'min_players'  then 2
      when 'max_players'  then 10
      when 'daily_rounds' then 10
      else 10
    end)
$fn$;

do $mig$
declare d text;
begin
  d := pg_get_functiondef('public._dress_room_settle'::regproc);
  if position('k.total < 3' in d) = 0 or position('n.c >= 3' in d) = 0 or position(') >= 3' in d) = 0 then raise exception 'settle: trechos nao encontrados'; end if;
  d := replace(d, 'k.total < 3', 'k.total < 2');
  d := replace(d, 'n.c >= 3', 'n.c >= 2');
  d := replace(d, ') >= 3', ') >= 2');
  execute d;

  d := pg_get_functiondef('public.dress_mega_join'::regproc);
  if position('''min_players'', 3' in d) = 0 then raise exception 'mega_join: nao encontrado'; end if;
  execute replace(d, '''min_players'', 3', '''min_players'', 2');
  d := pg_get_functiondef('public.dress_mega_watch'::regproc);
  if position('''min_players'', 3' in d) = 0 then raise exception 'mega_watch: nao encontrado'; end if;
  execute replace(d, '''min_players'', 3', '''min_players'', 2');

  d := pg_get_functiondef('public._dress_test'::regproc);
  d := replace(d, '(s->>''min_players'')::int = 3', '(s->>''min_players'')::int = 2');
  d := replace(d, '02 limites: 3 a 10 jogadoras', '02 limites: 2 a 10 jogadoras');
  d := replace(d, '''03 com 2 ainda espera (minimo 3)'', ''ok'', s->>''phase'' = ''lobby''', '''03 com 2 ja comeca (minimo 2)'', ''ok'', s->>''phase'' = ''intermission''');
  d := replace(d, '''min_players'', 3', '''min_players'', 2');
  execute d;
  revoke all on function public._dress_test() from public, anon, authenticated;
end $mig$;
-- as salas Mega já criadas guardam o mínimo antigo; ajusta as que ainda estão esperando
update public.dress_rooms set settings = jsonb_set(settings, '{min_players}', '2') where code = 'MEGA' and phase = 'lobby';
