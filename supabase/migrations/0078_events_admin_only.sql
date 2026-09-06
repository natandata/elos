-- Terceira opção de visibilidade na Agenda, além de "todo mundo"/"liderança":
-- evento que só o admin enxerga (ex.: itens administrativos internos que não
-- deviam aparecer nem pra líder).
alter table public.events add column if not exists admin_only boolean not null default false;

drop policy if exists events_read on public.events;
create policy events_read on public.events for select to authenticated using (
  public.is_admin()
  or (not admin_only and (not leaders_only or public.my_role() = 'leader'::user_role))
);
