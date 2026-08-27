-- ELOS — crypt() e gen_salt() ficam no schema "extensions" no Supabase.
--
-- As funções admin_* declaram "set search_path = public", então elas não
-- enxergavam o pgcrypto e falhavam com:
--   function gen_salt(unknown) does not exist
-- A correção é incluir o schema extensions no search_path das duas funções que
-- geram hash de senha. As demais funções não usam pgcrypto e ficam como estão.

alter function public.admin_create_user(text, text, text, text, text, text)
  set search_path = public, extensions;

alter function public.admin_set_password(uuid, text)
  set search_path = public, extensions;
