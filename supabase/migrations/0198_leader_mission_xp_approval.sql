-- XP de missão criada por líder: até 1 XP direto; de 2 a 3 XP só com aprovação do admin (o admin continua livre até 25).
-- A regra fica no banco (trava + funções), não só na tela. Missões antigas de líder com XP maior ficam como estão.
alter table public.missions
  add column if not exists xp_requested integer check (xp_requested is null or xp_requested between 2 and 3),
  add column if not exists xp_status text not null default 'none' check (xp_status in ('none', 'pending', 'approved', 'rejected')),
  add column if not exists xp_reviewed_at timestamptz;

create index if not exists missions_xp_pending_idx on public.missions (created_at) where xp_status = 'pending';

-- Trava: quem não é admin não passa de 1 XP nem mexe nos campos do pedido (só as funções abaixo mexem).
create or replace function public._missions_xp_gate()
returns trigger language plpgsql set search_path = public as $fn$
begin
  if coalesce(current_setting('app.xp_gate', true), '') = 'on' or auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.xp > 1 then
      raise exception 'Líder só pode colocar 1 XP direto. De 2 a 3 XP precisa da aprovação do admin.';
    end if;
    new.xp_requested := null;
    new.xp_status := 'none';
    new.xp_reviewed_at := null;
  else
    if new.xp is distinct from old.xp and new.xp > greatest(old.xp, 1) then
      raise exception 'Líder só pode colocar 1 XP direto. De 2 a 3 XP precisa da aprovação do admin.';
    end if;
    new.xp_requested := old.xp_requested;
    new.xp_status := old.xp_status;
    new.xp_reviewed_at := old.xp_reviewed_at;
  end if;
  return new;
end $fn$;
revoke all on function public._missions_xp_gate() from public, anon, authenticated;

drop trigger if exists missions_xp_gate on public.missions;
create trigger missions_xp_gate before insert or update on public.missions
  for each row execute function public._missions_xp_gate();

-- Líder (dono da missão) ou admin muda o XP. Líder: 0 a 1 vale na hora; 2 a 3 vira pedido pendente (o XP segue o atual até o admin aprovar).
-- A chave app.xp_gate só fica ligada durante a alteração (desliga logo depois) para a trava continuar valendo no resto da transação.
create or replace function public.mission_set_xp(p_mission uuid, p_xp integer)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  m public.missions;
  v_uid uuid := auth.uid();
  v_admin boolean := public.is_admin();
  v_res jsonb;
begin
  if v_uid is null then raise exception 'Sem permissão.'; end if;
  select * into m from public.missions where id = p_mission for update;
  if not found then raise exception 'Missão não encontrada.'; end if;
  if not (v_admin or m.created_by = v_uid) then raise exception 'Sem permissão.'; end if;
  if p_xp is null or p_xp < 0 then raise exception 'XP inválido.'; end if;
  if v_admin and p_xp > 25 then raise exception 'O máximo de XP por missão é 25.'; end if;
  if not v_admin and p_xp > 3 then raise exception 'O máximo para líderes é 3 XP (acima de 1, o admin precisa aprovar).'; end if;

  perform set_config('app.xp_gate', 'on', true);
  if v_admin then
    update public.missions set xp = p_xp, xp_requested = null, xp_status = 'none', xp_reviewed_at = null where id = m.id;
    v_res := jsonb_build_object('xp', p_xp, 'status', 'none');
  elsif p_xp = m.xp then
    -- mesmo valor: só cancela um pedido pendente ou recusado (se já estava aprovado, continua aprovado)
    update public.missions
       set xp_requested = case when m.xp_status = 'approved' then m.xp_requested else null end,
           xp_status = case when m.xp_status = 'approved' then 'approved' else 'none' end
     where id = m.id;
    v_res := jsonb_build_object('xp', m.xp, 'status', case when m.xp_status = 'approved' then 'approved' else 'none' end);
  elsif p_xp <= 1 or p_xp < m.xp then
    -- 1 XP direto, ou diminuir o que já vale: não precisa de aprovação
    update public.missions set xp = p_xp, xp_requested = null, xp_status = 'none', xp_reviewed_at = null where id = m.id;
    v_res := jsonb_build_object('xp', p_xp, 'status', 'none');
  else
    update public.missions set xp_requested = p_xp, xp_status = 'pending', xp_reviewed_at = null where id = m.id;
    v_res := jsonb_build_object('xp', m.xp, 'status', 'pending', 'requested', p_xp);
  end if;
  perform set_config('app.xp_gate', 'off', true);
  return v_res;
end $fn$;
revoke all on function public.mission_set_xp(uuid, integer) from public, anon;
grant execute on function public.mission_set_xp(uuid, integer) to authenticated;

-- Admin aprova (o XP da missão passa a valer o pedido) ou recusa (fica no que já valia).
create or replace function public.admin_review_mission_xp(p_mission uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare m public.missions;
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into m from public.missions where id = p_mission for update;
  if not found then raise exception 'Missão não encontrada.'; end if;
  if m.xp_status <> 'pending' or m.xp_requested is null then raise exception 'Essa missão não tem pedido de XP pendente.'; end if;
  perform set_config('app.xp_gate', 'on', true);
  if p_approve then
    update public.missions set xp = m.xp_requested, xp_status = 'approved', xp_reviewed_at = now() where id = m.id;
  else
    update public.missions set xp_status = 'rejected', xp_reviewed_at = now() where id = m.id;
  end if;
  perform set_config('app.xp_gate', 'off', true);
  return jsonb_build_object('approved', p_approve, 'xp', case when p_approve then m.xp_requested else m.xp end, 'created_by', m.created_by, 'title', m.title);
end $fn$;
revoke all on function public.admin_review_mission_xp(uuid, boolean) from public, anon;
grant execute on function public.admin_review_mission_xp(uuid, boolean) to authenticated;
