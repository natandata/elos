import { applyOutcome, passOutcome, resolveAuto, shotOutcome, type Aim, type Chance, type Match, type Outcome } from "@/lib/arenasoccer/sim";

export type PassLine = { length: number; blockers: number; aerial: boolean; /** curva do traço, de 0 a 1 */ curve?: number };
export type ShotOpts = { distance: number; header?: boolean; wall?: boolean; curve?: number; /** onde o goleiro está, de -1 a 1 */ keeperX?: number; /** marcadores em cima da trajetória do chute */ blockers?: number };

/**
 * Quem decide o resultado de um lance. No jogo local é o próprio aparelho; no online, quem joga o lance pede ao anfitrião
 * (que tem o sorteio) e espera a resposta. Por isso as respostas são `Promise`.
 */
export type MomentEngine = {
  pass: (chance: Chance, line: PassLine) => Promise<Outcome>;
  shot: (chance: Chance, aim: Aim, opts: ShotOpts) => Promise<Outcome>;
  /** o lance terminou com este resultado (placar e narração) */
  finish: (chance: Chance, outcome: Outcome) => void;
  /** o jogador desistiu de jogar o lance: o time resolve */
  auto: (chance: Chance) => void;
};

export function localEngine(match: Match): MomentEngine {
  return {
    pass: async (c, line) => passOutcome(match, c, line),
    shot: async (c, aim, opts) => shotOutcome(match, c, aim, opts),
    finish: (c, o) => applyOutcome(match, c, o),
    auto: (c) => void resolveAuto(match, c),
  };
}
