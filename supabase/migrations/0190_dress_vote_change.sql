-- Quem já avaliou um look pode mudar a nota enquanto a votação está aberta (não conta como novo voto nas missões).
do $mig$
declare d text;
begin
  d := pg_get_functiondef('public._dress_room_vote'::regproc);
  if position($$return jsonb_build_object('error', 'Você já avaliou este look.');$$ in d) = 0 then raise exception 'vote: trecho nao encontrado'; end if;
  d := replace(d, $$return jsonb_build_object('error', 'Você já avaliou este look.');$$,
    $$update public.dress_room_votes set stars = p_stars where room_id = r.id and round = r.round and voter_id = p_user and target_id = p_target;
    return jsonb_build_object('ok', true, 'changed', true);$$);
  execute d;
end $mig$;
