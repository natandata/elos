// Teste da trava alternada (leitura x vídeo): `npx tsx scripts/video-gate-e2e.ts`
import { gateKindFor } from "../src/lib/games/bibleGate";
import { BLOCK_SEC, WatchTracker, blocksBetween } from "../src/lib/video/tracker";

let fails = 0;
const ok = (cond: unknown, msg: string) => {
  if (!cond) {
    fails++;
    console.log("FALHOU:", msg);
  }
};
const eq = (a: unknown, b: unknown, msg: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)})`);

// ---------------------------------------------------------------- alternância (igual ao banco: gate_kind)
eq(gateKindFor("2026-01-01"), "reading", "01/01/2026 é dia de leitura");
eq(gateKindFor("2026-01-02"), "video", "02/01 é dia de vídeo");
eq(gateKindFor("2026-10-26"), "reading", "hoje (26/10/2026) é leitura");
eq(gateKindFor("2026-10-27"), "video", "amanhã é vídeo");
eq(gateKindFor("2026-10-28"), "reading", "depois de amanhã é leitura");
let alternates = true;
for (let d = 1; d < 60; d++) {
  const a = gateKindFor(new Date(Date.UTC(2026, 9, d, 12)).toISOString().slice(0, 10));
  const b = gateKindFor(new Date(Date.UTC(2026, 9, d + 1, 12)).toISOString().slice(0, 10));
  if (a === b) alternates = false;
}
ok(alternates, "nunca dois dias seguidos do mesmo tipo (inclui virada de mês e de ano)");
eq(gateKindFor("2027-01-01"), "video", "01/01/2027 continua a sequência (365 dias depois = ímpar)");

// ---------------------------------------------------------------- blocos assistidos
eq(blocksBetween(0, 1), [0], "avanço normal no mesmo bloco");
eq(blocksBetween(4, 6), [0, 1], "atravessou o limite de bloco");
eq(blocksBetween(10, 100), [20], "pulo para frente só marca onde pousou");
eq(blocksBetween(100, 50), [10], "voltar marca só onde está");

const t = new WatchTracker();
for (let s = 0; s <= 12; s++) t.step(s);
eq(t.take(), [0, 1, 2], "12 s contínuos = blocos 0, 1 e 2");
eq(t.take(), [], "depois de entregar, a fila esvazia");
t.step(60);
t.step(300); // pulo
eq(t.take(), [12, 60], "o pulo de 60 s para 300 s não marca o meio");
t.step(20);
t.breakRun();
t.step(30);
eq(t.take(), [4, 6], "depois de pausar, recomeça sem ligar os pontos");
t.giveBack([1, 2]);
eq(t.size, 2, "blocos devolvidos voltam para a fila");

// vídeo de 100 s assistido de ponta a ponta, uma leitura por segundo
const full = new WatchTracker();
const seen = new Set<number>();
for (let s = 0; s <= 100; s++) {
  full.step(s);
  if (s % 5 === 0) for (const b of full.take()) seen.add(b);
}
for (const b of full.take()) seen.add(b);
ok(seen.size >= Math.ceil(100 / BLOCK_SEC) * 0.95, "assistir tudo cobre pelo menos 95% dos blocos");
ok(![...seen].some((b) => b > 20), "nenhum bloco fora do vídeo");

console.log(fails ? `\n${fails} falha(s)` : "Trava de vídeo OK");
process.exit(fails ? 1 : 0);
