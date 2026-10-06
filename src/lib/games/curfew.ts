/** Toque de recolher da Arena dos Heróis: fechada das 00:00 às 06:00 (Brasília) para ninguém jogar de madrugada. */
export const ARENA_CURFEW = { fromHour: 0, toHour: 6 };

export function brasiliaHour(now = Date.now()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date(now))) % 24;
}

/** A Arena está "dormindo" agora? (o admin passa por cima, no servidor) */
export const arenaAsleep = (now = Date.now()): boolean => {
  const h = brasiliaHour(now);
  return h >= ARENA_CURFEW.fromHour && h < ARENA_CURFEW.toHour;
};
