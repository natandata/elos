// Regras puras das ligas do Babel (client-safe): divisões, semana e classificação. Só jogadores reais.

export const TIERS = [
  { name: "Bronze", color: "#cd7f32" },
  { name: "Prata", color: "#b4b9c4" },
  { name: "Ouro", color: "#ffc800" },
  { name: "Safira", color: "#1cb0f6" },
  { name: "Rubi", color: "#ff4b4b" },
  { name: "Esmeralda", color: "#2fbf71" },
  { name: "Ametista", color: "#ce82ff" },
  { name: "Pérola", color: "#f4b6d8" },
  { name: "Obsidiana", color: "#5b6b78" },
  { name: "Diamante", color: "#7ee8fa" },
] as const;

export const GROUP_SIZE = 30;
export const PROMOTE = 10;
export const DEMOTE = 5;

const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

/** Segunda-feira (dia BR) da semana que contém `ymd`. */
export function weekMonday(ymd: string): string {
  const dow = (new Date(ymd + "T12:00:00Z").getUTCDay() + 6) % 7;
  return addDays(ymd, -dow);
}
export const weekSunday = (monday: string) => addDays(monday, 6);
/** Instante (ms) em que a semana vira: segunda-feira 00:00 de Brasília (UTC-3). */
export const weekEndMs = (monday: string) => Date.parse(addDays(monday, 7) + "T03:00:00Z");
export const weekStartMs = (monday: string) => Date.parse(monday + "T03:00:00Z");

export type Standing = { id: string; name: string; avatar: string | null; xp: number; me: boolean };

export function rankStandings(list: Standing[]): Standing[] {
  return [...list].sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id));
}

/** Zonas de subida/descida proporcionais ao tamanho real do grupo (grupo pequeno não rebaixa ninguém por posição). */
export function zones(size: number): { promote: number; demoteFrom: number } {
  const promote = size >= 3 ? Math.min(PROMOTE, Math.floor(size / 3)) : size >= 1 ? 1 : 0;
  const demote = size >= 6 ? Math.min(DEMOTE, Math.floor(size / 6)) : 0;
  return { promote, demoteFrom: demote ? size - demote + 1 : size + 1 };
}

export type LeagueOutcome = { newTier: number; result: "promoted" | "demoted" | "stayed"; gems: number };
export function settleOutcome(rank: number, xp: number, tier: number, size = GROUP_SIZE): LeagueOutcome {
  const z = zones(size);
  // sem disputa de verdade (menos de 3 jogadores) não há prêmio de gemas
  const gems = size < 3 ? 0 : rank === 1 ? 60 : rank === 2 ? 40 : rank === 3 ? 20 : 0;
  if (xp > 0 && rank <= z.promote && tier < 10) return { newTier: tier + 1, result: "promoted", gems: size < 3 ? 0 : gems || 10 };
  if ((xp === 0 || rank >= z.demoteFrom) && tier > 1) return { newTier: tier - 1, result: "demoted", gems };
  return { newTier: tier, result: "stayed", gems };
}
