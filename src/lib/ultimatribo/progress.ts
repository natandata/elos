// Progressão de A Última Tribo (client-safe): XP, níveis, títulos e cores de roupa.
// O XP de verdade é calculado e gravado no servidor (actions/tribo.ts) com esta mesma conta.

export type TriboStats = { xp: number; matches: number; wins: number; kills: number; best_place: number | null; lore: string[] };
export const EMPTY_STATS: TriboStats = { xp: 0, matches: 0, wins: 0, kills: 0, best_place: null, lore: [] };

/** XP para sair do nível `l` e chegar no seguinte. */
const need = (l: number) => 150 * l;

export function levelOf(xp: number): { level: number; into: number; next: number } {
  let level = 1;
  let left = Math.max(0, xp);
  while (left >= need(level) && level < 99) {
    left -= need(level);
    level++;
  }
  return { level, into: left, next: need(level) };
}

export const TITLES: { level: number; title: string }[] = [
  { level: 1, title: "Sobrevivente" },
  { level: 3, title: "Batedor" },
  { level: 5, title: "Caçador de Suprimentos" },
  { level: 8, title: "Guardião" },
  { level: 12, title: "Líder de Tribo" },
  { level: 16, title: "O Último" },
];
export const titleOf = (level: number): string => [...TITLES].reverse().find((t) => level >= t.level)?.title ?? TITLES[0].title;

export const OUTFITS: { level: number; name: string; color: number }[] = [
  { level: 1, name: "Verde-oliva", color: 0x5f6b45 },
  { level: 2, name: "Azul-chumbo", color: 0x3f5670 },
  { level: 4, name: "Vinho", color: 0x7a3440 },
  { level: 6, name: "Areia", color: 0xa89468 },
  { level: 9, name: "Preto", color: 0x24262b },
  { level: 12, name: "Branco", color: 0xd8d6cc },
];

export type MatchReport = { place: number; won: boolean; kills: number; seconds: number; opened: number; lore: string[]; allies: number; players: number };

/** XP de uma partida (o servidor refaz a conta com os limites). */
export function matchXp(m: MatchReport): number {
  const xp = 20 + Math.max(0, m.players - m.place) * 12 + m.kills * 25 + Math.min(m.opened, 20) * 2 + m.lore.length * 8 + Math.min(m.allies, 2) * 10 + (m.won ? 120 : 0) + Math.floor(Math.min(m.seconds, 600) / 10);
  return Math.min(500, Math.max(0, Math.round(xp)));
}
