-- Título escolhido (troféu) aparece junto do nome da jogadora no estado da sala.
do $mig$
declare d text;
begin
  d := pg_get_functiondef('public._dress_room_state'::regproc);
  if position($$'id', p.user_id, 'name', p.name,$$ in d) = 0 then raise exception 'state: trecho nao encontrado'; end if;
  d := replace(d, $$'id', p.user_id, 'name', p.name,$$, $$'id', p.user_id, 'name', p.name, 'title', (select pr.title from public.dress_profile_pref pr where pr.user_id = p.user_id),$$);
  execute d;
end $mig$;
