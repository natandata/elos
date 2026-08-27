-- ELOS — preferência de e-mail: um único toggle por perfil. Desligado, pula
-- boas-vindas e resumos periódicos (não afeta o e-mail nativo de reset de
-- senha do Supabase Auth, que não passa pela Resend).
alter table public.profiles
  add column if not exists email_opt_in boolean not null default true;
