-- ELOS — o responsável (guardian) ganha uma lista com TODOS os pedidos de
-- oração compartilhados com o Elo (de qualquer Elo), mas só com o primeiro
-- nome do cria — nunca o sobrenome. Função dedicada (não RLS na tabela) pra
-- garantir que o full_name nunca vaza por engano: ela só devolve o primeiro
-- nome, e só quando quem chama é de fato guardian.
create or replace function public.guardian_prayer_requests()
returns table (
  id               uuid,
  cria_first_name  text,
  elo_name         text,
  title            text,
  is_answered      boolean,
  created_at       timestamptz
)
language sql stable security definer set search_path = public as $fn$
  select pr.id,
         coalesce(nullif(p.first_name, ''), split_part(p.full_name, ' ', 1)) as cria_first_name,
         e.name,
         pr.title,
         pr.is_answered,
         pr.created_at
    from public.prayer_requests pr
    join public.profiles p on p.id = pr.user_id
    left join public.elos e on e.id = pr.elo_id
   where pr.scope = 'elo'
     and exists (select 1 from public.profiles g where g.id = auth.uid() and g.role = 'guardian')
   order by pr.created_at desc
$fn$;

revoke execute on function public.guardian_prayer_requests() from anon, public;
grant  execute on function public.guardian_prayer_requests() to authenticated;
