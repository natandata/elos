-- Chat "Preciso de ajuda": uma conversa direta e individual entre um cria e
-- o(s) líder(es) do próprio Elo — separada do chat em grupo do Elo. Uma
-- thread por cria (identificada por cria_id), não por par cria+líder: todo
-- líder responsável por aquele cria participa da mesma conversa.
create table if not exists public.help_chat_messages (
  id         uuid primary key default gen_random_uuid(),
  cria_id    uuid not null references public.profiles(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists help_chat_cria_created_idx on public.help_chat_messages(cria_id, created_at);
alter table public.help_chat_messages enable row level security;

-- leitura: o próprio cria, o(s) líder(es) responsáveis por ele, ou admin
drop policy if exists help_chat_read on public.help_chat_messages;
create policy help_chat_read on public.help_chat_messages for select to authenticated using (
  cria_id = auth.uid() or public.is_leader_of(cria_id) or public.is_admin()
);

-- envio: o próprio cria escrevendo na própria thread, ou o líder responsável
-- respondendo — sempre assinando como si mesmo
drop policy if exists help_chat_insert on public.help_chat_messages;
create policy help_chat_insert on public.help_chat_messages for insert to authenticated with check (
  sender_id = auth.uid()
  and (sender_id = cria_id or public.is_leader_of(cria_id))
);

-- só admin apaga (moderação/monitoramento)
drop policy if exists help_chat_delete on public.help_chat_messages;
create policy help_chat_delete on public.help_chat_messages for delete to authenticated
  using (public.is_admin());
