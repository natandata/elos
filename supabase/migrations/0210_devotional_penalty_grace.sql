-- Carência: até 01/11/2026 a falta de devocional NÃO tira troféus da Arena dos Heróis.
-- Dias anteriores a 01/11 não contam como "dia sem devocional"; a regra de 50% por dia volta a valer a partir de 01/11.
-- (A regra base é da 0146.) Também avisa todo mundo: aviso no próximo acesso + notificação no sino.

create or replace function public.arena_devotional_penalties()
returns table (user_id uuid, lost int, missed_days int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yesterday date := (now() at time zone 'America/Sao_Paulo')::date - 1;
  v_grace_until date := date '2026-11-01';
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
      if d >= v_grace_until and not exists (select 1 from public.devotional_entries e where e.user_id = r.uid and e.entry_date = d) then
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

insert into public.announcements (title, body, active)
values (
  '📖 Sem devocional, sem perder troféus (até 01/11)',
  'Boa notícia! Até o dia 01 de novembro, ficar um dia sem fazer o devocional não tira mais troféus da Arena dos Heróis. A regra de perder troféus por dia sem devocional volta a valer a partir de 01/11. Aproveite esse tempo para criar o hábito do devocional diário!',
  true
);

insert into public.notifications (user_id, title, body, link, category)
select p.id,
       '📖 Devocional: sem perda de troféus até 01/11',
       'Até 01/11, a falta de devocional não tira mais troféus da Arena dos Heróis. A regra volta a valer a partir de 01/11.',
       '/app/devocional',
       'jogos'
  from public.profiles p
 where p.role <> 'admin' and coalesce(p.is_test_account, false) = false;
