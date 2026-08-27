-- ELOS — o Admin precisa ver o e-mail de cada conta para identificar quem é quem
-- (dois "João Silva" no mesmo Elo são indistinguíveis só pelo nome).
-- auth.users não é exposto pela API, então vai por função restrita ao admin.

create or replace function public.admin_user_emails()
returns table (id uuid, email text)
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Apenas a administração pode ver os e-mails';
  end if;
  return query select u.id, u.email::text from auth.users u;
end $fn$;

revoke execute on function public.admin_user_emails() from anon, public;
grant  execute on function public.admin_user_emails() to authenticated;
