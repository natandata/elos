import { createGame, step, stateHash, type GameOpts } from "./engine";
import { MATCH_TICKS, type GameState, type Input, type Side } from "./core";

export const MAX_INPUTS = 600;

export type ArenaResult = {
  winner: Side | null;
  crowns: [number, number];
  ticks: number;
  hash: number;
};

/**
 * Refaz uma partida inteira a partir da semente, do baralho e das jogadas do
 * jogador (lado 0). O computador (lado 1) decide sozinho, de forma
 * determinística. É isso que o servidor usa pra confirmar o resultado.
 */
export function simulate(seed: number, deck: string[], inputs: Input[], opts: GameOpts = {}): ArenaResult {
  const state: GameState = createGame(seed, deck, undefined, opts);
  // só as jogadas do jogador, em ordem de tick
  const mine = inputs
    .filter((i) => i.side === 0)
    .sort((a, b) => a.tick - b.tick)
    .slice(0, MAX_INPUTS);
  let cursor = 0;
  while (!state.over && state.tick < MATCH_TICKS + 1) {
    const batch: Input[] = [];
    while (cursor < mine.length && mine[cursor].tick <= state.tick) {
      if (mine[cursor].tick === state.tick) batch.push(mine[cursor]);
      cursor++;
    }
    step(state, batch, [1]);
  }
  return { winner: state.winner, crowns: [state.crowns[0], state.crowns[1]], ticks: state.tick, hash: stateHash(state) };
}
