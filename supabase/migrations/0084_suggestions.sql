-- Mural de sugestões: cria escreve o que gostaria de ver/fazer no app, todo
-- mundo (cria/líder/admin) vê e pode "hypar" (curtir) — vira um jeito de
-- priorizar o que a comunidade mais quer. Admin acompanha e marca o status.

create table if not exists public.suggestions (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(trim(content)) > 0 and char_length(content) <= 300),
  status     text not null default 'pending' check (status in ('pending', 'planned', 'done')),
  created_at timestamptz not null default now()
);
create index if not exists suggestions_created_idx on public.suggestions(created_at desc);
alter table public.suggestions enable row level security;

drop policy if exists suggestions_read on public.suggestions;
create policy suggestions_read on public.suggestions for select to authenticated using (true);

drop policy if exists suggestions_insert on public.suggestions;
create policy suggestions_insert on public.suggestions for insert to authenticated
  with check (author_id = auth.uid() and public.my_role() = 'cria');

drop policy if exists suggestions_admin on public.suggestions;
create policy suggestions_admin on public.suggestions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- hype
create table if not exists public.suggestion_hypes (
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);
alter table public.suggestion_hypes enable row level security;

drop policy if exists suggestion_hypes_read on public.suggestion_hypes;
create policy suggestion_hypes_read on public.suggestion_hypes for select to authenticated using (true);

drop policy if exists suggestion_hypes_insert on public.suggestion_hypes;
create policy suggestion_hypes_insert on public.suggestion_hypes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists suggestion_hypes_delete on public.suggestion_hypes;
create policy suggestion_hypes_delete on public.suggestion_hypes for delete to authenticated
  using (user_id = auth.uid());

-- view com a contagem de hype já somada — security_invoker respeita o RLS de
-- quem consulta (mesmo padrão de v_latest_status).
create or replace view public.v_suggestions with (security_invoker = on) as
  select s.id, s.author_id, p.full_name as author_name, s.content, s.status, s.created_at,
         count(h.user_id)::int as hype_count
    from public.suggestions s
    left join public.suggestion_hypes h on h.suggestion_id = s.id
    left join public.profiles p on p.id = s.author_id
   group by s.id, p.full_name;
