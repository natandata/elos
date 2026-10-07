/** A moeda da Sala de Jogos: o denário (client-safe). Mais tarde, o XP poderá ser trocado por ela. */
export const COIN = { name: "Denários", one: "Denário", emoji: "🪙" } as const;

export const fmtCoins = (n: number): string => `${COIN.emoji} ${Number(n).toLocaleString("pt-BR")}`;

/** A troca de XP por denários abre à 00:00 de 01/11/2026 (Brasília). A checagem de verdade é na função xp_exchange do banco. */
export const XP_EXCHANGE_OPENS = "2026-11-01T00:00:00-03:00";
