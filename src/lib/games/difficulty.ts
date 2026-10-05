// Regras de dificuldade dos jogos (client-safe: só números e textos).
// "legacy" = partidas começadas antes da dificuldade existir: seguem as regras
// do Médio e o sorteio antigo, pra ninguém ter a partida do dia trocada.

export type Difficulty = "facil" | "medio" | "dificil";
export type StoredDifficulty = Difficulty | "legacy";
export type GameKey = "quiz" | "verse" | "who" | "order";

export const DIFFICULTIES: Difficulty[] = ["facil", "medio", "dificil"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };
export const DIFFICULTY_EMOJI: Record<Difficulty, string> = { facil: "🌱", medio: "🔥", dificil: "🧗" };

export function isDifficulty(v: unknown): v is Difficulty {
  return v === "facil" || v === "medio" || v === "dificil";
}

/** Regras efetivas: partida "legacy" joga como Médio. */
export function rules(d: StoredDifficulty): Difficulty {
  return d === "legacy" ? "medio" : d;
}

export function difficultyChip(d: StoredDifficulty | null | undefined): string | null {
  if (!d || d === "legacy") return null;
  return `${DIFFICULTY_EMOJI[d]} ${DIFFICULTY_LABEL[d]}`;
}

export const DIFFICULTY_INFO: Record<GameKey, Record<Difficulty, string>> = {
  quiz: {
    facil: "3 alternativas, perguntas bem conhecidas · até +1 XP",
    medio: "4 alternativas · até +2 XP",
    dificil: "Perguntas mais desafiadoras · até +3 XP",
  },
  verse: {
    facil: "3 alternativas, versículos famosos · até +1 XP",
    medio: "4 alternativas · até +2 XP",
    dificil: "Versículos menos conhecidos · até +3 XP",
  },
  who: {
    facil: "Já começa com 2 dicas · +1 XP",
    medio: "Dica nova a cada erro · até +2 XP",
    dificil: "Personagens menos óbvios e só 3 palpites · até +3 XP",
  },
  order: {
    facil: "3 tentativas, fatos bem conhecidos · +1 XP",
    medio: "2 tentativas · +1 XP",
    dificil: "Só 1 tentativa, fatos próximos no tempo · +2 XP",
  },
};

/** Alternativas por pergunta (quiz e versículo). */
export const OPTION_COUNT: Record<Difficulty, number> = { facil: 3, medio: 4, dificil: 4 };

export const WHO_RULES: Record<Difficulty, { startHints: number; maxGuesses: number }> = {
  facil: { startHints: 2, maxGuesses: 4 },
  medio: { startHints: 1, maxGuesses: 4 },
  dificil: { startHints: 1, maxGuesses: 3 },
};

export const ORDER_ATTEMPTS: Record<Difficulty, number> = { facil: 3, medio: 2, dificil: 1 };

export function xpForQuiz(score: number, d: StoredDifficulty): number {
  switch (rules(d)) {
    case "facil":
      return score >= 4 ? 1 : 0;
    case "medio":
      return score >= 5 ? 2 : score >= 3 ? 1 : 0;
    case "dificil":
      return score >= 5 ? 3 : score >= 4 ? 2 : score >= 3 ? 1 : 0;
  }
}

export function xpForVerse(score: number, d: StoredDifficulty): number {
  switch (rules(d)) {
    case "facil":
      return score >= 3 ? 1 : 0;
    case "medio":
      return score >= 3 ? 2 : score >= 2 ? 1 : 0;
    case "dificil":
      return score >= 3 ? 3 : score >= 2 ? 1 : 0;
  }
}

/** `attempt` = em qual palpite acertou (1 = de primeira). */
export function xpForWho(attempt: number, d: StoredDifficulty): number {
  switch (rules(d)) {
    case "facil":
      return 1;
    case "medio":
      return attempt <= 2 ? 2 : 1;
    case "dificil":
      return attempt === 1 ? 3 : attempt === 2 ? 2 : 1;
  }
}

export function xpForOrder(d: StoredDifficulty): number {
  return rules(d) === "dificil" ? 2 : 1;
}
