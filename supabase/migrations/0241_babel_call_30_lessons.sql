-- Babel: com as unidades 5 a 10 a trilha tem 30 lições (3 por unidade); o último nível só abre depois de todas.
-- Se a trilha crescer de novo, ajuste este número (LESSON_ORDER.length em src/lib/english/content.ts).

create or replace function public.babel_call_request(p_leader text, p_note text) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'Entre de novo.'; end if;
  if p_leader not in ('natan', 'rebeca') then raise exception 'Líder inválido.'; end if;
  if (select count(*) from public.english_lessons_done where user_id = auth.uid() and lesson_id not like '%lendario') < 30 then
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
