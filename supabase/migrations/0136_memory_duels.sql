-- Jogo da Memória com as cartas da Arena: corrida entre dois colegas do Elo (mesmo tabuleiro, vence quem termina primeiro).
create table if not exists public.memory_duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  elo_id uuid references public.elos(id) on delete set null,
  seed integer not null,
  pairs smallint not null default 8,
  status text not null default 'open' check (status in ('open', 'finished', 'expired')),
  c_started_at timestamptz,
  o_started_at timestamptz,
  c_ms int,
  o_ms int,
  c_moves int,
  o_moves int,
  winner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  check (challenger_id <> opponent_id)
);
create index if not exists memory_duels_challenger on public.memory_duels (challenger_id, created_at desc);
create index if not exists memory_duels_opponent on public.memory_duels (opponent_id, created_at desc);

alter table public.memory_duels enable row level security;
drop policy if exists memory_duels_read on public.memory_duels;
create policy memory_duels_read on public.memory_duels for select
  using (challenger_id = auth.uid() or opponent_id = auth.uid() or public.is_admin());

-- Guarda o resultado de um jogador (uma vez só); quando os dois terminam, define o vencedor
-- (menor tempo; empate no tempo desempata por menos jogadas) e paga o XP do duelo (mesmo teto diário do Duelo 1x1).
create or replace function public.memory_duel_finish(p_duel uuid, p_user uuid, p_ms int, p_moves int)
returns table(duel_status text, c_ms int, o_ms int, c_moves int, o_moves int, winner_id uuid)
language plpgsql security definer set search_path = public as $fn$
declare
  d public.memory_duels%rowtype;
  v_winner uuid;
begin
  select * into d from public.memory_duels where id = p_duel for update;
  if not found then raise exception 'Duelo não encontrado'; end if;

  if d.status = 'open' then
    if d.challenger_id = p_user and d.c_ms is null then
      update public.memory_duels set c_ms = p_ms, c_moves = p_moves where id = p_duel;
    elsif d.opponent_id = p_user and d.o_ms is null then
      update public.memory_duels set o_ms = p_ms, o_moves = p_moves where id = p_duel;
    end if;
    select * into d from public.memory_duels where id = p_duel;
    if d.c_ms is not null and d.o_ms is not null then
      v_winner := case
        when d.c_ms < d.o_ms then d.challenger_id
        when d.o_ms < d.c_ms then d.opponent_id
        when d.c_moves < d.o_moves then d.challenger_id
        when d.o_moves < d.c_moves then d.opponent_id
        else null end;
      update public.memory_duels set status = 'finished', winner_id = v_winner, finished_at = now() where id = p_duel;
      if v_winner is null then
        perform public.game_duel_grant(d.challenger_id, 1);
        perform public.game_duel_grant(d.opponent_id, 1);
      else
        perform public.game_duel_grant(v_winner, 2);
      end if;
    end if;
  end if;

  return query select g.status, g.c_ms, g.o_ms, g.c_moves, g.o_moves, g.winner_id from public.memory_duels g where g.id = p_duel;
end $fn$;
revoke execute on function public.memory_duel_finish(uuid, uuid, int, int) from public, anon, authenticated;
grant execute on function public.memory_duel_finish(uuid, uuid, int, int) to service_role;
