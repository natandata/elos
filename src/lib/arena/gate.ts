// Trava da Arena: a cada 3 batalhas, o jogador precisa terminar pelo menos 3
// dos outros jogos (Quiz do Dia, Complete o Versículo, Quem Sou Eu?, Ordene os
// Fatos) pra continuar jogando. Depois de destravar, a contagem recomeça.
// Vale pra batalha contra o computador, 1x1 e duplas. Só conta o que
// aconteceu depois de GATE_START (quem já jogava não fica preso no passado).

export const GATE_BATTLES = 3;
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

export type GateEvent = { t: number; kind: "battle" | "game" };

export type GateState = {
  locked: boolean;
  /** batalhas feitas neste bloco (0 a 3) */
  battles: number;
  /** jogos feitos depois que travou (0 a 3) */
  games: number;
};

/**
 * Percorre o que o jogador fez em ordem e diz em que ponto está.
 * Batalha só conta enquanto destravado; jogo só conta depois de travar.
 */
export function computeGate(events: GateEvent[]): GateState {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  let locked = false;
  let battles = 0;
  let games = 0;
  for (const e of sorted) {
    if (e.kind === "battle") {
      if (locked) continue; // partida combinada antes de travar, terminando agora: não soma
      battles++;
      if (battles >= GATE_BATTLES) {
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
  return { locked, battles, games };
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

export const GATE_LOCKED_MESSAGE = `Você jogou ${GATE_BATTLES} batalhas! Jogue pelo menos ${GATE_GAMES} outros jogos (Quiz, Versículo, Quem Sou Eu ou Ordene os Fatos) pra continuar na Arena.`;

/** Texto do bloqueio, já considerando quantos jogos faltam. */
export function gateMessage(g: GateInfo): string {
  const falta = g.remaining === 1 ? "mais 1 jogo" : `mais ${g.remaining} jogos`;
  return `Você jogou ${GATE_BATTLES} batalhas! Jogue ${falta} (Quiz, Versículo, Quem Sou Eu ou Ordene os Fatos) pra continuar na Arena. Jogar de novo um jogo que já fez hoje vale, só não dá XP.`;
}
