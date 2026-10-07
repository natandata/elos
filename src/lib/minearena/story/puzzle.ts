// Lógica pura dos desafios (sem tela): normaliza respostas e confere cada tipo de desafio.
import type { PuzzleDef } from "./types";

/** Minúsculas, sem acentos nem pontuação, espaços únicos. */
export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function checkAnswer(def: Extract<PuzzleDef, { kind: "answer" }>, input: string): boolean {
  const n = norm(input);
  if (!n) return false;
  return def.accept.some((a) => {
    const k = norm(a);
    return n === k || (k.length >= 4 && (n.includes(k) || k.includes(n) && n.length >= 4));
  });
}

/** `chosen` = índices (na ordem original) dos itens, na ordem em que o jogador os tocou. */
export const checkOrder = (def: Extract<PuzzleDef, { kind: "order" }>, chosen: number[]): boolean => chosen.length === def.items.length && chosen.every((v, i) => v === i);

export const checkLock = (def: Extract<PuzzleDef, { kind: "lock" }>, digits: string): boolean => digits === def.answer;

export const checkSimon = (def: Extract<PuzzleDef, { kind: "simon" }>, played: number[]): boolean => played.length === def.seq.length && played.every((v, i) => v === def.seq[i]);

export const quizScore = (def: Extract<PuzzleDef, { kind: "quiz" }>, picks: (number | null)[]): number => def.questions.reduce((n, q, i) => n + (picks[i] === q.correct ? 1 : 0), 0);

/** Embaralha sem deixar a ordem original (para listas com 2 ou mais itens). */
export function shuffled<T>(list: T[], rnd: () => number = Math.random): T[] {
  if (list.length < 2) return [...list];
  for (let tries = 0; tries < 10; tries++) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.some((v, i) => v !== list[i])) return a;
  }
  return [...list].reverse();
}
