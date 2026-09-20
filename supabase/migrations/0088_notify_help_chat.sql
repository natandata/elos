-- notifications não tem policy de insert pra usuário comum (só é escrita via
-- função SECURITY DEFINER, como notify_elo_members/notify_admins) — a versão
-- inicial do chat de ajuda tentava inserir direto pela tabela e falhava
-- silenciosamente sob RLS. Mesmo padrão de autorização do help_chat_insert:
-- só quem participa da conversa (o próprio cria, o líder responsável, ou
-- admin) pode notificar nela.
create or replace function public.notify_help_chat(
  p_cria_id       uuid,
  p_recipient_ids uuid[],
  p_title         text,
  p_body          text,
  p_link          text default null
)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not (auth.uid() = p_cria_id or public.is_leader_of(p_cria_id) or public.is_admin()) then
    raise exception 'Sem permissão para notificar nesta conversa';
  end if;

  insert into public.notifications (user_id, title, body, link, category)
  select uid, p_title, p_body, p_link, 'help' from unnest(p_recipient_ids) as uid;
end $fn$;

revoke execute on function public.notify_help_chat(uuid, uuid[], text, text, text) from anon, public;
grant  execute on function public.notify_help_chat(uuid, uuid[], text, text, text) to authenticated;
