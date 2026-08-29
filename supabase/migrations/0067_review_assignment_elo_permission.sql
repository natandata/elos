-- Líderes têm permissão total para avaliar (aprovar/recusar) missões de
-- qualquer cria do seu Elo, mesmo que o vínculo leader_crias esteja
-- temporariamente dessincronizado. Antes a checagem dependia só da tabela
-- leader_crias; agora também aceita comparar o elo_id do líder com o do cria
-- diretamente, que é a regra de negócio real ("líder gerencia seu Elo").
create or replace function public.review_assignment(
  p_assignment uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare a record; m record; v_rows int; v_cria text; v_can boolean;
begin
  select * into a from public.mission_assignments where id = p_assignment for update;
  if not found then raise exception 'Missão não encontrada'; end if;
  select * into m from public.missions where id = a.mission_id;

  select
    public.is_admin()
    or (
      public.is_approved()
      and (
        public.is_leader_of(a.cria_id)
        or m.created_by = auth.uid()
        or exists (
          select 1
          from public.profiles lp
          join public.profiles cp on cp.id = a.cria_id
          where lp.id = auth.uid()
            and lp.role = 'leader'
            and lp.elo_id is not null
            and lp.elo_id = cp.elo_id
        )
      )
    )
  into v_can;

  if not v_can then
    raise exception 'Sem permissão para avaliar esta missão';
  end if;
  if a.status <> 'awaiting_approval' then
    raise exception 'Esta missão não está aguardando aprovação';
  end if;

  select full_name into v_cria from public.profiles where id = a.cria_id;

  if p_approve then
    update public.mission_assignments
       set status = 'approved', approved_at = now(), approved_by = auth.uid(), rejection_reason = null
     where id = a.id;

    insert into public.xp_transactions (user_id, mission_id, assignment_id, amount, type)
    values (a.cria_id, m.id, a.id, m.xp, 'mission_approved')
    on conflict (assignment_id) do nothing;
    get diagnostics v_rows = row_count;

    if v_rows > 0 and m.xp > 0 then
      perform set_config('elos.xp_bypass', 'on', true);
      update public.profiles set xp = xp + m.xp where id = a.cria_id;
      perform set_config('elos.xp_bypass', 'off', true);
    end if;

    insert into public.notifications (user_id, title, body, category)
    values (a.cria_id, 'Sua missão foi aprovada!', '+' || m.xp || ' XP — ' || m.title, 'mission');

    perform public.notify_admins(
      'Missão aprovada',
      coalesce(nullif(v_cria, ''), 'Um cria') || ' ganhou ' || m.xp || ' XP em "' || m.title || '".',
      'mission');
  else
    update public.mission_assignments
       set status = 'rejected', approved_by = auth.uid(), approved_at = null, rejection_reason = p_reason
     where id = a.id;

    insert into public.notifications (user_id, title, body, category)
    values (a.cria_id, 'Sua missão foi recusada',
            coalesce(nullif(p_reason, ''), 'Sem justificativa informada.') || ' — ' || m.title,
            'mission');

    perform public.notify_admins(
      'Missão recusada',
      coalesce(nullif(v_cria, ''), 'Um cria') || ' teve "' || m.title || '" recusada.',
      'mission');
  end if;
end $fn$;
