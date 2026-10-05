-- Duelos de posição no Top 3 da Arena (aplicada via MCP): colunas arena_pvp.rank_duel / rank_swap,
-- funções arena_rank_user_at, arena_rank_swap e arena_pvp_create_rank.
alter table public.arena_pvp add column if not exists rank_duel boolean not null default false;
alter table public.arena_pvp add column if not exists rank_swap jsonb;
