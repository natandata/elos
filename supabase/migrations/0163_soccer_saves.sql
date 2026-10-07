-- ArenaSoccer: progresso da Copa, do Brasileirão e da carreira (um registro por jogador e tipo).
create table if not exists public.soccer_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 60),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind),
  constraint soccer_saves_size check (pg_column_size(data) < 400000)
);
alter table public.soccer_saves enable row level security;
drop policy if exists soccer_saves_own_select on public.soccer_saves;
drop policy if exists soccer_saves_own_insert on public.soccer_saves;
drop policy if exists soccer_saves_own_update on public.soccer_saves;
drop policy if exists soccer_saves_own_delete on public.soccer_saves;
create policy soccer_saves_own_select on public.soccer_saves for select using (user_id = auth.uid());
create policy soccer_saves_own_insert on public.soccer_saves for insert with check (user_id = auth.uid());
create policy soccer_saves_own_update on public.soccer_saves for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy soccer_saves_own_delete on public.soccer_saves for delete using (user_id = auth.uid());
