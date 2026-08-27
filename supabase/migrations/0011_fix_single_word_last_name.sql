-- ELOS — corrige nomes de uma palavra só que ficaram duplicados no backfill.
-- position(' ' in full_name) devolve 0 quando não há espaço, e o substring
-- acabava repetindo o nome inteiro em last_name (ex.: "Administrador
-- Administrador"). Sem sobrenome, last_name é null.

update public.profiles
   set last_name = null
 where last_name is not null
   and first_name = last_name
   and position(' ' in trim(full_name)) = 0;
