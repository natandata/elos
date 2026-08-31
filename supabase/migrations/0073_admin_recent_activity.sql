-- Feed de atividade recente pro dashboard do admin: junta as principais ações
-- dos usuários (status, missões, posts, devocional, oração) num único feed
-- ordenado por data, sem precisar de N idas e vindas separadas no client.
create or replace function public.admin_recent_activity(p_exclude_user uuid default null, p_limit int default 30)
returns table(actor_id uuid, actor_name text, actor_role text, action text, detail text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão.';
  end if;

  return query
  select x.actor_id, x.actor_name, x.actor_role, x.action, x.detail, x.created_at
  from (
    select p.id as actor_id, p.full_name as actor_name, p.role::text as actor_role,
           'status'::text as action,
           'Emocional: ' || public.status_label(s.emotional_status)
             || ' · Espiritual: ' || public.status_label(s.spiritual_status) as detail,
           s.created_at
    from public.status_responses s
    join public.profiles p on p.id = s.user_id

    union all

    select p.id, p.full_name, p.role::text, 'mission_submitted',
           m.title, ma.submitted_at
    from public.mission_assignments ma
    join public.profiles p on p.id = ma.cria_id
    join public.missions m on m.id = ma.mission_id
    where ma.submitted_at is not null

    union all

    select p.id, p.full_name, p.role::text,
           case ma.status when 'approved' then 'mission_approved' else 'mission_rejected' end,
           m.title, ma.approved_at
    from public.mission_assignments ma
    join public.profiles p on p.id = ma.cria_id
    join public.missions m on m.id = ma.mission_id
    where ma.approved_at is not null and ma.status in ('approved', 'rejected')

    union all

    select p.id, p.full_name, p.role::text, 'feed_post',
           coalesce(nullif(f.caption, ''), 'sem legenda'), f.created_at
    from public.feed_posts f
    join public.profiles p on p.id = f.author_id

    union all

    select p.id, p.full_name, p.role::text, 'story_post',
           coalesce(nullif(st.caption, ''), 'sem legenda'), st.created_at
    from public.story_posts st
    join public.profiles p on p.id = st.author_id

    union all

    select p.id, p.full_name, p.role::text, 'devotional_entry',
           'Anotação no diário devocional', d.created_at
    from public.devotional_entries d
    join public.profiles p on p.id = d.user_id

    union all

    select p.id, p.full_name, p.role::text, 'prayer_request',
           pr.title, pr.created_at
    from public.prayer_requests pr
    join public.profiles p on p.id = pr.user_id
  ) x
  where x.created_at is not null
    and (p_exclude_user is null or x.actor_id <> p_exclude_user)
  order by x.created_at desc
  limit p_limit;
end;
$fn$;

revoke execute on function public.admin_recent_activity(uuid, int) from anon, public;
grant execute on function public.admin_recent_activity(uuid, int) to authenticated;
