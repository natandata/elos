-- ELOS — contas de líder criadas no cadastro público nascem pendentes.
--
-- A pessoa entra normalmente, mas não exerce nenhum poder de líder até o admin
-- aprovar. A trava é no banco, não só na interface: o papel 'leader' sozinho
-- deixa de bastar para criar missões ou avaliar envios.

alter table public.profiles
  add column if not exists approved boolean not null default true;

create index if not exists profiles_pending_idx
  on public.profiles(role, approved) where approved = false;

-- ---------------------------------------------------------------- helper
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select approved from public.profiles where id = auth.uid()), false)
$fn$;

revoke execute on function public.is_approved() from anon, public;
grant  execute on function public.is_approved() to authenticated;

-- ---------------------------------------------------------------- guard
-- Ninguém se auto-aprova: 'approved' só muda por mão de admin.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role     := old.role;
    new.elo_id   := old.elo_id;
    new.approved := old.approved;
    if coalesce(current_setting('elos.xp_bypass', true), 'off') <> 'on' then
      new.xp := old.xp;
    end if;
  end if;
  return new;
end $fn$;

revoke execute on function public.guard_profile_update() from anon, authenticated, public;

-- ---------------------------------------------------------------- cadastro
-- O papel vem do formulário, então só 'cria' e 'leader' são aceitos — nunca
-- 'admin'. Líder entra pendente de aprovação.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  g public.gender_t;
  a public.age_range_t;
  v_first text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  v_last  text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  v_full  text := coalesce(new.raw_user_meta_data->>'full_name',
                           new.raw_user_meta_data->>'name', '');
  v_role     public.user_role := 'cria';
  v_approved boolean := true;
begin
  begin g := (new.raw_user_meta_data->>'gender')::public.gender_t;
  exception when others then g := null; end;
  begin a := (new.raw_user_meta_data->>'age_range')::public.age_range_t;
  exception when others then a := null; end;

  if new.raw_user_meta_data->>'role' = 'leader' then
    v_role := 'leader';
    v_approved := false;
  end if;

  if v_first is null and v_full <> '' then
    v_first := split_part(v_full, ' ', 1);
    v_last  := case
                 when position(' ' in trim(v_full)) > 0
                   then nullif(trim(substring(v_full from position(' ' in v_full) + 1)), '')
               end;
  end if;

  insert into public.profiles (id, first_name, last_name, full_name, gender, age_range, role, approved)
  values (new.id, v_first, v_last, v_full, g, a, v_role, v_approved)
  on conflict (id) do nothing;
  return new;
end $fn$;

-- ---------------------------------------------------------------- aprovação
create or replace function public.admin_approve_leader(p_user uuid, p_approve boolean default true)
returns void language plpgsql security definer set search_path = public as $fn$
declare v record;
begin
  if not public.is_admin() then
    raise exception 'Apenas a administração pode aprovar líderes';
  end if;

  select full_name, role, approved into v from public.profiles where id = p_user;
  if v.full_name is null then raise exception 'Usuário não encontrado'; end if;

  if p_approve then
    update public.profiles set approved = true where id = p_user;

    insert into public.notifications (user_id, title, body, category)
    values (p_user, 'Conta de líder aprovada',
            'Sua conta foi liberada pela administração. Agora você tem acesso completo.',
            'user');
  else
    -- recusar mantém a conta, mas como cria: a pessoa não fica sem acesso
    update public.profiles set role = 'cria', approved = true where id = p_user;

    insert into public.notifications (user_id, title, body, category)
    values (p_user, 'Acesso de líder não aprovado',
            'Sua conta continua ativa como cria. Fale com a liderança se isso não estiver certo.',
            'user');
  end if;
end $fn$;

revoke execute on function public.admin_approve_leader(uuid, boolean) from anon, public;
grant  execute on function public.admin_approve_leader(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------- RLS
-- Líder pendente não cria nem edita missões.
drop policy if exists missions_insert on public.missions;
create policy missions_insert on public.missions for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.my_role() in ('admin','leader')
    and public.is_approved()
  );

drop policy if exists missions_write on public.missions;
create policy missions_write on public.missions for update to authenticated
  using (public.is_admin() or (created_by = auth.uid() and public.is_approved()))
  with check (public.is_admin() or (created_by = auth.uid() and public.is_approved()));

-- Líder pendente não avalia envios.
create or replace function public.review_assignment(
  p_assignment uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare a record; m record; v_rows int; v_cria text;
begin
  select * into a from public.mission_assignments where id = p_assignment for update;
  if not found then raise exception 'Missão não encontrada'; end if;
  select * into m from public.missions where id = a.mission_id;

  if not (public.is_admin()
          or (public.is_approved()
              and (public.is_leader_of(a.cria_id) or m.created_by = auth.uid()))) then
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

-- ---------------------------------------------------------------- notificação
create or replace function public.notify_new_profile()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_nome text := coalesce(nullif(new.full_name, ''), 'Novo participante');
begin
  if new.role = 'leader' and new.approved = false then
    perform public.notify_admins(
      'Líder aguardando aprovação',
      v_nome || ' criou uma conta de líder e precisa da sua liberação.',
      'user');
  else
    perform public.notify_admins(
      'Novo cadastro na plataforma',
      v_nome || case when new.gender is null then ''
                     else ' — ' || case new.gender when 'male' then 'masculino' else 'feminino' end end,
      'user');
  end if;
  return new;
end $fn$;

-- ---------------------------------------------------------------- admin cria
-- Conta feita pelo admin já nasce aprovada.
create or replace function public.admin_create_user(
  p_email      text,
  p_password   text,
  p_first_name text,
  p_last_name  text,
  p_gender     text,
  p_age_range  text,
  p_role       text default 'cria'
)
returns uuid
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  v_id    uuid;
  v_email text := lower(trim(p_email));
  v_first text := nullif(trim(p_first_name), '');
  v_last  text := nullif(trim(p_last_name), '');
  v_gender    public.gender_t;
  v_age_range public.age_range_t;
  v_role      public.user_role;
begin
  if not public.is_admin() then
    raise exception 'Apenas a administração pode criar usuários';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'A senha precisa ter ao menos 6 caracteres';
  end if;
  if v_first is null then raise exception 'Informe o nome'; end if;
  if v_last  is null then raise exception 'Informe o sobrenome'; end if;

  begin v_gender := p_gender::public.gender_t;
  exception when others then raise exception 'Gênero inválido'; end;
  begin v_age_range := p_age_range::public.age_range_t;
  exception when others then raise exception 'Faixa etária inválida'; end;
  begin v_role := coalesce(nullif(p_role, ''), 'cria')::public.user_role;
  exception when others then raise exception 'Perfil inválido'; end;

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Já existe uma conta com esse e-mail';
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', v_first, 'last_name', v_last,
                       'full_name', v_first || ' ' || v_last,
                       'gender', v_gender::text, 'age_range', v_age_range::text),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  update public.profiles set role = v_role, approved = true where id = v_id;

  return v_id;
end $fn$;

revoke execute on function public.admin_create_user(text, text, text, text, text, text, text) from anon, public;
grant  execute on function public.admin_create_user(text, text, text, text, text, text, text) to authenticated;
