-- ELOS — Retenção: estratégia por pessoa (painel do admin → Retenção → "Quem precisa de atenção").
-- O admin ativa uma estratégia para uma pessoa: ela recebe um aviso (sino + push) para abrir o app e, no próximo acesso,
-- um cartão de boas-vindas com um presente de XP e um atalho para o que ela mais gosta. Aqui ficam o sinal de cada pessoa
-- (admin_user_signals) e as ofertas (comeback_offers).

create table if not exists public.comeback_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  strategy text not null,
  title text not null,
  body text not null,
  cta_label text,
  cta_href text,
  reward_xp int not null default 0 check (reward_xp between 0 and 20),
  push_status text not null default 'none' check (push_status in ('none', 'pending', 'sent')),
  push_title text,
  push_body text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  shown_at timestamptz,
  claimed_at timestamptz
);
create index if not exists comeback_offers_user_idx on public.comeback_offers (user_id, created_at desc);
create index if not exists comeback_offers_push_idx on public.comeback_offers (push_status) where push_status = 'pending';
alter table public.comeback_offers enable row level security;
drop policy if exists comeback_offers_select on public.comeback_offers;
create policy comeback_offers_select on public.comeback_offers for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- sem política de escrita: só as funções abaixo gravam.

-- Sinais de cada pessoa (só admin): o que ela mais faz, sequências, se tem push, última oferta e, para líder, quantos do Elo estão sumidos.
create or replace function public.admin_user_signals(p_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return coalesce((
    select jsonb_object_agg(p.id::text, jsonb_build_object(
      'first_name', coalesce(nullif(p.first_name, ''), split_part(coalesce(p.full_name, ''), ' ', 1)),
      'role', p.role,
      'signup', (p.created_at at time zone 'America/Sao_Paulo')::date,
      'active_days', (select count(*) from public.daily_active d where d.user_id = p.id),
      'active_days_30', (select count(*) from public.daily_active d where d.user_id = p.id and d.day >= v_today - 29),
      'last_day', (select max(d.day) from public.daily_active d where d.user_id = p.id),
      'dev_streak', coalesce(p.devotional_streak, 0), 'dev_date', p.devotional_streak_date,
      'status_streak', coalesce(p.status_streak, 0), 'status_date', p.status_streak_date,
      'game_streak', coalesce(p.game_streak, 0), 'game_date', p.game_streak_date,
      'has_push', exists (select 1 from public.push_subscriptions s where s.user_id = p.id),
      'features', (select coalesce(jsonb_object_agg(f, n), '{}'::jsonb) from (
          select f, count(*) n from (
            select 'status' f from public.status_responses x where x.user_id = p.id and x.created_at > now() - interval '90 days'
            union all select 'devotional' from public.devotional_entries x where x.user_id = p.id and x.created_at > now() - interval '90 days'
            union all select 'post' from public.feed_posts x where x.author_id = p.id and x.created_at > now() - interval '90 days'
            union all select 'story' from public.story_posts x where x.author_id = p.id and x.created_at > now() - interval '90 days'
            union all select 'chat' from public.chat_messages x where x.sender_id = p.id and x.created_at > now() - interval '90 days'
            union all select 'dm' from public.dm_messages x where x.sender_id = p.id and x.created_at > now() - interval '90 days'
            union all select 'like' from public.feed_likes x where x.user_id = p.id and x.created_at > now() - interval '90 days'
            union all select 'comment' from public.feed_comments x where x.author_id = p.id and x.created_at > now() - interval '90 days'
          ) u group by f) t),
      'games', (select coalesce(jsonb_object_agg(g.game, g.n), '{}'::jsonb) from (
          select ga.game, count(*) n from public.game_activity ga
           where ga.user_id = p.id and ga.created_at > now() - interval '90 days' group by ga.game order by count(*) desc limit 5) g),
      'last_offer', (select jsonb_build_object('created_at', o.created_at, 'claimed_at', o.claimed_at, 'shown_at', o.shown_at, 'push', o.push_status, 'strategy', o.strategy, 'reward_xp', o.reward_xp)
                       from public.comeback_offers o where o.user_id = p.id order by o.created_at desc limit 1),
      'elo_at_risk', case when p.role = 'leader' and p.elo_id is not null then (
          select count(*) from public.profiles m
           where m.elo_id = p.elo_id and m.role = 'cria' and m.approved and not coalesce(m.is_test_account, false)
             and coalesce((select max(d.day) from public.daily_active d where d.user_id = m.id), date '2000-01-01') < v_today - 2) else 0 end
    ))
    from public.profiles p where p.id = any (p_ids)), '{}'::jsonb);
end $fn$;
revoke execute on function public.admin_user_signals(uuid[]) from public, anon;
grant execute on function public.admin_user_signals(uuid[]) to authenticated;

-- Cria a oferta + o aviso no sino (só admin). Uma oferta aberta por pessoa a cada 7 dias.
create or replace function public.admin_comeback_create(
  p_user uuid, p_strategy text, p_title text, p_body text, p_cta_label text, p_cta_href text, p_xp int,
  p_push_status text, p_push_title text, p_push_body text
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if exists (select 1 from public.comeback_offers where user_id = p_user and created_at > now() - interval '7 days') then
    raise exception 'Já existe uma estratégia ativada para esta pessoa nos últimos 7 dias.';
  end if;
  insert into public.comeback_offers (user_id, strategy, title, body, cta_label, cta_href, reward_xp, push_status, push_title, push_body, created_by)
  values (p_user, left(p_strategy, 40), left(p_title, 120), left(p_body, 400), left(p_cta_label, 60), left(p_cta_href, 120), greatest(0, least(p_xp, 20)),
          case when p_push_status in ('none', 'pending', 'sent') then p_push_status else 'none' end, left(p_push_title, 120), left(p_push_body, 200), auth.uid())
  returning id into v_id;
  insert into public.notifications (user_id, title, body, link, category)
  values (p_user, left(p_push_title, 120), left(p_push_body, 200), coalesce(nullif(p_cta_href, ''), '/app'), 'comeback');
  return v_id;
end $fn$;
revoke execute on function public.admin_comeback_create(uuid, text, text, text, text, text, int, text, text, text) from public, anon;
grant execute on function public.admin_comeback_create(uuid, text, text, text, text, text, int, text, text, text) to authenticated;

-- A pessoa viu o cartão.
create or replace function public.comeback_seen(p_id uuid) returns void language sql security definer set search_path = public as $$
  update public.comeback_offers set shown_at = coalesce(shown_at, now()) where id = p_id and user_id = auth.uid();
$$;
revoke execute on function public.comeback_seen(uuid) from public, anon;
grant execute on function public.comeback_seen(uuid) to authenticated;

-- A pessoa resgata o presente (uma vez, antes de vencer).
create or replace function public.comeback_claim(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare o public.comeback_offers;
begin
  if auth.uid() is null then return null; end if;
  select * into o from public.comeback_offers where id = p_id and user_id = auth.uid() for update;
  if not found or o.claimed_at is not null or o.expires_at < now() then return jsonb_build_object('xp', 0); end if;
  update public.comeback_offers set claimed_at = now(), shown_at = coalesce(shown_at, now()) where id = p_id;
  if o.reward_xp > 0 then perform public.game_grant_xp(o.user_id, o.reward_xp, 'comeback'); end if;
  return jsonb_build_object('xp', o.reward_xp);
end $fn$;
revoke execute on function public.comeback_claim(uuid) from public, anon;
grant execute on function public.comeback_claim(uuid) to authenticated;
