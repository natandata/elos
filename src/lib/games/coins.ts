/** A moeda da Sala de Jogos: o denário (client-safe). Mais tarde, o XP poderá ser trocado por ela. */
export const COIN = { name: "Denários", one: "Denário", emoji: "🪙" } as const;

export const fmtCoins = (n: number): string => `${COIN.emoji} ${Number(n).toLocaleString("pt-BR")}`;
