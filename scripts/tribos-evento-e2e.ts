// Teste do sorteio das tribos: `npx tsx scripts/tribos-evento-e2e.ts`
import { drawTribes, type DrawPerson } from "../src/lib/event/draw";
import { TRIBE_KEYS, type TribeKey } from "../src/lib/event/tribes";

let fails = 0;
const ok = (c: unknown, m: string) => {
  if (!c) {
    fails++;
    console.log("FALHOU:", m);
  }
};
let worstTotal = 0;
let worstElo = 0;
for (let n = 0; n < 400; n++) {
  const elos = 1 + Math.floor(Math.random() * 7);
  const people: DrawPerson[] = [];
  const size = 10 + Math.floor(Math.random() * 70);
  for (let i = 0; i < size; i++) people.push({ id: `u${i}`, role: Math.random() < 0.14 ? "leader" : "cria", eloId: Math.random() < 0.03 ? null : `e${Math.floor(Math.random() * elos)}` });
  const m = drawTribes(people, 1000 + n);
  ok(m.size === people.length, "todo mundo recebe tribo");
  const tot: Record<string, number> = { feras: 0, bravos: 0, reliquias: 0 };
  const perElo = new Map<string, Record<string, number>>();
  for (const p of people) {
    const t = m.get(p.id)!;
    tot[t]++;
    const k = p.eloId ?? "sem";
    const c = perElo.get(k) ?? { feras: 0, bravos: 0, reliquias: 0 };
    c[t]++;
    perElo.set(k, c);
  }
  const d = Math.max(...Object.values(tot)) - Math.min(...Object.values(tot));
  worstTotal = Math.max(worstTotal, d);
  for (const c of perElo.values()) worstElo = Math.max(worstElo, Math.max(...Object.values(c)) - Math.min(...Object.values(c)));
  // determinismo
  const again = drawTribes(people, 1000 + n);
  ok([...m].every(([k, v]) => again.get(k) === v), "mesma semente, mesmo resultado");
}
console.log("maior diferença no total:", worstTotal, "| por Elo:", worstElo);
ok(worstTotal <= 2, "total equilibrado (diferença máxima 2 em populações bagunçadas)");
ok(worstElo <= 1, "cada Elo dividido com diferença máxima de 1");
// quem já tem tribo não muda
const base: DrawPerson[] = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, role: "cria", eloId: "e1" }));
const first = drawTribes(base, 7);
const more = [...base, { id: "novo", role: "cria" as const, eloId: "e1" }];
const next = drawTribes(more, 9, first as Map<string, TribeKey>);
ok(next.size === 1 && TRIBE_KEYS.includes(next.get("novo")!), "só o novo é sorteado");
console.log(fails ? `${fails} falha(s)` : "Sorteio OK");
process.exit(fails ? 1 : 0);
