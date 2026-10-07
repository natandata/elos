// ArenaSoccer · Mundo aberto: o calendário. Os jogos são sempre à noite, depois das 20h (Brasília),
// só na segunda, terça, quinta e sábado: nunca na quarta, na sexta nem no domingo à noite.
import type { LeagueKey } from "./teams";

/** Horário de Brasília (sem horário de verão): UTC−3. */
const BRT = 3 * 3600_000;
const DAY = 86_400_000;

/** O mundo abre na segunda-feira, 12/10/2026 (meia-noite de Brasília). */
export const WORLD_EPOCH = Date.UTC(2026, 9, 12, 3, 0, 0);
/** Dias da semana de jogo (0 = domingo): segunda, terça, quinta, sábado. */
export const MATCH_DAYS = [1, 2, 4, 6];
export const KICKOFF_HOUR = 20;
/** Quem quiser jogar tem até 01h da madrugada seguinte; depois disso o jogo é simulado. */
export const WINDOW_HOURS = 5;
/** Rodadas de folga entre uma temporada e a outra (dá umas duas semanas de pausa). */
export const OFFSEASON_SLOTS = 4;

export const ROUNDS: Record<LeagueKey, number> = { br: 38, es: 38, en: 38, fr: 34 };

/** Dia (meia-noite de Brasília, em ms UTC) do n-ésimo dia de jogo desde a abertura do mundo. */
export function slotDay(n: number): number {
  const perWeek = MATCH_DAYS.length;
  const week = Math.floor(n / perWeek);
  const dow = MATCH_DAYS[n % perWeek];
  // a abertura é segunda: 1 → +0, 2 → +1, 4 → +3, 6 → +5
  return WORLD_EPOCH + week * 7 * DAY + (dow - 1) * DAY;
}

/** Início (20h) e fim da janela de jogo do n-ésimo dia de jogo. */
export function slotWindow(n: number): { start: number; end: number } {
  const start = slotDay(n) + KICKOFF_HOUR * 3600_000;
  return { start, end: start + WINDOW_HOURS * 3600_000 };
}

/** Em que dia de jogo cada rodada cai: a temporada `season` (1, 2…) da liga, rodada `round` (0…). */
export function slotIndex(league: LeagueKey, season: number, round: number): number {
  return (season - 1) * (ROUNDS[league] + OFFSEASON_SLOTS) + round;
}

export function roundWindow(league: LeagueKey, season: number, round: number): { start: number; end: number } {
  return slotWindow(slotIndex(league, season, round));
}

/** A janela está aberta agora? */
export const windowOpen = (w: { start: number; end: number }, now = Date.now()): boolean => now >= w.start && now < w.end;

const WD = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
/** "quinta, 15/10 às 20h" */
export function whenLabel(ms: number): string {
  const d = new Date(ms - BRT);
  return `${WD[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")} às ${String(d.getUTCHours()).padStart(2, "0")}h`;
}

/** "daqui a 2 d 3 h" / "daqui a 45 min" */
export function inLabel(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((ms - now) / 1000));
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60} min`;
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24} h`;
}
