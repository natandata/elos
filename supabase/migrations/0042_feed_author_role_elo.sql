-- ELOS — feed_author_names passa a trazer role e elo_id também, pra exibir
-- a tag "Líder/Cria - Elo" ao lado do nome no Feed (mesmo raciocínio da
-- 0040: só isso, nada mais sensível, sem afrouxar a RLS geral de profiles).
drop function if exists public.feed_author_names(uuid[]);

create function public.feed_author_names(p_ids uuid[])
returns table (id uuid, full_name text, avatar_url text, role public.user_role, elo_id uuid)
language sql stable security definer set search_path = public as $fn$
  select p.id, p.full_name, p.avatar_url, p.role, p.elo_id
    from public.profiles p
   where p.id = any(p_ids)
$fn$;

revoke execute on function public.feed_author_names(uuid[]) from anon, public;
grant  execute on function public.feed_author_names(uuid[]) to authenticated;
