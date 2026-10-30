-- Evento das tribos: o admin vê quem já viu a própria tribo (o card pós-login registra a visualização).
alter table public.event_members
  add column if not exists seen_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists views int not null default 0;

create or replace function public.event_mark_seen() returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null or not public.event_visible() then return; end if;
  update public.event_members
     set seen_at = coalesce(seen_at, now()), last_seen_at = now(), views = views + 1
   where user_id = auth.uid();
end $fn$;
revoke execute on function public.event_mark_seen() from public, anon;
grant execute on function public.event_mark_seen() to authenticated;
