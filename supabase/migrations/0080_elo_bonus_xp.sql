-- XP "bônus" do Elo: um valor separado, definido direto pelo admin, que soma
-- no XP total do Elo por cima do que os crias acumulam — diferente do XP dos
-- crias, existe mesmo sem nenhum cria no Elo (era exatamente o que faltava:
-- antes o XP do Elo só existia como soma dos crias, então sem cria não tinha
-- nada pra editar).

alter table public.elos add column if not exists bonus_xp integer not null default 0 check (bonus_xp >= 0);

-- guard_profile_update só cobre a tabela profiles — bonus_xp fica em elos,
-- que só admin edita mesmo (policy elos_write, já existente, exige is_admin()).

create or replace function public.elo_rankings()
returns table (elo_id uuid, elo_name text, total_xp bigint, crias bigint, rank_position int)
language sql stable security definer set search_path = public as $fn$
  select e.id,
         e.name,
         (coalesce(sum(p.xp), 0) + e.bonus_xp)::bigint as total_xp,
         count(p.id)::bigint            as crias,
         rank() over (order by (coalesce(sum(p.xp), 0) + e.bonus_xp) desc)::int as rank_position
    from public.elos e
    left join public.profiles p on p.elo_id = e.id and p.role = 'cria'
   group by e.id, e.name, e.bonus_xp
   order by total_xp desc
$fn$;
