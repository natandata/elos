-- ELOS — usuário administrador inicial
--
-- Cria a conta admin@elos.app com a senha inicial "cria2024".
-- A senha fica no Supabase Auth (hash bcrypt), nunca no bundle do frontend:
-- a tela "Acesso Administrativo" envia o que foi digitado para uma Server Action,
-- que faz signInWithPassword com o e-mail definido em ADMIN_EMAIL.
-- Para trocar a senha depois: Supabase Studio > Authentication > Users.

do $seed$
declare
  v_email text := 'admin@elos.app';
  v_pass  text := 'cria2024';
  v_id    uuid;
begin
  select id into v_id from auth.users where email = v_email;

  if v_id is null then
    v_id := gen_random_uuid();

    -- Os campos de token precisam de string vazia, não NULL: o GoTrue falha com
    -- "Database error querying schema" ao ler linhas inseridas manualmente com NULL.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, crypt(v_pass, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Administrador"}'::jsonb,
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
  end if;

  insert into public.profiles (id, full_name, role)
  values (v_id, 'Administrador', 'admin')
  on conflict (id) do update set role = 'admin', full_name = 'Administrador';
end $seed$;
