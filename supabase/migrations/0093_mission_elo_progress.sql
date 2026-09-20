-- ELOS — pro cria ver, na Home, quais Elos já estão na frente em cada
-- missão ainda pendente (competitividade/urgência). Progresso agregado é
-- informação pública entre os próprios crias — não expõe nada individual
-- além do que "quem visualizou"/rankings já expõem hoje.
create or replace function public.mission_elo_progress(p_mission_ids uuid[])
returns table (
  mission_id        uuid,
  total_approved    integer,
  leading_elo_id     uuid,
  leading_elo_name   text,
  leading_elo_count  integer
)
language sql stable security definer set search_path = public as $fn$
  with approved as (
    select ma.mission_id, p.elo_id, count(*) as cnt
      from public.mission_assignments ma
      join public.profiles p on p.id = ma.cria_id
     where ma.mission_id = any(p_mission_ids)
       and ma.status = 'approved'
       and p.elo_id is not null
     group by ma.mission_id, p.elo_id
  ),
  totals as (
    select mission_id, sum(cnt)::int as total_approved
      from approved
     group by mission_id
  ),
  ranked as (
    select a.*, row_number() over (partition by a.mission_id order by a.cnt desc) as rn
      from approved a
  )
  select m.id as mission_id,
         coalesce(t.total_approved, 0) as total_approved,
         r.elo_id as leading_elo_id,
         e.name as leading_elo_name,
         r.cnt as leading_elo_count
    from unnest(p_mission_ids) as m(id)
    left join totals t on t.mission_id = m.id
    left join ranked r on r.mission_id = m.id and r.rn = 1
    left join public.elos e on e.id = r.elo_id
$fn$;

revoke execute on function public.mission_elo_progress(uuid[]) from anon, public;
grant  execute on function public.mission_elo_progress(uuid[]) to authenticated;
