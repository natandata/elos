-- Evento das tribos: o admin pode tirar alguem de qualquer tribo (fica neutro) e a pessoa nao e sorteada de novo sozinha.
create table if not exists public.event_neutral (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.event_neutral enable row level security;
drop policy if exists event_neutral_admin on public.event_neutral;
create policy event_neutral_admin on public.event_neutral for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.event_assign_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $fn$
declare p record; v_tribe text;
begin
  select id, role, approved, elo_id, coalesce(is_test_account, false) as test into p from public.profiles where id = p_user;
  if not found or p.test or p.role not in ('cria', 'leader') then return; end if;
  if p.role = 'leader' and not p.approved then return; end if;
  if exists (select 1 from public.event_members where user_id = p_user) then return; end if;
  if exists (select 1 from public.event_neutral where user_id = p_user) then return; end if;
  if not exists (select 1 from public.event_settings where drawn_at is not null) then return; end if;
  select t.key into v_tribe
    from public.event_tribes t
    left join (select m.tribe, count(*) c from public.event_members m join public.profiles q on q.id = m.user_id where q.elo_id is not distinct from p.elo_id group by m.tribe) e on e.tribe = t.key
    left join (select tribe, count(*) c from public.event_members group by tribe) g on g.tribe = t.key
   order by coalesce(e.c, 0), coalesce(g.c, 0), random() limit 1;
  insert into public.event_members (user_id, tribe, source) values (p_user, v_tribe, 'late') on conflict do nothing;
end $fn$;
revoke execute on function public.event_assign_user(uuid) from public, anon, authenticated;
