// Nota do júri bíblico do "Vista o Herói" (SÓ SERVIDOR: usa as respostas certas).
import "server-only";
import { shuffle } from "../engine";
import { FEMALE_CHARACTERS, type DressCharacter } from "./characters";
import { ITEM_BY_ID, SLOTS, type Look, type Slot } from "./items";
import { SOLUTIONS, type Solution } from "./solutions";

/** Família (desenho base) de uma peça: peças da mesma família valem o mesmo na pontuação. */
export const famOf = (id: string | undefined): string => (id ? (ITEM_BY_ID.get(id)?.family ?? id) : "");

export const MAX_FIDELITY = SLOTS.length * 2;

/** Tema do treino: sorteio por número (1, 2, 3...), diferente a cada rodada do dia. */
export function practiceTheme(date: string, n: number): DressCharacter {
  const order = shuffle(FEMALE_CHARACTERS, `dress-practice:${date}`);
  return order[Math.max(0, n - 1) % order.length];
}

export type SlotResult = { slot: Slot; picked: string; ideal: string; points: 0 | 1 | 2; note: string };

/** Confere o look contra a história do tema: 2 pontos (ideal), 1 (aceitável) ou 0 por espaço. */
export function scoreLook(characterId: string, look: Look, solutions: Record<string, Solution> = SOLUTIONS): { score: number; slots: SlotResult[] } {
  const sol = solutions[characterId];
  const slots: SlotResult[] = SLOTS.map(({ key }) => {
    const s = sol?.[key];
    const picked = look[key] ?? "";
    const f = famOf(picked);
    const points: 0 | 1 | 2 = !s ? 0 : f === famOf(s.ideal) ? 2 : s.ok.some((o) => famOf(o) === f) ? 1 : 0;
    return { slot: key as Slot, picked, ideal: s?.ideal ?? "", points, note: s?.note ?? "" };
  });
  return { score: slots.reduce((a, r) => a + r.points, 0), slots };
}

/** Estrelas do júri (1 a 5) a partir da fidelidade (0 a 10). */
export const juryStars = (fidelity: number): number => Math.max(1, Math.min(5, 1 + Math.round(fidelity * 0.4)));
