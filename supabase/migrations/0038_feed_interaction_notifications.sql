-- ELOS — quem curte ou comenta um post do feed notifica o dono do post
-- (nunca a si mesmo). Inserção em notifications não tem policy pra
-- authenticated (só triggers/RPCs security definer inserem), então isso
-- precisa de uma função dedicada — mesmo padrão de notify_admins etc.
create or replace function public.notify_feed_interaction(p_post_id uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_author uuid; v_actor_name text; v_title text; v_body text;
begin
  if p_kind not in ('like', 'comment') then
    raise exception 'Tipo de interação inválido';
  end if;

  select author_id into v_author from public.feed_posts where id = p_post_id;
  if v_author is null or v_author = auth.uid() then return; end if;

  select full_name into v_actor_name from public.profiles where id = auth.uid();
  v_actor_name := coalesce(nullif(v_actor_name, ''), 'Alguém');

  if p_kind = 'like' then
    v_title := 'Curtiram sua foto';
    v_body  := v_actor_name || ' curtiu sua foto no feed.';
  else
    v_title := 'Comentaram na sua foto';
    v_body  := v_actor_name || ' comentou na sua foto no feed.';
  end if;

  insert into public.notifications (user_id, title, body, category)
  values (v_author, v_title, v_body, 'feed');
end $fn$;

revoke execute on function public.notify_feed_interaction(uuid, text) from anon, public;
grant  execute on function public.notify_feed_interaction(uuid, text) to authenticated;
