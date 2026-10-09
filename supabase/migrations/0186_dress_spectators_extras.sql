-- Espectadoras: sair da sala também tira a pessoa da plateia, e o teste de regressão cobre a plateia.
do $mig$
declare d text; a text;
begin
  d := pg_get_functiondef('public._dress_room_leave'::regproc);
  a := '  if not found then return; end if;';
  if position(a in d) = 0 then raise exception 'leave: nao encontrado'; end if;
  d := replace(d, a, a || chr(10) || '  delete from public.dress_room_spectators where room_id = r.id and user_id = p_user;');
  execute d;
end $mig$;

-- testes 30 a 35 de public._dress_test(): espectadora entra e consulta, jogadoras veem quem assiste, plateia não ocupa vaga,
-- não vota, jogadora não assiste a própria sala e quem entra para jogar sai da plateia (ver a migração aplicada "dress_test_spectators").
