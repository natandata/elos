// Teste sem navegador da Arena dos Heróis: partidas inteiras (modo normal, campanha em todas as arenas e níveis, duplas),
// conferindo invariantes (sem NaN, tudo dentro do campo, maná e coroas válidos), fim da partida e determinismo.
// Rodar: npx tsx scripts/arena-e2e.ts
import { ARENA_CARD_BY_KEY, ARENA_CARDS } from "../src/lib/arena/cards";
import { CAMPAIGN_DECK, CAMPAIGN_STAGES, CAMPAIGN_TIERS, stageBoost } from "../src/lib/arena/campaign";
import { DECK_SIZE, H, MANA_MAX, MAX_MATCH_TICKS, W, type GameState } from "../src/lib/arena/core";
import { createGame, createGameDuo, step, stateHash } from "../src/lib/arena/engine";
import { simulate } from "../src/lib/arena/sim";

const problems = new Map<string, number>();
const bad = (m: string) => problems.set(m, (problems.get(m) ?? 0) + 1);

function check(s: GameState, tag: string) {
  for (const e of s.entities) {
    if (![e.x, e.y, e.hp, e.maxHp, e.px, e.py].every(Number.isFinite)) bad(`${tag}: número inválido em ${e.card}`);
    if (e.x < -2 || e.x > W + 2 || e.y < -2 || e.y > H + 2) bad(`${tag}: ${e.card} fora do campo (${e.x.toFixed(1)}, ${e.y.toFixed(1)})`);
    if (e.hp > e.maxHp * 1.001 + 1) bad(`${tag}: ${e.card} com vida acima do máximo`);
  }
  for (const m of s.mana) if (!(m >= 0 && m <= MANA_MAX + 1e-6)) bad(`${tag}: maná fora da faixa ${m}`);
  if (s.crowns[0] > 3 || s.crowns[1] > 3) bad(`${tag}: coroas > 3`);
  for (const sl of s.slots) if (sl.length !== 4 || sl.some((k) => !ARENA_CARD_BY_KEY.has(k))) bad(`${tag}: mão inválida ${sl.join(",")}`);
}

function runBots(seed: number, deck: string[], botDeck: string[] | undefined, opts: Parameters<typeof createGame>[3], tag: string): GameState {
  const s = createGame(seed, deck, botDeck, opts);
  let guard = 0;
  while (!s.over && guard++ < MAX_MATCH_TICKS + 5) {
    step(s, [], [0, 1]);
    if (s.tick % 40 === 0) check(s, tag);
  }
  check(s, tag);
  if (!s.over) bad(`${tag}: partida não terminou`);
  return s;
}

// ------------------------------------------------ cartas
ok(ARENA_CARDS.length >= 8, "poucas cartas");
function ok(c: boolean, m: string) {
  if (!c) bad(m);
}
for (const c of ARENA_CARD_BY_KEY.values()) {
  ok(c.cost >= 1 && c.cost <= 10, `custo estranho em ${c.key}`);
  ok((c.hp ?? 0) > 0, `${c.key} sem vida`);
}

// ------------------------------------------------ modo normal: cada carta jogando sozinha em baralho repetido
let n = 0;
for (const card of ARENA_CARDS) {
  const deck = Array.from({ length: DECK_SIZE }, (_, i) => ARENA_CARDS[(ARENA_CARDS.indexOf(card) + i) % ARENA_CARDS.length].key);
  runBots(1000 + n++, deck, undefined, { arena: 3 }, `normal ${card.key}`);
}

// ------------------------------------------------ campanha: todas as arenas e níveis, os dois lados jogados pelo computador
const results: string[] = [];
for (const [i, st] of CAMPAIGN_STAGES.entries()) {
  for (let tier = 0; tier < CAMPAIGN_TIERS; tier++) {
    const boss = [st.boss, ...CAMPAIGN_DECK.filter((k) => k !== st.boss)].slice(0, DECK_SIZE);
    const s = runBots(7000 + i * 10 + tier, CAMPAIGN_DECK, boss, { botBoost: stageBoost(i, tier) }, `campanha ${i + 1}/${tier}`);
    results.push(`${i + 1}.${tier}:${s.winner === null ? "empate" : s.winner}`);
  }
}

// ------------------------------------------------ determinismo (o servidor refaz a partida)
for (const seed of [11, 22, 33]) {
  const a = simulate(seed, CAMPAIGN_DECK, [], { arena: 2 });
  const b = simulate(seed, CAMPAIGN_DECK, [], { arena: 2 });
  ok(a.hash === b.hash && a.ticks === b.ticks && a.winner === b.winner, `partida não determinística (seed ${seed})`);
}

// ------------------------------------------------ duplas (4 baralhos) e PvP
const duo = createGameDuo(5, [CAMPAIGN_DECK, CAMPAIGN_DECK, ARENA_CARDS.slice(0, 8).map((c) => c.key), ARENA_CARDS.slice(1, 9).map((c) => c.key)]);
let g = 0;
while (!duo.over && g++ < MAX_MATCH_TICKS + 5) step(duo, [], [0, 1]);
check(duo, "duplas");
ok(duo.over, "duplas não terminou");
const pvp = createGame(9, CAMPAIGN_DECK, CAMPAIGN_DECK, { pvp: true });
g = 0;
while (!pvp.over && g++ < MAX_MATCH_TICKS + 5) step(pvp, [], [0, 1]);
ok(pvp.over, "pvp não terminou");
ok(stateHash(pvp) === stateHash(pvp), "hash instável");

console.log("campanha (arena.nível:vencedor):", results.join("  "));
if (problems.size === 0) console.log("NENHUM PROBLEMA");
else {
  console.log("PROBLEMAS:");
  for (const [m, c] of problems) console.log(` ${c}× ${m}`);
}
