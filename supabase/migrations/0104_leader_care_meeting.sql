-- ELOS — quando quem responde "Mal" é um líder, a conversa deve ser com a
-- administração (hoje o "líder de todos os líderes"), não com outro líder.
-- Reaproveita a tabela care_meetings (cria_id guarda o proponente, seja cria
-- ou líder) só adicionando pra quem, dentre os admins, o líder endereçou.
alter table public.care_meetings
  add column if not exists target_admin_id uuid references public.profiles(id) on delete set null;

-- assinatura mudou (novo parâmetro) — CREATE OR REPLACE criaria uma
-- sobrecarga em vez de substituir; remove a versão antiga primeiro.
drop function if exists public.request_care_meeting(text, date, time, text, uuid);

create or replace function public.request_care_meeting(
  p_modality text, p_date date, p_time time default null, p_note text default null,
  p_status_response uuid default null, p_target_admin_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_elo uuid; v_role text; v_name text;
begin
  select role, elo_id, full_name into v_role, v_elo, v_name from public.profiles where id = auth.uid();
  if v_role not in ('cria', 'leader') then raise exception 'Sem permissão para propor conversa'; end if;
  if p_modality not in ('online', 'presencial') then raise exception 'Modalidade inválida'; end if;
  if p_date is null then raise exception 'Escolha uma data'; end if;

  if v_role = 'leader' and p_target_admin_id is not null then
    if not exists (select 1 from public.profiles where id = p_target_admin_id and role = 'admin') then
      raise exception 'Destinatário inválido';
    end if;
  end if;

  insert into public.care_meetings
    (cria_id, elo_id, status_response_id, modality, proposed_date, proposed_time, note, status, proposed_by, target_admin_id)
  values (auth.uid(), v_elo, p_status_response, p_modality, p_date, p_time, p_note, 'pending_leader', v_role,
          case when v_role = 'leader' then p_target_admin_id else null end)
  returning id into v_id;

  if v_role = 'cria' then
    insert into public.notifications (user_id, title, body, category)
    select p.id, 'Pedido de conversa', coalesce(v_name, 'Um cria') || ' pediu uma conversa.', 'status'
      from public.profiles p
     where p.elo_id = v_elo and p.role = 'leader' and p.approved = true;
  else
    insert into public.notifications (user_id, title, body, category)
    select p.id, 'Pedido de conversa', coalesce(v_name, 'Um líder') || ' pediu uma conversa.', 'status'
      from public.profiles p
     where p.role = 'admin' and (p_target_admin_id is null or p.id = p_target_admin_id);
  end if;

  return v_id;
end $fn$;

revoke execute on function public.request_care_meeting(text, date, time, text, uuid, uuid) from anon, public;
grant  execute on function public.request_care_meeting(text, date, time, text, uuid, uuid) to authenticated;

-- A RLS de profiles não deixa um líder ler a linha de um admin (não é
-- "seu" líder nem está no mesmo Elo) — sem essa função a lista de "falar
-- com" na tela de status vinha sempre vazia pra quem é líder.
create or replace function public.leader_admin_contacts()
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $fn$
  select p.id, p.full_name
    from public.profiles p
   where p.role = 'admin'
     and exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'leader')
   order by p.full_name
$fn$;

revoke execute on function public.leader_admin_contacts() from anon, public;
grant  execute on function public.leader_admin_contacts() to authenticated;

-- Texto neutro: quem respondeu pode ser admin (pedido de líder) ou líder
-- (pedido de cria) — "sua liderança" cobre os dois sem afirmar errado.
create or replace function public.respond_care_meeting(
  p_id uuid, p_approve boolean, p_date date default null, p_time time default null, p_modality text default null
)
returns void language plpgsql security definer set search_path = public as $fn$
declare m record;
begin
  select * into m from public.care_meetings where id = p_id for update;
  if not found then raise exception 'Conversa não encontrada'; end if;
  if not (public.is_admin() or public.is_leader_of(m.cria_id)) then
    raise exception 'Sem permissão';
  end if;
  if m.status <> 'pending_leader' then raise exception 'Essa conversa não está aguardando resposta'; end if;

  if p_approve then
    update public.care_meetings
       set status = 'confirmed', responded_by = auth.uid(), updated_at = now()
     where id = p_id;
    insert into public.notifications (user_id, title, body, category)
    values (m.cria_id, 'Conversa confirmada', 'Sua conversa foi confirmada.', 'status');
  else
    if p_date is null then raise exception 'Informe a nova data'; end if;
    update public.care_meetings
       set status = 'pending_cria', proposed_by = 'leader', responded_by = auth.uid(),
           proposed_date = p_date, proposed_time = coalesce(p_time, proposed_time),
           modality = coalesce(p_modality, modality), updated_at = now()
     where id = p_id;
    insert into public.notifications (user_id, title, body, category)
    values (m.cria_id, 'Nova data proposta', 'Foi sugerido outro dia para a conversa.', 'status');
  end if;
end $fn$;
