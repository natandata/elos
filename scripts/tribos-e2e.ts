// Testes das regras puras do Clash of Tribos (sem banco). Rode: npx tsx scripts/tribos-e2e.ts
import { BUILDINGS, BUILD_KINDS, gemsForResource, gemsForTime, playerLevel, xpForLevel, MAX_TH } from "../src/lib/tribos/data";
import { START_LAYOUT, canPlace, capacity, produced, quoteBuild, quoteUpgrade, speedUpGems, startObstacles, thLevel, type TBuilding, type TState } from "../src/lib/tribos/state";

let fails = 0;
const ok = (c: boolean, m: string) => {
  if (!c) {
    fails++;
    console.log("FALHOU:", m);
  }
};

const now = 1_000_000_000_000;
const mk = (kind: TBuilding["kind"], x: number, y: number, level = 1, extra: Partial<TBuilding> = {}): TBuilding => ({ id: `${kind}${x}${y}`, kind, level, x, y, upTo: null, upEnds: null, upStarted: null, stored: 0, collectedAt: now, ...extra });
const village = (): TBuilding[] => START_LAYOUT.map((l) => mk(l.kind, l.x, l.y));
const state = (bs: TBuilding[], gold = 5000, mana = 5000, gems = 100): TState => ({ player: { tribe: "feras", gold, mana, gems, xp: 0, trophies: 0, rev: 0 }, buildings: bs, serverNow: now });

// vila inicial sem sobreposição, dentro do mapa
const v = village();
for (let i = 0; i < v.length; i++) ok(canPlace(v.filter((_, j) => j !== i), v[i].kind, v[i].x, v[i].y), `vila inicial: ${v[i].kind} não cabe`);
ok(thLevel(v) === 1, "QG nível 1");
ok(capacity(v, "gold") === 1000 + 1500, "capacidade inicial de ouro = QG + cofre");

// obstáculos: determinísticos, sem sobreposição e fora da base
const o1 = startObstacles(123);
const o2 = startObstacles(123);
ok(JSON.stringify(o1) === JSON.stringify(o2), "obstáculos determinísticos");
ok(o1.length >= 20, `obstáculos suficientes (${o1.length})`);
const all = [...v, ...o1.map((o, i) => mk(o.kind, o.x, o.y, 1, { id: `ob${i}` }))];
for (const b of all) ok(canPlace(all.filter((x) => x.id !== b.id), b.kind, b.x, b.y), `sobreposição em ${b.kind} ${b.x},${b.y}`);

// produção
const mine = mk("gold_mine", 0, 0, 1, { collectedAt: now - 3_600_000 });
ok(Math.round(produced(mine, now)) === 200, "mina nível 1 produz 200/h");
ok(produced(mk("gold_mine", 0, 0, 1, { collectedAt: now - 99 * 3_600_000 }), now) === 500, "mina para na capacidade");
const upg = mk("gold_mine", 0, 0, 1, { stored: 120, upTo: 2, upEnds: now + 60_000, upStarted: now, collectedAt: now });
ok(produced(upg, now + 30_000) === 120, "em obra: não produz, mantém o guardado");

// construir e melhorar
let s = state(village());
ok(quoteBuild(s, "gold_mine", now).ok, "pode construir 2ª mina no QG1");
ok(!quoteBuild(s, "hq", now).ok, "não constrói QG");
s = state([...village(), mk("gold_mine", 5, 5), mk("gold_mine", 5, 9)]);
ok(!quoteBuild(s, "gold_mine", now).ok, "limite de 3 minas no QG1");
const hut3 = quoteBuild(state(village()), "hut", now);
ok(hut3.ok && hut3.pay === "gems" && hut3.cost === 250, "3ª cabana custa 250 gemas");
// obreiros ocupados
const busyState = state([...village().map((b) => (b.kind === "gold_mine" ? { ...b, upTo: 2, upEnds: now + 5000, upStarted: now } : b))]);
ok(busyState.buildings.filter((b) => b.upEnds).length === 1, "1 obra");
const mana = busyState.buildings.find((b) => b.kind === "mana_pump")!;
ok(quoteUpgrade(busyState, mana, now).ok, "ainda tem 1 obreiro livre");
const twoBusy = state(busyState.buildings.map((b) => (b.kind === "mana_pump" ? { ...b, upTo: 2, upEnds: now + 5000, upStarted: now } : b)));
ok(!quoteUpgrade(twoBusy, twoBusy.buildings.find((b) => b.kind === "gold_store")!, now).ok, "sem obreiro livre");
// teto por QG
const m = village().find((b) => b.kind === "gold_mine")!;
const m2 = { ...m, level: 2 };
const st2 = state(village().map((b) => (b.id === m.id ? m2 : b)));
const q = quoteUpgrade(st2, m2, now);
ok(!q.ok && /Salão da Tribo/.test(q.error ?? ""), "mina 2 não passa para 3 sem QG 2");
// QG sobe até MAX_TH
let hq = village().find((b) => b.kind === "hq")!;
for (let lvl = 1; lvl < MAX_TH; lvl++) {
  const qq = quoteUpgrade(state(village().map((b) => (b.kind === "hq" ? { ...hq, level: lvl } : b)), 10 ** 9), { ...hq, level: lvl }, now);
  ok(qq.ok && qq.to === lvl + 1, `QG ${lvl} → ${lvl + 1}`);
}
hq = { ...hq, level: MAX_TH };
ok(!quoteUpgrade(state(village().map((b) => (b.kind === "hq" ? hq : b))), hq, now).ok, "QG máximo");

// faltou recurso → gemas
const poor = state(village(), 0, 0, 500);
const qp = quoteUpgrade(poor, poor.buildings.find((b) => b.kind === "mana_pump")!, now);
ok(qp.ok && qp.missing > 0 && qp.gemsForMissing >= 1, "falta recurso vira gemas");

// gemas
ok(gemsForTime(1) === 1 && gemsForTime(60) === 1, "1 gema por até 1 min");
ok(gemsForTime(3600) === 20, `1 hora = 20 gemas (${gemsForTime(3600)})`);
ok(gemsForTime(86400) === 260, `1 dia = 260 (${gemsForTime(86400)})`);
ok(gemsForTime(7 * 86400) === 1000, `1 semana = 1000 (${gemsForTime(7 * 86400)})`);
let prev = 0;
for (let t = 0; t < 10 * 86400; t += 997) {
  const g = gemsForTime(t);
  ok(g >= prev, "gemas crescem com o tempo");
  prev = g;
}
ok(gemsForResource(100) === 1 && gemsForResource(0) === 0, "recurso: 100 = 1 gema");
ok(gemsForResource(100_000) > 200 && gemsForResource(100_000) < 320, `100k ≈ 260 gemas (${gemsForResource(100_000)})`);
ok(speedUpGems(mk("hq", 0, 0, 1, { upEnds: now + 3600_000 }), now) === 20, "acelerar 1h = 20 gemas");

// níveis do jogador
ok(playerLevel(0) === 1 && playerLevel(50) === 2 && playerLevel(150) === 3 && playerLevel(149) === 2, "níveis do jogador");
ok(xpForLevel(5) === 500, "XP do nível 5");

// tabelas coerentes
for (const k of BUILD_KINDS) {
  const d = BUILDINGS[k];
  for (let th = 1; th <= MAX_TH; th++) ok(d.maxLevel[th - 1] <= d.levels.length, `${k}: nível máx. do QG${th} existe`);
  for (let i = 1; i < d.levels.length; i++) {
    ok(d.levels[i].cost >= d.levels[i - 1].cost, `${k}: custo cresce`);
    ok(d.levels[i].secs >= d.levels[i - 1].secs, `${k}: tempo cresce`);
  }
}

console.log(fails ? `${fails} falhas` : "Tudo certo");
process.exit(fails ? 1 : 0);
