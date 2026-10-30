import { TRIBE_KEYS, type TribeKey } from "./tribes";

// Sorteio equilibrado das tribos: cada Elo é dividido o mais igual possível entre as 3 e o total também.
// Líderes primeiro (espalhados, separando líderes do mesmo Elo); depois os crias, Elo por Elo (os maiores primeiro).

export type DrawPerson = { id: string; role: "cria" | "leader"; eloId: string | null };

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawTribes(people: DrawPerson[], seed: number, existing: Map<string, TribeKey> = new Map()): Map<string, TribeKey> {
  const rand = rng(seed);
  const total: Record<TribeKey, number> = { feras: 0, bravos: 0, reliquias: 0 };
  const byElo = new Map<string, Record<TribeKey, number>>();
  const eloKey = (p: DrawPerson) => p.eloId ?? "sem-elo";
  const counts = (e: string) => {
    let c = byElo.get(e);
    if (!c) byElo.set(e, (c = { feras: 0, bravos: 0, reliquias: 0 }));
    return c;
  };
  const out = new Map<string, TribeKey>();
  const put = (p: DrawPerson, t: TribeKey) => {
    counts(eloKey(p))[t]++;
    total[t]++;
    out.set(p.id, t);
  };
  const choose = (p: DrawPerson): TribeKey => {
    const c = counts(eloKey(p));
    return [...TRIBE_KEYS].map((k) => ({ k, r: rand() })).sort((a, b) => c[a.k] - c[b.k] || total[a.k] - total[b.k] || a.r - b.r)[0].k;
  };
  const shuffle = <T,>(l: T[]) => {
    const a = [...l];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // quem já tem tribo conta no equilíbrio e não muda
  for (const p of people) {
    const t = existing.get(p.id);
    if (t) {
      counts(eloKey(p))[t]++;
      total[t]++;
    }
  }
  const todo = people.filter((p) => !existing.has(p.id));
  for (const p of shuffle(todo.filter((p) => p.role === "leader"))) put(p, choose(p));
  const groups = new Map<string, DrawPerson[]>();
  for (const p of todo.filter((p) => p.role === "cria")) groups.set(eloKey(p), [...(groups.get(eloKey(p)) ?? []), p]);
  for (const [, list] of [...groups].sort((a, b) => b[1].length - a[1].length)) for (const p of shuffle(list)) put(p, choose(p));
  return out;
}
