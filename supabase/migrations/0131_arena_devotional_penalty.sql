-- Quem fica um dia sem fazer o devocional perde 25% dos troféus da Arena dos Heróis.
-- Roda de madrugada (cron de manutenção): avalia cada dia que passou desde a última
-- avaliação; cada dia sem anotação no devocional tira 25% (acumulando se forem vários).
-- O recorde (best) e as cartas liberadas não mudam. A contagem começa amanhã
-- (o dia de hoje é de carência).
alter table public.arena_stats
  add column if not exists devo_penalty_date date not null default ((now() at time zone 'America/Sao_Paulo')::date);

-- quem já joga hoje começa a ser avaliado a partir de amanhã
update public.arena_stats set devo_penalty_date = (now() at time zone 'America/Sao_Paulo')::date;

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
        v_tr := (v_tr * 3) / 4;  -- perde 25% (arredonda a perda pra cima)
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
