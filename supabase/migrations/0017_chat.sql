-- ELOS — Chat privado por Elo. Líder e crias do mesmo Elo conversam em um
-- único "grupo" (uma linha por Elo, sem threads). O Admin não participa,
-- apenas monitora (lê) todas as conversas da plataforma.

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  elo_id     uuid not null references public.elos(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_elo_created_idx
  on public.chat_messages (elo_id, created_at);

alter table public.chat_messages enable row level security;

-- leitura: admin vê tudo (monitoramento); líder/cria só o chat do próprio Elo
drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages for select to authenticated using (
  public.is_admin()
  or (elo_id is not null and elo_id = public.my_elo())
);

-- envio: só líder/cria aprovado, no próprio Elo, assinando como si mesmo.
-- Admin não envia mensagens — só monitora.
drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.my_role() in ('leader', 'cria')
    and elo_id = public.my_elo()
  );

-- ninguém edita ou apaga mensagem (histórico do chat é imutável)

-- habilita realtime para a lista de mensagens atualizar ao vivo
alter publication supabase_realtime add table public.chat_messages;
