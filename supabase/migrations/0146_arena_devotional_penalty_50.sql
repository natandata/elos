-- Mudança: a perda por dia sem devocional passou de 25% para 50% dos troféus da Arena dos Heróis.
-- Cada dia sem anotação no devocional tira metade (acumulando se forem vários). A regra original é da migração 0131.

create or replace function public.arena_devotional_penalties()
returns table (user_id uuid, lost int, missed_days int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yesterday date := (now() at time zone 'America/Sao_Paulo')::date - 1;
  r record;
  d date;
  v_tr int;
  v_missed int;
begin
  for r in
    select s.user_id as uid, s.trophies, s.devo_penalty_date as from_day
      from public.arena_stats s
      join public.profiles p on p.id = s.user_id
     where p.role in ('cria', 'leader') and s.devo_penalty_date < v_yesterday
     for update of s
  loop
    v_tr := r.trophies;
    v_missed := 0;
    d := r.from_day + 1;
    while d <= v_yesterday loop
      if not exists (select 1 from public.devotional_entries e where e.user_id = r.uid and e.entry_date = d) then
        v_missed := v_missed + 1;
        v_tr := v_tr / 2;  -- perde 50% (arredonda a perda pra cima)
      end if;
      d := d + 1;
    end loop;
    update public.arena_stats set trophies = v_tr, devo_penalty_date = v_yesterday, updated_at = now() where arena_stats.user_id = r.uid;
    if v_missed > 0 and v_tr < r.trophies then
      user_id := r.uid;
      lost := r.trophies - v_tr;
      missed_days := v_missed;
      return next;
    end if;
  end loop;
end $$;
revoke all on function public.arena_devotional_penalties() from public, anon, authenticated;
grant execute on function public.arena_devotional_penalties() to service_role;
