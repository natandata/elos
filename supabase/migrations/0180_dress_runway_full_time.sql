-- Vista o Herói ao vivo: cada modelo fica os 30 s inteiros na passarela, mesmo que todas já tenham votado
-- (antes o desfile pulava para a próxima modelo 6 s depois do último voto).
do $mig$
declare d text;
begin
  d := pg_get_functiondef('public._dress_room_tick'::regproc);
  if position('exit when p_now < r.phase_ends_at and not (v_pending = 0 and p_now >= r.phase_started_at + interval ''6 seconds'');' in d) = 0 then
    raise exception 'trecho nao encontrado';
  end if;
  d := replace(d, 'exit when p_now < r.phase_ends_at and not (v_pending = 0 and p_now >= r.phase_started_at + interval ''6 seconds'');', 'exit when p_now < r.phase_ends_at;');
  execute d;
end $mig$;
