// ArenaSoccer: seleções das últimas sete Copas do Mundo, clubes das quatro ligas e escalação de times de verdade.
import type { Slot } from "./engine";

export type KitPattern = "solid" | "stripes" | "hoops" | "sash" | "halves" | "checker";
export type Kit = { p: string; s: string; k: KitPattern };
/** n = número da camisa, pos = GK/DF/MF/FW, name = nome, ovr = força (50–99) */
export type RosterPlayer = [n: number, pos: string, name: string, ovr: number];
export type Team = { id: string; name: string; coach?: string; p: string; s: string; k: KitPattern; str: number; players: RosterPlayer[] };

export type CupMeta = { year: number; host: string; teams: number; groups: number };
export type CupData = { year: number; host: string; groups: Record<string, string[]>; teams: Team[] };
export type LeagueKey = "br" | "en" | "es" | "fr";
export type LeagueData = { key: LeagueKey; label: string; teams: Team[] };

export const CUP_YEARS = [2026, 2022, 2018, 2014, 2010, 2006, 2002] as const;
export const CUP_HOST: Record<number, string> = { 2026: "EUA, Canadá e México", 2022: "Catar", 2018: "Rússia", 2014: "Brasil", 2010: "África do Sul", 2006: "Alemanha", 2002: "Coreia do Sul e Japão" };
export const LEAGUES: { key: LeagueKey; label: string; flag: string; short: string }[] = [
  { key: "br", label: "Campeonato Brasileiro", flag: "🇧🇷", short: "Brasileirão" },
  { key: "es", label: "Campeonato Espanhol", flag: "🇪🇸", short: "La Liga" },
  { key: "en", label: "Campeonato Inglês", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", short: "Premier League" },
  { key: "fr", label: "Campeonato Francês", flag: "🇫🇷", short: "Ligue 1" },
];

export async function loadCup(year: number): Promise<CupData> {
  const m = await import(`./data/cup${year}.json`);
  return (m.default ?? m) as CupData;
}

export async function loadLeague(key: LeagueKey): Promise<LeagueData> {
  const m = await import(`./data/league-${key}.json`);
  return (m.default ?? m) as LeagueData;
}

export const kitOf = (t: Pick<Team, "p" | "s" | "k">): Kit => ({ p: t.p, s: t.s, k: t.k });

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Distância entre duas cores (0–441). */
export function colorDist(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  // pesos que parecem mais com o olho: verde pesa mais
  return Math.sqrt(2 * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + 3 * (b1 - b2) ** 2) / 3;
}

/** O segundo time troca para o uniforme reserva quando as camisas se confundem. */
export function resolveKits(a: Kit, b: Kit): [Kit, Kit] {
  if (colorDist(a.p, b.p) >= 70) return [a, b];
  const alt: Kit = { p: b.s, s: b.p, k: b.k === "solid" ? "solid" : b.k };
  if (colorDist(a.p, alt.p) >= 70) return [a, alt];
  const w: Kit = { p: "#ffffff", s: b.p, k: "solid" };
  if (colorDist(a.p, w.p) >= 70) return [a, w];
  return [a, { p: "#111827", s: b.p, k: "solid" }];
}

const POS_ORDER: Record<string, number> = { GK: 0, DF: 1, MF: 2, FW: 3 };
const slotOf = (p: RosterPlayer): Slot => ({ num: p[0], pos: p[1], name: p[2], ovr: p[3] });

/** Sobrenome para a etiqueta em campo. */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return full;
  const last = parts[parts.length - 1];
  return /^(jr\.?|júnior|junior|filho|neto)$/i.test(last) && parts.length > 2 ? parts[parts.length - 2] + " " + last : last;
}

/**
 * Organiza a escalação para a partida: o primeiro é quem você controla (fica no meio-campo, na posição mais livre);
 * o resto vai do ataque para a defesa pela posição (goleiro e zagueiros nos lugares mais recuados).
 */
export function arrange(players: RosterPlayer[], controlled?: number): Slot[] {
  if (players.length === 0) return [];
  const me = controlled !== undefined && controlled >= 0 && controlled < players.length ? controlled : 0;
  const rest = players.filter((_, i) => i !== me).sort((a, b) => POS_ORDER[b[1]] - POS_ORDER[a[1]] || b[3] - a[3]);
  return [slotOf(players[me]), ...rest.map(slotOf)];
}

/** Escolha automática: os melhores, com equilíbrio (até 1 goleiro só se não houver mais ninguém). */
export function autoPick(team: Team, n = 4): RosterPlayer[] {
  const pool = team.players.filter((p) => p[1] !== "GK");
  const byPos = (pos: string) => pool.filter((p) => p[1] === pos).sort((a, b) => b[3] - a[3]);
  const chosen: RosterPlayer[] = [];
  const want = n >= 4 ? ["FW", "MF", "MF", "DF"] : n === 3 ? ["FW", "MF", "DF"] : n === 2 ? ["FW", "MF"] : ["FW"];
  for (const pos of want) {
    const c = byPos(pos).find((p) => !chosen.includes(p));
    if (c) chosen.push(c);
  }
  for (const p of [...pool].sort((a, b) => b[3] - a[3])) {
    if (chosen.length >= n) break;
    if (!chosen.includes(p)) chosen.push(p);
  }
  return chosen.slice(0, n).sort((a, b) => b[3] - a[3]);
}

/** Nível do computador conforme a diferença de força entre os times. */
export function levelFor(mine: number, theirs: number): "easy" | "normal" | "hard" {
  const d = theirs - mine;
  return d >= 5 ? "hard" : d <= -6 ? "easy" : "normal";
}

/** A escalação do computador: os melhores do time adversário. */
export function cpuLineup(team: Team, n: number): Slot[] {
  return arrange(autoPick(team, n), 0);
}
