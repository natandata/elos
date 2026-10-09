-- Ajusta o teste do Mega Desfile: simula as consultas da sala (a limpeza do lobby tira quem some por mais de 2 min).
do $mig$
declare d text;
begin
  d := pg_get_functiondef('public._dress_test'::regproc);
  d := replace(d, 't := ev + interval ''1 second'';', 't := ev - interval ''10 seconds''; s := public._dress_room_state(d, rcode2, t); s := public._dress_room_state(a, rcode2, t); s := public._dress_room_state(b, rcode2, t); t := ev + interval ''1 second'';');
  d := replace(d, 't := ev - interval ''10 seconds'';', 'for n in 1..12 loop t := ''2030-01-06 14:35:00-03''::timestamptz + make_interval(mins => n * 2); s := public._dress_room_state(d, rcode2, t); s := public._dress_room_state(a, rcode2, t); s := public._dress_room_state(b, rcode2, t); end loop; t := ev - interval ''10 seconds'';');
  execute d;
  revoke all on function public._dress_test() from public, anon, authenticated;
end $mig$;
