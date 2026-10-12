-- Elogram (o antigo Explorar, agora no estilo Instagram): mensagens diretas e atividade (coração do topo).
--
-- Regras de mensagem: líder e cria conversam com qualquer líder ou cria (todos com todos);
-- a liderança aprovada e o admin LEEM todas as conversas (a tela avisa isso a quem conversa).

create table if not exists public.dm_threads (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles(id) on delete cascade,
  user_b          uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  a_read_at       timestamptz,
  b_read_at       timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists dm_threads_a_idx on public.dm_threads (user_a, last_message_at desc);
create index if not exists dm_threads_b_idx on public.dm_threads (user_b, last_message_at desc);

create table if not exists public.dm_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.dm_threads(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists dm_messages_thread_idx on public.dm_messages (thread_id, created_at);
create index if not exists dm_messages_sender_idx on public.dm_messages (sender_id, created_at desc);

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

-- liderança aprovada ou admin (quem pode ler todas as conversas)
create or replace function public.can_monitor_dm()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and (p.role = 'admin' or (p.role = 'leader' and p.approved))
  )
$$;

drop policy if exists dm_threads_read on public.dm_threads;
create policy dm_threads_read on public.dm_threads for select to authenticated
  using (auth.uid() in (user_a, user_b) or public.can_monitor_dm());

drop policy if exists dm_messages_read on public.dm_messages;
create policy dm_messages_read on public.dm_messages for select to authenticated
  using (
    exists (select 1 from public.dm_threads t
             where t.id = thread_id and (auth.uid() in (t.user_a, t.user_b) or public.can_monitor_dm()))
  );
-- sem policy de escrita: tudo passa pelas funções abaixo.

-- Envia uma mensagem (cria a conversa se for a primeira). Devolve o id da conversa.
create or replace function public.dm_send(p_to uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  me public.profiles%rowtype;
  target public.profiles%rowtype;
  body text := btrim(coalesce(p_body, ''));
  a uuid; b uuid; tid uuid; recent int;
begin
  if uid is null then raise exception 'Faça login para enviar mensagens.'; end if;
  select * into me from public.profiles where id = uid;
  if me.role not in ('leader', 'cria') or (me.role = 'leader' and not me.approved) then
    raise exception 'Sua conta não envia mensagens.';
  end if;
  if char_length(body) < 1 or char_length(body) > 1000 then raise exception 'Escreva uma mensagem de até 1000 caracteres.'; end if;
  if p_to is null or p_to = uid then raise exception 'Destinatário inválido.'; end if;
  select * into target from public.profiles where id = p_to;
  if not found or target.role not in ('leader', 'cria') or (target.role = 'leader' and not target.approved) then
    raise exception 'Essa pessoa não recebe mensagens.';
  end if;

  select count(*) into recent from public.dm_messages where sender_id = uid and created_at > now() - interval '1 minute';
  if recent >= 20 then raise exception 'Muitas mensagens seguidas. Espere um instante.'; end if;

  a := least(uid, p_to); b := greatest(uid, p_to);
  insert into public.dm_threads (user_a, user_b) values (a, b)
  on conflict (user_a, user_b) do update set last_message_at = now()
  returning id into tid;

  insert into public.dm_messages (thread_id, sender_id, body) values (tid, uid, body);
  -- quem enviou já leu a conversa até agora
  update public.dm_threads
     set last_message_at = now(),
         a_read_at = case when a = uid then now() else a_read_at end,
         b_read_at = case when b = uid then now() else b_read_at end
   where id = tid;
  return tid;
end;
$$;

-- Marca a conversa como lida pra quem está lendo (só participante; o monitor lê sem marcar).
create or replace function public.dm_mark_read(p_thread uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.dm_threads
     set a_read_at = case when user_a = auth.uid() then now() else a_read_at end,
         b_read_at = case when user_b = auth.uid() then now() else b_read_at end
   where id = p_thread and auth.uid() in (user_a, user_b);
end;
$$;

-- Lista das minhas conversas (mais recente primeiro), com quem é o outro lado e se há mensagem não lida.
create or replace function public.dm_list()
returns table (
  thread_id uuid, other_id uuid, other_name text, other_username text, other_avatar text,
  last_body text, last_at timestamptz, last_sender uuid, unread boolean
)
language sql stable security definer set search_path = public as $$
  select t.id,
         o.id, o.full_name, o.username, o.avatar_url,
         m.body, m.created_at, m.sender_id,
         (m.sender_id <> auth.uid()
           and m.created_at > coalesce(case when t.user_a = auth.uid() then t.a_read_at else t.b_read_at end, '-infinity'))
    from public.dm_threads t
    join public.profiles o on o.id = case when t.user_a = auth.uid() then t.user_b else t.user_a end
    join lateral (
      select body, created_at, sender_id from public.dm_messages
       where thread_id = t.id and deleted_at is null order by created_at desc limit 1
    ) m on true
   where auth.uid() in (t.user_a, t.user_b)
   order by m.created_at desc
$$;

-- Liderança/admin: todas as conversas do Elogram.
create or replace function public.dm_list_all(p_limit int default 100)
returns table (
  thread_id uuid, a_id uuid, a_name text, a_avatar text, b_id uuid, b_name text, b_avatar text,
  last_body text, last_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_monitor_dm() then raise exception 'Apenas a liderança.'; end if;
  return query
    select t.id, a.id, a.full_name, a.avatar_url, b.id, b.full_name, b.avatar_url, m.body, m.created_at
      from public.dm_threads t
      join public.profiles a on a.id = t.user_a
      join public.profiles b on b.id = t.user_b
      join lateral (
        select body, created_at from public.dm_messages
         where thread_id = t.id and deleted_at is null order by created_at desc limit 1
      ) m on true
     order by m.created_at desc
     limit greatest(1, least(p_limit, 300));
end;
$$;

-- Liderança/admin apaga uma mensagem imprópria (fica registrada como apagada).
create or replace function public.dm_delete_message(p_message uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_monitor_dm() then raise exception 'Apenas a liderança.'; end if;
  update public.dm_messages set deleted_at = now() where id = p_message;
end;
$$;

create or replace function public.dm_unread_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.dm_list() where unread
$$;

-- Atividade do coração: curtidas/reações, comentários e visualizações de story nas MINHAS publicações.
create table if not exists public.elogram_seen (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table public.elogram_seen enable row level security;

create or replace function public.elogram_activity(p_limit int default 60)
returns table (
  kind text, actor_id uuid, actor_name text, actor_username text, actor_avatar text,
  post_id uuid, image_path text, body text, reaction text, at timestamptz
)
language sql stable security definer set search_path = public as $$
  with mine as (
    select l.user_id as actor, 'like'::text as k, p.id as pid, p.image_path as img, null::text as txt, l.kind as react, l.created_at as ts
      from public.feed_likes l join public.feed_posts p on p.id = l.post_id
     where p.author_id = auth.uid() and l.user_id <> auth.uid()
    union all
    select c.author_id, 'comment', p.id, p.image_path, c.body, null, c.created_at
      from public.feed_comments c join public.feed_posts p on p.id = c.post_id
     where p.author_id = auth.uid() and c.author_id <> auth.uid()
    union all
    select v.viewer_id, 'story_view', s.id, s.image_path, null, null, v.viewed_at
      from public.story_views v join public.story_posts s on s.id = v.story_id
     where s.author_id = auth.uid() and v.viewer_id <> auth.uid()
  )
  select m.k, m.actor, pr.full_name, pr.username, pr.avatar_url, m.pid, m.img, m.txt, m.react, m.ts
    from mine m join public.profiles pr on pr.id = m.actor
   order by m.ts desc
   limit greatest(1, least(p_limit, 200))
$$;

create or replace function public.elogram_unread_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.elogram_activity(200) a
   where a.at > coalesce((select seen_at from public.elogram_seen where user_id = auth.uid()), '-infinity')
$$;

create or replace function public.elogram_mark_seen()
returns void language sql security definer set search_path = public as $$
  insert into public.elogram_seen (user_id, seen_at) values (auth.uid(), now())
  on conflict (user_id) do update set seen_at = now()
$$;

do $$ begin
  alter publication supabase_realtime add table public.dm_messages;
exception when duplicate_object then null; end $$;

revoke all on function public.can_monitor_dm() from public, anon;
revoke all on function public.dm_send(uuid, text) from public, anon;
revoke all on function public.dm_mark_read(uuid) from public, anon;
revoke all on function public.dm_list() from public, anon;
revoke all on function public.dm_list_all(int) from public, anon;
revoke all on function public.dm_delete_message(uuid) from public, anon;
revoke all on function public.dm_unread_count() from public, anon;
revoke all on function public.elogram_activity(int) from public, anon;
revoke all on function public.elogram_unread_count() from public, anon;
revoke all on function public.elogram_mark_seen() from public, anon;
grant execute on function public.can_monitor_dm() to authenticated;
grant execute on function public.dm_send(uuid, text) to authenticated;
grant execute on function public.dm_mark_read(uuid) to authenticated;
grant execute on function public.dm_list() to authenticated;
grant execute on function public.dm_list_all(int) to authenticated;
grant execute on function public.dm_delete_message(uuid) to authenticated;
grant execute on function public.dm_unread_count() to authenticated;
grant execute on function public.elogram_activity(int) to authenticated;
grant execute on function public.elogram_unread_count() to authenticated;
grant execute on function public.elogram_mark_seen() to authenticated;
