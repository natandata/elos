// ArenaSoccer: campeonatos (Copa do Mundo, Brasileirão e ligas da carreira). Tudo puro: simula as partidas dos outros times,
// monta tabelas e chaves, e guarda o estado numa estrutura simples que cabe no banco (JSON).
import type { Team } from "./teams";

export type Rng = () => number;
export function mulberry(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Goal = { team: 0 | 1; name: string; assist?: string; at: number };
export type Result = { hg: number; ag: number; pen?: [number, number]; goals?: Goal[] };

function poisson(l: number, rng: Rng): number {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L && k < 12);
  return k - 1;
}

const POS_W: Record<string, number> = { FW: 4, MF: 2, DF: 0.6, GK: 0.02 };
function pickScorer(t: Team, rng: Rng, not?: string): string {
  const top = [...t.players].sort((a, b) => b[3] - a[3]).slice(0, 16).filter((p) => p[2] !== not);
  const w = top.map((p) => (POS_W[p[1]] ?? 1) * Math.pow(Math.max(1, p[3]) / 70, 3));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < top.length; i++) {
    r -= w[i];
    if (r <= 0) return top[i][2];
  }
  return top[0][2];
}

/** Resultado simulado de uma partida entre dois times (a força manda; o acaso também). `neutral`: sem mando de campo. */
export function simulate(home: Team, away: Team, rng: Rng, opts: { neutral?: boolean; knockout?: boolean } = {}): Result {
  const diff = (home.str - away.str) / 26;
  const adv = opts.neutral ? 0 : 0.12;
  const lh = 1.3 * Math.exp(0.85 * diff + adv);
  const la = 1.3 * Math.exp(-0.85 * diff);
  const hg = Math.min(8, poisson(lh, rng));
  const ag = Math.min(8, poisson(la, rng));
  const goals: Goal[] = [];
  for (let i = 0; i < hg; i++) {
    const name = pickScorer(home, rng);
    goals.push({ team: 0, name, assist: rng() < 0.65 ? pickScorer(home, rng, name) : undefined, at: Math.floor(rng() * 90) + 1 });
  }
  for (let i = 0; i < ag; i++) {
    const name = pickScorer(away, rng);
    goals.push({ team: 1, name, assist: rng() < 0.65 ? pickScorer(away, rng, name) : undefined, at: Math.floor(rng() * 90) + 1 });
  }
  goals.sort((a, b) => a.at - b.at);
  const res: Result = { hg, ag, goals };
  if (opts.knockout && hg === ag) res.pen = penalties(home, away, rng);
  return res;
}

/** Disputa de pênaltis: cinco cobranças cada e, se precisar, uma de cada vez. */
export function penalties(a: Team, b: Team, rng: Rng): [number, number] {
  const pa = 0.75 + (a.str - b.str) / 300;
  const pb = 0.75 - (a.str - b.str) / 300;
  let x = 0;
  let y = 0;
  for (let i = 0; i < 5; i++) {
    if (rng() < pa) x++;
    if (rng() < pb) y++;
  }
  while (x === y) {
    if (rng() < pa) x++;
    if (rng() < pb) y++;
  }
  return [x, y];
}

export const winnerOf = (r: Result, a: string, b: string): string => (r.hg !== r.ag ? (r.hg > r.ag ? a : b) : r.pen ? (r.pen[0] > r.pen[1] ? a : b) : a);

// ------------------------------------------------------------ tabelas
export type Row = { id: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number };
export type Fixture = { h: string; a: string; hg: number; ag: number };

export function table(ids: string[], games: Fixture[], tie?: (id: string) => number): Row[] {
  const rows = new Map<string, Row>(ids.map((id) => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const g of games) {
    const h = rows.get(g.h);
    const a = rows.get(g.a);
    if (!h || !a) continue;
    h.p++;
    a.p++;
    h.gf += g.hg;
    h.ga += g.ag;
    a.gf += g.ag;
    a.ga += g.hg;
    if (g.hg > g.ag) {
      h.w++;
      a.l++;
      h.pts += 3;
    } else if (g.hg < g.ag) {
      a.w++;
      h.l++;
      a.pts += 3;
    } else {
      h.d++;
      a.d++;
      h.pts++;
      a.pts++;
    }
  }
  return [...rows.values()].sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || (tie ? tie(y.id) - tie(x.id) : 0) || x.id.localeCompare(y.id));
}

/** Rodadas de todos contra todos (método do círculo); `double`: turno e returno. */
export function roundRobin(ids: string[], rng: Rng, double = true): [string, string][][] {
  const list = [...ids];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  if (list.length % 2) list.push("");
  const n = list.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (!a || !b) continue;
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    list.splice(1, 0, list.pop()!);
  }
  return double ? [...rounds, ...rounds.map((rd) => rd.map(([a, b]) => [b, a] as [string, string]))] : rounds;
}

// ------------------------------------------------------------ artilharia (todos os campeonatos)
export type Tally = Record<string, { team: string; goals: number; assists: number }>;
export function tallyGoals(t: Tally, teamId: string, goals: Goal[] | undefined, side: 0 | 1, other?: string): void {
  for (const g of goals ?? []) {
    if (g.team !== side) continue;
    const k = `${teamId}|${g.name}`;
    (t[k] ??= { team: teamId, goals: 0, assists: 0 }).goals++;
    if (g.assist) (t[`${teamId}|${g.assist}`] ??= { team: teamId, goals: 0, assists: 0 }).assists++;
  }
  void other;
}
export function topOf(t: Tally, by: "goals" | "assists", n = 10): { name: string; team: string; goals: number; assists: number }[] {
  return Object.entries(t)
    .map(([k, v]) => ({ name: k.split("|").slice(1).join("|"), ...v }))
    .filter((x) => x[by] > 0)
    .sort((a, b) => b[by] - a[by] || b.goals + b.assists - (a.goals + a.assists) || a.name.localeCompare(b.name))
    .slice(0, n);
}

// ------------------------------------------------------------ pontos corridos (Brasileirão e ligas da carreira)
export type LeagueSave = {
  key: string;
  /** id do meu time */
  mine: string;
  seed: number;
  /** rodada atual (0 = primeira) */
  round: number;
  ids: string[];
  fixtures: [string, string][][];
  /** resultados por rodada e jogo: results[round][i] */
  results: (Result | null)[][];
  tally: Tally;
};

export function newLeague(key: string, ids: string[], mine: string, seed: number): LeagueSave {
  const rng = mulberry(seed);
  const fixtures = roundRobin(ids, rng, true);
  return { key, mine, seed, round: 0, ids, fixtures, results: fixtures.map((r) => r.map(() => null)), tally: {} };
}

export const leagueGames = (s: LeagueSave): Fixture[] => s.fixtures.flatMap((r, ri) => r.flatMap(([h, a], i) => (s.results[ri][i] ? [{ h, a, hg: s.results[ri][i]!.hg, ag: s.results[ri][i]!.ag }] : [])));

/** Meu jogo da rodada atual (ou null se a temporada acabou). */
export function myFixture(s: LeagueSave): { round: number; index: number; home: string; away: string } | null {
  if (s.round >= s.fixtures.length) return null;
  const i = s.fixtures[s.round].findIndex(([h, a]) => h === s.mine || a === s.mine);
  if (i < 0) return null; // folga (número ímpar de times)
  return { round: s.round, index: i, home: s.fixtures[s.round][i][0], away: s.fixtures[s.round][i][1] };
}

/** Fecha a rodada atual: guarda o meu resultado (se houver), simula os outros jogos e avança. */
export function playRound(s: LeagueSave, teams: Map<string, Team>, mine: Result | null): LeagueSave {
  const next: LeagueSave = { ...s, results: s.results.map((r) => [...r]), tally: { ...s.tally } };
  const rng = mulberry(s.seed * 1009 + s.round * 31 + 7);
  next.fixtures[next.round].forEach(([h, a], i) => {
    const isMine = h === s.mine || a === s.mine;
    let res: Result | null = next.results[next.round][i];
    if (!res) {
      res = isMine && mine ? mine : simulate(teams.get(h)!, teams.get(a)!, rng);
      next.results[next.round][i] = res;
    }
    tallyGoals(next.tally, h, res.goals, 0);
    tallyGoals(next.tally, a, res.goals, 1);
  });
  next.round++;
  return next;
}

export function leagueDone(s: LeagueSave): boolean {
  return s.round >= s.fixtures.length;
}

// ------------------------------------------------------------ Copa do Mundo
export type Tie = { a: string; b: string; res?: Result; winner?: string };
export type KoRound = { name: string; ties: Tie[] };
export type CupSave = {
  year: number;
  mine: string;
  seed: number;
  groups: Record<string, string[]>;
  /** rodada da fase de grupos (0–2); 3 = acabou */
  md: number;
  groupResults: Record<string, Result>;
  ko: KoRound[];
  /** índice da rodada atual do mata-mata */
  koRound: number;
  tally: Tally;
  champion?: string;
  runnerUp?: string;
  third?: string;
};

const MD_PAIRS: [number, number][][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [3, 1]],
  [[3, 0], [1, 2]],
];
const gkey = (h: string, a: string) => `${h}|${a}`;

export function newCup(year: number, groups: Record<string, string[]>, mine: string, seed: number): CupSave {
  return { year, mine, seed, groups, md: 0, groupResults: {}, ko: [], koRound: 0, tally: {} };
}

export function groupOf(s: CupSave, id: string): string | null {
  return Object.keys(s.groups).find((g) => s.groups[g].includes(id)) ?? null;
}

export function groupGames(s: CupSave, g: string): Fixture[] {
  const ids = s.groups[g];
  const out: Fixture[] = [];
  for (const md of MD_PAIRS) for (const [i, j] of md) {
    const r = s.groupResults[gkey(ids[i], ids[j])];
    if (r) out.push({ h: ids[i], a: ids[j], hg: r.hg, ag: r.ag });
  }
  return out;
}

export function groupTable(s: CupSave, g: string, teams: Map<string, Team>): Row[] {
  return table(s.groups[g], groupGames(s, g), (id) => teams.get(id)?.str ?? 0);
}

const KO_NAMES: Record<number, string> = { 32: "16-avos de final", 16: "Oitavas de final", 8: "Quartas de final", 4: "Semifinal", 2: "Final" };

function seedKnockout(s: CupSave, teams: Map<string, Team>): Tie[] {
  const letters = Object.keys(s.groups).sort();
  const tabs = letters.map((g) => ({ g, rows: groupTable(s, g, teams) }));
  if (letters.length === 8) {
    const w = (g: string) => tabs.find((t) => t.g === g)!.rows[0].id;
    const r = (g: string) => tabs.find((t) => t.g === g)!.rows[1].id;
    const L = letters;
    return [
      { a: w(L[0]), b: r(L[1]) },
      { a: w(L[2]), b: r(L[3]) },
      { a: w(L[4]), b: r(L[5]) },
      { a: w(L[6]), b: r(L[7]) },
      { a: w(L[1]), b: r(L[0]) },
      { a: w(L[3]), b: r(L[2]) },
      { a: w(L[5]), b: r(L[4]) },
      { a: w(L[7]), b: r(L[6]) },
    ];
  }
  // 12 grupos: 12 vencedores + 12 segundos + 8 melhores terceiros = 32 times
  const winners = tabs.map((t) => ({ g: t.g, row: t.rows[0] })).sort((x, y) => y.row.pts - x.row.pts || y.row.gf - y.row.ga - (x.row.gf - x.row.ga) || y.row.gf - x.row.gf);
  const seconds = tabs.map((t) => ({ g: t.g, row: t.rows[1] })).sort((x, y) => y.row.pts - x.row.pts || y.row.gf - y.row.ga - (x.row.gf - x.row.ga) || y.row.gf - x.row.gf);
  const thirds = tabs
    .map((t) => ({ g: t.g, row: t.rows[2] }))
    .sort((x, y) => y.row.pts - x.row.pts || y.row.gf - y.row.ga - (x.row.gf - x.row.ga) || y.row.gf - x.row.gf)
    .slice(0, 8);
  const pairs: { a: { g: string; id: string }; b: { g: string; id: string } }[] = [];
  const T = [...thirds];
  const S = [...seconds];
  for (let i = 0; i < 8; i++) {
    const wi = winners[i];
    let ti = T.length - 1;
    while (ti > 0 && T[ti].g === wi.g) ti--;
    const t = T.splice(ti, 1)[0];
    pairs.push({ a: { g: wi.g, id: wi.row.id }, b: { g: t.g, id: t.row.id } });
  }
  for (let i = 8; i < 12; i++) {
    const wi = winners[i];
    let si = S.length - 1;
    while (si > 0 && S[si].g === wi.g) si--;
    const sx = S.splice(si, 1)[0];
    pairs.push({ a: { g: wi.g, id: wi.row.id }, b: { g: sx.g, id: sx.row.id } });
  }
  while (S.length >= 2) {
    const a = S.shift()!;
    let bi = S.length - 1;
    while (bi > 0 && S[bi].g === a.g) bi--;
    const b = S.splice(bi, 1)[0];
    pairs.push({ a: { g: a.g, id: a.row.id }, b: { g: b.g, id: b.row.id } });
  }
  return pairs.map((p) => ({ a: p.a.id, b: p.b.id }));
}

/** O meu próximo jogo na Copa (ou null: acabou, ou fui eliminado). */
export function cupNext(s: CupSave): { stage: string; home: string; away: string; knockout: boolean } | null {
  if (s.champion) return null;
  if (s.md < 3) {
    const g = groupOf(s, s.mine);
    if (!g) return null;
    const ids = s.groups[g];
    const pair = MD_PAIRS[s.md].find(([i, j]) => ids[i] === s.mine || ids[j] === s.mine);
    if (!pair) return null;
    return { stage: `Grupo ${g} · rodada ${s.md + 1}`, home: ids[pair[0]], away: ids[pair[1]], knockout: false };
  }
  const round = s.ko[s.koRound];
  if (!round) return null;
  const tie = round.ties.find((t) => !t.winner && (t.a === s.mine || t.b === s.mine));
  if (!tie) return null;
  return { stage: round.name, home: tie.a, away: tie.b, knockout: true };
}

export function cupAlive(s: CupSave): boolean {
  if (s.champion) return false;
  if (s.md < 3) return !!groupOf(s, s.mine);
  const round = s.ko[s.koRound];
  return !!round && round.ties.some((t) => !t.winner && (t.a === s.mine || t.b === s.mine));
}

/** Fecha a etapa atual: guarda o meu resultado, simula os outros jogos da etapa e avança (grupos → mata-mata → final). */
export function cupAdvance(s: CupSave, teams: Map<string, Team>, mine: Result | null): CupSave {
  const n: CupSave = { ...s, groupResults: { ...s.groupResults }, ko: s.ko.map((r) => ({ ...r, ties: r.ties.map((t) => ({ ...t })) })), tally: { ...s.tally } };
  const rng = mulberry(s.seed * 7919 + s.md * 101 + s.koRound * 13 + s.ko.length);
  if (n.md < 3) {
    for (const g of Object.keys(n.groups).sort()) {
      const ids = n.groups[g];
      for (const [i, j] of MD_PAIRS[n.md]) {
        const h = ids[i];
        const a = ids[j];
        const k = gkey(h, a);
        if (n.groupResults[k]) continue;
        const isMine = h === n.mine || a === n.mine;
        const res = isMine && mine ? mine : simulate(teams.get(h)!, teams.get(a)!, rng, { neutral: true });
        n.groupResults[k] = res;
        tallyGoals(n.tally, h, res.goals, 0);
        tallyGoals(n.tally, a, res.goals, 1);
      }
    }
    n.md++;
    if (n.md === 3) {
      const ties = seedKnockout(n, teams);
      n.ko = [{ name: KO_NAMES[ties.length * 2] ?? "Mata-mata", ties }];
      n.koRound = 0;
    }
    return n;
  }
  const round = n.ko[n.koRound];
  for (const t of round.ties) {
    if (t.winner) continue;
    const isMine = t.a === n.mine || t.b === n.mine;
    const res = isMine && mine ? mine : simulate(teams.get(t.a)!, teams.get(t.b)!, rng, { neutral: true, knockout: true });
    if (res.hg === res.ag && !res.pen) res.pen = penalties(teams.get(t.a)!, teams.get(t.b)!, rng);
    t.res = res;
    t.winner = winnerOf(res, t.a, t.b);
    tallyGoals(n.tally, t.a, res.goals, 0);
    tallyGoals(n.tally, t.b, res.goals, 1);
  }
  if (round.ties.length === 1) {
    const f = round.ties[0];
    n.champion = f.winner;
    n.runnerUp = f.winner === f.a ? f.b : f.a;
    return n;
  }
  const winners = round.ties.map((t) => t.winner!);
  const nextTies: Tie[] = [];
  for (let i = 0; i < winners.length; i += 2) nextTies.push({ a: winners[i], b: winners[i + 1] });
  n.ko.push({ name: KO_NAMES[nextTies.length * 2] ?? "Mata-mata", ties: nextTies });
  n.koRound++;
  return n;
}

/** Quando eu já saí da Copa (ou quero pular), simula tudo o que falta. */
export function cupFinish(s: CupSave, teams: Map<string, Team>): CupSave {
  let n = s;
  let guard = 0;
  while (!n.champion && guard++ < 20) n = cupAdvance(n, teams, null);
  return n;
}

export function cupStageLabel(s: CupSave): string {
  if (s.champion) return "Copa encerrada";
  if (s.md < 3) return `Fase de grupos · rodada ${s.md + 1} de 3`;
  return s.ko[s.koRound]?.name ?? "";
}

/** Até onde meu time chegou. */
export function cupFinish_label(s: CupSave): string {
  if (s.champion === s.mine) return "Campeão do mundo! 🏆";
  if (s.runnerUp === s.mine) return "Vice-campeão";
  const g = groupOf(s, s.mine);
  for (let i = s.ko.length - 1; i >= 0; i--) {
    if (s.ko[i].ties.some((t) => t.a === s.mine || t.b === s.mine)) return `Eliminado: ${s.ko[i].name}`;
  }
  return g ? `Eliminado na fase de grupos (grupo ${g})` : "";
}
