// Progresso da campanha (capítulos concluídos, biblioteca, conquistas), guardado neste aparelho.
import type { StoryProgress } from "./types";

const KEY = "minearena:story:v1";

/** O modo "Novo Mundo" (sobrevivência e criativo) só abre depois de concluir este capítulo (o 15: O Bezerro de Ouro). */
export const NEW_WORLD_CHAPTER = "bezerro";

export const freshProgress = (): StoryProgress => ({ completed: [], books: [], achievements: [], current: null, seenLearn: [], otDone: false, puzzles: [], relics: [] });

export function loadProgress(): StoryProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshProgress();
    const d = JSON.parse(raw) as Partial<StoryProgress>;
    const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    return { completed: strs(d.completed), books: strs(d.books), achievements: strs(d.achievements), current: typeof d.current === "string" ? d.current : null, seenLearn: strs(d.seenLearn), otDone: d.otDone === true, puzzles: strs(d.puzzles), relics: strs(d.relics) };
  } catch {
    return freshProgress();
  }
}

export function saveProgress(p: StoryProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada a limpar
  }
}
