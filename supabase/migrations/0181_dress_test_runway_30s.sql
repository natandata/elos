-- Ajusta o teste de regressão public._dress_test() aos novos tempos (desfile de 30 s sem adiantar).
do $mig$
declare d text;
begin
  d := pg_get_functiondef('public._dress_test'::regproc);
  d := replace(d, 'interval ''7 seconds''', 'interval ''31 seconds''');
  d := replace(d, 'interval ''15 seconds''', 'interval ''31 seconds''');
  d := replace(d, '20 todos votaram: passa para a proxima modelo', '20 passados os 30 s: proxima modelo');
  d := replace(d, '19 nao adianta antes de 6 s mesmo com todos os votos', '19 nao adianta o desfile mesmo com todos os votos');
  execute d;
  revoke all on function public._dress_test() from public, anon, authenticated;
end $mig$;
