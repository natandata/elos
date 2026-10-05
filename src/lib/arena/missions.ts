// Missões da Arena dos Heróis (do jogo; não confundir com as missões do aplicativo,
// que os líderes criam). São diárias e pagam troféus, no máximo 5 por missão.

export type ArenaMissionDef = {
  key: string;
  icon: string;
  title: string;
  desc: string;
  /** quanto falta pra completar (ex.: 3 vitórias) */
  target: number;
  /** troféus de prêmio (1 a 5) */
  reward: number;
};

export const MAX_MISSION_REWARD = 5;

export const ARENA_MISSIONS: ArenaMissionDef[] = [
  { key: "win_streak", icon: "🔥", title: "Sequência de vitórias", desc: "Ganhe 3 partidas seguidas hoje (contra o computador ou colegas).", target: 3, reward: 5 },
  { key: "flawless", icon: "🛡️", title: "Vitória perfeita", desc: "Vença o computador sem perder nenhuma torre.", target: 1, reward: 4 },
  { key: "win_friend", icon: "🤝", title: "Vença um colega", desc: "Ganhe um desafio 1x1 ou em duplas contra um colega.", target: 1, reward: 3 },
  { key: "upgrade", icon: "⬆️", title: "Evolua um herói", desc: "Suba o nível de qualquer carta.", target: 1, reward: 3 },
  { key: "play5", icon: "⚔️", title: "Guerreiro do dia", desc: "Termine 5 partidas hoje.", target: 5, reward: 2 },
  { key: "chest", icon: "📦", title: "Baú do dia", desc: "Abra o Baú da Arena.", target: 1, reward: 1 },
];

export const MISSION_BY_KEY = new Map(ARENA_MISSIONS.map((m) => [m.key, m]));

/** Maior sequência de vitórias seguidas numa lista em ordem cronológica. */
export function longestWinStreak(results: ("win" | "loss" | "draw")[]): number {
  let best = 0;
  let cur = 0;
  for (const r of results) {
    cur = r === "win" ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}
