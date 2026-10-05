import { ARENA_CARDS } from "@/lib/arena/cards";

/** Jogo da Memória com as cartas da Arena dos Heróis (client-safe, o servidor usa o mesmo tabuleiro). */

export const DUEL_PAIRS = 8;
export const SOLO_SIZES = [
  { pairs: 6, label: "Fácil", hint: "6 pares" },
  { pairs: 8, label: "Médio", hint: "8 pares" },
  { pairs: 12, label: "Difícil", hint: "12 pares" },
] as const;

function rng(s: number): () => number {
  let a = s | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Tabuleiro: lista de chaves de carta (cada uma aparece duas vezes), embaralhada pela semente. */
export function buildBoard(seed: number, pairs: number): string[] {
  const rnd = rng(seed);
  const keys = shuffle(
    ARENA_CARDS.map((c) => c.key),
    rnd,
  ).slice(0, pairs);
  return shuffle([...keys, ...keys], rnd);
}

export const MAX_TURNS = 200;

/**
 * Confere a lista de jogadas (pares de posições viradas, na ordem): cada jogada vira 2 cartas
 * diferentes ainda no jogo; o jogo só termina quando todos os pares foram achados.
 * Devolve o número de jogadas ou null se for inválida/incompleta.
 */
export function verifyTurns(board: string[], turns: unknown): number | null {
  if (!Array.isArray(turns) || turns.length === 0 || turns.length > MAX_TURNS) return null;
  const gone = new Set<number>();
  for (const t of turns) {
    if (!Array.isArray(t) || t.length !== 2) return null;
    const [a, b] = t as [unknown, unknown];
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return null;
    const x = a as number;
    const y = b as number;
    if (x < 0 || y < 0 || x >= board.length || y >= board.length || gone.has(x) || gone.has(y)) return null;
    if (board[x] === board[y]) {
      gone.add(x);
      gone.add(y);
    }
  }
  return gone.size === board.length ? turns.length : null;
}

/** Menor tempo humanamente possível (ms) pra um tabuleiro de N pares: barra tempos forjados. */
export const minPlausibleMs = (pairs: number) => pairs * 900;

export const fmtMs = (ms: number) => {
  const s = ms / 1000;
  return s >= 60 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : `${s.toFixed(1)}s`;
};
