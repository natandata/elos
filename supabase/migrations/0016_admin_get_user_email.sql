-- ELOS — busca o e-mail de um único usuário, para o admin enviar notificação
-- por e-mail. Complementa admin_user_emails() (que lista todos) com uma
-- versão pontual, mais barata quando só se precisa de um endereço.

create or replace function public.admin_get_user_email(p_user uuid)
returns text
language sql stable security definer set search_path = public as $fn$
  select case when public.is_admin() then u.email::text end
    from auth.users u
   where u.id = p_user
$fn$;

revoke execute on function public.admin_get_user_email(uuid) from anon, public;
grant  execute on function public.admin_get_user_email(uuid) to authenticated;
