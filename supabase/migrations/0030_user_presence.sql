-- ELOS — presença: o admin vê quem está online agora e em qual tela.
-- Heartbeat simples (sem infra de Realtime): o próprio cliente grava sua
-- linha a cada ~20s e a cada troca de rota; "online" é calculado na leitura
-- como last_seen_at recente (60s), não uma coluna própria.
create table if not exists public.user_presence (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  path          text not null,
  last_seen_at  timestamptz not null default now()
);

alter table public.user_presence enable row level security;

drop policy if exists user_presence_upsert_self on public.user_presence;
create policy user_presence_upsert_self on public.user_presence for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_presence_update_self on public.user_presence;
create policy user_presence_update_self on public.user_presence for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_presence_read on public.user_presence;
create policy user_presence_read on public.user_presence for select to authenticated using (
  user_id = auth.uid() or public.is_admin()
);
