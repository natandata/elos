-- Notifica todo mundo (cria + líder) de um Elo de uma vez — usado pelo ciclo
-- de oração respondida, pelo aviso de "seu Elo subiu no ranking" e pelo
-- anúncio de vitória em desafio entre Elos. SECURITY DEFINER porque inserir
-- notificação pra OUTRO usuário não passa pelo RLS comum (cada um só insere
-- a própria); em troca, só deixa quem já é do próprio Elo (ou admin) disparar
-- pra ele — ninguém manda notificação pra um Elo que não é o seu.
create or replace function public.notify_elo_members(
  p_elo_id   uuid,
  p_title    text,
  p_body     text,
  p_link     text default null,
  p_category text default 'geral',
  p_exclude  uuid default null
)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not (public.is_admin() or public.my_elo() = p_elo_id) then
    raise exception 'Sem permissão para notificar este Elo';
  end if;

  insert into public.notifications (user_id, title, body, link, category)
  select id, p_title, p_body, p_link, p_category
    from public.profiles
   where elo_id = p_elo_id
     and role in ('cria', 'leader')
     and id is distinct from p_exclude;
end $fn$;

revoke execute on function public.notify_elo_members(uuid, text, text, text, text, uuid) from anon, public;
grant  execute on function public.notify_elo_members(uuid, text, text, text, text, uuid) to authenticated;
