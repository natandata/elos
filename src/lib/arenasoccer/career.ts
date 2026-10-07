// ArenaSoccer: modo carreira. O jogador entra num time de uma das quatro ligas, joga a temporada (partidas de verdade ou simuladas),
// cumpre missões, evolui, disputa artilharia e assistências e, jogando bem, recebe propostas de outros times.
import { type LeagueSave, type Result, leagueDone, leagueGames, myFixture, mulberry, newLeague, playRound, table, topOf, type Rng } from "./comp";
import type { LeagueKey, RosterPlayer, Team } from "./teams";
import { LEAGUES } from "./teams";

export type Position = "FW" | "MF" | "DF";
export const POSITIONS: { v: Position; label: string; hint: string }[] = [
  { v: "FW", label: "Atacante", hint: "Faz os gols: joga mais à frente." },
  { v: "MF", label: "Meia", hint: "Cria as jogadas e dá assistências." },
  { v: "DF", label: "Zagueiro", hint: "Protege o gol e ganha jogos fechados." },
];

export type MissionKind = "match" | "season";
export type CareerMission = { id: string; kind: MissionKind; key: "goals" | "assists" | "wins" | "rating" | "top"; goal: number; text: string; xp: number; rep: number; progress: number; done: boolean };
export type Offer = { team: string; league: LeagueKey; name: string; str: number; reason: string };
export type SeasonLine = { season: string; team: string; league: string; place: number; goals: number; assists: number; apps: number; avg: number; note: string };
export type Totals = { goals: number; assists: number; apps: number; wins: number; ratingSum: number };

export type CareerSave = {
  v: 1;
  name: string;
  pos: Position;
  num: number;
  age: number;
  ovr: number;
  xp: number;
  rep: number;
  /** últimas notas (até 5) */
  form: number[];
  league: LeagueKey;
  team: string;
  /** primeiro ano da temporada atual (2026 = temporada 2026/27) */
  year: number;
  lg: LeagueSave;
  season: Totals;
  total: Totals;
  titles: string[];
  history: SeasonLine[];
  missions: CareerMission[];
  offers: Offer[];
  news: string[];
  /** a proposta que o jogador aceitou, para valer na próxima temporada */
  moveTo: Offer | null;
  /** já avisou das propostas no meio da temporada */
  midOffers: boolean;
  seed: number;
};

const zero = (): Totals => ({ goals: 0, assists: 0, apps: 0, wins: 0, ratingSum: 0 });
export const xpFor = (ovr: number): number => 150 + Math.max(0, ovr - 60) * 16;
export const avgRating = (t: Totals): number => (t.apps ? Math.round((t.ratingSum / t.apps) * 10) / 10 : 0);
export const formAvg = (c: CareerSave): number => (c.form.length ? c.form.reduce((a, b) => a + b, 0) / c.form.length : 6);
export const seasonLabel = (year: number): string => `${year}/${String((year + 1) % 100).padStart(2, "0")}`;

function matchMissions(rng: Rng): CareerMission[] {
  const pool: Omit<CareerMission, "id" | "progress" | "done">[] = [
    { kind: "match", key: "goals", goal: 1, text: "Marque um gol neste jogo", xp: 45, rep: 1.5 },
    { kind: "match", key: "assists", goal: 1, text: "Dê uma assistência neste jogo", xp: 45, rep: 1.5 },
    { kind: "match", key: "wins", goal: 1, text: "Vença este jogo", xp: 30, rep: 1 },
    { kind: "match", key: "rating", goal: 7.5, text: "Termine o jogo com nota 7,5 ou mais", xp: 60, rep: 2 },
  ];
  const a = Math.floor(rng() * pool.length);
  let b = Math.floor(rng() * pool.length);
  if (b === a) b = (b + 1) % pool.length;
  return [pool[a], pool[b]].map((m, i) => ({ ...m, id: `m${Math.floor(rng() * 1e6)}-${i}`, progress: 0, done: false }));
}

function seasonMissions(pos: Position, teamStr: number, leagueStr: number): CareerMission[] {
  const gGoal = pos === "FW" ? 12 : pos === "MF" ? 6 : 3;
  const aGoal = pos === "MF" ? 8 : pos === "FW" ? 5 : 3;
  const top = teamStr >= leagueStr + 3 ? 4 : teamStr >= leagueStr - 4 ? 8 : 12;
  return [
    { id: "s-goals", kind: "season", key: "goals", goal: gGoal, text: `Marque ${gGoal} gols na temporada`, xp: 160, rep: 5, progress: 0, done: false },
    { id: "s-assists", kind: "season", key: "assists", goal: aGoal, text: `Dê ${aGoal} assistências na temporada`, xp: 140, rep: 4, progress: 0, done: false },
    { id: "s-wins", kind: "season", key: "wins", goal: 14, text: "Vença 14 jogos na temporada", xp: 120, rep: 4, progress: 0, done: false },
    { id: "s-top", kind: "season", key: "top", goal: top, text: `Termine entre os ${top} primeiros`, xp: 200, rep: 8, progress: 0, done: false },
  ];
}

const teamMap = (teams: Team[]) => new Map(teams.map((t) => [t.id, t]));
export const myTeam = (c: CareerSave, teams: Team[]): Team => teams.find((t) => t.id === c.team) ?? teams[0];
const leagueStr = (teams: Team[]) => teams.reduce((a, t) => a + t.str, 0) / teams.length;

/** Começa a carreira: o jogador só escolhe a liga; o time sai por sorteio entre os times do meio e de baixo da tabela. */
export function newCareer(name: string, pos: Position, league: LeagueKey, teams: Team[], seed: number): CareerSave {
  const rng = mulberry(seed);
  const sorted = [...teams].sort((a, b) => b.str - a.str);
  const pool = sorted.slice(Math.floor(sorted.length * 0.4));
  const team = pool[Math.floor(rng() * pool.length)];
  const used = new Set(team.players.map((p) => p[0]));
  let num = 10 + Math.floor(rng() * 80);
  while (used.has(num)) num++;
  const year = 2026;
  const c: CareerSave = {
    v: 1,
    name,
    pos,
    num,
    age: 19,
    ovr: 64 + Math.floor(rng() * 4),
    xp: 0,
    rep: 18,
    form: [],
    league,
    team: team.id,
    year,
    lg: newLeague(`career-${league}`, teams.map((t) => t.id), team.id, seed),
    season: zero(),
    total: zero(),
    titles: [],
    history: [],
    missions: [],
    offers: [],
    news: [`${name} assinou com o ${team.name} para a temporada ${seasonLabel(year)}.`],
    moveTo: null,
    midOffers: false,
    seed,
  };
  c.missions = [...seasonMissions(pos, team.str, leagueStr(teams)), ...matchMissions(mulberry(seed + 1))];
  return c;
}

/** Quem joga: eu e os dois melhores companheiros (3 contra 3). */
export function lineup(c: CareerSave, team: Team): { me: RosterPlayer; mates: RosterPlayer[] } {
  const me: RosterPlayer = [c.num, c.pos, c.name, c.ovr];
  const pool = team.players.filter((p) => p[1] !== "GK").sort((a, b) => b[3] - a[3]);
  const want: string[] = c.pos === "FW" ? ["MF", "DF"] : c.pos === "MF" ? ["FW", "DF"] : ["FW", "MF"];
  const mates: RosterPlayer[] = [];
  for (const pos of want) {
    const p = pool.find((x) => x[1] === pos && !mates.includes(x));
    if (p) mates.push(p);
  }
  for (const p of pool) {
    if (mates.length >= 2) break;
    if (!mates.includes(p)) mates.push(p);
  }
  return { me, mates: mates.slice(0, 2) };
}

/** Força efetiva do meu time: o jogador pesa um pouco. */
export const effStr = (c: CareerSave, team: Team): number => team.str + (c.ovr - 70) * 0.12;

export type MyGame = { goals: number; assists: number; own: number; minutes: number };

/** Nota da partida (0–10) a partir do que o jogador fez. */
export function rate(g: MyGame, result: "win" | "draw" | "loss", conceded: number, pos: Position): number {
  let r = 6 + g.goals * 1.2 + g.assists * 0.8 - g.own * 1.2 + (result === "win" ? 0.6 : result === "draw" ? 0.1 : -0.4);
  if (pos === "DF") r += conceded === 0 ? 0.8 : conceded >= 3 ? -0.5 : 0;
  return Math.max(3, Math.min(10, Math.round(r * 10) / 10));
}

/** Resultado simulado quando o jogador não quer jogar a partida (ele rende um pouco menos). */
export function simulateMine(c: CareerSave, mine: Team, other: Team, home: boolean, rng: Rng): { result: Result; me: MyGame } {
  const diff = (effStr(c, mine) - other.str) / 16;
  const lam = (base: number) => base;
  const poisson = (l: number) => {
    const L = Math.exp(-l);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > L && k < 10);
    return k - 1;
  };
  const gf = Math.min(7, poisson(lam(1.25 * Math.exp(0.85 * diff + (home ? 0.12 : 0)))));
  const ga = Math.min(7, poisson(lam(1.25 * Math.exp(-0.85 * diff))));
  const share = c.pos === "FW" ? 0.38 : c.pos === "MF" ? 0.2 : 0.06;
  const ashare = c.pos === "MF" ? 0.3 : c.pos === "FW" ? 0.18 : 0.08;
  let goals = 0;
  let assists = 0;
  const mates = lineup(c, mine).mates;
  const list: Result["goals"] = [];
  for (let i = 0; i < gf; i++) {
    const mine1 = rng() < share * (0.8 + (c.ovr - 60) / 80);
    const at = Math.floor(rng() * 90) + 1;
    if (mine1) {
      goals++;
      list.push({ team: home ? 0 : 1, name: c.name, at });
    } else {
      const m = mates[Math.floor(rng() * mates.length)] ?? mates[0];
      const asst = rng() < ashare;
      if (asst) assists++;
      list.push({ team: home ? 0 : 1, name: m ? m[2] : "Companheiro", assist: asst ? c.name : undefined, at });
    }
  }
  for (let i = 0; i < ga; i++) list.push({ team: home ? 1 : 0, name: other.players[Math.floor(rng() * Math.min(10, other.players.length))]?.[2] ?? "Adversário", at: Math.floor(rng() * 90) + 1 });
  list.sort((a, b) => (a?.at ?? 0) - (b?.at ?? 0));
  const result: Result = home ? { hg: gf, ag: ga, goals: list } : { hg: ga, ag: gf, goals: list };
  return { result, me: { goals, assists, own: 0, minutes: 90 } };
}

export type MatchSummary = { rating: number; xp: number; repDelta: number; levelUps: number; doneMissions: string[] };

/** Aplica uma partida ao jogador: estatísticas, missões, experiência, reputação e evolução. */
export function applyMatch(c: CareerSave, g: MyGame, result: "win" | "draw" | "loss", conceded: number, rng: Rng): { save: CareerSave; summary: MatchSummary } {
  const rating = rate(g, result, conceded, c.pos);
  const n: CareerSave = { ...c, season: { ...c.season }, total: { ...c.total }, missions: c.missions.map((m) => ({ ...m })), form: [...c.form, rating].slice(-5), news: [...c.news] };
  for (const t of [n.season, n.total]) {
    t.goals += g.goals;
    t.assists += g.assists;
    t.apps++;
    t.wins += result === "win" ? 1 : 0;
    t.ratingSum += rating;
  }
  let xp = Math.round((12 + Math.max(0, rating - 5) * 14 + g.goals * 18 + g.assists * 12) * 0.6);
  let rep = (rating - 6.2) * 1.1 + g.goals * 0.4;
  const done: string[] = [];
  for (const m of n.missions) {
    if (m.done) continue;
    if (m.kind === "match") {
      const ok = m.key === "goals" ? g.goals >= m.goal : m.key === "assists" ? g.assists >= m.goal : m.key === "wins" ? result === "win" : rating >= m.goal;
      m.progress = ok ? m.goal : 0;
      if (ok) {
        m.done = true;
      }
    } else if (m.key === "goals") m.progress = Math.min(m.goal, n.season.goals);
    else if (m.key === "assists") m.progress = Math.min(m.goal, n.season.assists);
    else if (m.key === "wins") m.progress = Math.min(m.goal, n.season.wins);
    if (m.kind === "season" && m.key !== "top" && m.progress >= m.goal) m.done = true;
    if (m.done) {
      xp += m.xp;
      rep += m.rep;
      done.push(m.text);
    }
  }
  // as missões de jogo se renovam depois de cada partida
  n.missions = [...n.missions.filter((m) => m.kind === "season"), ...matchMissions(rng)];
  n.xp += xp;
  let ups = 0;
  while (n.xp >= xpFor(n.ovr) && n.ovr < 95) {
    n.xp -= xpFor(n.ovr);
    n.ovr++;
    ups++;
  }
  if (n.ovr >= 95) n.xp = 0;
  n.rep = Math.max(0, Math.min(100, Math.round((n.rep + rep) * 10) / 10));
  if (ups) n.news.push(`${n.name} evoluiu para ${n.ovr} de força!`);
  if (g.goals >= 3) n.news.push(`Hat-trick de ${n.name}!`);
  n.news = n.news.slice(-30);
  return { save: n, summary: { rating, xp, repDelta: Math.round(rep * 10) / 10, levelUps: ups, doneMissions: done } };
}

/** Propostas de outros times (de qualquer uma das quatro ligas), conforme reputação e fase. */
export function makeOffers(c: CareerSave, all: Record<LeagueKey, Team[]>, rng: Rng, atSeasonEnd: boolean): Offer[] {
  const form = formAvg(c);
  if (c.rep < 28 || (form < 6.1 && !atSeasonEnd)) return [];
  const n = c.rep >= 75 ? 3 : c.rep >= 55 ? 2 : 1;
  const mine = (all[c.league] ?? []).find((t) => t.id === c.team);
  const cur = mine ? effStr(c, mine) : 70;
  // quem pode querer o jogador: times mais fortes do que o dele, e até onde a reputação alcança
  const ceiling = 62 + c.rep * 0.32 + (c.ovr - 65) * 0.4;
  const cands: Offer[] = [];
  for (const lg of LEAGUES) {
    for (const t of all[lg.key] ?? []) {
      if (lg.key === c.league && t.id === c.team) continue;
      if (t.str <= cur - 2 || t.str > ceiling + 6) continue;
      cands.push({ team: t.id, league: lg.key, name: t.name, str: t.str, reason: t.str >= cur + 6 ? "Um passo grande na carreira" : "Quer você como titular" });
    }
  }
  cands.sort((a, b) => Math.abs(a.str - ceiling) - Math.abs(b.str - ceiling));
  const out: Offer[] = [];
  const pool = cands.slice(0, 10);
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out.sort((a, b) => b.str - a.str);
}

/** Meu lugar na tabela e o saldo da temporada, para o resumo. */
export function seasonPlace(c: CareerSave): number {
  const tb = table(c.lg.ids, leagueGames(c.lg));
  return tb.findIndex((r) => r.id === c.team) + 1;
}

/** O jogador é o artilheiro / o líder de assistências da liga? */
export function leadsTally(c: CareerSave): { scorer: boolean; assister: boolean } {
  const g = topOf(c.lg.tally, "goals", 1)[0];
  const a = topOf(c.lg.tally, "assists", 1)[0];
  return { scorer: !!g && g.name === c.name && g.team === c.team, assister: !!a && a.name === c.name && a.team === c.team };
}

/** Fecha a temporada: resumo, troféus, evolução por idade, nova liga/time (se aceitou uma proposta) e nova temporada. */
export function endSeason(c: CareerSave, all: Record<LeagueKey, Team[]>): CareerSave {
  const tb = table(c.lg.ids, leagueGames(c.lg));
  const place = tb.findIndex((r) => r.id === c.team) + 1;
  const lead = leadsTally(c);
  const team = (all[c.league] ?? []).find((t) => t.id === c.team);
  const lgLabel = LEAGUES.find((l) => l.key === c.league)?.short ?? c.league;
  const n: CareerSave = { ...c, titles: [...c.titles], history: [...c.history], news: [...c.news], season: zero() };
  const notes: string[] = [];
  if (place === 1) {
    n.titles.push(`${lgLabel} ${seasonLabel(c.year)}`);
    notes.push("Campeão");
    n.rep = Math.min(100, n.rep + 10);
  }
  if (lead.scorer) {
    n.titles.push(`Artilheiro · ${lgLabel} ${seasonLabel(c.year)}`);
    notes.push("Artilheiro");
    n.rep = Math.min(100, n.rep + 8);
  }
  if (lead.assister) {
    n.titles.push(`Líder de assistências · ${lgLabel} ${seasonLabel(c.year)}`);
    notes.push("Líder de assistências");
    n.rep = Math.min(100, n.rep + 6);
  }
  // missão da temporada: posição na tabela
  const top = c.missions.find((m) => m.key === "top");
  let bonusXp = 0;
  if (top && place <= top.goal) {
    bonusXp += top.xp;
    n.rep = Math.min(100, n.rep + top.rep);
    notes.push(`Missão cumprida: top ${top.goal}`);
  }
  n.history.push({ season: seasonLabel(c.year), team: team?.name ?? c.team, league: lgLabel, place, goals: c.season.goals, assists: c.season.assists, apps: c.season.apps, avg: avgRating(c.season), note: notes.join(" · ") });
  n.news.push(`Fim da temporada ${seasonLabel(c.year)}: ${place}º lugar no ${lgLabel}.`);
  // idade e evolução entre temporadas: jovens crescem, veteranos perdem um pouco
  n.age = c.age + 1;
  n.xp += bonusXp;
  while (n.xp >= xpFor(n.ovr) && n.ovr < 95) {
    n.xp -= xpFor(n.ovr);
    n.ovr++;
  }
  if (n.age >= 33 && n.ovr > 60) n.ovr -= n.age >= 36 ? 2 : 1;
  // nova temporada (e novo time, se aceitou uma proposta)
  let league = c.league;
  let teamId = c.team;
  if (c.moveTo) {
    league = c.moveTo.league;
    teamId = c.moveTo.team;
    n.news.push(`${n.name} foi contratado pelo ${c.moveTo.name}!`);
  }
  const teams = all[league] ?? [];
  const nt = teams.find((t) => t.id === teamId) ?? teams[0];
  n.league = league;
  n.team = nt.id;
  n.year = c.year + 1;
  n.lg = newLeague(`career-${league}`, teams.map((t) => t.id), nt.id, c.seed + n.year * 17);
  n.moveTo = null;
  n.offers = [];
  n.midOffers = false;
  n.missions = [...seasonMissions(n.pos, nt.str, leagueStr(teams)), ...matchMissions(mulberry(c.seed + n.year))];
  n.form = [];
  n.news = n.news.slice(-30);
  return n;
}

/** Joga a rodada atual (o meu resultado já vem pronto) e cuida das propostas de meio de temporada. */
export function finishRound(c: CareerSave, teams: Team[], mine: Result, all: Record<LeagueKey, Team[]>): CareerSave {
  const lg = playRound(c.lg, teamMap(teams), mine);
  const n: CareerSave = { ...c, lg };
  const half = Math.floor(lg.fixtures.length / 2);
  if (!c.midOffers && lg.round >= half) {
    n.midOffers = true;
    const offers = makeOffers(n, all, mulberry(c.seed + lg.round * 3), false);
    if (offers.length) {
      n.offers = offers;
      n.news = [...n.news, `Chegaram ${offers.length === 1 ? "uma proposta" : offers.length + " propostas"} de outros times. Decida até o fim da temporada.`].slice(-30);
    }
  }
  // fim da temporada: chegam as propostas do período de transferências (somadas às que já estavam na mesa)
  if (lg.round >= lg.fixtures.length) {
    const more = makeOffers(n, all, mulberry(c.seed + 991), true);
    const have = new Set(n.offers.map((o) => o.team));
    n.offers = [...n.offers, ...more.filter((o) => !have.has(o.team))].sort((x, y) => y.str - x.str).slice(0, 4);
    if (more.length) n.news = [...n.news, "A janela de transferências abriu: há propostas na mesa."].slice(-30);
  }
  // as missões "top" acompanham a tabela
  n.missions = n.missions.map((m) => (m.key === "top" ? { ...m, progress: seasonPlace(n) } : m));
  return n;
}

export const careerDone = (c: CareerSave): boolean => leagueDone(c.lg);
export { myFixture };
