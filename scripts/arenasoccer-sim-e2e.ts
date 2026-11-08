// Teste sem navegador do motor da partida do ArenaSoccer (Brasfoot + lances): médias de gols, força contra resultado,
// invariantes (placar bate com os gols, sem NaN, 11 em campo, trocas) e determinismo.
// Rodar: npx tsx scripts/arenasoccer-sim-e2e.ts
import br from "../src/lib/arenasoccer/data/league-br.json";
import en from "../src/lib/arenasoccer/data/league-en.json";
import cup from "../src/lib/arenasoccer/data/cup2026.json";
import { bestFormation, createMatch, FAIR_CHANCES, FORMATIONS, pickLineup, resolveAuto, resultOf, simulateAll, stepMinute, substitute, toPlayer, type Formation, type Match } from "../src/lib/arenasoccer/sim";
import type { RosterPlayer, Team } from "../src/lib/arenasoccer/teams";

const problems = new Map<string, number>();
const bad = (m: string) => problems.set(m, (problems.get(m) ?? 0) + 1);
const squad = (t: Team) => t.players.map((p) => toPlayer(p as RosterPlayer));
const mk = (t: Team) => pickLineup(squad(t), bestFormation(squad(t)));
const find = (list: Team[], name: string) => list.find((t) => t.name === name)!;

function play(a: Team, b: Team, seed: number): Match {
  const m = createMatch([mk(a), mk(b)], seed, null);
  simulateAll(m);
  const goals = m.goals.length;
  if (goals !== m.score[0] + m.score[1]) bad("placar não bate com a lista de gols");
  if (m.lineups.some((l) => l.xi.length !== 11)) bad("escalação sem 11");
  if (m.lineups.some((l) => new Set(l.xi.map((p) => p.name)).size !== 11)) bad("jogador repetido na escalação");
  if (![...m.score, ...m.log.map((l) => l.min)].every(Number.isFinite)) bad("número inválido");
  if (m.min !== 90) bad(`partida terminou no minuto ${m.min}`);
  return m;
}

function series(a: Team, b: Team, n: number) {
  let w = 0, d = 0, l = 0, ga = 0, gb = 0;
  for (let i = 0; i < n; i++) {
    const m = play(a, b, i * 7919 + 13);
    ga += m.score[0]; gb += m.score[1];
    if (m.score[0] > m.score[1]) w++; else if (m.score[0] < m.score[1]) l++; else d++;
  }
  return { w: (w / n) * 100, d: (d / n) * 100, l: (l / n) * 100, ga: ga / n, gb: gb / n };
}
const fmt = (r: ReturnType<typeof series>) => `V ${r.w.toFixed(0)}% E ${r.d.toFixed(0)}% D ${r.l.toFixed(0)}% · gols ${r.ga.toFixed(2)} x ${r.gb.toFixed(2)} (total ${(r.ga + r.gb).toFixed(2)})`;

const BR = br.teams as unknown as Team[];
const EN = en.teams as unknown as Team[];
const CUP = cup.teams as unknown as Team[];
console.log("Flamengo x Chapecoense:", fmt(series(find(BR, "Flamengo"), find(BR, "Chapecoense"), 1500)));
console.log("Chapecoense x Flamengo:", fmt(series(find(BR, "Chapecoense"), find(BR, "Flamengo"), 1500)));
console.log("Palmeiras x Corinthians:", fmt(series(find(BR, "Palmeiras"), find(BR, "Corinthians"), 1500)));
console.log("Man City x Liverpool:", fmt(series(find(EN, "Manchester City"), find(EN, "Liverpool"), 1500)));
console.log("Brasil x Haiti:", fmt(series(find(CUP, "Brasil"), find(CUP, "Haiti"), 1500)));
console.log("Brasil x Argentina:", fmt(series(find(CUP, "Brasil"), find(CUP, "Argentina"), 1500)));

// liga inteira: média de gols por jogo
let tot = 0, n = 0;
for (let i = 0; i < BR.length; i++) for (let j = 0; j < BR.length; j++) if (i !== j) { const m = play(BR[i], BR[j], i * 31 + j); tot += m.score[0] + m.score[1]; n++; }
console.log(`Brasileirão (todos contra todos): ${(tot / n).toFixed(2)} gols por jogo em ${n} jogos`);

// determinismo
const a = play(find(BR, "Flamengo"), find(BR, "Santos"), 4242), b = play(find(BR, "Flamengo"), find(BR, "Santos"), 4242);
if (a.score.join() !== b.score.join() || a.log.length !== b.log.length) bad("não é determinístico");

// trocas e formações
const m = createMatch([mk(find(BR, "Flamengo")), mk(find(BR, "Santos"))], 5, 0);
for (let i = 0; i < 3; i++) if (!substitute(m, 0, 1 + i, i)) bad("troca válida recusada");
if (substitute(m, 0, 5, 0)) bad("quarta troca aceita");
for (const f of Object.keys(FORMATIONS) as Formation[]) {
  const l = pickLineup(squad(find(BR, "Chapecoense")), f);
  if (l.xi.length !== 11 || l.xi.filter((p) => p.pos === "GK").length !== 1) bad(`formação ${f} inválida`);
}
const r = resultOf(a);
if (r.goalsFor + r.goalsAgainst !== a.goals.length) bad("resultOf inconsistente");

// partida entre duas pessoas: mesmo número e mesmos tipos de lance para os dois lados
for (let seed = 1; seed <= 300; seed++) {
  const mm = createMatch([mk(find(BR, "Flamengo")), mk(find(BR, "Chapecoense"))], seed, "both");
  const sch = mm.schedule;
  if (!sch) { bad("agenda justa não criada"); break; }
  const per = [0, 1].map((s) => sch.filter((e) => e.side === s).map((e) => e.kind).sort().join());
  if (per[0] !== per[1]) bad("lados com tipos de lance diferentes");
  if (sch.length !== FAIR_CHANCES * 2) bad("quantidade de lances inesperada");
  if (new Set(sch.map((e) => e.min)).size !== sch.length) bad("dois lances no mesmo minuto");
  if (sch.some((e) => e.min < 3 || e.min > 89 || e.min === 45 || e.min === 46)) bad("lance fora da faixa");
  const got = [0, 0];
  for (;;) {
    const r = stepMinute(mm);
    if (r.chance) { got[r.chance.side]++; resolveAuto(mm, r.chance); }
    if (r.ended === "full" || mm.min >= 90) break;
  }
  if (got[0] !== FAIR_CHANCES || got[1] !== FAIR_CHANCES) bad(`lances jogados ${got.join("x")} em vez de ${FAIR_CHANCES}x${FAIR_CHANCES}`);
}

if (problems.size) { console.log("\nPROBLEMAS:"); for (const [k, v] of problems) console.log(` - ${k} (${v}x)`); process.exit(1); }
console.log("\nOK: sem problemas.");
