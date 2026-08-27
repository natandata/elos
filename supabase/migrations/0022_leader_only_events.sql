-- ELOS — evento exclusivo para líderes ("Liderança"): admin cria, só líderes
-- (e admin) veem na agenda; não aparece pra crias.

alter table public.events
  add column if not exists leaders_only boolean not null default false;

drop policy if exists events_read on public.events;
create policy events_read on public.events for select to authenticated using (
  not leaders_only or public.is_admin() or public.my_role() = 'leader'
);
