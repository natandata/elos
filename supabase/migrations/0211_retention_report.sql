-- ELOS — painel de retenção do admin.
-- 1) daily_active: um registro por pessoa por dia em que abriu o app (fuso de São Paulo). Daqui pra frente é gravado pelo
--    sinal de vida (user_presence); o passado é reconstruído a partir de tudo que a pessoa fez (check-in, posts, jogos...).
-- 2) admin_retention_report(): devolve tudo que o painel mostra, numa chamada só (só admin).

create table if not exists public.daily_active (
  day date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (day, user_id)
);
create index if not exists daily_active_user_idx on public.daily_active (user_id, day desc);
alter table public.daily_active enable row level security;
drop policy if exists daily_active_admin_read on public.daily_active;
create policy daily_active_admin_read on public.daily_active for select to authenticated using (public.is_admin());

-- passado: qualquer atividade conta como "abriu o app naquele dia"
insert into public.daily_active (day, user_id)
select distinct d, u from (
  select (created_at at time zone 'America/Sao_Paulo')::date d, user_id u from public.status_responses
  union all select (created_at at time zone 'America/Sao_Paulo')::date, author_id from public.feed_posts
  union all select (created_at at time zone 'America/Sao_Paulo')::date, author_id from public.story_posts
  union all select (created_at at time zone 'America/Sao_Paulo')::date, user_id from public.game_activity
  union all select (created_at at time zone 'America/Sao_Paulo')::date, user_id from public.devotional_entries
  union all select (created_at at time zone 'America/Sao_Paulo')::date, user_id from public.feed_likes
  union all select (created_at at time zone 'America/Sao_Paulo')::date, author_id from public.feed_comments
  union all select (created_at at time zone 'America/Sao_Paulo')::date, sender_id from public.dm_messages
  union all select (created_at at time zone 'America/Sao_Paulo')::date, sender_id from public.chat_messages
) x
where u is not null and exists (select 1 from public.profiles p where p.id = x.u)
on conflict do nothing;

-- futuro: o sinal de vida marca o dia
create or replace function public.track_daily_active()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.daily_active (day, user_id)
  values ((now() at time zone 'America/Sao_Paulo')::date, new.user_id)
  on conflict do nothing;
  return new;
end $fn$;
drop trigger if exists track_daily_active_trg on public.user_presence;
create trigger track_daily_active_trg after insert or update on public.user_presence
  for each row execute function public.track_daily_active();

-- ------------------------------------------------------------------ relatório
create or replace function public.admin_retention_report()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  res jsonb;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;

  with m as (
    select p.id, p.full_name, p.role, p.elo_id, (p.created_at at time zone 'America/Sao_Paulo')::date as signup
      from public.profiles p
     where p.role in ('cria', 'leader') and p.approved and not coalesce(p.is_test_account, false)
  ),
  da as (select d.day, d.user_id from public.daily_active d join m on m.id = d.user_id),
  daily as (select day, count(*) n from da group by day),
  last_seen as (
    select m.id, m.full_name, m.role, m.elo_id, max(da.day) as last_day
      from m left join da on da.user_id = m.id group by m.id, m.full_name, m.role, m.elo_id
  ),
  seg as (
    select ls.*, (v_today - ls.last_day) as days_ago,
           case when ls.last_day is null then 'perdido'
                when v_today - ls.last_day <= 2 then 'ativo'
                when v_today - ls.last_day <= 6 then 'em_risco'
                when v_today - ls.last_day <= 13 then 'dormente'
                else 'perdido' end as bucket
      from last_seen ls
  ),
  act7 as (select user_id, count(distinct day) n from da where day >= v_today - 6 group by user_id),
  grp as (
    select m.id, case when coalesce(a.n, 0) >= 4 then 'engaged' when coalesce(a.n, 0) >= 1 then 'casual' else 'none' end g
      from m left join act7 a on a.user_id = m.id
  ),
  ev as (
    select user_id u, 'Check-in diário' f from public.status_responses where (created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6
    union all select user_id, 'Devocional' from public.devotional_entries where (created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6
    union all select author_id, 'Post no Elogram' from public.feed_posts where (created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6
    union all select author_id, 'Story' from public.story_posts where (created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6
    union all select user_id, 'Jogos' from public.game_activity where (created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6
    union all select sender_id, 'Chat do Elo' from public.chat_messages where (created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6
    union all select sender_id, 'Mensagem direta' from public.dm_messages where (created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6
    union all select user_id, 'Curtir/comentar' from public.feed_likes where (created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6
    union all select author_id, 'Curtir/comentar' from public.feed_comments where (created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6
  ),
  ev_m as (select distinct e.u, e.f from ev e join m on m.id = e.u),
  feat as (
    select f,
           count(*) users,
           count(*) filter (where g.g = 'engaged') eng,
           count(*) filter (where g.g = 'casual') cas
      from ev_m join grp g on g.id = ev_m.u group by f
  ),
  games7 as (
    select ga.game, count(distinct ga.user_id) users
      from public.game_activity ga join m on m.id = ga.user_id
     where (ga.created_at at time zone 'America/Sao_Paulo')::date >= v_today - 6 group by ga.game
  ),
  cohort_rows as (
    select c.wk, c.size, k,
           (select count(distinct m2.id) from m m2 join da on da.user_id = m2.id
             where date_trunc('week', m2.signup)::date = c.wk and da.day between c.wk + 7 * k and c.wk + 7 * k + 6) act
      from (select date_trunc('week', signup)::date wk, count(*) size from m group by 1) c, generate_series(0, 5) k
     where c.wk + 7 * k <= v_today
  ),
  wk as (
    select extract(dow from g)::int dow, avg(coalesce(d.n, 0))::numeric(6,1) avg_n
      from generate_series(v_today - 28, v_today - 1, interval '1 day') g
      left join daily d on d.day = g::date group by 1
  )
  select jsonb_build_object(
    'today', v_today,
    'members', (select count(*) from m),
    'dau', (select coalesce(jsonb_agg(jsonb_build_object('day', v_today - 29 + i, 'users', coalesce((select n from daily where day = v_today - 29 + i), 0)) order by i), '[]'::jsonb) from generate_series(0, 29) i),
    'dau_today', coalesce((select n from daily where day = v_today), 0),
    'dau_yesterday', coalesce((select n from daily where day = v_today - 1), 0),
    'avg_dau_7', (select round(avg(coalesce((select n from daily where day = v_today - i), 0)), 1) from generate_series(1, 7) i),
    'avg_dau_prev7', (select round(avg(coalesce((select n from daily where day = v_today - i), 0)), 1) from generate_series(8, 14) i),
    'wau', (select count(distinct user_id) from da where day >= v_today - 6),
    'wau_prev', (select count(distinct user_id) from da where day between v_today - 13 and v_today - 7),
    'mau', (select count(distinct user_id) from da where day >= v_today - 29),
    'weekday', (select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'avg', avg_n) order by dow), '[]'::jsonb) from wk),
    'segments', (select jsonb_build_object(
        'ativo', count(*) filter (where bucket = 'ativo'),
        'em_risco', count(*) filter (where bucket = 'em_risco'),
        'dormente', count(*) filter (where bucket = 'dormente'),
        'perdido', count(*) filter (where bucket = 'perdido')) from seg),
    'at_risk', (select coalesce(jsonb_agg(x order by (x->>'days')::int), '[]'::jsonb) from (
        select jsonb_build_object('id', s.id, 'name', s.full_name, 'role', s.role, 'elo', e.name, 'days', s.days_ago, 'bucket', s.bucket) x
          from seg s left join public.elos e on e.id = s.elo_id
         where s.bucket in ('em_risco', 'dormente', 'perdido')
         order by s.days_ago asc nulls last limit 60) t),
    'retention', (select jsonb_agg(jsonb_build_object('day', n,
        'eligible', (select count(*) from m where signup <= v_today - n),
        'returned', (select count(*) from m where signup <= v_today - n and exists (select 1 from da where da.user_id = m.id and da.day = m.signup + n)))
        order by n) from unnest(array[1, 7, 14, 30]) as t(n)),
    'cohorts', (select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'size', size, 'pct', pcts) order by wk), '[]'::jsonb) from (
        select wk, size, jsonb_agg(round(100.0 * act / size) order by k) pcts from cohort_rows group by wk, size) c),
    'groups', (select jsonb_build_object('engaged', count(*) filter (where g = 'engaged'), 'casual', count(*) filter (where g = 'casual'), 'none', count(*) filter (where g = 'none')) from grp),
    'features', (select coalesce(jsonb_agg(jsonb_build_object('name', f, 'users', users, 'engaged', eng, 'casual', cas) order by users desc), '[]'::jsonb) from feat),
    'games', (select coalesce(jsonb_agg(jsonb_build_object('game', game, 'users', users) order by users desc), '[]'::jsonb) from games7),
    'elos', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'members', members, 'active7', active7) order by name), '[]'::jsonb) from (
        select e.name, count(m.id) members,
               count(m.id) filter (where exists (select 1 from da where da.user_id = m.id and da.day >= v_today - 6)) active7
          from public.elos e join m on m.elo_id = e.id group by e.name) t)
  ) into res;
  return res;
end $fn$;
revoke execute on function public.admin_retention_report() from anon, public;
grant execute on function public.admin_retention_report() to authenticated;
