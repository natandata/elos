// Economia de cartas do Arena dos Heróis (client-safe, sem segredo).
//
// Cada carta junta cópias; juntando o bastante (veja UPGRADE_COST em cards.ts)
// ela evolui, até o nível 15. Cópias vêm de:
//   - batalhas (vitória rende mais que derrota/empate);
//   - baú da Arena, grátis, 1x por dia;
//   - baús comprados com troféus, sempre com mais cópias que o baú do dia.

import { isCardUnlocked } from "./arenas";
import { ARENA_CARDS } from "./cards";

/** Cópias de UMA carta por partida (precisa durar pelo menos 75 s, como o XP). */
export const COPIES_WIN = 12;
export const COPIES_OTHER = 4;

export type ChestKind = "daily" | "cedro" | "templo" | "arca";

export type ChestDef = {
  kind: ChestKind;
  name: string;
  emoji: string;
  /** troféus gastos (0 = grátis, 1x por dia) */
  cost: number;
  /** cartas diferentes sorteadas */
  stacks: number;
  /** total de cópias distribuídas */
  copies: number;
};

export const CHESTS: ChestDef[] = [
  { kind: "daily", name: "Baú da Arena", emoji: "🎁", cost: 0, stacks: 5, copies: 40 },
  { kind: "cedro", name: "Baú de Cedro", emoji: "🧰", cost: 50, stacks: 5, copies: 70 },
  { kind: "templo", name: "Baú do Templo", emoji: "🏺", cost: 100, stacks: 6, copies: 160 },
  { kind: "arca", name: "Arca da Aliança", emoji: "👑", cost: 200, stacks: 8, copies: 400 },
];
export const CHEST_BY_KIND = new Map(CHESTS.map((c) => [c.kind, c]));

export type CopyGrant = { card: string; n: number };

/** Cartas que o jogador já liberou (pelo recorde de troféus). */
export function unlockedCards(best: number): string[] {
  return ARENA_CARDS.filter((c) => isCardUnlocked(c.key, best)).map((c) => c.key);
}

/** Carta ultra lendária: só sai de baú (1% por baú) e só depois de liberada. */
export const ULTRA_CARD = "jesus";
export const ULTRA_CHEST_CHANCE = 0.01;

/** Sorteia `count` cartas diferentes; as do baralho atual pesam o dobro (o jogador evolui o que usa). */
export function pickCards(unlocked: string[], deck: string[], count: number, rnd: () => number = Math.random): string[] {
  const pool = unlocked.map((k) => ({ k, w: deck.includes(k) ? 2 : 1 }));
  const out: string[] = [];
  while (out.length < count && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let roll = rnd() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      roll -= pool[idx].w;
      if (roll < 0) break;
    }
    out.push(pool[idx].k);
    pool.splice(idx, 1);
  }
  return out;
}

/** Divide as cópias do baú entre as cartas sorteadas (o que sobra vai pras primeiras). */
export function rollChest(def: ChestDef, unlocked: string[], deck: string[], rnd: () => number = Math.random): CopyGrant[] {
  const common = unlocked.filter((k) => k !== ULTRA_CARD);
  const cards = pickCards(common, deck, def.stacks, rnd);
  if (cards.length === 0) return [];
  // 1% de chance do baú trazer o Jesus no lugar de uma das cartas
  if (unlocked.includes(ULTRA_CARD) && rnd() < ULTRA_CHEST_CHANCE) cards[cards.length - 1] = ULTRA_CARD;
  const base = Math.floor(def.copies / cards.length);
  let rest = def.copies - base * cards.length;
  return cards.map((card) => ({ card, n: base + (rest-- > 0 ? 1 : 0) }));
}

/** Carta que recebe as cópias de uma batalha (uma só, sorteada). */
export function pickBattleCard(unlocked: string[], deck: string[], rnd: () => number = Math.random): string | null {
  return pickCards(unlocked.filter((k) => k !== ULTRA_CARD), deck, 1, rnd)[0] ?? null;
}
