-- Histórico de XP por Elo e de missões cumpridas.
-- O XP dos crias já fica em xp_transactions (missão, jogos, entrada diária, feed...). Faltavam os bônus do Elo, que não deixavam rastro:
--  * elo_bonus_log guarda cada bônus dado direto ao Elo (a partir de agora; o que veio antes aparece como "anterior ao histórico");
--  * o prêmio de desafio de Elo também passa a gravar uma linha de XP para cada cria premiado.

create table if not exists public.elo_bonus_log (
  id         uuid primary key default gen_random_uuid(),
  elo_id     uuid not null references public.elos(id) on delete cascade,
  amount     integer not null,
  source     text not null check (source in ('admin_add', 'admin_set')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists elo_bonus_log_elo_idx on public.elo_bonus_log (elo_id, created_at desc);
alter table public.elo_bonus_log enable row level security;
-- sem políticas: só as funções abaixo (que checam a permissão) leem e gravam

-- Bônus somado por cima do Elo: agora com registro.
create or replace function public.admin_add_elo_bonus_xp(p_elo_id uuid, p_amount integer)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin';
  end if;
  update public.elos set bonus_xp = bonus_xp + p_amount where id = p_elo_id;
  if p_amount <> 0 then
    insert into public.elo_bonus_log (elo_id, amount, source, created_by) values (p_elo_id, p_amount, 'admin_add', auth.uid());
  end if;
end $fn$;

-- Define o XP total do Elo: o bônus muda pela diferença, e a diferença fica registrada.
create or replace function public.admin_set_elo_total_xp(p_elo_id uuid, p_total integer)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_crias_xp integer;
  v_old integer;
  v_new integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin';
  end if;
  select coalesce(sum(xp), 0) into v_crias_xp from public.profiles where elo_id = p_elo_id and role = 'cria';
  select bonus_xp into v_old from public.elos where id = p_elo_id;
  v_new := p_total - v_crias_xp;
  update public.elos set bonus_xp = v_new where id = p_elo_id;
  if v_new <> coalesce(v_old, 0) then
    insert into public.elo_bonus_log (elo_id, amount, source, created_by) values (p_elo_id, v_new - coalesce(v_old, 0), 'admin_set', auth.uid());
  end if;
end $fn$;

-- Prêmio de desafio de Elo: além de somar no XP de cada cria, grava a linha de XP (aparece no histórico e no perfil).
create or replace function public.award_elo_challenge_bonus(p_elo_id uuid, p_amount int)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Apenas a administração pode premiar um desafio';
  end if;
  if p_amount <= 0 then return; end if;
  update public.profiles set xp = xp + p_amount where elo_id = p_elo_id and role = 'cria';
  insert into public.xp_transactions (user_id, amount, type)
  select id, p_amount, 'elo_challenge' from public.profiles where elo_id = p_elo_id and role = 'cria';
end $fn$;

-- Quem pode ver o histórico de um Elo: admin (todos) ou líder aprovado do próprio Elo.
create or replace function public._elo_history_allowed(p_elo uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select public.is_admin() or exists (
    select 1 from public.profiles me
     where me.id = auth.uid() and me.role = 'leader' and me.approved and me.elo_id = p_elo
  );
$fn$;
revoke all on function public._elo_history_allowed(uuid) from public, anon, authenticated;

-- Resumo do XP ganho pelos crias do Elo no período (p_days nulo = desde o começo). Datas no horário de Brasília.
create or replace function public.elo_xp_history(p_elo uuid, p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_since timestamptz := case when p_days is null then null else now() - make_interval(days => p_days) end;
  v jsonb;
begin
  if auth.uid() is null or not public._elo_history_allowed(p_elo) then
    raise exception 'Sem permissão.';
  end if;
  with tx as (
    select t.user_id, t.amount, t.type, t.created_at, p.full_name
      from public.xp_transactions t
      join public.profiles p on p.id = t.user_id and p.elo_id = p_elo and p.role = 'cria'
     where v_since is null or t.created_at >= v_since
  )
  select jsonb_build_object(
    'since', v_since,
    'total', coalesce((select sum(amount) from tx), 0),
    'missions_done', coalesce((select count(*) from tx where type = 'mission_approved'), 0),
    'missions_xp', coalesce((select sum(amount) from tx where type = 'mission_approved'), 0),
    'active_members', coalesce((select count(distinct user_id) from tx), 0),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'xp', x) order by d)
        from (select (created_at at time zone 'America/Sao_Paulo')::date as d, sum(amount) as x from tx group by 1) q), '[]'::jsonb),
    'by_type', coalesce((select jsonb_agg(jsonb_build_object('type', ty, 'xp', x, 'n', n) order by x desc)
        from (select type as ty, sum(amount) as x, count(*) as n from tx group by 1) q), '[]'::jsonb),
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', uid, 'name', nm, 'xp', x, 'missions', ms) order by x desc)
        from (select user_id as uid, max(full_name) as nm, sum(amount) as x, count(*) filter (where type = 'mission_approved') as ms from tx group by 1) q), '[]'::jsonb),
    'bonus_in_period', coalesce((select sum(amount) from public.elo_bonus_log b where b.elo_id = p_elo and (v_since is null or b.created_at >= v_since)), 0),
    'bonus_events', coalesce((select jsonb_agg(jsonb_build_object('at', created_at, 'amount', amount, 'source', source) order by created_at desc)
        from public.elo_bonus_log b where b.elo_id = p_elo and (v_since is null or b.created_at >= v_since)), '[]'::jsonb),
    'bonus_total_now', coalesce((select bonus_xp from public.elos where id = p_elo), 0),
    'bonus_logged_total', coalesce((select sum(amount) from public.elo_bonus_log b where b.elo_id = p_elo), 0)
  ) into v;
  return v;
end $fn$;
revoke all on function public.elo_xp_history(uuid, integer) from public, anon;
grant execute on function public.elo_xp_history(uuid, integer) to authenticated;

-- Missões cumpridas (aprovadas) pelos crias do Elo no período: quando, qual missão, quem cumpriu, quanto XP e quem aprovou.
create or replace function public.elo_missions_done(p_elo uuid, p_days integer default 30, p_limit integer default 200)
returns table (done_at timestamptz, mission_id uuid, mission_title text, member_id uuid, member_name text, xp integer, approver_name text)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if auth.uid() is null or not public._elo_history_allowed(p_elo) then
    raise exception 'Sem permissão.';
  end if;
  return query
    select t.created_at, t.mission_id, coalesce(m.title, 'Missão excluída'), t.user_id, p.full_name, t.amount, ap.full_name
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
