-- ELOS — Row Level Security, RPCs de negócio, notificações e seed dos ELOS

-- ---------------------------------------------------------------- seed dos ELOS
insert into public.elos (name, gender, age_range) values
  ('Elo Masculino 12–14', 'male',   '12-14'),
  ('Elo Masculino 15–16', 'male',   '15-16'),
  ('Elo Masculino 17',    'male',   '17'),
  ('Elo Feminino 12–14',  'female', '12-14'),
  ('Elo Feminino 15–16',  'female', '15-16'),
  ('Elo Feminino 17',     'female', '17')
on conflict (gender, age_range) do nothing;

-- ---------------------------------------------------------------- RPCs
-- O cria envia a missão para aprovação. XP não é creditado aqui (Regra 1).
create or replace function public.submit_assignment(p_assignment uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare a record; m record; approver record;
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

  for approver in
    select distinct p.id
      from public.profiles p
      left join public.leader_crias lc on lc.leader_id = p.id and lc.cria_id = a.cria_id
     where p.role = 'admin' or lc.id is not null or p.id = m.created_by
  loop
    insert into public.notifications (user_id, title, body)
    values (approver.id, 'Missão aguardando aprovação',
            (select full_name from public.profiles where id = a.cria_id) || ' enviou "' || m.title || '".');
  end loop;
end $fn$;

-- Líder ou Admin aprova/recusa. XP creditado uma única vez (Regras 2 e 4).
create or replace function public.review_assignment(
  p_assignment uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare a record; m record; v_rows int;
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

    insert into public.notifications (user_id, title, body)
    values (a.cria_id, 'Sua missão foi aprovada!', '+' || m.xp || ' XP — ' || m.title);
  else
    update public.mission_assignments
       set status = 'rejected', approved_by = auth.uid(), approved_at = null, rejection_reason = p_reason
     where id = a.id;

    insert into public.notifications (user_id, title, body)
    values (a.cria_id, 'Sua missão foi recusada',
            coalesce(nullif(p_reason, ''), 'Sem justificativa informada.') || ' — ' || m.title);
  end if;
end $fn$;

-- o crédito de XP feito pela RPC precisa passar pelo guard de profiles
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    new.role   := old.role;
    new.elo_id := old.elo_id;
    if coalesce(current_setting('elos.xp_bypass', true), 'off') <> 'on' then
      new.xp := old.xp;
    end if;
  end if;
  return new;
end $fn$;

-- Notifica o cria quando recebe uma missão nova
create or replace function public.notify_new_assignment()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare m record;
begin
  select * into m from public.missions where id = new.mission_id;
  insert into public.notifications (user_id, title, body)
  values (new.cria_id, 'Nova missão disponível', m.title || ' — ' || m.xp || ' XP');
  return new;
end $fn$;

drop trigger if exists trg_notify_assignment on public.mission_assignments;
create trigger trg_notify_assignment
  after insert on public.mission_assignments
  for each row execute function public.notify_new_assignment();

-- Última resposta de status por usuário (respeita o RLS de quem consulta)
drop view if exists public.v_latest_status;
create view public.v_latest_status
with (security_invoker = on) as
  select distinct on (user_id)
         user_id, emotional_status, spiritual_status, created_at
    from public.status_responses
   order by user_id, created_at desc;

-- ---------------------------------------------------------------- RLS
alter table public.elos                enable row level security;
alter table public.profiles            enable row level security;
alter table public.leader_crias        enable row level security;
alter table public.status_responses    enable row level security;
alter table public.missions            enable row level security;
alter table public.mission_assignments enable row level security;
alter table public.xp_transactions     enable row level security;
alter table public.events              enable row level security;
alter table public.notifications       enable row level security;

-- elos
drop policy if exists elos_read on public.elos;
create policy elos_read on public.elos for select to authenticated using (true);
drop policy if exists elos_admin on public.elos;
create policy elos_admin on public.elos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.is_admin()
  or public.is_leader_of(id)
  or (elo_id is not null and elo_id = public.my_elo())
);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- leader_crias
drop policy if exists leader_crias_read on public.leader_crias;
create policy leader_crias_read on public.leader_crias for select to authenticated using (
  public.is_admin() or leader_id = auth.uid() or cria_id = auth.uid()
);
drop policy if exists leader_crias_admin on public.leader_crias;
create policy leader_crias_admin on public.leader_crias for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- status_responses
drop policy if exists status_insert_self on public.status_responses;
create policy status_insert_self on public.status_responses for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists status_read on public.status_responses;
create policy status_read on public.status_responses for select to authenticated using (
  user_id = auth.uid() or public.is_admin() or public.is_leader_of(user_id)
);

-- missions
drop policy if exists missions_read on public.missions;
create policy missions_read on public.missions for select to authenticated using (
  public.is_admin()
  or created_by = auth.uid()
  or (elo_id is not null and elo_id = public.my_elo())
  or exists (select 1 from public.mission_assignments ma
              where ma.mission_id = missions.id and ma.cria_id = auth.uid())
);
drop policy if exists missions_insert on public.missions;
create policy missions_insert on public.missions for insert to authenticated
  with check (created_by = auth.uid() and public.my_role() in ('admin','leader'));
drop policy if exists missions_write on public.missions;
create policy missions_write on public.missions for update to authenticated
  using (public.is_admin() or created_by = auth.uid())
  with check (public.is_admin() or created_by = auth.uid());
drop policy if exists missions_delete on public.missions;
create policy missions_delete on public.missions for delete to authenticated
  using (public.is_admin() or created_by = auth.uid());

-- mission_assignments
drop policy if exists assignments_read on public.mission_assignments;
create policy assignments_read on public.mission_assignments for select to authenticated using (
  cria_id = auth.uid()
  or public.is_admin()
  or public.is_leader_of(cria_id)
  or exists (select 1 from public.missions m
              where m.id = mission_assignments.mission_id and m.created_by = auth.uid())
);
drop policy if exists assignments_insert on public.mission_assignments;
create policy assignments_insert on public.mission_assignments for insert to authenticated
  with check (
    public.is_admin()
    or exists (select 1 from public.missions m
                where m.id = mission_assignments.mission_id and m.created_by = auth.uid())
  );
drop policy if exists assignments_delete on public.mission_assignments;
create policy assignments_delete on public.mission_assignments for delete to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.missions m
                where m.id = mission_assignments.mission_id and m.created_by = auth.uid())
  );
-- transições de status acontecem só pelas RPCs (submit/review)

-- xp_transactions (somente leitura no cliente; escrita apenas via RPC)
drop policy if exists xp_read on public.xp_transactions;
create policy xp_read on public.xp_transactions for select to authenticated using (
  user_id = auth.uid() or public.is_admin() or public.is_leader_of(user_id)
);

-- events
drop policy if exists events_read on public.events;
create policy events_read on public.events for select to authenticated using (true);
drop policy if exists events_admin on public.events;
create policy events_admin on public.events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- notifications
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ranking agregado entre ELOS (só totais, sem dados pessoais)
create or replace function public.elo_rankings()
returns table (elo_id uuid, elo_name text, total_xp bigint, crias bigint, rank_position int)
language sql stable security definer set search_path = public as $fn$
  select e.id,
         e.name,
         coalesce(sum(p.xp), 0)::bigint as total_xp,
         count(p.id)::bigint            as crias,
         rank() over (order by coalesce(sum(p.xp), 0) desc)::int as rank_position
    from public.elos e
    left join public.profiles p on p.elo_id = e.id and p.role = 'cria'
   group by e.id, e.name
   order by total_xp desc
$fn$;

grant execute on function public.submit_assignment(uuid)                to authenticated;
grant execute on function public.review_assignment(uuid, boolean, text) to authenticated;
grant execute on function public.elo_rankings()                         to authenticated;
