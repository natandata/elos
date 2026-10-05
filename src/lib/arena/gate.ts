// Trava da Arena: a cada 3 batalhas, o jogador precisa terminar pelo menos 3
// dos outros jogos (Quiz do Dia, Complete o Versículo, Quem Sou Eu?, Ordene os
// Fatos) pra continuar jogando — e só conta quando ele GANHA o jogo. Depois de destravar, a contagem recomeça.
// Vale só pra batalha contra o computador: desafiar um colega (1x1, duplas e
// torneios) fica de fora, sem trava e sem limite. Só conta o que aconteceu
// depois de GATE_START (quem já jogava não fica preso no passado).

export const GATE_BATTLES = 3;
/** Líderes jogam mais batalhas antes da pausa. */
export const GATE_BATTLES_LEADER = 15;
export const gateBattlesFor = (role: string | null | undefined): number => (role === "leader" ? GATE_BATTLES_LEADER : GATE_BATTLES);
export const GATE_GAMES = 3;
/** A regra vale a partir daqui. */
export const GATE_START = "2026-10-05T12:30:00.000Z";

export const GATE_GAME_KEYS = ["quiz", "verse", "who", "order"] as const;
export type GateGame = (typeof GATE_GAME_KEYS)[number];

export const GATE_GAME_INFO: Record<GateGame, { name: string; href: string; icon: string }> = {
  quiz: { name: "Quiz do Dia", href: "/app/jogos/quiz", icon: "❓" },
  verse: { name: "Complete o Versículo", href: "/app/jogos/versiculo", icon: "📖" },
  who: { name: "Quem Sou Eu?", href: "/app/jogos/quem-sou-eu", icon: "🕵️" },
  order: { name: "Ordene os Fatos", href: "/app/jogos/ordem", icon: "🔢" },
};

/**
 * Só VITÓRIA conta como jogo feito pra destravar a Arena (perder de propósito não adianta):
 * Quiz: 3 de 5 certas · Versículo: 2 de 3 · Quem Sou Eu: acertou o personagem · Ordene os Fatos: acertou a ordem.
 * O treino (jogar de novo no dia) só conta se for no nível Difícil.
 */
export function gameCounts(game: GateGame, score: number, practice: boolean, difficulty: string | null): boolean {
  if (practice && difficulty !== "dificil") return false;
  switch (game) {
    case "quiz":
      return score >= 3;
    case "verse":
      return score >= 2;
    case "who":
    case "order":
      return score > 0;
  }
}

export type GateEvent = { t: number; kind: "battle" | "game" };

export type GateState = {
  locked: boolean;
  /** batalhas feitas neste bloco (0 até `limit`) */
  battles: number;
  /** quantas batalhas cabem antes da pausa (3 pra crias, 15 pra líderes) */
  limit: number;
  /** jogos feitos depois que travou (0 a 3) */
  games: number;
};

/**
 * Percorre o que o jogador fez em ordem e diz em que ponto está.
 * Batalha só conta enquanto destravado; jogo só conta depois de travar.
 */
export function computeGate(events: GateEvent[], limit: number = GATE_BATTLES): GateState {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  let locked = false;
  let battles = 0;
  let games = 0;
  for (const e of sorted) {
    if (e.kind === "battle") {
      if (locked) continue; // partida combinada antes de travar, terminando agora: não soma
      battles++;
      if (battles >= limit) {
        locked = true;
        games = 0;
      }
    } else if (locked) {
      games++;
      if (games >= GATE_GAMES) {
        locked = false;
        battles = 0;
        games = 0;
      }
    }
  }
  return { locked, battles, games, limit };
}

/** Informação pronta pra tela. */
export type GateInfo = GateState & {
  /** quantos jogos ainda faltam pra destravar */
  remaining: number;
  /** jogos com partida valendo XP já feita hoje (jogar de novo vale como treino, sem XP) */
  doneToday: GateGame[];
};

export function describeGate(state: GateState, doneToday: GateGame[]): GateInfo {
  const remaining = state.locked ? GATE_GAMES - state.games : 0;
  return { ...state, remaining, doneToday };
}

export const GATE_LOCKED_MESSAGE = `Você jogou ${GATE_BATTLES} batalhas contra o computador! Vença pelo menos ${GATE_GAMES} outros jogos (Quiz, Versículo, Quem Sou Eu ou Ordene os Fatos) pra continuar na Arena.`;

/** Texto do bloqueio, já considerando quantos jogos faltam. */
export function gateMessage(g: GateInfo): string {
  const falta = g.remaining === 1 ? "mais 1 jogo" : `mais ${g.remaining} jogos`;
  return `Você jogou ${g.limit} batalhas contra o computador! Vença ${falta} (Quiz, Versículo, Quem Sou Eu ou Ordene os Fatos) pra continuar na Arena. Só conta quando você ganha o jogo. Jogar de novo um jogo que já fez hoje vale como treino (sem XP), mas só no nível Difícil.`;
}
