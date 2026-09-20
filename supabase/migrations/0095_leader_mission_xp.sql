-- ELOS — XP de liderança: o líder ganha 5 XP por missão que cria e 1 XP por
-- cria aprovado naquela missão. Se, no prazo, menos de 50% dos crias
-- atribuídos cumprirem, o líder perde os 5 XP da criação (só isso — o XP por
-- cria aprovado e o XP de cada cria continuam intactos, ninguém que cumpriu
-- perde nada).

alter table public.missions
  add column if not exists leader_xp_settled_at timestamptz;

-- Permite uma segunda linha de xp_transactions pro MESMO assignment_id (a do
-- cria já existe; agora o líder também ganha uma, com outro user_id).
alter table public.xp_transactions
  drop constraint if exists xp_transactions_assignment_id_key,
  add constraint xp_transactions_assignment_id_user_id_key unique (assignment_id, user_id);

-- 5 XP por missão criada — chamada pela própria createMission() só depois
-- que a missão e as atribuições já existem de verdade (nunca antes, senão
-- uma missão que acaba sendo descartada por falta de participante já teria
-- rendido XP à toa).
create or replace function public.grant_leader_mission_creation_xp(p_mission_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_creator uuid;
  v_role    text;
begin
  select created_by into v_creator from public.missions where id = p_mission_id;
  -- cuidado: "v_creator <> auth.uid()" dá NULL (não TRUE) quando auth.uid()
  -- é null, e "if NULL" não dispara a exceção — checar null explicitamente.
  if v_creator is null or auth.uid() is null or v_creator <> auth.uid() then
    raise exception 'Sem permissão';
  end if;

  select role into v_role from public.profiles where id = v_creator;
  if v_role <> 'leader' then return; end if;

  if exists (
    select 1 from public.xp_transactions
     where mission_id = p_mission_id and type = 'leader_mission_created'
  ) then
    return;
  end if;

  -- guard_profile_update() reverte qualquer update de xp feito por quem não
  -- é admin, a menos que esse bypass esteja ligado (mesmo padrão já usado em
  -- review_assignment pra liberar o XP do cria).
  perform set_config('elos.xp_bypass', 'on', true);
  update public.profiles set xp = xp + 5 where id = v_creator;
  perform set_config('elos.xp_bypass', 'off', true);

  insert into public.xp_transactions (user_id, mission_id, amount, type)
  values (v_creator, p_mission_id, 5, 'leader_mission_created');
end $fn$;

revoke execute on function public.grant_leader_mission_creation_xp(uuid) from anon, public;
grant  execute on function public.grant_leader_mission_creation_xp(uuid) to authenticated;

-- 1 XP por cria aprovado — dentro do próprio review_assignment, junto da
-- aprovação, pro líder que CRIOU a missão (não necessariamente quem clicou
-- aprovar, já que outro líder responsável pelo cria também pode aprovar).
create or replace function public.review_assignment(p_assignment uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare a record; m record; v_rows int; v_cria text; v_can boolean; v_creator_role text;
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
    on conflict (assignment_id, user_id) do nothing;
    get diagnostics v_rows = row_count;

    if v_rows > 0 and m.xp > 0 then
      perform set_config('elos.xp_bypass', 'on', true);
      update public.profiles set xp = xp + m.xp where id = a.cria_id;
      perform set_config('elos.xp_bypass', 'off', true);
    end if;

    if m.created_by is not null then
      select role into v_creator_role from public.profiles where id = m.created_by;
      if v_creator_role = 'leader' then
        insert into public.xp_transactions (user_id, mission_id, assignment_id, amount, type)
        values (m.created_by, m.id, a.id, 1, 'leader_cria_approved')
        on conflict (assignment_id, user_id) do nothing;
        get diagnostics v_rows = row_count;
        if v_rows > 0 then
          perform set_config('elos.xp_bypass', 'on', true);
          update public.profiles set xp = xp + 1 where id = m.created_by;
          perform set_config('elos.xp_bypass', 'off', true);
        end if;
      end if;
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

-- Penalidade de <50%: roda diária (via cron de manutenção), acerta as contas
-- só das missões de líder já vencidas e ainda não avaliadas. Idempotente —
-- marca leader_xp_settled_at pra nunca reprocessar a mesma missão.
create or replace function public.settle_leader_mission_xp()
returns void language plpgsql security definer set search_path = public as $fn$
declare
  r record;
  v_total    int;
  v_approved int;
begin
  for r in
    select m.id, m.created_by
      from public.missions m
      join public.profiles p on p.id = m.created_by and p.role = 'leader'
     where m.due_date is not null
       and m.due_date < current_date
       and m.leader_xp_settled_at is null
       and m.audience = 'crias'
  loop
    select count(*) into v_total
      from public.mission_assignments where mission_id = r.id;
    select count(*) into v_approved
      from public.mission_assignments where mission_id = r.id and status = 'approved';

    if v_total > 0 and v_approved::float / v_total < 0.5
       and exists (
         select 1 from public.xp_transactions
          where mission_id = r.id and type = 'leader_mission_created'
       )
    then
      update public.profiles set xp = greatest(0, xp - 5) where id = r.created_by;
      insert into public.xp_transactions (user_id, mission_id, amount, type)
      values (r.created_by, r.id, -5, 'leader_mission_penalty');
    end if;

    update public.missions set leader_xp_settled_at = now() where id = r.id;
  end loop;
end $fn$;

revoke execute on function public.settle_leader_mission_xp() from anon, public;
grant  execute on function public.settle_leader_mission_xp() to service_role;
