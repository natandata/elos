-- ELOS — Admin cria e exclui usuários direto da plataforma.
--
-- Criar e apagar contas mexe em auth.users, que nenhuma policy de RLS alcança.
-- Em vez de expor a service role key no servidor, o trabalho fica em duas
-- funções SECURITY DEFINER que só executam se public.is_admin() for verdadeiro.

-- ---------------------------------------------------------------- criar
create or replace function public.admin_create_user(
  p_email     text,
  p_password  text,
  p_full_name text,
  p_gender    public.gender_t,
  p_age_range public.age_range_t,
  p_role      public.user_role default 'cria'
)
returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_id    uuid;
  v_email text := lower(trim(p_email));
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
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Informe o nome completo';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Já existe uma conta com esse e-mail';
  end if;

  v_id := gen_random_uuid();

  -- Os campos de token precisam de string vazia, não NULL: com NULL o GoTrue
  -- falha com "Database error querying schema" no login.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', trim(p_full_name),
                       'gender', p_gender::text,
                       'age_range', p_age_range::text),
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

  -- o trigger handle_new_user já criou o perfil e o autofill_elo definiu o Elo;
  -- aqui só ajustamos o papel quando for diferente de cria.
  if p_role <> 'cria' then
    update public.profiles set role = p_role where id = v_id;
  end if;

  return v_id;
end $fn$;

-- ---------------------------------------------------------------- excluir
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql security definer set search_path = public as $fn$
declare v_role public.user_role;
begin
  if not public.is_admin() then
    raise exception 'Apenas a administração pode excluir usuários';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode excluir a própria conta';
  end if;

  select role into v_role from public.profiles where id = p_user;
  if v_role is null then
    raise exception 'Usuário não encontrado';
  end if;
  if v_role = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'Não é possível excluir o único administrador';
  end if;

  -- profiles referencia auth.users com on delete cascade, e missões, XP,
  -- status, vínculos e notificações cascateiam a partir de profiles.
  delete from auth.users where id = p_user;
end $fn$;

-- ---------------------------------------------------------------- trocar senha
create or replace function public.admin_set_password(p_user uuid, p_password text)
returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Apenas a administração pode redefinir senhas';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'A senha precisa ter ao menos 6 caracteres';
  end if;

  update auth.users
     set encrypted_password = crypt(p_password, gen_salt('bf')),
         updated_at = now()
   where id = p_user;

  if not found then raise exception 'Usuário não encontrado'; end if;
end $fn$;

revoke execute on function public.admin_create_user(text, text, text, public.gender_t, public.age_range_t, public.user_role) from anon, public;
revoke execute on function public.admin_delete_user(uuid)          from anon, public;
revoke execute on function public.admin_set_password(uuid, text)   from anon, public;
grant  execute on function public.admin_create_user(text, text, text, public.gender_t, public.age_range_t, public.user_role) to authenticated;
grant  execute on function public.admin_delete_user(uuid)          to authenticated;
grant  execute on function public.admin_set_password(uuid, text)   to authenticated;
