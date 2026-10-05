-- Medalhas de vitória do 1x1: quem vence um colega ganha uma medalha contra ELE
-- (ex.: Gabriel tem 5 medalhas contra Rafael). O 1x1 não mexe em troféus.
create table if not exists public.arena_medals (
  winner_id uuid not null references public.profiles(id) on delete cascade,
  loser_id uuid not null references public.profiles(id) on delete cascade,
  wins int not null default 0 check (wins >= 0),
  last_at timestamptz not null default now(),
  primary key (winner_id, loser_id),
  check (winner_id <> loser_id)
);
alter table public.arena_medals enable row level security;
drop policy if exists arena_medals_read on public.arena_medals;
create policy arena_medals_read on public.arena_medals for select using (winner_id = auth.uid() or loser_id = auth.uid() or public.is_admin());

create or replace function public.arena_add_medal(p_winner uuid, p_loser uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v int;
begin
  insert into public.arena_medals (winner_id, loser_id, wins) values (p_winner, p_loser, 1)
  on conflict (winner_id, loser_id) do update set wins = public.arena_medals.wins + 1, last_at = now()
  returning wins into v;
  return v;
end $$;
revoke all on function public.arena_add_medal(uuid, uuid) from public, anon, authenticated;
grant execute on function public.arena_add_medal(uuid, uuid) to service_role;
