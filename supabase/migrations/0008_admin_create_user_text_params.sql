-- ELOS — admin_create_user com parâmetros text.
--
-- Com gender_t / age_range_t / user_role na assinatura, o PostgREST não
-- encontra a função ao receber strings JSON e responde 42883 ("function does
-- not exist"). Os parâmetros passam a ser text e a conversão para enum
-- acontece dentro da função, que também valida os valores.

drop function if exists public.admin_create_user(text, text, text, public.gender_t, public.age_range_t, public.user_role);

create or replace function public.admin_create_user(
  p_email     text,
  p_password  text,
  p_full_name text,
  p_gender    text,
  p_age_range text,
  p_role      text default 'cria'
)
returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_id    uuid;
  v_email text := lower(trim(p_email));
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
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Informe o nome completo';
  end if;

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
    jsonb_build_object('full_name', trim(p_full_name),
                       'gender', v_gender::text,
                       'age_range', v_age_range::text),
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

  if v_role <> 'cria' then
    update public.profiles set role = v_role where id = v_id;
  end if;

  return v_id;
end $fn$;

revoke execute on function public.admin_create_user(text, text, text, text, text, text) from anon, public;
grant  execute on function public.admin_create_user(text, text, text, text, text, text) to authenticated;
