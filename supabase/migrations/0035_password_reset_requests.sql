-- ELOS — troca o "esqueci minha senha" por link de e-mail (que dependia de
-- configuração do Supabase que quebrou em produção) por um pedido direto
-- pro admin: o usuário sugere a senha que quer, o admin aplica com um clique.
-- Reaproveita a mesma técnica de admin_set_password (update direto em
-- auth.users via pgcrypto) — não depende de e-mail nenhum.

create table if not exists public.password_reset_requests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  suggested_password text not null,
  status             text not null default 'pending' check (status in ('pending', 'done', 'dismissed')),
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid references public.profiles(id) on delete set null
);

create index if not exists password_reset_requests_status_idx
  on public.password_reset_requests(status, created_at);

alter table public.password_reset_requests enable row level security;

-- só admin lê (a senha sugerida é tão sensível quanto o campo que o admin já
-- usa hoje pra redefinir senha manualmente — mesmo nível de confiança).
drop policy if exists password_reset_requests_admin_read on public.password_reset_requests;
create policy password_reset_requests_admin_read on public.password_reset_requests for select to authenticated using (
  public.is_admin()
);

-- ninguém insere/atualiza direto pela API — só pelas funções abaixo.

-- ---------------------------------------------------------------- pedido (público, sem login)
-- Chamado da tela de login, onde por definição o usuário NÃO está autenticado
-- (esqueceu a senha). Não revela se o e-mail existe: falha silenciosamente.
create or replace function public.request_password_reset(p_email text, p_suggested_password text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_user uuid; v_name text;
begin
  if length(coalesce(p_suggested_password, '')) < 6 then
    raise exception 'A senha sugerida precisa ter ao menos 6 caracteres';
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then return; end if;

  select full_name into v_name from public.profiles where id = v_user;

  -- evita acumular pedidos repetidos da mesma pessoa
  delete from public.password_reset_requests where user_id = v_user and status = 'pending';

  insert into public.password_reset_requests (user_id, suggested_password)
  values (v_user, p_suggested_password);

  insert into public.notifications (user_id, title, body, category)
  select p.id, 'Pedido de redefinição de senha',
         coalesce(nullif(v_name, ''), 'Alguém') || ' pediu para trocar a própria senha.', 'user'
    from public.profiles p where p.role = 'admin';
end $fn$;

revoke execute on function public.request_password_reset(text, text) from public;
grant  execute on function public.request_password_reset(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- aplicar (admin)
create or replace function public.admin_apply_password_reset(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $fn$
declare r record;
begin
  if not public.is_admin() then
    raise exception 'Apenas a administração pode aplicar esse pedido';
  end if;

  select * into r from public.password_reset_requests where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Pedido não encontrado ou já resolvido'; end if;

  update auth.users
     set encrypted_password = crypt(r.suggested_password, gen_salt('bf')),
         updated_at = now()
   where id = r.user_id;

  update public.password_reset_requests
     set status = 'done', resolved_at = now(), resolved_by = auth.uid()
   where id = p_id;

  insert into public.notifications (user_id, title, body, category)
  values (r.user_id, 'Sua senha foi redefinida', 'A administração aplicou a senha que você sugeriu.', 'user');
end $fn$;

revoke execute on function public.admin_apply_password_reset(uuid) from anon, public;
grant  execute on function public.admin_apply_password_reset(uuid) to authenticated;

-- ---------------------------------------------------------------- recusar (admin)
create or replace function public.admin_dismiss_password_reset(p_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Apenas a administração pode recusar esse pedido';
  end if;

  update public.password_reset_requests
     set status = 'dismissed', resolved_at = now(), resolved_by = auth.uid()
   where id = p_id and status = 'pending';
  if not found then raise exception 'Pedido não encontrado ou já resolvido'; end if;
end $fn$;

revoke execute on function public.admin_dismiss_password_reset(uuid) from anon, public;
grant  execute on function public.admin_dismiss_password_reset(uuid) to authenticated;
