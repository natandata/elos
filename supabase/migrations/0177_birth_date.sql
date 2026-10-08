-- ELOS — data de nascimento de todos os usuários + aviso de aniversário na tela inicial.
alter table public.profiles add column if not exists birth_date date;

-- Quem faz aniversário hoje (Brasília): só nome e foto, para qualquer usuário logado ver o card.
-- Nunca devolve a data nem a idade. 29/02 comemora em 28/02 nos anos não bissextos.
create or replace function public.birthdays_today()
returns table (id uuid, full_name text, avatar_url text)
language sql stable security definer set search_path = public as $fn$
  with hoje as (select (now() at time zone 'America/Sao_Paulo')::date as d)
  select p.id, p.full_name, p.avatar_url
    from public.profiles p, hoje
   where p.birth_date is not null
     and coalesce(p.is_test_account, false) = false
     and (
       (extract(month from p.birth_date) = extract(month from hoje.d) and extract(day from p.birth_date) = extract(day from hoje.d))
       or (extract(month from p.birth_date) = 2 and extract(day from p.birth_date) = 29
           and extract(month from hoje.d) = 2 and extract(day from hoje.d) = 28
           and (extract(year from hoje.d)::int % 4 <> 0 or (extract(year from hoje.d)::int % 100 = 0 and extract(year from hoje.d)::int % 400 <> 0)))
     )
   order by p.full_name
$fn$;

revoke execute on function public.birthdays_today() from anon, public;
grant execute on function public.birthdays_today() to authenticated;
