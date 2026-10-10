-- Endurecimento (alertas do advisor de segurança do Supabase, 2026-10-09).
-- 1) Auxiliares internos com parâmetro de usuário: só as funções do próprio banco (que rodam como dono) chamam.
--    Antes, qualquer pessoa SEM login podia chamar _dress_room_watch (escrevia espectadores como outro usuário)
--    e _dress_mission_progress (lia as estatísticas de outro usuário pelo id).
revoke all on function public._dress_mission_progress(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public._dress_room_watch(uuid, text, timestamptz) from public, anon, authenticated;

-- 2) Funções que só fazem sentido logado: saem do acesso anônimo (continuam para quem entrou).
revoke all on function public.admin_recent_game_activity(uuid, integer) from public, anon;
revoke all on function public.admin_recent_game_activity_extra(uuid, integer) from public, anon;
revoke all on function public.arena_day_record(date) from public, anon;
grant execute on function public.admin_recent_game_activity(uuid, integer) to authenticated, service_role;
grant execute on function public.admin_recent_game_activity_extra(uuid, integer) to authenticated, service_role;
grant execute on function public.arena_day_record(date) to authenticated, service_role;

-- 3) search_path fixo nas funções que não tinham.
do $mig$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('_dress_mega_event', '_dress_cfg', '_dress_test', '_dress_mission_defs', '_dress_period_key', '_dress_test_play', '_dress_family_price', '_mall_pool')
  loop
    execute format('alter function %s set search_path = public', r.sig);
  end loop;
end $mig$;
