// Sorteio, opções e pontuação do "Vista o Herói" (SÓ SERVIDOR: usa as respostas certas).
import "server-only";
import { pickDaily, shuffle } from "../engine";
import { DRESS_CHARACTERS, DRESS_CHARACTER_BY_ID, type DressCharacter } from "./characters";
import { ITEMS_BY_SLOT, SLOTS, type Slot } from "./items";
import { SOLUTIONS, type Solution } from "./solutions";

export const ROUNDS_PER_DAY = 3;
export const POINTS_PER_SLOT = 2;
export const MAX_SCORE = ROUNDS_PER_DAY * SLOTS.length * POINTS_PER_SLOT;
export const PERFECT_BONUS = 10;
export const OPTIONS_PER_SLOT = 4;

/** Data do sorteio: o treino (jogar de novo no dia) usa o sorteio de outro dia. */
export function dressDrawDate(date: string, variant: number): string {
  if (variant <= 0) return date;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + variant * 41 + 7);
  return d.toISOString().slice(0, 10);
}

/** Os 3 personagens do dia (sem repetir dentro de um ciclo da lista). */
export function dailyCharacters(drawDate: string): DressCharacter[] {
  return pickDaily(DRESS_CHARACTERS, ROUNDS_PER_DAY, drawDate, "dress");
}

/** 4 opções por espaço: a ideal, uma aceitável (se houver) e o resto distratores, embaralhadas. */
export function slotOptions(characterId: string, slot: Slot, drawDate: string, solutions: Record<string, Solution> = SOLUTIONS): string[] {
  const sol = solutions[characterId][slot];
  const taken = new Set([sol.ideal, ...sol.ok]);
  const seed = `${drawDate}:${characterId}:${slot}`;
  const distractors = shuffle(
    ITEMS_BY_SLOT(slot).filter((i) => !taken.has(i.id)),
    `d:${seed}`,
  ).map((i) => i.id);
  const picks = [sol.ideal, ...(sol.ok[0] ? [sol.ok[0]] : [])];
  picks.push(...distractors.slice(0, OPTIONS_PER_SLOT - picks.length));
  return shuffle(picks, `o:${seed}`);
}

export type RoundOptions = Record<Slot, string[]>;

export function roundOptions(characterId: string, drawDate: string): RoundOptions {
  const out = {} as RoundOptions;
  for (const s of SLOTS) out[s.key] = slotOptions(characterId, s.key, drawDate);
  return out;
}

export type SlotResult = { slot: Slot; picked: string; ideal: string; points: 0 | 1 | 2; note: string };

/** Confere as escolhas de uma rodada: 2 pontos (ideal), 1 (aceitável) ou 0 por espaço. */
export function scoreRound(characterId: string, picks: Record<string, string>, solutions: Record<string, Solution> = SOLUTIONS): { score: number; slots: SlotResult[] } {
  const sol = solutions[characterId];
  const slots: SlotResult[] = SLOTS.map(({ key }) => {
    const s = sol[key];
    const picked = picks[key];
    const points: 0 | 1 | 2 = picked === s.ideal ? 2 : s.ok.includes(picked) ? 1 : 0;
    return { slot: key, picked, ideal: s.ideal, points, note: s.note };
  });
  return { score: slots.reduce((a, r) => a + r.points, 0), slots };
}

/** Bilhetes do dia: 1 por ponto + bônus se acertar tudo. Só o jogo do dia (não o treino) paga. */
export function ticketsFor(score: number): number {
  return score + (score >= MAX_SCORE ? PERFECT_BONUS : 0);
}

export const characterById = (id: string) => DRESS_CHARACTER_BY_ID.get(id);
