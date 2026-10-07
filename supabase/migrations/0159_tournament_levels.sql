-- Torneios da Arena: nível das cartas por partida (só quando os dois estão perto no ranking)
-- e posição no ranking de cada inscrito no início do torneio.
alter table public.arena_pvp add column if not exists levels jsonb;
alter table public.arena_duo add column if not exists levels jsonb;
alter table public.arena_tournament_entries add column if not exists seed_pos int;
