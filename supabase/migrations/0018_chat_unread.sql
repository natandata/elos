-- ELOS — marca de "última leitura" do chat, para o badge de mensagens novas
-- no menu (contagem de chat_messages do Elo criadas depois desse instante).

alter table public.profiles
  add column if not exists chat_last_read_at timestamptz;
