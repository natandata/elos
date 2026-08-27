-- ELOS — pacote de acompanhamento pastoral + operação do admin + segurança.
-- Ver conversa: histórico de status, ciclo de conversa após "Mal", registro
-- de resolução, ficha do cria, autorização do responsável, metas/templates
-- de missão, check-in de presença, relatório do admin, auditoria, e
-- endurecimento de permissões de funções.

-- ============================================================== 1) consentimento do responsável
alter table public.profiles
  add column if not exists guardian_ack_at timestamptz;

-- confirma a autorização no cadastro, quando enviada no metadata do signUp
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  g public.gender_t;
  a public.age_range_t;
  ack boolean;
begin
  begin g := (new.raw_user_meta_data->>'gender')::public.gender_t;
  exception when others then g := null; end;
  begin a := (new.raw_user_meta_data->>'age_range')::public.age_range_t;
  exception when others then a := null; end;
  ack := coalesce(new.raw_user_meta_data->>'guardian_ack', 'false') = 'true';

  insert into public.profiles (id, full_name, gender, age_range, guardian_ack_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    g, a,
    case when ack then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end $fn$;

-- ============================================================== 2) histórico de status: sem mudança de schema, só consulta mais ampla no app

-- ============================================================== 3) registro de resolução de alerta "Mal"
create table if not exists public.status_follow_ups (
  id                 uuid primary key default gen_random_uuid(),
  status_response_id uuid not null unique references public.status_responses(id) on delete cascade,
  resolved_by        uuid not null references public.profiles(id),
  note               text not null check (char_length(trim(note)) > 0),
  created_at         timestamptz not null default now()
);

alter table public.status_follow_ups enable row level security;

drop policy if exists status_follow_ups_read on public.status_follow_ups;
create policy status_follow_ups_read on public.status_follow_ups for select to authenticated using (
  public.is_admin()
  or resolved_by = auth.uid()
  or exists (
    select 1 from public.status_responses sr
     where sr.id = status_follow_ups.status_response_id
       and (sr.user_id = auth.uid() or public.is_leader_of(sr.user_id))
  )
);

create or replace function public.resolve_status_alert(p_status_response uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_user uuid;
begin
  select user_id into v_user from public.status_responses where id = p_status_response;
  if v_user is null then raise exception 'Resposta de status não encontrada'; end if;
  if not (public.is_admin() or public.is_leader_of(v_user)) then
    raise exception 'Sem permissão para registrar essa resolução';
  end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'Escreva o que foi feito'; end if;

  insert into public.status_follow_ups (status_response_id, resolved_by, note)
  values (p_status_response, auth.uid(), p_note)
  on conflict (status_response_id) do update set note = excluded.note, resolved_by = excluded.resolved_by;
end $fn$;

revoke execute on function public.resolve_status_alert(uuid, text) from anon, public;
grant  execute on function public.resolve_status_alert(uuid, text) to authenticated;

-- ============================================================== 4) conversa após "Mal" (agendamento com aprovação/reagendamento)
create table if not exists public.care_meetings (
  id                 uuid primary key default gen_random_uuid(),
  cria_id            uuid not null references public.profiles(id) on delete cascade,
  elo_id             uuid references public.elos(id) on delete set null,
  status_response_id uuid references public.status_responses(id) on delete set null,
  modality           text not null check (modality in ('online', 'presencial')),
  proposed_date      date not null,
  proposed_time      time,
  note               text,
  status             text not null default 'pending_leader'
                        check (status in ('pending_leader', 'pending_cria', 'confirmed', 'cancelled')),
  proposed_by        text not null check (proposed_by in ('cria', 'leader')),
  responded_by       uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists care_meetings_cria_idx on public.care_meetings(cria_id);

alter table public.care_meetings enable row level security;

drop policy if exists care_meetings_read on public.care_meetings;
create policy care_meetings_read on public.care_meetings for select to authenticated using (
  cria_id = auth.uid() or public.is_admin() or public.is_leader_of(cria_id)
);

create or replace function public.request_care_meeting(
  p_modality text, p_date date, p_time time default null,
  p_note text default null, p_status_response uuid default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_elo uuid;
begin
  if public.my_role() <> 'cria' then raise exception 'Só o cria propõe a conversa'; end if;
  if p_modality not in ('online', 'presencial') then raise exception 'Modalidade inválida'; end if;
  if p_date is null then raise exception 'Escolha uma data'; end if;

  select elo_id into v_elo from public.profiles where id = auth.uid();

  insert into public.care_meetings (cria_id, elo_id, status_response_id, modality, proposed_date, proposed_time, note, status, proposed_by)
  values (auth.uid(), v_elo, p_status_response, p_modality, p_date, p_time, p_note, 'pending_leader', 'cria')
  returning id into v_id;

  insert into public.notifications (user_id, title, body, category)
  select p.id, 'Pedido de conversa',
         (select full_name from public.profiles where id = auth.uid()) || ' pediu uma conversa.',
         'status'
    from public.profiles p
   where p.elo_id = v_elo and p.role = 'leader' and p.approved = true;

  return v_id;
end $fn$;

create or replace function public.respond_care_meeting(
  p_id uuid, p_approve boolean,
  p_date date default null, p_time time default null, p_modality text default null
) returns void language plpgsql security definer set search_path = public as $fn$
declare m record;
begin
  select * into m from public.care_meetings where id = p_id for update;
  if not found then raise exception 'Conversa não encontrada'; end if;
  if not (public.is_admin() or public.is_leader_of(m.cria_id)) then
    raise exception 'Sem permissão';
  end if;
  if m.status <> 'pending_leader' then raise exception 'Essa conversa não está aguardando o líder'; end if;

  if p_approve then
    update public.care_meetings
       set status = 'confirmed', responded_by = auth.uid(), updated_at = now()
     where id = p_id;
    insert into public.notifications (user_id, title, body, category)
    values (m.cria_id, 'Conversa confirmada', 'Sua conversa foi aprovada pelo líder.', 'status');
  else
    if p_date is null then raise exception 'Informe a nova data'; end if;
    update public.care_meetings
       set status = 'pending_cria', proposed_by = 'leader', responded_by = auth.uid(),
           proposed_date = p_date, proposed_time = coalesce(p_time, proposed_time),
           modality = coalesce(p_modality, modality), updated_at = now()
     where id = p_id;
    insert into public.notifications (user_id, title, body, category)
    values (m.cria_id, 'Nova data proposta', 'O líder sugeriu outro dia para a conversa.', 'status');
  end if;
end $fn$;

create or replace function public.accept_care_meeting(p_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare m record;
begin
  select * into m from public.care_meetings where id = p_id for update;
  if not found then raise exception 'Conversa não encontrada'; end if;
  if m.cria_id <> auth.uid() then raise exception 'Sem permissão'; end if;
  if m.status <> 'pending_cria' then raise exception 'Não há proposta aguardando seu aceite'; end if;

  update public.care_meetings set status = 'confirmed', updated_at = now() where id = p_id;
end $fn$;

create or replace function public.cancel_care_meeting(p_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare m record;
begin
  select * into m from public.care_meetings where id = p_id for update;
  if not found then raise exception 'Conversa não encontrada'; end if;
  if not (m.cria_id = auth.uid() or public.is_admin() or public.is_leader_of(m.cria_id)) then
    raise exception 'Sem permissão';
  end if;
  update public.care_meetings set status = 'cancelled', updated_at = now() where id = p_id;
end $fn$;

revoke execute on function public.request_care_meeting(text, date, time, text, uuid) from anon, public;
revoke execute on function public.respond_care_meeting(uuid, boolean, date, time, text) from anon, public;
revoke execute on function public.accept_care_meeting(uuid) from anon, public;
revoke execute on function public.cancel_care_meeting(uuid) from anon, public;
grant  execute on function public.request_care_meeting(text, date, time, text, uuid) to authenticated;
grant  execute on function public.respond_care_meeting(uuid, boolean, date, time, text) to authenticated;
grant  execute on function public.accept_care_meeting(uuid) to authenticated;
grant  execute on function public.cancel_care_meeting(uuid) to authenticated;

-- ============================================================== 5) ficha do cria (dado sensível, opcional, pós-login)
create table if not exists public.cria_profile_details (
  id                   uuid primary key references public.profiles(id) on delete cascade,
  guardian_name        text,
  guardian_phone       text,
  guardian_relationship text,
  notes                text,
  updated_at           timestamptz not null default now()
);

alter table public.cria_profile_details enable row level security;

drop policy if exists cria_details_read on public.cria_profile_details;
create policy cria_details_read on public.cria_profile_details for select to authenticated using (
  id = auth.uid() or public.is_admin() or public.is_leader_of(id)
);
drop policy if exists cria_details_write on public.cria_profile_details;
create policy cria_details_write on public.cria_profile_details for all to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ============================================================== 6) check-in de presença em eventos
create table if not exists public.event_attendance (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_attendance enable row level security;

drop policy if exists attendance_read on public.event_attendance;
create policy attendance_read on public.event_attendance for select to authenticated using (
  user_id = auth.uid() or public.is_admin() or public.is_leader_of(user_id)
);
drop policy if exists attendance_insert on public.event_attendance;
create policy attendance_insert on public.event_attendance for insert to authenticated
  with check (user_id = auth.uid());

-- ============================================================== 7) auditoria de trocas administrativas
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id),
  actor_name  text,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  target_name text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_read on public.audit_log;
create policy audit_log_read on public.audit_log for select to authenticated using (public.is_admin());

create or replace function public.log_profile_changes()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_actor_name text; v_changes jsonb := '{}'::jsonb;
begin
  if new.role is distinct from old.role then
    v_changes := v_changes || jsonb_build_object('role', jsonb_build_object('de', old.role, 'para', new.role));
  end if;
  if new.elo_id is distinct from old.elo_id then
    v_changes := v_changes || jsonb_build_object('elo_id', jsonb_build_object('de', old.elo_id, 'para', new.elo_id));
  end if;
  if new.approved is distinct from old.approved then
    v_changes := v_changes || jsonb_build_object('approved', jsonb_build_object('de', old.approved, 'para', new.approved));
  end if;

  if v_changes <> '{}'::jsonb then
    select full_name into v_actor_name from public.profiles where id = auth.uid();
    insert into public.audit_log (actor_id, actor_name, action, target_type, target_id, target_name, details)
    values (auth.uid(), v_actor_name, 'profile_update', 'profile', new.id, new.full_name, v_changes);
  end if;
  return new;
end $fn$;

drop trigger if exists trg_z_log_profile_changes on public.profiles;
create trigger trg_z_log_profile_changes
  after update on public.profiles
  for each row execute function public.log_profile_changes();

create or replace function public.log_profile_delete()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.audit_log (actor_id, actor_name, action, target_type, target_id, target_name, details)
  values (
    auth.uid(),
    (select full_name from public.profiles where id = auth.uid()),
    'profile_delete', 'profile', old.id, old.full_name,
    jsonb_build_object('role', old.role, 'elo_id', old.elo_id)
  );
  return old;
end $fn$;

drop trigger if exists trg_z_log_profile_delete on public.profiles;
create trigger trg_z_log_profile_delete
  before delete on public.profiles
  for each row execute function public.log_profile_delete();

-- ============================================================== 8) relatório agregado do admin
create or replace function public.admin_dashboard_report()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Apenas admin'; end if;

  select jsonb_build_object(
    'bad_status_week', (
      select count(distinct user_id) from public.status_responses
       where created_at >= now() - interval '7 days'
         and (emotional_status = 'bad' or spiritual_status = 'bad')
    ),
    'elos_without_leader', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name)), '[]'::jsonb)
        from public.elos e
       where not exists (
         select 1 from public.profiles p
          where p.elo_id = e.id and p.role = 'leader' and p.approved = true
       )
    ),
    'inactive_leaders', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.full_name, 'elo', e.name,
               'last_sign_in', u.last_sign_in_at
             )), '[]'::jsonb)
        from public.profiles p
        join auth.users u on u.id = p.id
        left join public.elos e on e.id = p.elo_id
       where p.role = 'leader' and p.approved = true
         and (u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '14 days')
    )
  ) into result;

  return result;
end $fn$;

revoke execute on function public.admin_dashboard_report() from anon, public;
grant  execute on function public.admin_dashboard_report() to authenticated;

-- ============================================================== 9) endurecendo permissões (Supabase Advisor)
-- essas 4 são funções de trigger, nunca deveriam ser chamáveis via RPC direto
revoke execute on function public.notify_event_change()    from anon, authenticated, public;
revoke execute on function public.notify_mission_created() from anon, authenticated, public;
revoke execute on function public.notify_new_profile()     from anon, authenticated, public;
revoke execute on function public.notify_status_response() from anon, authenticated, public;
