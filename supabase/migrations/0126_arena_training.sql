-- Treino: jogar numa arena já vencida (abaixo da atual) não mexe em troféus nem dá XP.
alter table public.arena_matches add column if not exists training boolean not null default false;
