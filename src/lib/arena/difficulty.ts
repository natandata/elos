/** Dificuldade geral da Arena contra o computador: multiplicador da vida e do dano do computador (1 = normal). */
export const ARENA_DIFFICULTY_DEFAULT = 1.25;
export const ARENA_DIFFICULTY_MIN = 0.5;
export const ARENA_DIFFICULTY_MAX = 2.5;

export const clampDifficulty = (v: number): number => (Number.isFinite(v) ? Math.min(ARENA_DIFFICULTY_MAX, Math.max(ARENA_DIFFICULTY_MIN, Math.round(v * 100) / 100)) : ARENA_DIFFICULTY_DEFAULT);

/** Bônus final do computador: o bônus do ranking multiplicado pela dificuldade geral. */
export const combineBotBoost = (rankBoost: number, difficulty: number): number => (1 + rankBoost) * clampDifficulty(difficulty) - 1;

export const DIFFICULTY_PRESETS: { label: string; value: number }[] = [
  { label: "Fácil", value: 0.75 },
  { label: "Normal", value: 1 },
  { label: "Difícil (padrão)", value: 1.25 },
  { label: "Muito difícil", value: 1.5 },
  { label: "Extremo", value: 2 },
];
