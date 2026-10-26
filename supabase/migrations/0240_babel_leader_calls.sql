-- Babel — último nível: chamada de 10 minutos com um líder (Natan ou Rebeca).
-- O aluno que concluiu as lições pede a chamada (escolhe o líder e os horários que prefere); o admin marca data/hora + link
-- e, depois da conversa, confirma que aconteceu (paga a recompensa em gemas). Uma chamada aberta por aluno.

create table if not exists public.babel_leader_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leader text not null check (leader in ('natan', 'rebeca')),
  note text,
  status text not null default 'requested' check (status in ('requested', 'scheduled', 'done', 'cancelled')),
  scheduled_at timestamptz,
  link text,
  gems_paid int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index if not exists babel_leader_calls_open_idx on public.babel_leader_calls (user_id) where status in ('requested', 'scheduled');
create index if not exists babel_leader_calls_status_idx on public.babel_leader_calls (status, created_at desc);
alter table public.babel_leader_calls enable row level security;
drop policy if exists babel_leader_calls_select on public.babel_leader_calls;
create policy babel_leader_calls_select on public.babel_leader_calls for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- sem política de escrita: só as funções abaixo gravam.

-- O aluno pede a chamada (precisa ter concluído as 12 lições da trilha; o nível lendário não conta).
create or replace function public.babel_call_request(p_leader text, p_note text) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'Entre de novo.'; end if;
  if p_leader not in ('natan', 'rebeca') then raise exception 'Líder inválido.'; end if;
  if (select count(*) from public.english_lessons_done where user_id = auth.uid() and lesson_id not like '%lendario') < 12 then
    raise exception 'Conclua todas as lições para liberar a conversa com o líder.';
  end if;
  if exists (select 1 from public.babel_leader_calls where user_id = auth.uid() and status in ('requested', 'scheduled')) then
    raise exception 'Você já tem uma conversa em andamento.';
  end if;
  insert into public.babel_leader_calls (user_id, leader, note) values (auth.uid(), p_leader, left(nullif(trim(p_note), ''), 300)) returning id into v_id;
  select coalesce(nullif(first_name, ''), split_part(coalesce(full_name, ''), ' ', 1), 'Um cria') into v_name from public.profiles where id = auth.uid();
  insert into public.notifications (user_id, title, body, link, category)
  select a.id, 'Babel: pedido de conversa', v_name || ' concluiu a trilha e quer a conversa de 10 min com ' || case p_leader when 'natan' then 'o Natan' else 'a Rebeca' end || '.', '/app/admin/babel-conversas', 'babel_call'
    from public.profiles a where a.role = 'admin';
  return v_id;
end $fn$;
revoke execute on function public.babel_call_request(text, text) from public, anon;
grant execute on function public.babel_call_request(text, text) to authenticated;

-- O aluno cancela enquanto ainda não aconteceu.
create or replace function public.babel_call_cancel(p_id uuid) returns void language sql security definer set search_path = public as $$
  update public.babel_leader_calls set status = 'cancelled', updated_at = now() where id = p_id and user_id = auth.uid() and status in ('requested', 'scheduled');
$$;
revoke execute on function public.babel_call_cancel(uuid) from public, anon;
grant execute on function public.babel_call_cancel(uuid) to authenticated;

-- Admin marca data/hora e o link da chamada; o aluno recebe o aviso no sino.
create or replace function public.admin_babel_call_schedule(p_id uuid, p_at timestamptz, p_link text) returns void
language plpgsql security definer set search_path = public as $fn$
declare c public.babel_leader_calls;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select * into c from public.babel_leader_calls where id = p_id for update;
  if not found or c.status not in ('requested', 'scheduled') then raise exception 'Pedido não encontrado.'; end if;
  if p_at is null or p_at < now() - interval '1 hour' then raise exception 'Escolha uma data futura.'; end if;
  update public.babel_leader_calls set status = 'scheduled', scheduled_at = p_at, link = left(nullif(trim(p_link), ''), 300), updated_at = now() where id = p_id;
  insert into public.notifications (user_id, title, body, link, category)
  values (c.user_id, 'Sua conversa está marcada!', 'Conversa de 10 min com ' || case c.leader when 'natan' then 'o Natan' else 'a Rebeca' end || ' em ' || to_char(p_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') || '. Toque para ver o link.', '/app/jogos/ingles/lider', 'babel_call');
end $fn$;
revoke execute on function public.admin_babel_call_schedule(uuid, timestamptz, text) from public, anon;
grant execute on function public.admin_babel_call_schedule(uuid, timestamptz, text) to authenticated;

-- Admin confirma que a conversa aconteceu: paga 300 gemas (uma vez) e avisa o aluno. Ou cancela.
create or replace function public.admin_babel_call_finish(p_id uuid, p_done boolean) returns void
language plpgsql security definer set search_path = public as $fn$
declare c public.babel_leader_calls; v_gems int := 300;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select * into c from public.babel_leader_calls where id = p_id for update;
  if not found or c.status not in ('requested', 'scheduled') then raise exception 'Pedido não encontrado.'; end if;
  if p_done then
    update public.babel_leader_calls set status = 'done', completed_at = now(), gems_paid = v_gems, updated_at = now() where id = p_id;
    insert into public.babel_profile (user_id) values (c.user_id) on conflict (user_id) do nothing;
    update public.babel_profile set gems = gems + v_gems, updated_at = now() where user_id = c.user_id;
    insert into public.notifications (user_id, title, body, link, category)
    values (c.user_id, 'Conversa concluída!', 'Parabéns, você completou o último nível do Babel! +' || v_gems || ' gemas de presente.', '/app/jogos/ingles/lider', 'babel_call');
  else
    update public.babel_leader_calls set status = 'cancelled', updated_at = now() where id = p_id;
    insert into public.notifications (user_id, title, body, link, category)
    values (c.user_id, 'Conversa cancelada', 'Peça uma nova conversa quando quiser.', '/app/jogos/ingles/lider', 'babel_call');
  end if;
end $fn$;
revoke execute on function public.admin_babel_call_finish(uuid, boolean) from public, anon;
grant execute on function public.admin_babel_call_finish(uuid, boolean) to authenticated;
