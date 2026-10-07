// Torneios da Arena: configuração de prêmios e chaveamento eliminatório (client-safe, sem banco).

import { ARENA_CARD_BY_KEY } from "./cards";

export type TFormat = "solo" | "duo";
export type TStatus = "open" | "running" | "finished" | "cancelled";

/** O que um lugar do pódio ganha. `card`: chave da carta, "random" (sorteada) ou null (sem carta). */
export type TPrize = { xp: number; trophies: number; card: string | null; copies: number };
export type TPrizes = { places: 1 | 2 | 3; p1: TPrize; p2: TPrize; p3: TPrize };

export const MAX_PRIZE = { xp: 500, trophies: 1000, copies: 5000 } as const;
export const EMPTY_PRIZE: TPrize = { xp: 0, trophies: 0, card: null, copies: 0 };

const num = (v: unknown, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
};

function prize(raw: unknown): TPrize {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const copies = num(r.copies, MAX_PRIZE.copies);
  const card = typeof r.card === "string" && r.card ? r.card : null;
  return { xp: num(r.xp, MAX_PRIZE.xp), trophies: num(r.trophies, MAX_PRIZE.trophies), card: copies > 0 ? card : null, copies: card ? copies : 0 };
}

/** Limpa o que veio do formulário/banco: números dentro dos limites, lugares 1 a 3. */
export function normalizePrizes(raw: unknown): TPrizes {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const places = r.places === 2 ? 2 : r.places === 3 ? 3 : 1;
  return { places, p1: prize(r.p1), p2: places >= 2 ? prize(r.p2) : { ...EMPTY_PRIZE }, p3: places >= 3 ? prize(r.p3) : { ...EMPTY_PRIZE } };
}

export const prizeIsEmpty = (p: TPrize) => p.xp === 0 && p.trophies === 0 && p.copies === 0;

// ------------------------------------------------------------ regras das partidas

/** Diferença máxima de posição no ranking pra valer o nível real das cartas (1º x 4º ainda vale; 1º x 5º, não). */
export const NEAR_RANK = 3;
/** A final de todo torneio é sempre nesta arena (Nova Jerusalém). */
export const FINAL_ARENA_KEY = "nova";

/**
 * Posições no ranking (null = fora do ranking) dos dois lados: se estão perto, cada um
 * joga com o nível real do seu baralho; se não, as cartas ficam no nível 1.
 */
export const realLevelsApply = (posA: number | null, posB: number | null): boolean => posA !== null && posB !== null && Math.abs(posA - posB) <= NEAR_RANK;

export type StandingStatus = "champion" | "alive" | "out";
export type Standing = { entryId: string; status: StandingStatus; round: number };

/** Tabela de classificação: até que fase cada inscrito chegou e se ainda está na disputa. */
export function standings(matches: TMatch[], entryIds: string[]): Standing[] {
  const mains = matches.filter((m) => m.bracket === "main");
  const R = mains.length ? Math.max(...mains.map((m) => m.round)) : 0;
  const out: Standing[] = entryIds.map((entryId) => {
    const mine = mains.filter((m) => m.entryA === entryId || m.entryB === entryId);
    const round = mine.length ? Math.max(...mine.map((m) => m.round)) : 0;
    const lost = mine.some((m) => m.winner && m.winner !== entryId);
    const champion = mine.some((m) => m.round === R && m.winner === entryId);
    return { entryId, round, status: champion ? "champion" : lost ? "out" : "alive" };
  });
  const rank = { champion: 0, alive: 1, out: 2 } as const;
  return out.sort((a, b) => rank[a.status] - rank[b.status] || b.round - a.round);
}

// ------------------------------------------------------------ chaveamento

export type TMatchStatus = "pending" | "ready" | "playing" | "done";

export type TMatch = {
  id: string;
  bracket: "main" | "bronze";
  round: number;
  slot: number;
  entryA: string | null;
  entryB: string | null;
  winner: string | null;
  status: TMatchStatus;
  roomId: string | null;
};

const rounds = (n: number) => Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));

/** Quantas rodadas tem o torneio com `n` inscritos. */
export const roundCount = (n: number) => rounds(n);

/**
 * Monta o chaveamento. `entryIds` já vem embaralhado. Quem sobra (inscritos que
 * não completam uma potência de 2) avança direto na 1ª rodada ("folga").
 */
export function buildBracket(entryIds: string[], places: 1 | 2 | 3, newId: () => string): TMatch[] {
  const n = entryIds.length;
  if (n < 2) return [];
  const R = rounds(n);
  const size = 2 ** R;
  const byes = size - n;
  const out: TMatch[] = [];
  const mk = (bracket: "main" | "bronze", round: number, slot: number): TMatch => {
    const m: TMatch = { id: newId(), bracket, round, slot, entryA: null, entryB: null, winner: null, status: "pending", roomId: null };
    out.push(m);
    return m;
  };
  for (let r = 1; r <= R; r++) for (let s = 0; s < size / 2 ** r; s++) mk("main", r, s);
  const needBronze = places >= 3 && R >= 2 && !(R === 2 && byes > 0);
  if (needBronze) mk("bronze", R, 0);

  const first = out.filter((m) => m.bracket === "main" && m.round === 1);
  let k = 0;
  first.forEach((m, i) => {
    m.entryA = entryIds[k++];
    if (i >= byes) m.entryB = entryIds[k++];
  });
  for (const m of first) {
    if (m.entryB === null) advanceInPlace(out, m, m.entryA!, R);
    else m.status = "ready";
  }
  return out;
}

function find(list: TMatch[], bracket: "main" | "bronze", round: number, slot: number) {
  return list.find((m) => m.bracket === bracket && m.round === round && m.slot === slot);
}

function advanceInPlace(list: TMatch[], m: TMatch, winner: string, R: number) {
  m.winner = winner;
  m.status = "done";
  const loser = m.entryA === winner ? m.entryB : m.entryA;
  if (m.bracket !== "main") return;
  const put = (target: TMatch | undefined, slot: number, entry: string | null) => {
    if (!target || !entry) return;
    if (slot % 2 === 0) target.entryA = entry;
    else target.entryB = entry;
    if (target.entryA && target.entryB && target.status === "pending") target.status = "ready";
  };
  if (m.round < R) put(find(list, "main", m.round + 1, Math.floor(m.slot / 2)), m.slot, winner);
  if (m.round === R - 1 && R >= 2) put(find(list, "bronze", R, 0), m.slot, loser);
}

/** Registra o vencedor de uma partida e leva cada lado pra próxima fase. Devolve uma cópia. */
export function advance(matches: TMatch[], matchId: string, winner: string): { matches: TMatch[]; error?: string } {
  const list = matches.map((m) => ({ ...m }));
  const m = list.find((x) => x.id === matchId);
  if (!m) return { matches, error: "Partida não encontrada." };
  if (m.status === "done") return { matches, error: "Essa partida já tem vencedor." };
  if (m.entryA !== winner && m.entryB !== winner) return { matches, error: "Esse vencedor não está nessa partida." };
  if (!m.entryA || !m.entryB) return { matches, error: "A partida ainda não tem os dois lados." };
  const R = Math.max(...list.filter((x) => x.bracket === "main").map((x) => x.round));
  advanceInPlace(list, m, winner, R);
  return { matches: list };
}

export function isFinished(matches: TMatch[]): boolean {
  const mains = matches.filter((m) => m.bracket === "main");
  if (mains.length === 0) return false;
  const R = Math.max(...mains.map((m) => m.round));
  const final = find(matches, "main", R, 0);
  const bronze = find(matches, "bronze", R, 0);
  return !!final && final.status === "done" && (!bronze || bronze.status === "done");
}

/** 1º, 2º e 3º lugar (entradas). 3º = vencedor da disputa, ou o perdedor da semifinal real quando não há disputa. */
export function placings(matches: TMatch[]): (string | null)[] {
  const mains = matches.filter((m) => m.bracket === "main");
  if (mains.length === 0) return [null, null, null];
  const R = Math.max(...mains.map((m) => m.round));
  const final = find(matches, "main", R, 0);
  const first = final?.winner ?? null;
  const second = final && first ? (final.entryA === first ? final.entryB : final.entryA) : null;
  let third: string | null = null;
  const bronze = find(matches, "bronze", R, 0);
  if (bronze) third = bronze.winner;
  else if (R >= 2) {
    const real = mains.filter((m) => m.round === R - 1 && m.entryA && m.entryB && m.winner);
    if (real.length === 1) third = real[0].entryA === real[0].winner ? real[0].entryB : real[0].entryA;
  }
  return [first, second, third];
}

export function roundLabel(bracket: "main" | "bronze", round: number, R: number): string {
  if (bracket === "bronze") return "Disputa do 3º lugar";
  const left = R - round;
  if (left === 0) return "Final";
  if (left === 1) return "Semifinal";
  if (left === 2) return "Quartas de final";
  if (left === 3) return "Oitavas de final";
  return `Rodada ${round}`;
}

/** Texto curto do prêmio de um lugar: "🏆 50 · ⭐ 20 XP · 🃏 40 Davi". */
export function prizeText(p: TPrize): string {
  const bits: string[] = [];
  if (p.trophies > 0) bits.push(`🏆 ${p.trophies}`);
  if (p.xp > 0) bits.push(`⭐ ${p.xp} XP`);
  if (p.copies > 0 && p.card) bits.push(`🃏 ${p.copies} ${p.card === "random" ? "cartas sorteadas" : (ARENA_CARD_BY_KEY.get(p.card)?.name ?? p.card)}`);
  return bits.length > 0 ? bits.join(" · ") : "Sem prêmio";
}
