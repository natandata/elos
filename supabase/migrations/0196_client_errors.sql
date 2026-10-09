-- Erros que acontecem no aparelho das pessoas (ex.: a tela da Arena em branco): cada pessoa manda no máximo 20 por hora.
create table if not exists public.client_errors (
  id         bigserial primary key,
  user_id    uuid references public.profiles(id) on delete set null,
  area       text not null,
  message    text not null,
  stack      text,
  ua         text,
  extra      jsonb,
  created_at timestamptz not null default now()
);
create index if not exists client_errors_created_idx on public.client_errors (created_at desc);
alter table public.client_errors enable row level security;

create or replace function public.report_client_error(p_area text, p_message text, p_stack text default null, p_ua text default null, p_extra jsonb default null)
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  if (select count(*) from public.client_errors where user_id = v_uid and created_at > now() - interval '1 hour') >= 20 then return; end if;
  insert into public.client_errors (user_id, area, message, stack, ua, extra)
  values (v_uid, left(coalesce(p_area, '?'), 40), left(coalesce(p_message, '?'), 400), left(p_stack, 1500), left(p_ua, 300), p_extra);
end $fn$;
revoke all on function public.report_client_error(text, text, text, text, jsonb) from public, anon;
grant execute on function public.report_client_error(text, text, text, text, jsonb) to authenticated;
