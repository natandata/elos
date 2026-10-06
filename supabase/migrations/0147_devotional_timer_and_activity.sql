-- "Fez devocional" = qualquer registro em Meu Devocional: Diário, Oração (pedido ou apoio), Favoritos ou Timer.
-- O Timer passa a ser registrado (uma linha por sessão iniciada).
create table if not exists public.devotional_timer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,
  minutes int not null check (minutes between 1 and 240),
  created_at timestamptz not null default now()
);
create index if not exists devotional_timer_sessions_user_date on public.devotional_timer_sessions (user_id, session_date);
alter table public.devotional_timer_sessions enable row level security;
drop policy if exists "timer sessions own" on public.devotional_timer_sessions;
create policy "timer sessions own" on public.devotional_timer_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.devotional_done_on(p_user uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from devotional_entries e where e.user_id = p_user and e.entry_date = p_day)
      or exists (select 1 from prayer_requests r where r.user_id = p_user and (r.created_at at time zone 'America/Sao_Paulo')::date = p_day)
      or exists (select 1 from prayer_supports s where s.user_id = p_user and (s.created_at at time zone 'America/Sao_Paulo')::date = p_day)
      or exists (select 1 from devotional_favorites f where f.user_id = p_user and (f.created_at at time zone 'America/Sao_Paulo')::date = p_day)
      or exists (select 1 from devotional_timer_sessions t where t.user_id = p_user and t.session_date = p_day);
$$;
revoke all on function public.devotional_done_on(uuid, date) from public, anon, authenticated;
grant execute on function public.devotional_done_on(uuid, date) to service_role;

create or replace function public.arena_devotional_penalties()
returns table (user_id uuid, lost int, missed_days int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yesterday date := (now() at time zone 'America/Sao_Paulo')::date - 1;
  r record;
  d date;
  v_tr int;
  v_missed int;
begin
  for r in
    select s.user_id as uid, s.trophies, s.devo_penalty_date as from_day
      from public.arena_stats s
      join public.profiles p on p.id = s.user_id
     where p.role in ('cria', 'leader') and s.devo_penalty_date < v_yesterday
     for update of s
  loop
    v_tr := r.trophies;
    v_missed := 0;
    d := r.from_day + 1;
    while d <= v_yesterday loop
      if not public.devotional_done_on(r.uid, d) then
        v_missed := v_missed + 1;
        v_tr := v_tr / 2;
      end if;
      d := d + 1;
    end loop;
    update public.arena_stats set trophies = v_tr, devo_penalty_date = v_yesterday, updated_at = now() where arena_stats.user_id = r.uid;
    if v_missed > 0 and v_tr < r.trophies then
      user_id := r.uid;
      lost := r.trophies - v_tr;
      missed_days := v_missed;
      return next;
    end if;
  end loop;
end $$;
revoke all on function public.arena_devotional_penalties() from public, anon, authenticated;
grant execute on function public.arena_devotional_penalties() to service_role;
