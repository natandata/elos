-- ELOS — o Admin recebe notificação de tudo que acontece na plataforma,
-- separado em categorias para poder filtrar: status, missões e agenda.
-- Cadastros novos entram como 'user' e aparecem no filtro "Todas".

alter table public.notifications
  add column if not exists category text not null default 'geral';

create index if not exists notifications_category_idx
  on public.notifications(user_id, category, created_at desc);

-- notificações já existentes: deduz a categoria pelo título
update public.notifications
   set category = case
     when title ilike '%miss%' then 'mission'
     else 'geral'
   end
 where category = 'geral';

-- ---------------------------------------------------------------- helper
-- Avisa todos os admins, inclusive quem provocou a ação: a tela funciona como
-- registro de tudo que acontece. Excluir o autor deixaria o filtro "Apenas
-- Agenda" sempre vazio, já que só o admin mexe na agenda.
create or replace function public.notify_admins(
  p_title text, p_body text, p_category text
)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.notifications (user_id, title, body, category)
  select p.id, p_title, p_body, p_category
    from public.profiles p
   where p.role = 'admin';
end $fn$;

revoke execute on function public.notify_admins(text, text, text) from anon, authenticated, public;

create or replace function public.status_label(s public.status_level)
returns text language sql immutable set search_path = public as $fn$
  select case s when 'bad' then 'mal' when 'ok' then 'mais ou menos' else 'bem' end
$fn$;

-- ---------------------------------------------------------------- status
create or replace function public.notify_status_response()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v record;
begin
  select full_name, role into v from public.profiles where id = new.user_id;

  perform public.notify_admins(
    'Novo status respondido',
    coalesce(nullif(v.full_name, ''), 'Alguém')
      || ' (' || case v.role when 'leader' then 'líder' else 'cria' end || ')'
      || ' — emocional ' || public.status_label(new.emotional_status)
      || ', espiritual ' || public.status_label(new.spiritual_status),
    'status');
  return new;
end $fn$;

drop trigger if exists trg_notify_status on public.status_responses;
create trigger trg_notify_status
  after insert on public.status_responses
  for each row execute function public.notify_status_response();

-- ---------------------------------------------------------------- missões
create or replace function public.notify_mission_created()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_author text;
begin
  select full_name into v_author from public.profiles where id = new.created_by;

  perform public.notify_admins(
    'Nova missão criada',
    new.title || ' — ' || new.xp || ' XP, por ' || coalesce(nullif(v_author, ''), 'alguém'),
    'mission');
  return new;
end $fn$;

drop trigger if exists trg_notify_mission on public.missions;
create trigger trg_notify_mission
  after insert on public.missions
  for each row execute function public.notify_mission_created();

-- ---------------------------------------------------------------- agenda
create or replace function public.notify_event_change()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v record;
begin
  v := case when tg_op = 'DELETE' then old else new end;

  perform public.notify_admins(
    case tg_op
      when 'INSERT' then 'Novo evento na agenda'
      when 'UPDATE' then 'Evento alterado'
      else 'Evento excluído'
    end,
    v.title || ' — ' || to_char(v.event_date, 'DD/MM/YYYY'),
    'agenda');

  return case when tg_op = 'DELETE' then old else new end;
end $fn$;

drop trigger if exists trg_notify_event on public.events;
create trigger trg_notify_event
  after insert or update or delete on public.events
  for each row execute function public.notify_event_change();

-- ---------------------------------------------------------------- cadastros
create or replace function public.notify_new_profile()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  perform public.notify_admins(
    'Novo cadastro na plataforma',
    coalesce(nullif(new.full_name, ''), 'Novo participante')
      || case when new.gender is null then ''
              else ' — ' || case new.gender when 'male' then 'masculino' else 'feminino' end end,
    'user');
  return new;
end $fn$;

drop trigger if exists trg_notify_new_profile on public.profiles;
create trigger trg_notify_new_profile
  after insert on public.profiles
  for each row execute function public.notify_new_profile();

-- ---------------------------------------------------------------- categorias
-- nas notificações que já eram disparadas pelas RPCs e pelo trigger de atribuição
create or replace function public.notify_new_assignment()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare m record;
begin
  select * into m from public.missions where id = new.mission_id;
  insert into public.notifications (user_id, title, body, category)
  values (new.cria_id, 'Nova missão disponível', m.title || ' — ' || m.xp || ' XP', 'mission');
  return new;
end $fn$;

create or replace function public.submit_assignment(p_assignment uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare a record; m record; approver record; v_cria text;
begin
  select * into a from public.mission_assignments where id = p_assignment for update;
  if not found then raise exception 'Missão não encontrada'; end if;
  if a.cria_id <> auth.uid() then raise exception 'Sem permissão para enviar esta missão'; end if;
  if a.status not in ('pending','rejected') then
    raise exception 'Esta missão não pode ser enviada no status atual';
  end if;

  update public.mission_assignments
     set status = 'awaiting_approval', submitted_at = now(), rejection_reason = null
   where id = a.id;

  select * into m from public.missions where id = a.mission_id;
  select full_name into v_cria from public.profiles where id = a.cria_id;

  for approver in
    select distinct p.id
      from public.profiles p
      left join public.leader_crias lc on lc.leader_id = p.id and lc.cria_id = a.cria_id
     where p.role = 'admin' or lc.id is not null or p.id = m.created_by
  loop
    insert into public.notifications (user_id, title, body, category)
    values (approver.id, 'Missão aguardando aprovação',
            coalesce(nullif(v_cria, ''), 'Um cria') || ' enviou "' || m.title || '".', 'mission');
  end loop;
end $fn$;

create or replace function public.review_assignment(
  p_assignment uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare a record; m record; v_rows int; v_cria text;
begin
  select * into a from public.mission_assignments where id = p_assignment for update;
  if not found then raise exception 'Missão não encontrada'; end if;
  select * into m from public.missions where id = a.mission_id;

  if not (public.is_admin() or public.is_leader_of(a.cria_id) or m.created_by = auth.uid()) then
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
