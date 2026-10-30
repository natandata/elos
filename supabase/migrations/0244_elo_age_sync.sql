-- Elos por idade: todo dia, quem fez aniversario e mudou de faixa (12-13 / 14-15 / 16-17) vai para o Elo da nova faixa.
-- So cria aprovado, com data de nascimento e genero. Lider nao muda (e adulto). Maiores de 17 ficam no 16-17.
create or replace function public.elo_age_sync()
returns table (user_id uuid, full_name text, old_elo text, new_elo text)
language plpgsql security definer set search_path = public as $fn$
declare
  r record;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  idade int;
  faixa public.age_range_t;
  novo uuid;
begin
  for r in
    select p.id, p.full_name, p.gender, p.elo_id, p.age_range
      from public.profiles p
     where p.role = 'cria' and p.approved and coalesce(p.is_test_account, false) = false
       and p.birth_date is not null and p.gender is not null
  loop
    idade := extract(year from age(hoje, (select birth_date from public.profiles where id = r.id)))::int;
    faixa := case when idade <= 13 then '12-13' when idade <= 15 then '14-15' else '16-17' end;
    novo := public.suggest_elo(r.gender, faixa);
    if novo is not null and (r.elo_id is distinct from novo or r.age_range is distinct from faixa) then
      update public.profiles set elo_id = novo, age_range = faixa where id = r.id;
      insert into public.notifications (user_id, title, body, link, category)
      values (r.id, '🎂 Você mudou de Elo!', 'Pelo seu aniversário, você agora está no ' || (select name from public.elos where id = novo) || '. Conheça a turma nova!', '/app', 'geral');
      user_id := r.id; full_name := r.full_name;
      old_elo := (select name from public.elos where id = r.elo_id);
      new_elo := (select name from public.elos where id = novo);
      return next;
    end if;
  end loop;
end $fn$;
revoke execute on function public.elo_age_sync() from public, anon, authenticated;

-- 00:05 de Brasilia (03:05 UTC), todo dia
select cron.schedule('elos-age-sync', '5 3 * * *', $$select public.elo_age_sync()$$);
