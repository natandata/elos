-- Mega Desfile: toda sexta-feira às 19h (Brasília), no lugar do domingo às 15h.
create or replace function public._dress_mega_event(p_now timestamptz)
returns timestamptz language plpgsql immutable as $fn$
declare loc timestamp := p_now at time zone 'America/Sao_Paulo'; fri date; ev timestamptz;
begin
  fri := loc::date - ((extract(dow from loc)::int + 2) % 7);
  ev := (fri + time '19:00') at time zone 'America/Sao_Paulo';
  if p_now > ev + interval '45 minutes' then ev := ((fri + 7) + time '19:00') at time zone 'America/Sao_Paulo'; end if;
  return ev;
end $fn$;
