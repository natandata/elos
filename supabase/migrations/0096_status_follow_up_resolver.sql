-- ELOS — admin (e outros líderes que também têm acesso ao cria) precisa
-- saber QUEM tratou um alerta de status "Mal", não só o que foi feito.
-- status_follow_ups.resolved_by já existia, só faltava expor o nome — via
-- RPC porque a leitura direta de profiles é restrita por Elo/liderança, e
-- quem resolveu pode não estar no mesmo Elo de quem está vendo a tela.
create or replace function public.status_follow_up_resolver_names(p_status_response_ids uuid[])
returns table (status_response_id uuid, resolver_name text)
language plpgsql stable security definer set search_path = public as $fn$
begin
  return query
  select sf.status_response_id, p.full_name
    from public.status_follow_ups sf
    join public.status_responses sr on sr.id = sf.status_response_id
    join public.profiles p on p.id = sf.resolved_by
   where sf.status_response_id = any(p_status_response_ids)
     and (public.is_admin() or public.is_leader_of(sr.user_id));
end $fn$;

revoke execute on function public.status_follow_up_resolver_names(uuid[]) from anon, public;
grant  execute on function public.status_follow_up_resolver_names(uuid[]) to authenticated;
