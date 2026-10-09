// Teste sem navegador do Bible Rush: um jogador aleatório joga todas as fases e os desafios, conferindo as regras a cada passo.
// Rodar: npx tsx scripts/rush-e2e.ts [partidas por fase]
import { RushLevel } from "../src/lib/bible-rush/core/engine";
import { makeRng } from "../src/lib/bible-rush/core/rng";
import { CAMPAIGN, CHALLENGES, LEVELS, challengeLevel } from "../src/lib/bible-rush/data/levels";
import { FEEDS, GUESTS } from "../src/lib/bible-rush/data/items";

const runs = Number(process.argv[2] ?? 30);
const problems = new Map<string, number>();
const bad = (m: string) => problems.set(m, (problems.get(m) ?? 0) + 1);

function check(g: RushLevel, tag: string) {
  if (g.plate.length > g.def.plateMax) bad(`${tag}: bandeja acima do limite`);
  if (![g.t, g.score, g.satisfaction].every(Number.isFinite)) bad(`${tag}: número inválido`);
  if (g.queue.length > g.def.queueCap) bad(`${tag}: fila acima do limite`);
  for (const r of g.queue) {
    if (!(r.patience > 0 && r.patience <= 1.0001)) bad(`${tag}: paciência fora da faixa (${r.patience})`);
    for (const f of r.needs) if (!FEEDS[f]) bad(`${tag}: prato inexistente ${f}`);
    if (!GUESTS[r.guest]) bad(`${tag}: convidado inexistente ${r.guest}`);
    if (r.needs.some((f) => !r.want.includes(f))) bad(`${tag}: pedido incoerente`);
  }
  for (const f of g.plate) if (!g.def.feeds.includes(f)) bad(`${tag}: prato fora do cardápio na bandeja (${f})`);
  if (g.abandoned > g.maxAbandon + 3) bad(`${tag}: abandonos demais sem acabar`);
}

function play(def: ReturnType<typeof challengeLevel>, mode: "campaign" | "survival" | "speed" | "perfect", seed: number, skill: number, tutorial: boolean): RushLevel {
  const g = new RushLevel(def, { seed, mode, tutorial });
  const rnd = makeRng(seed ^ 0x9e3779b9);
  const tag = `${def.id}/${mode}${tutorial ? "/tut" : ""}`;
  let guard = 0;
  while (g.status === "playing" && guard++ < 60 * 60 * 6) {
    // jogador "esperto" (skill) ou aleatório: tenta cumprir o primeiro pedido
    if (rnd() < 0.35) {
      const r = g.queue[Math.floor(rnd() * g.queue.length)];
      if (r && rnd() < skill) {
        for (const f of r.needs) {
          if (g.plate.includes(f)) continue;
          const st = FEEDS[f].station;
          if (st.kind === "direct") g.tapStation(f, 0);
          else {
            const cells = g.cells[f] ?? [];
            const ready = cells.findIndex((c) => c.state === "ready");
            if (ready >= 0) g.tapStation(f, ready);
            else {
              const empty = cells.findIndex((c) => c.state === "empty");
              if (empty >= 0) g.tapStation(f, empty);
              const burnt = cells.findIndex((c) => c.state === "burnt");
              if (burnt >= 0) g.tapStation(f, burnt);
            }
          }
        }
        g.serve(r.id);
      } else {
        // ação aleatória qualquer
        const f = def.feeds[Math.floor(rnd() * def.feeds.length)];
        const cells = g.cells[f];
        g.tapStation(f, cells ? Math.floor(rnd() * cells.length) : 0);
        if (rnd() < 0.3 && g.plate.length) g.discard(Math.floor(rnd() * g.plate.length));
        if (rnd() < 0.4 && g.queue.length) g.serve(g.queue[Math.floor(rnd() * g.queue.length)].id);
      }
    }
    // ações inválidas de propósito
    if (rnd() < 0.02) {
      g.serve(-5);
      g.discard(99);
      g.tapStation("inexistente", 9);
      g.tapStation(def.feeds[0], 99);
    }
    g.update(1 / 30);
    if (guard % 30 === 0) check(g, tag);
  }
  check(g, tag);
  if (g.status === "playing") bad(`${tag}: partida não terminou`);
  if (g.status !== "playing" && !g.result) bad(`${tag}: terminou sem resultado`);
  if (g.result && g.mode === "campaign" && (g.result.stars < 0 || g.result.stars > 3)) bad(`${tag}: estrelas inválidas`);
  return g;
}

let total = 0;
let wins = 0;
for (const ch of CAMPAIGN) {
  if (!ch.level) continue;
  for (let i = 0; i < runs; i++) {
    for (const skill of [0.1, 0.6, 0.95]) {
      const g = play(ch.level, "campaign", 100 + i, skill, i === 0);
      total++;
      if (g.result?.won) wins++;
    }
  }
}
for (const c of CHALLENGES) for (let i = 0; i < runs; i++) play(challengeLevel(c.mode), c.mode, 500 + i, 0.7, false), total++;
for (const l of Object.values(LEVELS)) {
  if (!l.schedule.length && !l.generator) bad(`${l.id}: sem convidados`);
  for (const a of l.schedule) if (!GUESTS[a.guest]) bad(`${l.id}: convidado ${a.guest} não existe`);
  for (const f of l.feeds) if (!FEEDS[f]) bad(`${l.id}: prato ${f} não existe`);
  for (const gid of Object.keys(GUESTS)) for (const f of GUESTS[gid].feeds) if (!FEEDS[f]) bad(`convidado ${gid}: prato ${f} não existe`);
}
console.log(`${total} partidas · vitórias na campanha ${wins}`);
if (problems.size === 0) console.log("NENHUM PROBLEMA");
else for (const [m, c] of problems) console.log(` ${c}× ${m}`);
