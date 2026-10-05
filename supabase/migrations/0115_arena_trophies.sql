-- Troféus da Arena dos Heróis: sobem/descem a cada partida confirmada no servidor.
create table if not exists public.arena_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  trophies int not null default 0 check (trophies >= 0),
  best int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.arena_stats enable row level security;
drop policy if exists arena_stats_read on public.arena_stats;
create policy arena_stats_read on public.arena_stats for select using (user_id = auth.uid() or public.is_admin());

alter table public.arena_matches add column if not exists arena smallint not null default 0;
alter table public.arena_matches add column if not exists trophy_delta int not null default 0;

-- só o servidor (chave de serviço) mexe nos troféus
create or replace function public.arena_apply_result(p_user uuid, p_delta int, p_result text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_new int;
begin
  insert into public.arena_stats (user_id, trophies, best, wins, losses)
  values (p_user, greatest(0, p_delta), greatest(0, p_delta), (p_result = 'win')::int, (p_result = 'loss')::int)
  on conflict (user_id) do update set
    trophies = greatest(0, public.arena_stats.trophies + p_delta),
    best = greatest(public.arena_stats.best, public.arena_stats.trophies + p_delta),
    wins = public.arena_stats.wins + (p_result = 'win')::int,
    losses = public.arena_stats.losses + (p_result = 'loss')::int,
    updated_at = now()
  returning trophies into v_new;
  return v_new;
end $$;
revoke all on function public.arena_apply_result(uuid, int, text) from public, anon, authenticated;
grant execute on function public.arena_apply_result(uuid, int, text) to service_role;
