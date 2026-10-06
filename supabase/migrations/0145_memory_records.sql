-- Memória dos Heróis: recordes por nível (solo e duelo) e rankings por jogador e por Elo.
create table if not exists public.memory_solo_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  seed integer not null,
  pairs smallint not null,
  started_at timestamptz not null default now(),
  finished boolean not null default false
);
create index if not exists memory_solo_runs_user on public.memory_solo_runs (user_id, started_at desc);
alter table public.memory_solo_runs enable row level security;

create table if not exists public.memory_records (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pairs smallint not null,
  best_ms int not null,
  best_moves int,
  achieved_at timestamptz not null default now(),
  primary key (user_id, pairs)
);
alter table public.memory_records enable row level security;
drop policy if exists memory_records_read on public.memory_records;
create policy memory_records_read on public.memory_records for select using (user_id = auth.uid() or public.is_admin());

-- guarda o recorde se for melhor (só o servidor chama)
create or replace function public.memory_record_submit(p_user uuid, p_pairs int, p_ms int, p_moves int)
returns table(is_record boolean, best_ms int)
language plpgsql security definer set search_path = public as $fn$
declare cur int;
begin
  select r.best_ms into cur from public.memory_records r where r.user_id = p_user and r.pairs = p_pairs;
  if cur is null or p_ms < cur then
    insert into public.memory_records (user_id, pairs, best_ms, best_moves, achieved_at)
    values (p_user, p_pairs, p_ms, p_moves, now())
    on conflict (user_id, pairs) do update set best_ms = excluded.best_ms, best_moves = excluded.best_moves, achieved_at = now();
    return query select true, p_ms;
  else
    return query select false, cur;
  end if;
end;
$fn$;
revoke execute on function public.memory_record_submit(uuid, int, int, int) from anon, authenticated, public;

-- ranking de jogadores por nível (crias e líderes; contas de teste ficam de fora)
create or replace function public.memory_ranking(p_per_level int default 50)
returns table(pairs int, user_id uuid, full_name text, avatar_url text, elo_id uuid, elo_name text, best_ms int, pos int)
language sql stable security definer set search_path = public as $fn$
  select x.pairs, x.user_id, x.full_name, x.avatar_url, x.elo_id, x.elo_name, x.best_ms, x.pos from (
    select r.pairs::int as pairs, p.id as user_id, p.full_name, p.avatar_url, p.elo_id, e.name as elo_name, r.best_ms,
           (row_number() over (partition by r.pairs order by r.best_ms asc, r.achieved_at asc))::int as pos
      from public.memory_records r
      join public.profiles p on p.id = r.user_id
      left join public.elos e on e.id = p.elo_id
     where p.role in ('cria', 'leader') and not coalesce(p.is_test_account, false)
  ) x
  where x.pos <= least(coalesce(p_per_level, 50), 200)
    and exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('cria', 'leader', 'admin'))
  order by x.pairs, x.pos;
$fn$;
grant execute on function public.memory_ranking(int) to authenticated;
revoke execute on function public.memory_ranking(int) from anon, public;

-- ranking de Elos por nível: o melhor recorde de cada Elo
create or replace function public.memory_elo_ranking()
returns table(pairs int, elo_id uuid, elo_name text, best_ms int, holder text, pos int)
language sql stable security definer set search_path = public as $fn$
  select y.pairs, y.elo_id, y.elo_name, y.best_ms, y.holder, y.pos from (
    select x.pairs, x.elo_id, x.elo_name, x.best_ms, x.full_name as holder,
           (row_number() over (partition by x.pairs order by x.best_ms asc))::int as pos
      from (
        select distinct on (r.pairs, p.elo_id) r.pairs::int as pairs, p.elo_id, e.name as elo_name, r.best_ms, p.full_name
          from public.memory_records r
          join public.profiles p on p.id = r.user_id
          join public.elos e on e.id = p.elo_id
         where p.role in ('cria', 'leader') and not coalesce(p.is_test_account, false)
         order by r.pairs, p.elo_id, r.best_ms asc
      ) x
  ) y
  where exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('cria', 'leader', 'admin'))
  order by y.pairs, y.pos;
$fn$;
grant execute on function public.memory_elo_ranking() to authenticated;
revoke execute on function public.memory_elo_ranking() from anon, public;
