-- ELOS — dados de saúde da plataforma pro admin (tela "Geral"): tamanho do
-- banco, armazenamento de arquivos e volume de dados por área.
create or replace function public.admin_platform_health()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Apenas admin'; end if;

  select jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum(coalesce((metadata->>'size')::bigint,0)) from storage.objects), 0),
    'postgres_version', current_setting('server_version'),
    'counts', jsonb_build_object(
      'profiles', (select count(*) from public.profiles),
      'missions', (select count(*) from public.missions),
      'chat_messages', (select count(*) from public.chat_messages),
      'notifications', (select count(*) from public.notifications),
      'events', (select count(*) from public.events),
      'status_responses', (select count(*) from public.status_responses),
      'audit_log', (select count(*) from public.audit_log)
    )
  ) into result;

  return result;
end $fn$;

revoke execute on function public.admin_platform_health() from anon, public;
grant execute on function public.admin_platform_health() to authenticated;
