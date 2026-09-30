-- ELOS — "Líderes inativos" usava auth.users.last_sign_in_at, que só
-- atualiza numa autenticação de verdade (login novo), não a cada visita —
-- uma sessão que fica válida por semanas (refresh automático) nunca
-- reautentica, então o líder aparecia "sem login há 14+ dias" mesmo usando
-- o app todo dia. public.user_presence.last_seen_at já existe pra isso
-- exatamente (heartbeat do próprio cliente a cada ~20s/troca de rota, é o
-- que alimenta o indicador "Online" em Admin > Usuários) — é o sinal certo
-- de atividade real, não o de autenticação.
create or replace function public.admin_dashboard_report()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Apenas admin'; end if;

  select jsonb_build_object(
    'bad_status_week', (
      select count(distinct user_id) from public.status_responses
       where created_at >= now() - interval '7 days'
         and (emotional_status = 'bad' or spiritual_status = 'bad')
    ),
    'elos_without_leader', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name)), '[]'::jsonb)
        from public.elos e
       where not exists (
         select 1 from public.profiles p
          where p.elo_id = e.id and p.role = 'leader' and p.approved = true
       )
    ),
    'inactive_leaders', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.full_name, 'elo', e.name,
               'last_sign_in', up.last_seen_at
             )), '[]'::jsonb)
        from public.profiles p
        left join public.user_presence up on up.user_id = p.id
        left join public.elos e on e.id = p.elo_id
       where p.role = 'leader' and p.approved = true
         and (up.last_seen_at is null or up.last_seen_at < now() - interval '14 days')
    )
    -- chave do JSON continua "last_sign_in" por compatibilidade com o
    -- front (RelatorioPage.tsx) — o valor agora é o último acesso real
    -- (user_presence), não mais a última autenticação (auth.users).
  ) into result;

  return result;
end $fn$;
