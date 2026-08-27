-- ELOS — bug real: o Feed é global (todo mundo vê fotos de qualquer Elo),
-- mas a leitura de profiles continua restrita por Elo/liderança. Quem via o
-- post de alguém de outro Elo não conseguia ler o nome/avatar dessa pessoa
-- via join — o app caía no fallback "Alguém".
--
-- Corrigido com uma função dedicada (só id/nome/avatar, nada sensível) em
-- vez de afrouxar a RLS geral de profiles — o resto da plataforma continua
-- restrito por Elo como sempre foi.
create or replace function public.feed_author_names(p_ids uuid[])
returns table (id uuid, full_name text, avatar_url text)
language sql stable security definer set search_path = public as $fn$
  select p.id, p.full_name, p.avatar_url
    from public.profiles p
   where p.id = any(p_ids)
$fn$;

revoke execute on function public.feed_author_names(uuid[]) from anon, public;
grant  execute on function public.feed_author_names(uuid[]) to authenticated;
