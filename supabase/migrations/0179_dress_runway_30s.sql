-- Vista o Herói ao vivo: cada modelo fica 30 s na passarela enquanto as outras votam.
create or replace function public._dress_cfg(p_settings jsonb, p_key text)
returns integer language sql immutable as $fn$
  select coalesce(
    nullif(p_settings->>p_key, '')::integer,
    case p_key
      when 'intermission' then 20
      when 'theme'        then 8
      when 'dressing'     then 360
      when 'prep'         then 5
      when 'runway'       then 30   -- cada modelo na passarela (as outras votam com estrelas)
      when 'voting'       then 10   -- últimos votos
      when 'calc'         then 3
      when 'podium'       then 12
      when 'rewards'      then 10
      when 'min_players'  then 2
      when 'max_players'  then 8
      when 'daily_rounds' then 12
      else 10
    end)
$fn$;
