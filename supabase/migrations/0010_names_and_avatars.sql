-- ELOS — nome dividido em Nome + Sobrenome, e foto de perfil.
--
-- full_name continua existindo e é o que a interface exibe em todo lugar
-- (ranking, missões, status). Ele passa a ser derivado de first_name +
-- last_name por trigger, então não há dois lugares para manter em sincronia.

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name  text;

-- preenche os registros que já existem a partir do full_name atual.
-- Sem espaço no nome não há sobrenome: position() devolveria 0 e o substring
-- repetiria o nome inteiro em last_name.
update public.profiles
   set first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
       last_name  = coalesce(
         last_name,
         case
           when position(' ' in trim(full_name)) > 0
             then nullif(trim(substring(full_name from position(' ' in full_name) + 1)), '')
         end
       )
 where full_name <> '' and (first_name is null or last_name is null);

create or replace function public.compose_full_name()
returns trigger language plpgsql set search_path = public as $fn$
begin
  if new.first_name is not null or new.last_name is not null then
    new.full_name := trim(both ' ' from
      coalesce(trim(new.first_name), '') || ' ' || coalesce(trim(new.last_name), ''));
  end if;
  return new;
end $fn$;

revoke execute on function public.compose_full_name() from anon, authenticated, public;

-- roda depois do guard e do autofill de Elo
drop trigger if exists trg_c_compose_name on public.profiles;
create trigger trg_c_compose_name
  before insert or update on public.profiles
  for each row execute function public.compose_full_name();

-- ---------------------------------------------------------------- novo usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  g public.gender_t;
  a public.age_range_t;
  v_first text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  v_last  text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  v_full  text := coalesce(new.raw_user_meta_data->>'full_name',
                           new.raw_user_meta_data->>'name', '');
begin
  begin g := (new.raw_user_meta_data->>'gender')::public.gender_t;
  exception when others then g := null; end;
  begin a := (new.raw_user_meta_data->>'age_range')::public.age_range_t;
  exception when others then a := null; end;

  -- se vier só o nome completo (contas antigas), divide no primeiro espaço
  if v_first is null and v_full <> '' then
    v_first := split_part(v_full, ' ', 1);
    v_last  := case
                 when position(' ' in trim(v_full)) > 0
                   then nullif(trim(substring(v_full from position(' ' in v_full) + 1)), '')
               end;
  end if;

  insert into public.profiles (id, first_name, last_name, full_name, gender, age_range)
  values (new.id, v_first, v_last, v_full, g, a)
  on conflict (id) do nothing;
  return new;
end $fn$;

-- ---------------------------------------------------------------- admin cria
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

  if v_role <> 'cria' then
    update public.profiles set role = v_role where id = v_id;
  end if;

  return v_id;
end $fn$;

drop function if exists public.admin_create_user(text, text, text, text, text, text);

revoke execute on function public.admin_create_user(text, text, text, text, text, text, text) from anon, public;
grant  execute on function public.admin_create_user(text, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------- fotos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- qualquer um vê as fotos (o bucket é público); cada pessoa só escreve na
-- própria pasta, cujo nome é o id do usuário.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
