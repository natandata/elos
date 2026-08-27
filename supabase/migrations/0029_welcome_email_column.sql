-- ELOS — marca quando o e-mail de boas-vindas já foi enviado (ou dispensado
-- por opt-out), pra /auth/callback nunca reenviar em logins seguintes.
alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;
