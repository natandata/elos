// Partida 1x1 entre dois jogadores. O motor é o mesmo da partida contra o
// computador; aqui ficam a ordem das jogadas, a simulação completa (usada pelo
// servidor pra confirmar o resultado) e a conferência dos relatórios dos dois.

import { createGame, createGameDuo, step } from "./engine";
import { isValidDeck } from "./cards";
import { MATCH_TICKS, teamOf, type Input, type Side } from "./core";
import type { ArenaResult } from "./sim";
import { stateHash } from "./engine";

export const PVP_MAX_INPUTS = 600;
/** Atraso fixo das jogadas (ticks): dá tempo da jogada chegar no outro aparelho. */
export const PVP_INPUT_DELAY = 8;
/** De quantos em quantos ticks cada lado avisa até onde já mandou tudo. */
export const PVP_HEARTBEAT = 4;
/** Duplas: 4 aparelhos conversando, então menos mensagens e um pouco mais de folga. */
export const DUO_INPUT_DELAY = 10;
export const DUO_HEARTBEAT = 6;
/** Partida mais curta que isso (em ticks) não vale prêmio. */
export const PVP_MIN_TICKS_FOR_REWARD = 75 * 20;
/** Troféus que o vencedor de um 1x1 rouba do perdedor. */
export const PVP_TROPHY_STEAL = 30;

/** Ordem única das jogadas dentro de um tick (igual nos dois aparelhos e no servidor). */
export function orderInputs(list: Input[]): Input[] {
  return [...list].sort((a, b) => a.tick - b.tick || (a.player ?? a.side) - (b.player ?? b.side) || a.slot - b.slot || a.x - b.x || a.y - b.y);
}

/** Só jogadas bem formadas, do lado `side`, em ordem. */
export function cleanSideInputs(raw: unknown, side: Side): Input[] {
  if (!Array.isArray(raw)) return [];
  const out: Input[] = [];
  for (const r of raw.slice(0, PVP_MAX_INPUTS)) {
    const o = r as Partial<Input>;
    if (!o || !Number.isInteger(o.tick) || !Number.isInteger(o.slot)) continue;
    if (typeof o.x !== "number" || typeof o.y !== "number") continue;
    if (!Number.isFinite(o.x) || !Number.isFinite(o.y)) continue;
    if ((o.tick as number) < 0 || (o.tick as number) > MATCH_TICKS) continue;
    out.push({ tick: o.tick as number, side, slot: o.slot as number, x: o.x, y: o.y });
  }
  return orderInputs(out);
}

export function simulatePvp(seed: number, decks: [string[], string[]], inputs: Input[], arena = 0): ArenaResult {
  const state = createGame(seed, decks[0], decks[1], { arena, pvp: true });
  const all = orderInputs(inputs);
  let cursor = 0;
  while (!state.over && state.tick < MATCH_TICKS + 1) {
    const batch: Input[] = [];
    while (cursor < all.length && all[cursor].tick <= state.tick) {
      if (all[cursor].tick === state.tick) batch.push(all[cursor]);
      cursor++;
    }
    step(state, batch, []);
  }
  return { winner: state.winner, crowns: [state.crowns[0], state.crowns[1]], ticks: state.tick, hash: stateHash(state) };
}

/** Só jogadas bem formadas do jogador `player` (de `players`), em ordem. */
export function cleanPlayerInputs(raw: unknown, player: number, players: number): Input[] {
  const side = teamOf(players, player);
  return cleanSideInputs(raw, side).map((i) => (players > 2 ? { ...i, player } : i));
}

/** Refaz uma partida em duplas inteira (4 jogadores). */
export function simulateDuo(seed: number, decks: string[][], inputs: Input[]): ArenaResult {
  const state = createGameDuo(seed, decks);
  const all = orderInputs(inputs);
  let cursor = 0;
  while (!state.over && state.tick < MATCH_TICKS + 1) {
    const batch: Input[] = [];
    while (cursor < all.length && all[cursor].tick <= state.tick) {
      if (all[cursor].tick === state.tick) batch.push(all[cursor]);
      cursor++;
    }
    step(state, batch, []);
  }
  return { winner: state.winner, crowns: [state.crowns[0], state.crowns[1]], ticks: state.tick, hash: stateHash(state) };
}

export type PvpReport = {
  /** minhas jogadas (as que eu mandei) */
  mine: unknown;
  /** as jogadas do colega, como eu recebi durante a partida */
  theirs: unknown;
  /** desisti */
  resigned?: boolean;
  /** o colega sumiu e eu terminei sozinho (tick em que isso aconteceu) */
  left?: number;
  /** tick em que desisti (pra saber se a partida durou o bastante) */
  tick?: number;
};

export type PvpOutcome =
  | { kind: "finished"; winner: Side | null; crowns: [number, number]; ticks: number; why: "played" | "resigned" | "left" }
  | { kind: "disputed" }
  | { kind: "waiting" };

const canon = (list: Input[]) => JSON.stringify(list.map((i) => [i.tick, i.slot, i.x, i.y]));

/**
 * Confere os relatórios dos dois jogadores (desafiante = lado 0, convidado = lado 1)
 * e decide o resultado. Só vale quando o que cada um mandou bate com o que o
 * outro recebeu; senão a partida fica "contestada" e ninguém ganha nem perde.
 */
export function resolvePvp(
  seed: number,
  decks: [string[], string[]],
  reports: { challenger?: PvpReport; opponent?: PvpReport },
  arena = 0,
  /** o colega não mandou relatório e já passou do prazo */
  stale = false,
): PvpOutcome {
  if (!isValidDeck(decks[0]) || !isValidDeck(decks[1])) return { kind: "disputed" };
  const c = reports.challenger;
  const o = reports.opponent;

  // desistência: quem desistiu perde
  if (c?.resigned || o?.resigned) {
    const loser: Side = c?.resigned ? 0 : 1;
    const t = Number((loser === 0 ? c : o)?.tick);
    const ticks = Number.isFinite(t) ? Math.min(MATCH_TICKS, Math.max(0, Math.floor(t))) : 0;
    return { kind: "finished", winner: (1 - loser) as Side, crowns: [0, 0], ticks, why: "resigned" };
  }

  if (c && o) {
    const cMine = cleanSideInputs(c.mine, 0);
    const oMine = cleanSideInputs(o.mine, 1);
    if (canon(cMine) !== canon(cleanSideInputs(o.theirs, 0)) || canon(oMine) !== canon(cleanSideInputs(c.theirs, 1))) {
      return { kind: "disputed" };
    }
    const r = simulatePvp(seed, decks, [...cMine, ...oMine], arena);
    return { kind: "finished", winner: r.winner, crowns: r.crowns, ticks: r.ticks, why: "played" };
  }

  // só um mandou: espera o outro; passado o prazo, vale o que o presente viu
  const only = c ?? o;
  if (!only || !stale) return { kind: "waiting" };
  const mySide: Side = c ? 0 : 1;
  const mine = cleanSideInputs(only.mine, mySide);
  const theirs = cleanSideInputs(only.theirs, (1 - mySide) as Side);
  const r = simulatePvp(seed, decks, [...mine, ...theirs], arena);
  if (typeof only.left === "number") {
    // o colega sumiu no meio: quem ficou vence
    return { kind: "finished", winner: mySide, crowns: r.crowns, ticks: only.left, why: "left" };
  }
  return { kind: "finished", winner: r.winner, crowns: r.crowns, ticks: r.ticks, why: "played" };
}

// ------------------------------------------------------------------ duplas

export type DuoReport = {
  /** minhas jogadas */
  mine: unknown;
  /** jogadas dos outros três como eu recebi, por número de jogador */
  seen?: Record<string, unknown>;
  /** saí da partida no meio */
  resigned?: boolean;
  tick?: number;
};

export type DuoOutcome =
  | { kind: "finished"; winner: Side | null; crowns: [number, number]; ticks: number; resigned: boolean[] }
  | { kind: "disputed" }
  | { kind: "waiting" };

/**
 * Confere os relatórios dos 4 jogadores (0–1 = lado 0, 2–3 = lado 1) e decide
 * o resultado. Tudo que um jogador mandou tem que bater com o que os outros
 * receberam dele; senão a partida fica "contestada". Quem saiu no meio não
 * encerra a partida: as jogadas dele só param, e o resultado vem da simulação.
 */
export function resolveDuo(
  seed: number,
  decks: string[][],
  reports: Record<string, DuoReport | undefined>,
  /** passou o prazo de espera pelos relatórios que faltam */
  stale = false,
): DuoOutcome {
  if (decks.length !== 4 || !decks.every((d) => isValidDeck(d))) return { kind: "disputed" };
  const present = [0, 1, 2, 3].filter((i) => reports[String(i)]);
  if (present.length === 0) return { kind: "waiting" };
  if (present.length < 4 && !stale) return { kind: "waiting" };

  const final: Input[][] = [[], [], [], []];
  for (let p = 0; p < 4; p++) {
    const candidates: Input[][] = [];
    const own = reports[String(p)];
    if (own) candidates.push(cleanPlayerInputs(own.mine, p, 4));
    for (const q of present) {
      if (q === p) continue;
      const seen = reports[String(q)]?.seen?.[String(p)];
      if (seen !== undefined) candidates.push(cleanPlayerInputs(seen, p, 4));
    }
    if (candidates.length === 0) return { kind: "disputed" };
    const first = canon(candidates[0]);
    if (!candidates.every((c) => canon(c) === first)) return { kind: "disputed" };
    final[p] = candidates[0];
  }
  const r = simulateDuo(seed, decks, final.flat());
  const resigned = [0, 1, 2, 3].map((i) => !!reports[String(i)]?.resigned);
  return { kind: "finished", winner: r.winner, crowns: r.crowns, ticks: r.ticks, resigned };
}
