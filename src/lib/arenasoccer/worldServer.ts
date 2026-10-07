import "server-only";
// ArenaSoccer · Mundo aberto: o servidor do mundo. Resolve as rodadas que já passaram (simulando o que ninguém jogou),
// confere e guarda as partidas jogadas, cuida das temporadas, das propostas e da linha do tempo.
import type { SupabaseClient } from "@supabase/supabase-js";
import br from "./data/league-br.json";
import en from "./data/league-en.json";
import es from "./data/league-es.json";
import fr from "./data/league-fr.json";
import { applyMatch, endSeason, makeOffers, newCareer, seasonLabel, simulateMine, xpFor, type CareerSave, type MyGame, type Offer, type Totals } from "./career";
import { type Goal, type LeagueSave, type Result, leagueGames, mulberry, roundRobin, simulate, table, tallyGoals, topOf, type Tally } from "./comp";
import type { LeagueKey, Team } from "./teams";
import { LEAGUES } from "./teams";
import { ROUNDS, roundWindow, windowOpen } from "./worldCalendar";

export const LEAGUE_DATA: Record<LeagueKey, Team[]> = { br: br.teams as unknown as Team[], en: en.teams as unknown as Team[], es: es.teams as unknown as Team[], fr: fr.teams as unknown as Team[] };
const TEAM = (league: LeagueKey, id: string): Team | undefined => LEAGUE_DATA[league].find((t) => t.id === id);

export type WorldPlayerRow = { user_id: string; name: string; pos: "FW" | "MF" | "DF"; num: number; age: number; league: LeagueKey; team: string; ovr: number; xp: number; rep: number; form: number[]; data: PlayerData; created_at: string };
export type PlayerData = {
  total?: Totals;
  titles?: string[];
  history?: CareerSave["history"];
  missions?: CareerSave["missions"];
  offers?: Offer[];
  news?: string[];
  moveTo?: Offer | null;
  midOffers?: string;
  /** "liga-temporada-rodada" da última partida contada */
  lastPlayed?: string;
};
type StatsRow = { user_id: string; league: string; season: number; team: string; goals: number; assists: number; apps: number; wins: number; rating_sum: number };
type ResultRow = { league: string; season: number; round: number; idx: number; hg: number; ag: number; goals: Goal[]; by_user: string | null };

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** As rodadas de uma temporada de uma liga: sempre as mesmas para todos (dependem só da liga e da temporada). */
export function fixturesFor(league: LeagueKey, season: number): [string, string][][] {
  const ids = LEAGUE_DATA[league].map((t) => t.id);
  return roundRobin(ids, mulberry(hash(league) + season * 7919), true).slice(0, ROUNDS[league]);
}

const zero = (): Totals => ({ goals: 0, assists: 0, apps: 0, wins: 0, ratingSum: 0 });
const statsTotals = (s: StatsRow | undefined): Totals => (s ? { goals: s.goals, assists: s.assists, apps: s.apps, wins: s.wins, ratingSum: Number(s.rating_sum) } : zero());
const dummyLg = (): LeagueSave => ({ key: "", mine: "", seed: 0, round: 0, ids: [], fixtures: [], results: [], tally: {} });

export function toSave(p: WorldPlayerRow, season: Totals, lg: LeagueSave, seasonNo: number): CareerSave {
  const d = p.data ?? {};
  return {
    v: 1,
    name: p.name,
    pos: p.pos,
    num: p.num,
    age: p.age,
    ovr: p.ovr,
    xp: p.xp,
    rep: Number(p.rep),
    form: p.form ?? [],
    league: p.league,
    team: p.team,
    year: 2026 + seasonNo - 1,
    lg,
    season,
    total: d.total ?? zero(),
    titles: d.titles ?? [],
    history: d.history ?? [],
    missions: d.missions ?? [],
    offers: d.offers ?? [],
    news: d.news ?? [],
    moveTo: d.moveTo ?? null,
    midOffers: false,
    seed: hash(p.user_id),
  };
}

const ALL = (): Record<LeagueKey, Team[]> => LEAGUE_DATA;

async function feed(admin: SupabaseClient, rows: { user_id?: string | null; league?: string; kind: string; text: string }[]) {
  if (rows.length === 0) return;
  await admin.from("soccer_world_feed").insert(rows.map((r) => ({ user_id: r.user_id ?? null, league: r.league ?? null, kind: r.kind, text: r.text })));
}

/** Grava o jogador (e a linha de estatísticas da temporada) depois de uma partida ou fim de temporada. */
async function savePlayer(admin: SupabaseClient, p: WorldPlayerRow, c: CareerSave, extra: Partial<PlayerData>, statsRow?: { league: string; season: number; team: string; totals: Totals }) {
  const data: PlayerData = { ...(p.data ?? {}), total: c.total, titles: c.titles, history: c.history, missions: c.missions, offers: c.offers, news: c.news.slice(-30), moveTo: c.moveTo, ...extra };
  await admin
    .from("soccer_world_players")
    .update({ name: c.name, age: c.age, league: c.league, team: c.team, ovr: c.ovr, xp: c.xp, rep: c.rep, form: c.form, data, updated_at: new Date().toISOString() })
    .eq("user_id", p.user_id);
  if (statsRow) {
    await admin.from("soccer_world_stats").upsert({ user_id: p.user_id, league: statsRow.league, season: statsRow.season, team: statsRow.team, goals: statsRow.totals.goals, assists: statsRow.totals.assists, apps: statsRow.totals.apps, wins: statsRow.totals.wins, rating_sum: statsRow.totals.ratingSum }, { onConflict: "user_id,league,season" });
  }
}

/** Gols e assistências de um jogador numa partida que ele não jogou (ou que já tinha resultado): repartidos pelo placar do time. */
function share(c: CareerSave, gf: number, rng: () => number): MyGame {
  const pg = c.pos === "FW" ? 0.3 : c.pos === "MF" ? 0.16 : 0.05;
  const pa = c.pos === "MF" ? 0.24 : c.pos === "FW" ? 0.14 : 0.06;
  let goals = 0;
  let assists = 0;
  for (let i = 0; i < gf; i++) {
    if (rng() < pg) goals++;
    else if (rng() < pa) assists++;
  }
  return { goals, assists, own: 0, minutes: 90 };
}

const resultOf = (gf: number, ga: number): "win" | "draw" | "loss" => (gf > ga ? "win" : gf < ga ? "loss" : "draw");

/** Monta a tabela da temporada (resultados vindos do banco) no formato do modo carreira. */
function buildLeagueSave(league: LeagueKey, season: number, results: ResultRow[]): LeagueSave {
  const fx = fixturesFor(league, season);
  const ids = LEAGUE_DATA[league].map((t) => t.id);
  const res: (Result | null)[][] = fx.map((r) => r.map(() => null));
  const tally: Tally = {};
  for (const r of results) {
    if (r.season !== season || !fx[r.round]) continue;
    res[r.round][r.idx] = { hg: r.hg, ag: r.ag, goals: r.goals };
    const [h, a] = fx[r.round][r.idx];
    tallyGoals(tally, h, r.goals, 0);
    tallyGoals(tally, a, r.goals, 1);
  }
  return { key: `world-${league}`, mine: "", seed: season, round: results.length ? Math.max(...results.map((r) => r.round)) + 1 : 0, ids, fixtures: fx, results: res, tally };
}

/** Fecha todas as rodadas cuja janela de jogo já acabou. Pode ser chamada por qualquer pessoa, a qualquer hora. */
export async function advanceWorld(admin: SupabaseClient, now = Date.now()): Promise<void> {
  for (const lg of LEAGUES) {
    for (let guard = 0; guard < 80; guard++) {
      const { data: st } = await admin.from("soccer_world_state").select("season, next_round").eq("league", lg.key).maybeSingle<{ season: number; next_round: number }>();
      if (!st) break;
      const w = roundWindow(lg.key, st.season, st.next_round);
      if (now < w.end) break;
      const last = st.next_round + 1 >= ROUNDS[lg.key];
      // "reserva" a rodada: só quem conseguir avançar o ponteiro a processa
      const { data: claimed } = await admin
        .from("soccer_world_state")
        .update(last ? { season: st.season + 1, next_round: 0 } : { next_round: st.next_round + 1 })
        .eq("league", lg.key)
        .eq("season", st.season)
        .eq("next_round", st.next_round)
        .select("league");
      if (!claimed || claimed.length === 0) continue;
      await closeRound(admin, lg.key, st.season, st.next_round, last);
    }
  }
}

async function closeRound(admin: SupabaseClient, league: LeagueKey, season: number, round: number, last: boolean) {
  const fx = fixturesFor(league, season)[round] ?? [];
  const { data: existing } = await admin.from("soccer_world_results").select("*").eq("league", league).eq("season", season).eq("round", round);
  const have = new Map(((existing ?? []) as ResultRow[]).map((r) => [r.idx, r]));
  const { data: ps } = await admin.from("soccer_world_players").select("*").eq("league", league);
  const players = (ps ?? []) as WorldPlayerRow[];
  const { data: sts } = await admin.from("soccer_world_stats").select("*").eq("league", league).eq("season", season);
  const stats = new Map(((sts ?? []) as StatsRow[]).map((s) => [s.user_id, s]));
  const rng = mulberry(hash(`${league}-${season}-${round}`));
  const news: { user_id?: string; league: string; kind: string; text: string }[] = [];
  const key = `${league}-${season}-${round}`;

  for (let i = 0; i < fx.length; i++) {
    const [h, a] = fx[i];
    const home = TEAM(league, h)!;
    const away = TEAM(league, a)!;
    const humans = players.filter((p) => p.team === h || p.team === a);
    let res: Result | null = have.get(i) ? { hg: have.get(i)!.hg, ag: have.get(i)!.ag, goals: have.get(i)!.goals } : null;
    const unplayed = humans.filter((p) => p.data?.lastPlayed !== key);
    const per = new Map<string, MyGame>();
    if (!res) {
      const lead = unplayed[0];
      if (lead) {
        // alguém do jogo não jogou: o placar sai da simulação do jogador (que rende menos que jogando)
        const c = toSave(lead, statsTotals(stats.get(lead.user_id)), dummyLg(), season);
        const mine = lead.team === h ? home : away;
        const other = lead.team === h ? away : home;
        const sim = simulateMine(c, mine, other, lead.team === h, rng);
        res = sim.result;
        per.set(lead.user_id, sim.me);
      } else res = simulate(home, away, rng);
      await admin.from("soccer_world_results").upsert({ league, season, round, idx: i, hg: res.hg, ag: res.ag, goals: res.goals ?? [], by_user: null }, { onConflict: "league,season,round,idx", ignoreDuplicates: true });
    }
    // quem estava neste jogo e não o jogou também ganha a partida nos números (sem destaque)
    for (const p of unplayed) {
      const gf = p.team === h ? res.hg : res.ag;
      const ga = p.team === h ? res.ag : res.hg;
      const g = per.get(p.user_id) ?? share(toSave(p, statsTotals(stats.get(p.user_id)), dummyLg(), season), gf, rng);
      const c = toSave(p, statsTotals(stats.get(p.user_id)), dummyLg(), season);
      const { save } = applyMatch(c, g, resultOf(gf, ga), ga, rng);
      // faltou: a nota fica menor (não jogou, só teve o jogo simulado)
      await savePlayer(admin, p, save, { lastPlayed: key }, { league, season, team: p.team, totals: save.season });
      stats.set(p.user_id, { user_id: p.user_id, league, season, team: p.team, goals: save.season.goals, assists: save.season.assists, apps: save.season.apps, wins: save.season.wins, rating_sum: save.season.ratingSum });
      p.data = { ...(p.data ?? {}), lastPlayed: key, total: save.total };
      p.ovr = save.ovr;
      p.xp = save.xp;
      p.rep = save.rep;
      p.form = save.form;
      if (g.goals >= 2) news.push({ user_id: p.user_id, league, kind: "match", text: `${p.name} (${(p.team === h ? home : away).name}) marcou ${g.goals} gols na rodada ${round + 1}.` });
    }
  }

  // propostas: no meio da temporada e na janela de transferências, três rodadas antes do fim (dá tempo de decidir)
  const half = Math.floor(ROUNDS[league] / 2);
  if (round + 1 === half || round + 1 === ROUNDS[league] - 3) {
    for (const p of players) {
      const c = toSave(p, statsTotals(stats.get(p.user_id)), dummyLg(), season);
      const found = makeOffers(c, ALL(), mulberry(hash(p.user_id) + season + round), round + 1 !== half);
      const have = new Set(c.offers.map((o) => o.team));
      const offers = [...c.offers, ...found.filter((o) => !have.has(o.team))].sort((x, y) => y.str - x.str).slice(0, 4);
      if (found.length) {
        c.offers = offers;
        await savePlayer(admin, p, c, {});
        news.push({ user_id: p.user_id, league, kind: "offer", text: `${p.name} recebeu ${found.length === 1 ? "uma proposta" : found.length + " propostas"} de outros times.` });
      }
    }
  }

  if (last) await closeSeason(admin, league, season, news);
  await feed(admin, news);
}

async function closeSeason(admin: SupabaseClient, league: LeagueKey, season: number, news: { user_id?: string; league: string; kind: string; text: string }[]) {
  const { data: rs } = await admin.from("soccer_world_results").select("*").eq("league", league).eq("season", season);
  const lg = buildLeagueSave(league, season, (rs ?? []) as ResultRow[]);
  const { data: ps } = await admin.from("soccer_world_players").select("*").eq("league", league);
  const { data: sts } = await admin.from("soccer_world_stats").select("*").eq("league", league).eq("season", season);
  const stats = new Map(((sts ?? []) as StatsRow[]).map((s) => [s.user_id, s]));
  const rows = table(lg.ids, leagueGames(lg), (id) => TEAM(league, id)?.str ?? 0);
  const champ = rows[0]?.id;
  news.push({ league, kind: "season", text: `Fim da temporada ${seasonLabel(2026 + season - 1)} no ${LEAGUES.find((l) => l.key === league)?.short}: campeão ${TEAM(league, champ)?.name ?? champ}.` });
  const top = topOf(lg.tally, "goals", 1)[0];
  if (top) news.push({ league, kind: "season", text: `Artilheiro da temporada: ${top.name} (${TEAM(league, top.team)?.name}), ${top.goals} gols.` });
  for (const p of (ps ?? []) as WorldPlayerRow[]) {
    const c0 = toSave(p, statsTotals(stats.get(p.user_id)), { ...lg, mine: p.team }, season);
    c0.lg = { ...lg, mine: p.team };
    const after = endSeason(c0, ALL());
    if (c0.moveTo) news.push({ user_id: p.user_id, league, kind: "transfer", text: `${p.name} foi contratado pelo ${c0.moveTo.name}!` });
    const place = rows.findIndex((r) => r.id === p.team) + 1;
    if (place === 1) news.push({ user_id: p.user_id, league, kind: "title", text: `${p.name} foi campeão com o ${TEAM(league, p.team)?.name}! 🏆` });
    const last = after.history[after.history.length - 1];
    if (last?.note.includes("Artilheiro")) news.push({ user_id: p.user_id, league, kind: "title", text: `${p.name} é o artilheiro da liga! 👟` });
    await savePlayer(admin, p, { ...after, offers: [], moveTo: null }, { midOffers: undefined });
  }
}

// ------------------------------------------------------------ o que a tela recebe
export type WorldPlayerView = { userId: string; name: string; pos: string; num: number; age: number; league: LeagueKey; team: string; teamName: string; ovr: number; rep: number; goals: number; assists: number; apps: number; avg: number; titles: string[]; avatar: string | null };
export type WorldView = {
  now: number;
  me: (WorldPlayerView & { xp: number; xpMax: number; form: number[]; missions: CareerSave["missions"]; offers: Offer[]; moveTo: Offer | null; news: string[]; history: CareerSave["history"]; total: Totals; lastPlayed: string | null }) | null;
  league: LeagueKey | null;
  season: number;
  round: number;
  rounds: number;
  window: { start: number; end: number } | null;
  open: boolean;
  fixtures: [string, string][][];
  results: Record<string, { hg: number; ag: number }>;
  scorers: { name: string; team: string; goals: number; assists: number }[];
  assisters: { name: string; team: string; goals: number; assists: number }[];
  players: WorldPlayerView[];
  feed: { at: string; text: string; kind: string }[];
  /** já jogou a rodada atual? */
  playedThis: boolean;
};

export async function worldView(admin: SupabaseClient, userId: string, now = Date.now()): Promise<WorldView> {
  await advanceWorld(admin, now);
  const { data: me } = await admin.from("soccer_world_players").select("*").eq("user_id", userId).maybeSingle<WorldPlayerRow>();
  const { data: all } = await admin.from("soccer_world_players").select("*").order("ovr", { ascending: false }).limit(200);
  const players = (all ?? []) as WorldPlayerRow[];
  const ids = players.map((p) => p.user_id);
  const { data: profs } = ids.length ? await admin.from("profiles").select("id, avatar_url").in("id", ids) : { data: [] };
  const avatar = new Map(((profs ?? []) as { id: string; avatar_url: string | null }[]).map((p) => [p.id, p.avatar_url]));
  const { data: states } = await admin.from("soccer_world_state").select("*");
  const stateOf = new Map(((states ?? []) as { league: string; season: number; next_round: number }[]).map((s) => [s.league, s]));
  const { data: allStats } = ids.length ? await admin.from("soccer_world_stats").select("*").in("user_id", ids) : { data: [] };
  const statKey = (u: string, lg: string, s: number) => `${u}|${lg}|${s}`;
  const statMap = new Map(((allStats ?? []) as StatsRow[]).map((s) => [statKey(s.user_id, s.league, s.season), s]));

  const view = (p: WorldPlayerRow): WorldPlayerView => {
    const st = stateOf.get(p.league);
    const s = statMap.get(statKey(p.user_id, p.league, st?.season ?? 1));
    return { userId: p.user_id, name: p.name, pos: p.pos, num: p.num, age: p.age, league: p.league, team: p.team, teamName: TEAM(p.league, p.team)?.name ?? p.team, ovr: p.ovr, rep: Number(p.rep), goals: s?.goals ?? 0, assists: s?.assists ?? 0, apps: s?.apps ?? 0, avg: s && s.apps ? Math.round((Number(s.rating_sum) / s.apps) * 10) / 10 : 0, titles: p.data?.titles ?? [], avatar: avatar.get(p.user_id) ?? null };
  };

  const { data: fd } = await admin.from("soccer_world_feed").select("at, text, kind").order("at", { ascending: false }).limit(40);
  const base: WorldView = { now, me: null, league: null, season: 1, round: 0, rounds: 0, window: null, open: false, fixtures: [], results: {}, scorers: [], assisters: [], players: players.map(view), feed: (fd ?? []) as WorldView["feed"], playedThis: false };
  if (!me) return base;

  const st = stateOf.get(me.league) ?? { season: 1, next_round: 0, league: me.league };
  const { data: rs } = await admin.from("soccer_world_results").select("*").eq("league", me.league).eq("season", st.season);
  const results = (rs ?? []) as ResultRow[];
  const lg = buildLeagueSave(me.league, st.season, results);
  const w = st.next_round < ROUNDS[me.league] ? roundWindow(me.league, st.season, st.next_round) : null;
  const key = `${me.league}-${st.season}-${st.next_round}`;
  const mv = view(me);
  return {
    ...base,
    me: { ...mv, xp: me.xp, xpMax: xpFor(me.ovr), form: me.form ?? [], missions: me.data?.missions ?? [], offers: me.data?.offers ?? [], moveTo: me.data?.moveTo ?? null, news: me.data?.news ?? [], history: me.data?.history ?? [], total: me.data?.total ?? zero(), lastPlayed: me.data?.lastPlayed ?? null },
    league: me.league,
    season: st.season,
    round: st.next_round,
    rounds: ROUNDS[me.league],
    window: w,
    open: !!w && windowOpen(w, now),
    fixtures: lg.fixtures,
    results: Object.fromEntries(results.map((r) => [`${r.round}|${r.idx}`, { hg: r.hg, ag: r.ag }])),
    scorers: topOf(lg.tally, "goals", 8),
    assisters: topOf(lg.tally, "assists", 5),
    playedThis: me.data?.lastPlayed === key,
  };
}

// ------------------------------------------------------------ ações
const NAMES_OK = (s: string) => /^[\p{L}\p{N} .'-]{2,18}$/u.test(s);

export async function joinWorld(admin: SupabaseClient, userId: string, name: string, pos: string, league: string): Promise<{ error?: string }> {
  if (!NAMES_OK(name.trim())) return { error: "Nome inválido (de 2 a 18 letras)." };
  if (!["FW", "MF", "DF"].includes(pos) || !LEAGUES.some((l) => l.key === league)) return { error: "Escolha inválida." };
  const { data: ex } = await admin.from("soccer_world_players").select("user_id").eq("user_id", userId).maybeSingle();
  if (ex) return { error: "Você já está no mundo." };
  const lk = league as LeagueKey;
  const teams = [...LEAGUE_DATA[lk]].sort((a, b) => b.str - a.str);
  const pool = teams.slice(Math.floor(teams.length * 0.4));
  const rng = mulberry(hash(userId) + Date.now() % 100000);
  const team = pool[Math.floor(rng() * pool.length)];
  const used = new Set(team.players.map((p) => p[0]));
  let num = 10 + Math.floor(rng() * 80);
  while (used.has(num)) num++;
  const c = newCareer(name.trim(), pos as "FW" | "MF" | "DF", lk, teams, hash(userId));
  const { error } = await admin.from("soccer_world_players").insert({ user_id: userId, name: name.trim(), pos, num, age: 19, league: lk, team: team.id, ovr: c.ovr, xp: 0, rep: 18, form: [], data: { missions: c.missions, news: [`${name.trim()} chegou ao mundo aberto pelo ${team.name}.`], total: zero(), titles: [], history: [], offers: [] } });
  if (error) return { error: "Não foi possível entrar agora." };
  await feed(admin, [{ user_id: userId, league: lk, kind: "join", text: `${name.trim()} começou a carreira no ${team.name} (${LEAGUES.find((l) => l.key === lk)?.short}).` }]);
  return {};
}

export type MatchReport = { goalsFor: number; goalsAgainst: number; goals: { team: 0 | 1; name: string; assist?: string; at: number }[]; mine: { goals: number; assists: number; own: number } };

export async function submitMatch(admin: SupabaseClient, userId: string, rep: MatchReport, now = Date.now()): Promise<{ error?: string; summary?: { rating: number; xp: number; official: boolean; levelUps: number; doneMissions: string[]; line: string } }> {
  await advanceWorld(admin, now);
  const { data: p } = await admin.from("soccer_world_players").select("*").eq("user_id", userId).maybeSingle<WorldPlayerRow>();
  if (!p) return { error: "Você ainda não entrou no mundo." };
  const { data: st } = await admin.from("soccer_world_state").select("season, next_round").eq("league", p.league).maybeSingle<{ season: number; next_round: number }>();
  if (!st || st.next_round >= ROUNDS[p.league]) return { error: "Não há rodada agora." };
  const w = roundWindow(p.league, st.season, st.next_round);
  if (!windowOpen(w, now)) return { error: "A janela dos jogos desta rodada não está aberta." };
  const key = `${p.league}-${st.season}-${st.next_round}`;
  if (p.data?.lastPlayed === key) return { error: "Você já jogou esta rodada." };
  const fx = fixturesFor(p.league, st.season)[st.next_round] ?? [];
  const idx = fx.findIndex(([h, a]) => h === p.team || a === p.team);
  if (idx < 0) return { error: "Seu time está de folga nesta rodada." };
  const [h, a] = fx[idx];
  const home = p.team === h;
  const gf = Math.max(0, Math.min(12, Math.floor(rep.goalsFor)));
  const ga = Math.max(0, Math.min(12, Math.floor(rep.goalsAgainst)));
  const mg = Math.max(0, Math.min(gf, Math.floor(rep.mine.goals)));
  const ma = Math.max(0, Math.min(Math.max(0, gf - mg), Math.floor(rep.mine.assists)));
  const own = Math.max(0, Math.min(3, Math.floor(rep.mine.own)));
  const goals: Goal[] = (rep.goals ?? []).slice(0, 24).map((g) => ({ team: (home ? g.team : 1 - g.team) as 0 | 1, name: String(g.name).slice(0, 40), assist: g.assist ? String(g.assist).slice(0, 40) : undefined, at: Math.max(1, Math.min(120, Math.floor(g.at) || 1)) }));
  const hg = home ? gf : ga;
  const ag = home ? ga : gf;
  // o placar oficial da tabela é o do primeiro jogo registrado; se alguém já registrou, este vale só para as suas estatísticas
  const { error: insErr } = await admin.from("soccer_world_results").insert({ league: p.league, season: st.season, round: st.next_round, idx, hg, ag, goals, by_user: userId });
  const official = !insErr;
  const { data: sts } = await admin.from("soccer_world_stats").select("*").eq("user_id", userId).eq("league", p.league).eq("season", st.season).maybeSingle<StatsRow>();
  const c = toSave(p, statsTotals(sts ?? undefined), dummyLg(), st.season);
  const rng = mulberry(hash(key + userId));
  const { save, summary } = applyMatch(c, { goals: mg, assists: ma, own, minutes: 90 }, resultOf(gf, ga), ga, rng);
  await savePlayer(admin, p, save, { lastPlayed: key }, { league: p.league, season: st.season, team: p.team, totals: save.season });
  const tn = (id: string) => TEAM(p.league, id)?.name ?? id;
  const items: { user_id: string; league: string; kind: string; text: string }[] = [];
  const score = home ? `${tn(h)} ${gf} x ${ga} ${tn(a)}` : `${tn(h)} ${ga} x ${gf} ${tn(a)}`;
  if (mg >= 3) items.push({ user_id: userId, league: p.league, kind: "match", text: `Hat-trick de ${p.name}! ${score}` });
  else if (mg >= 1) items.push({ user_id: userId, league: p.league, kind: "match", text: `${p.name} marcou ${mg} ${mg === 1 ? "gol" : "gols"} na rodada ${st.next_round + 1}: ${score}` });
  else if (ma >= 2) items.push({ user_id: userId, league: p.league, kind: "match", text: `${p.name} deu ${ma} assistências: ${score}` });
  if (save.ovr > p.ovr) items.push({ user_id: userId, league: p.league, kind: "level", text: `${p.name} evoluiu para ${save.ovr} de força.` });
  await feed(admin, items);
  return { summary: { rating: summary.rating, xp: summary.xp, official, levelUps: summary.levelUps, doneMissions: summary.doneMissions, line: score } };
}

export async function decideOffer(admin: SupabaseClient, userId: string, team: string | null): Promise<{ error?: string }> {
  const { data: p } = await admin.from("soccer_world_players").select("*").eq("user_id", userId).maybeSingle<WorldPlayerRow>();
  if (!p) return { error: "Você ainda não entrou no mundo." };
  const offers = p.data?.offers ?? [];
  const o = team ? offers.find((x) => x.team === team) : null;
  if (team && !o) return { error: "Essa proposta não existe mais." };
  await admin.from("soccer_world_players").update({ data: { ...(p.data ?? {}), moveTo: o ?? null }, updated_at: new Date().toISOString() }).eq("user_id", userId);
  return {};
}

export async function leaveWorld(admin: SupabaseClient, userId: string): Promise<void> {
  await admin.from("soccer_world_players").delete().eq("user_id", userId);
  await admin.from("soccer_world_stats").delete().eq("user_id", userId);
}
