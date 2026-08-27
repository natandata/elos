-- ELOS — ranking entre líderes. O líder não compete com os crias do próprio
-- Elo (ele não tem XP nem posição nesse ranking); em vez disso, é avaliado
-- pelo trabalho de liderança: quantas missões criou, o "nível" delas (soma do
-- XP definido pra cada missão) e quantas dessas missões os crias concluíram.
--
-- Critério de desempate (nessa ordem): missões criadas > nível (XP) das
-- missões > missões concluídas pelos crias. A ordenação final é decidida no
-- client, essa função só entrega os números já agregados por líder.

create or replace function public.leader_rankings()
returns table (
  leader_id         uuid,
  leader_name       text,
  leader_avatar_url text,
  elo_id            uuid,
  elo_name          text,
  missions_created  bigint,
  missions_xp       bigint,
  missions_completed bigint
)
language sql stable security definer set search_path = public as $fn$
  select p.id,
         p.full_name,
         p.avatar_url,
         p.elo_id,
         e.name,
         coalesce(mstats.created, 0)::bigint,
         coalesce(mstats.xp, 0)::bigint,
         coalesce(cstats.completed, 0)::bigint
    from public.profiles p
    left join public.elos e on e.id = p.elo_id
    left join (
      select created_by, count(*) as created, sum(xp) as xp
        from public.missions
       group by created_by
    ) mstats on mstats.created_by = p.id
    left join (
      select m.created_by, count(*) as completed
        from public.mission_assignments ma
        join public.missions m on m.id = ma.mission_id
       where ma.status = 'approved'
       group by m.created_by
    ) cstats on cstats.created_by = p.id
   where p.role = 'leader' and p.approved = true
$fn$;

revoke execute on function public.leader_rankings() from anon, public;
grant  execute on function public.leader_rankings() to authenticated;
