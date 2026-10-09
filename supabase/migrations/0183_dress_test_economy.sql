-- Teste de regressão do Vista o Herói ao vivo (3 a 10 jogadoras, economia 30/20/10, XP, missões, troca e Mega Desfile).
-- Uso: select public._dress_test();  (faz rollback no fim; precisa de 4 contas 'cria' no banco)

drop function if exists public._dress_test_play(text, timestamptz, uuid, uuid, uuid, integer);
create or replace function public._dress_test_play(p_code text, p_t timestamptz, p_a uuid, p_b uuid, p_c uuid, p_step integer)
returns timestamptz language plpgsql as $fn$
declare t timestamptz := p_t; s jsonb; i int; cur uuid; voter uuid;
begin
  perform public._dress_room_set_look(p_a, p_code, '{"tunic":"tunic_simple"}', '{}', 'modelo', true, t);
  perform public._dress_room_set_look(p_b, p_code, '{"tunic":"tunic_blue"}', '{}', 'modelo', true, t + interval '1 second');
  perform public._dress_room_set_look(p_c, p_code, '{"tunic":"tunic_simple","shoes":"heels__preto"}', '{"hair":"bob"}', 'elegante', true, t + interval '2 seconds');
  t := t + interval '3 seconds';
  s := public._dress_room_state(p_a, p_code, t);
  t := t + interval '6 seconds';
  s := public._dress_room_state(p_a, p_code, t);
  for i in 1..3 loop
    s := public._dress_room_state(p_a, p_code, t);
    cur := (s->'order'->>((s->>'idx')::int - 1))::uuid;
    foreach voter in array array[p_a, p_b, p_c] loop
      if voter <> cur then
        perform public._dress_room_vote(voter, p_code, cur, case cur when p_a then 5 when p_b then 4 else 1 end, t);
      end if;
    end loop;
    t := t + make_interval(secs => p_step + 1);
    s := public._dress_room_state(p_a, p_code, t);
  end loop;
  t := t + interval '4 seconds';
  s := public._dress_room_state(p_a, p_code, t);
  t := t + interval '4 seconds';
  s := public._dress_room_state(p_a, p_code, t);
  return t;
end $fn$;

create or replace function public._dress_test()
returns jsonb language plpgsql as $fn$
declare
  u uuid[]; a uuid; b uuid; c uuid; d uuid;
  t timestamptz := '2030-01-02 12:00:00-03';
  rcode text; rcode2 text; s jsonb; v jsonb; log jsonb := '[]'::jsonb;
  ta int; tb int; tc int; xa int; n int; ev timestamptz := '2030-01-06 15:00:00-03'; td date;
begin
  begin
    select array_agg(id) into u from (select id from public.profiles where role = 'cria' order by created_at limit 4) q;
    a := u[1]; b := u[2]; c := u[3]; d := u[4];
    select coalesce((select tickets from public.dress_stats where user_id = a), 0) into ta;
    select coalesce((select tickets from public.dress_stats where user_id = b), 0) into tb;
    select coalesce((select tickets from public.dress_stats where user_id = c), 0) into tc;
    select xp into xa from public.profiles where id = a;

    rcode := public._dress_room_create(a, true, t);
    s := public._dress_room_state(a, rcode, t);
    log := log || jsonb_build_object('t', '01 sozinha fica no lobby', 'ok', s->>'phase' = 'lobby', 'got', s->>'phase');
    log := log || jsonb_build_object('t', '02 limites: 3 a 10 jogadoras', 'ok', (s->>'min_players')::int = 3 and (s->>'max_players')::int = 10, 'got', jsonb_build_array(s->'min_players', s->'max_players'));
    v := public._dress_room_join(b, rcode, t);
    s := public._dress_room_state(a, rcode, t); s := public._dress_room_state(b, rcode, t);
    log := log || jsonb_build_object('t', '03 com 2 ainda espera (minimo 3)', 'ok', s->>'phase' = 'lobby', 'got', s->>'phase');
    v := public._dress_room_join(c, rcode, t);
    s := public._dress_room_state(a, rcode, t);
    log := log || jsonb_build_object('t', '04 com 3 vai para o intervalo', 'ok', s->>'phase' = 'intermission' and (s->>'left_ms')::int = 20000, 'got', s->>'phase');
    t := t + interval '21 seconds';
    s := public._dress_room_state(b, rcode, t); s := public._dress_room_state(c, rcode, t); s := public._dress_room_state(a, rcode, t);
    log := log || jsonb_build_object('t', '05 tema revelado', 'ok', s->>'phase' = 'theme' and (s->>'round')::int = 1, 'got', s->>'phase');
    t := t + interval '9 seconds';
    s := public._dress_room_state(b, rcode, t); s := public._dress_room_state(c, rcode, t); s := public._dress_room_state(a, rcode, t);
    log := log || jsonb_build_object('t', '06 camarim com 360 s', 'ok', s->>'phase' = 'dressing' and (s->>'left_ms')::int = 360000, 'got', s->>'phase');

    t := public._dress_test_play(rcode, t, a, b, c, 30);
    s := public._dress_room_state(a, rcode, t);
    log := log || jsonb_build_object('t', '07 podio: a, b, c', 'ok', s->>'phase' = 'podium' and (s->'results'->0->>'id')::uuid = a and (s->'results'->1->>'id')::uuid = b and (s->'results'->2->>'id')::uuid = c, 'got', s->'results');
    log := log || jsonb_build_object('t', '08 notas amortecidas (4,333 / 3,667 / 1,667)', 'ok',
      (s->'results'->0->>'score')::numeric = 4.333 and (s->'results'->1->>'score')::numeric = 3.667 and (s->'results'->2->>'score')::numeric = 1.667, 'got', s->'results');
    log := log || jsonb_build_object('t', '09 bilhetes 30 / 20 / 10', 'ok',
      (select tickets from public.dress_stats where user_id = a) - ta = 30 and (select tickets from public.dress_stats where user_id = b) - tb = 20 and (select tickets from public.dress_stats where user_id = c) - tc = 10,
      'got', jsonb_build_array((select tickets from public.dress_stats where user_id = a) - ta, (select tickets from public.dress_stats where user_id = b) - tb, (select tickets from public.dress_stats where user_id = c) - tc));
    log := log || jsonb_build_object('t', '10 vitoria do dia vale 1 XP', 'ok', (select xp from public.profiles where id = a) - xa = 1, 'got', (select xp from public.profiles where id = a) - xa);
    log := log || jsonb_build_object('t', '11 progresso: 1 partida, 1 vitoria, 2 notas dadas', 'ok',
      (select games = 1 and wins = 1 and podiums = 1 and votes = 2 from public.dress_daily where user_id = a and day = (t at time zone 'America/Sao_Paulo')::date), 'got',
      (select to_jsonb(x) from public.dress_daily x where user_id = a limit 1));
    perform public._dress_room_settle((select id from public.dress_rooms where dress_rooms.code = rcode), t);
    log := log || jsonb_build_object('t', '12 apurar de novo nao paga em dobro', 'ok', (select tickets from public.dress_stats where user_id = a) - ta = 30 and (select xp from public.profiles where id = a) - xa = 1, 'got', (select tickets from public.dress_stats where user_id = a) - ta);

    -- 2a rodada do mesmo dia: a vence de novo e leva os bilhetes, mas nao um 2o XP
    t := t + interval '13 seconds'; s := public._dress_room_state(a, rcode, t); s := public._dress_room_state(b, rcode, t); s := public._dress_room_state(c, rcode, t);
    log := log || jsonb_build_object('t', '13 recompensas', 'ok', s->>'phase' = 'rewards', 'got', s->>'phase');
    t := t + interval '11 seconds'; s := public._dress_room_state(a, rcode, t); s := public._dress_room_state(b, rcode, t); s := public._dress_room_state(c, rcode, t);
    t := t + interval '21 seconds'; s := public._dress_room_state(a, rcode, t); s := public._dress_room_state(b, rcode, t); s := public._dress_room_state(c, rcode, t);
    log := log || jsonb_build_object('t', '14 rodada 2 comeca sozinha', 'ok', s->>'phase' = 'theme' and (s->>'round')::int = 2, 'got', s->>'phase');
    t := t + interval '9 seconds'; s := public._dress_room_state(a, rcode, t); s := public._dress_room_state(b, rcode, t); s := public._dress_room_state(c, rcode, t);
    t := public._dress_test_play(rcode, t, a, b, c, 30);
    log := log || jsonb_build_object('t', '15 rodada 2: +30 bilhetes de novo, sem 2o XP no dia', 'ok',
      (select tickets from public.dress_stats where user_id = a) - ta = 60 and (select xp from public.profiles where id = a) - xa = 1, 'got',
      jsonb_build_array((select tickets from public.dress_stats where user_id = a) - ta, (select xp from public.profiles where id = a) - xa));
    log := log || jsonb_build_object('t', '16 progresso do dia: 2 partidas, 2 vitorias', 'ok', public._dress_mission_progress(a, 'day', 'games', t) = 2 and public._dress_mission_progress(a, 'week', 'wins', t) = 2, 'got', public._dress_mission_progress(a, 'day', 'games', t));

    -- missoes e troca por XP (usam a hora real e o usuario logado)
    perform set_config('request.jwt.claim.sub', a::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    td := (now() at time zone 'America/Sao_Paulo')::date;
    insert into public.dress_daily (user_id, day, games) values (a, td, 3) on conflict (user_id, day) do update set games = 3;
    v := public.dress_mission_claim('d_podium');
    log := log || jsonb_build_object('t', '17 missao nao cumprida e recusada', 'ok', v ? 'error', 'got', v);
    select tickets into n from public.dress_stats where user_id = a;
    v := public.dress_mission_claim('d_play3');
    log := log || jsonb_build_object('t', '18 missao cumprida paga 6 bilhetes', 'ok', (v->>'reward')::int = 6 and (select tickets from public.dress_stats where user_id = a) - n = 6, 'got', v);
    v := public.dress_mission_claim('d_play3');
    log := log || jsonb_build_object('t', '19 nao resgata duas vezes no mesmo dia', 'ok', v ? 'error', 'got', v);
    v := public.dress_tutorial_done();
    log := log || jsonb_build_object('t', '20 tutorial paga 10 uma vez so', 'ok', (v->>'reward')::int = 10 and ((public.dress_tutorial_done())->>'reward')::int = 0, 'got', v);
    update public.dress_stats set tickets = 299 where user_id = a;
    v := public.dress_exchange_tickets(1);
    log := log || jsonb_build_object('t', '21 299 bilhetes nao trocam', 'ok', v ? 'error', 'got', v);
    update public.dress_stats set tickets = 650 where user_id = a;
    select xp into xa from public.profiles where id = a;
    v := public.dress_exchange_tickets(2);
    log := log || jsonb_build_object('t', '22 600 bilhetes = 2 XP', 'ok', (v->>'tickets')::int = 50 and (select xp from public.profiles where id = a) - xa = 2, 'got', v);

    -- Mega Desfile
    log := log || jsonb_build_object('t', '23 evento: proximo domingo 15h', 'ok', public._dress_mega_event('2030-01-02 12:00:00-03') = ev and public._dress_mega_event('2030-01-06 15:44:00-03') = ev, 'got', public._dress_mega_event('2030-01-02 12:00:00-03'));
    log := log || jsonb_build_object('t', '24 depois da janela vai para o domingo seguinte', 'ok', public._dress_mega_event('2030-01-06 15:46:00-03') = ev + interval '7 days', 'got', public._dress_mega_event('2030-01-06 15:46:00-03'));
    t := '2030-01-06 14:35:00-03';
    rcode2 := public._dress_room_create(d, false, t, jsonb_build_object('mega', true, 'event_start', ev, 'max_players', 60, 'min_players', 3, 'runway', 15, 'voting', 15, 'intermission', 15));
    v := public._dress_room_join(a, rcode2, t); v := public._dress_room_join(b, rcode2, t);
    s := public._dress_room_state(d, rcode2, t); s := public._dress_room_state(a, rcode2, t); s := public._dress_room_state(b, rcode2, t);
    log := log || jsonb_build_object('t', '25 mega espera a hora marcada (mesmo com 3 na sala)', 'ok', s->>'phase' = 'lobby' and (s->>'mega')::boolean and (s->>'left_ms')::bigint = 1500000, 'got', jsonb_build_array(s->>'phase', s->>'left_ms'));
    t := ev + interval '1 second';
    s := public._dress_room_state(d, rcode2, t); s := public._dress_room_state(a, rcode2, t); s := public._dress_room_state(b, rcode2, t);
    log := log || jsonb_build_object('t', '26 na hora, o mega comeca', 'ok', s->>'phase' = 'intermission', 'got', s->>'phase');
    t := t + interval '16 seconds';
    s := public._dress_room_state(d, rcode2, t); s := public._dress_room_state(a, rcode2, t); s := public._dress_room_state(b, rcode2, t);
    t := t + interval '9 seconds';
    s := public._dress_room_state(d, rcode2, t); s := public._dress_room_state(a, rcode2, t); s := public._dress_room_state(b, rcode2, t);
    log := log || jsonb_build_object('t', '27 mega: camarim', 'ok', s->>'phase' = 'dressing', 'got', s->>'phase');
    select tickets into n from public.dress_stats where user_id = d;
    n := coalesce(n, 0);
    t := public._dress_test_play(rcode2, t, d, a, b, 15);
    s := public._dress_room_state(d, rcode2, t);
    log := log || jsonb_build_object('t', '28 mega paga o dobro (60 / 40 / 20)', 'ok', (s->'results'->0->>'tickets')::int = 60 and (s->'results'->1->>'tickets')::int = 40 and (s->'results'->2->>'tickets')::int = 20, 'got', s->'results');
    t := t + interval '13 seconds'; s := public._dress_room_state(d, rcode2, t);
    t := t + interval '3 minutes'; s := public._dress_room_state(d, rcode2, t);
    log := log || jsonb_build_object('t', '29 mega tem uma rodada so (fica nas recompensas)', 'ok', s->>'phase' = 'rewards', 'got', s->>'phase');

    raise exception using message = log::text, errcode = 'P0999';
  exception when sqlstate 'P0999' then
    return sqlerrm::jsonb;
  end;
end $fn$;

revoke all on function public._dress_test() from public, anon, authenticated;
revoke all on function public._dress_test_play(text, timestamptz, uuid, uuid, uuid, integer) from public, anon, authenticated;
