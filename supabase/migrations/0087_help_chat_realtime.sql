-- O chat de ajuda depende de Realtime pra mensagem nova aparecer sem recarregar
-- a página (mesmo mecanismo do chat em grupo) — só que tabela nova não entra
-- na publicação sozinha, precisa ser adicionada explicitamente.
alter publication supabase_realtime add table public.help_chat_messages;
