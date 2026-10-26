// Regras puras das ligas do Babel (client-safe): divisões, semana, adversários de reserva e classificação.

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

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const BOT_NAMES = [
  "Lucas", "Ana Clara", "Pedro", "Maria Eduarda", "Gabriel", "Beatriz", "Davi", "Larissa", "Mateus", "Julia", "Rafael", "Isabela", "Enzo", "Sofia", "Miguel",
  "Laura", "Heitor", "Helena", "Arthur", "Valentina", "Bernardo", "Alice", "Samuel", "Manuela", "Théo", "Lorena", "Nicolas", "Yasmin", "João Pedro", "Rebeca",
  "Caleb", "Raquel", "Daniel", "Esther", "Josué", "Débora", "Tiago", "Ester", "Benício", "Lívia",
];

export type Standing = { id: string; name: string; avatar: string | null; xp: number; bot: boolean; me: boolean };

/** Adversários de reserva do grupo: sempre os mesmos para o mesmo grupo; o XP cresce ao longo da semana. */
export function reserveBots(groupId: string, tier: number, count: number, monday: string, nowMs: number, final = false): Standing[] {
  const span = weekEndMs(monday) - weekStartMs(monday);
  const f = final ? 1 : Math.max(0, Math.min(1, (nowMs - weekStartMs(monday)) / span));
  const out: Standing[] = [];
  for (let i = 0; i < Math.max(0, count); i++) {
    const u = hash(`${groupId}:${i}:t`);
    const j = hash(`${groupId}:${i}:j`);
    const base = 90 + 55 * (tier - 1);
    const target = u < 0.15 ? 8 + Math.floor(u * 100) : base * (0.25 + 1.5 * hash(`${groupId}:${i}:x`));
    const xp = Math.round(target * Math.pow(f, 0.9) * (0.9 + 0.2 * j));
    out.push({ id: `bot:${groupId}:${i}`, name: BOT_NAMES[(Math.floor(hash(`${groupId}:n`) * BOT_NAMES.length) + i * 7) % BOT_NAMES.length], avatar: null, xp, bot: true, me: false });
  }
  return out;
}

export function rankStandings(list: Standing[]): Standing[] {
  return [...list].sort((a, b) => b.xp - a.xp || Number(a.bot) - Number(b.bot) || a.id.localeCompare(b.id));
}

export type LeagueOutcome = { newTier: number; result: "promoted" | "demoted" | "stayed"; gems: number };
export function settleOutcome(rank: number, xp: number, tier: number): LeagueOutcome {
  const gems = rank === 1 ? 60 : rank === 2 ? 40 : rank === 3 ? 20 : 0;
  if (xp > 0 && rank <= PROMOTE && tier < 10) return { newTier: tier + 1, result: "promoted", gems: gems || 10 };
  if ((xp === 0 || rank > GROUP_SIZE - DEMOTE) && tier > 1) return { newTier: tier - 1, result: "demoted", gems };
  return { newTier: tier, result: "stayed", gems };
}
