-- O admin corrige o XP já ganho numa missão cumprida: muda a linha de XP e o total do cria pela diferença, e registra tudo.
alter table public.xp_transactions
  add column if not exists adjusted_from integer,
  add column if not exists adjusted_by uuid references public.profiles(id) on delete set null,
  add column if not exists adjusted_at timestamptz,
  add column if not exists adjust_reason text;

create or replace function public.admin_adjust_mission_xp(p_tx uuid, p_new_xp integer, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  t public.xp_transactions;
  v_diff integer;
  v_xp integer;
  v_actor text;
  v_cria text;
  v_title text;
begin
  if not public.is_admin() then raise exception 'Apenas admin'; end if;
  if p_new_xp is null or p_new_xp < 0 or p_new_xp > 25 then raise exception 'O XP de uma missão vai de 0 a 25.'; end if;
  select * into t from public.xp_transactions where id = p_tx for update;
  if not found or t.type <> 'mission_approved' then raise exception 'Essa linha de XP não é de uma missão cumprida.'; end if;
  v_diff := p_new_xp - t.amount;
  if v_diff = 0 then
    return jsonb_build_object('changed', false, 'xp', t.amount);
  end if;

  select xp, full_name into v_xp, v_cria from public.profiles where id = t.user_id for update;
  if v_xp + v_diff < 0 then
    raise exception 'Esse cria ficaria com XP negativo (hoje ele tem % XP).', v_xp;
  end if;

  perform set_config('elos.xp_bypass', 'on', true);
  update public.profiles set xp = xp + v_diff where id = t.user_id;
  perform set_config('elos.xp_bypass', 'off', true);

  update public.xp_transactions
     set amount = p_new_xp,
         adjusted_from = coalesce(adjusted_from, t.amount),
         adjusted_by = auth.uid(),
         adjusted_at = now(),
         adjust_reason = nullif(trim(coalesce(p_reason, '')), '')
   where id = t.id;

  select full_name into v_actor from public.profiles where id = auth.uid();
  select title into v_title from public.missions where id = t.mission_id;
  insert into public.audit_log (actor_id, actor_name, action, target_type, target_id, target_name, details)
  values (auth.uid(), v_actor, 'xp_adjust', 'xp_transaction', t.id, v_cria,
          jsonb_build_object('mission', coalesce(v_title, 'Missão excluída'), 'from', t.amount, 'to', p_new_xp, 'diff', v_diff, 'reason', nullif(trim(coalesce(p_reason, '')), '')));

  return jsonb_build_object('changed', true, 'xp', p_new_xp, 'diff', v_diff, 'user_id', t.user_id, 'cria', v_cria, 'mission', coalesce(v_title, 'Missão excluída'));
end $fn$;
revoke all on function public.admin_adjust_mission_xp(uuid, integer, text) from public, anon;
grant execute on function public.admin_adjust_mission_xp(uuid, integer, text) to authenticated;

-- A lista de missões cumpridas agora traz o id da linha de XP e o valor original (quando já foi corrigido).
drop function if exists public.elo_missions_done(uuid, integer, integer);
create or replace function public.elo_missions_done(p_elo uuid, p_days integer default 30, p_limit integer default 200)
returns table (tx_id uuid, done_at timestamptz, mission_id uuid, mission_title text, member_id uuid, member_name text, xp integer, approver_name text, adjusted_from integer, adjust_reason text)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if auth.uid() is null or not public._elo_history_allowed(p_elo) then
    raise exception 'Sem permissão.';
  end if;
  return query
    select t.id, t.created_at, t.mission_id, coalesce(m.title, 'Missão excluída'), t.user_id, p.full_name, t.amount, ap.full_name, t.adjusted_from, t.adjust_reason
      from public.xp_transactions t
      join public.profiles p on p.id = t.user_id and p.elo_id = p_elo and p.role = 'cria'
      left join public.missions m on m.id = t.mission_id
      left join public.mission_assignments a on a.id = t.assignment_id
      left join public.profiles ap on ap.id = a.approved_by
     where t.type = 'mission_approved'
       and (p_days is null or t.created_at >= now() - make_interval(days => p_days))
     order by t.created_at desc
     limit greatest(1, least(coalesce(p_limit, 200), 500));
end $fn$;
revoke all on function public.elo_missions_done(uuid, integer, integer) from public, anon;
grant execute on function public.elo_missions_done(uuid, integer, integer) to authenticated;
