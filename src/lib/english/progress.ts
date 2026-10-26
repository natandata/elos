import { LESSON_ORDER, UNITS } from "./content";

// Quem pode abrir o quê: lições em sequência a partir da unidade inicial (nivelamento); a conversa abre depois da
// 2ª lição da unidade; o nível lendário depois das 3 lições. Puro: usado na tela e conferido de novo no servidor.

const idxOf = (lessonId: string) => LESSON_ORDER.indexOf(lessonId);
/** Índice da primeira lição da unidade inicial (as anteriores ficam liberadas pelo nivelamento). */
const startIdx = (startUnit: number) => Math.max(0, Math.min(UNITS.length - 1, startUnit - 1)) * 3;

export function lessonUnlocked(lessonId: string, done: Set<string>, startUnit: number): boolean {
  const i = idxOf(lessonId);
  if (i < 0) return false;
  const s = startIdx(startUnit);
  if (i < s) return true;
  for (let k = s; k < i; k++) if (!done.has(LESSON_ORDER[k])) return false;
  return true;
}

/** Próxima lição a fazer (a primeira ainda não feita a partir da unidade inicial), ou null se acabou. */
export function nextLesson(done: Set<string>, startUnit: number): string | null {
  for (let k = startIdx(startUnit); k < LESSON_ORDER.length; k++) if (!done.has(LESSON_ORDER[k])) return LESSON_ORDER[k];
  return null;
}

const unitLessons = (unit: number) => UNITS.find((u) => u.n === unit)?.lessons.map((l) => l.id) ?? [];

export function roleplayUnlocked(unit: number, done: Set<string>, startUnit: number): boolean {
  if (unit < startUnit) return true;
  const l = unitLessons(unit);
  return l.length >= 2 && done.has(l[0]) && done.has(l[1]);
}

export function legendaryUnlocked(unit: number, done: Set<string>, startUnit: number): boolean {
  if (unit < startUnit) return true;
  const l = unitLessons(unit);
  return l.length > 0 && l.every((id) => done.has(id));
}

export const legendaryId = (unit: number) => `u${unit}-lendario`;
export const parseLegendary = (key: string): number | null => {
  const m = key.match(/^u(\d+)-lendario$/);
  return m ? Number(m[1]) : null;
};
