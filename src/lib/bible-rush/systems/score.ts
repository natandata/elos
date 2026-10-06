import type { Rating } from "../core/types";

export const RATING_LABEL: Record<Rating, string> = { perfect: "PERFEITO", excellent: "EXCELENTE", good: "BOM", late: "ATRASADO", failed: "FALHOU" };

/** Avaliação pelo que sobrou de paciência na hora da entrega. */
export function rate(patience: number): Rating {
  if (patience >= 0.7) return "perfect";
  if (patience >= 0.5) return "excellent";
  if (patience >= 0.3) return "good";
  return "late";
}

export const BONUS: Record<Rating, number> = { perfect: 5, excellent: 3, good: 1, late: 0, failed: 0 };
/** Quanto cada avaliação vale na satisfação geral (0–100). */
export const SATISFACTION: Record<Rating, number> = { perfect: 100, excellent: 88, good: 68, late: 42, failed: 0 };

export type StarInput = { won: boolean; score: number; target: number; satisfaction: number; waste: number; abandoned: number };

/** 1 estrela: concluir. 2: bom desempenho. 3: excelente (pontos, satisfação, pouco desperdício, ninguém perdido). */
export function starsFor(i: StarInput): number {
  if (!i.won) return 0;
  let s = 1;
  if (i.score >= i.target * 1.25 && i.satisfaction >= 60) s = 2;
  if (s === 2 && i.score >= i.target * 1.5 && i.satisfaction >= 80 && i.waste <= 2 && i.abandoned <= 1) s = 3;
  return s;
}
