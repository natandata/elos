-- ELOS — o cria pode retirar do envio uma missão que mandou pra aprovação
-- sem querer. Só vale enquanto ainda está "awaiting_approval" (nenhum XP foi
-- creditado nessa fase); depois de avaliada, não dá mais pra retirar.
create or replace function public.withdraw_assignment(p_assignment uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare a record; m record; v_cria text;
begin
  select * into a from public.mission_assignments where id = p_assignment for update;
  if not found then raise exception 'Missão não encontrada'; end if;
  if auth.uid() is null or a.cria_id <> auth.uid() then
    raise exception 'Sem permissão para retirar esta missão';
  end if;
  if a.status <> 'awaiting_approval' then
    raise exception 'Esta missão não está mais aguardando aprovação';
  end if;

  update public.mission_assignments
     set status = 'pending', submitted_at = null
   where id = a.id;

  select * into m from public.missions where id = a.mission_id;
  select full_name into v_cria from public.profiles where id = a.cria_id;

  -- limpa o aviso "aguardando aprovação" que ainda não foi lido por quem avalia
  delete from public.notifications
   where category = 'mission'
     and title = 'Missão aguardando aprovação'
     and read = false
     and body = coalesce(nullif(v_cria, ''), 'Um cria') || ' enviou "' || m.title || '".'
     and created_at >= a.submitted_at;
end $fn$;

revoke execute on function public.withdraw_assignment(uuid) from anon, public;
grant  execute on function public.withdraw_assignment(uuid) to authenticated;
