// Clash of Tribos: estado da vila e regras (puras). A tela usa para mostrar; o servidor usa para decidir.

import {
  BUILDINGS, GRID, HUT_GEM_COST, MAX_TH, OBSTACLES, countFor, gemsForResource, gemsForTime, isBuild, isObstacle, levelDef, maxLevelFor, sizeOf,
  type BuildKind, type Kind, type Res, type TribeKey,
} from "./data";

export type TBuilding = {
  id: string;
  kind: Kind;
  /** nível concluído (0 = ainda em obra) */
  level: number;
  x: number;
  y: number;
  /** nível alvo da obra em andamento; 0 = obstáculo sendo removido */
  upTo: number | null;
  /** quando a obra termina (ms desde 1970) */
  upEnds: number | null;
  upStarted: number | null;
  /** coletores: o que já estava guardado ao parar de produzir */
  stored: number;
  collectedAt: number;
};

export type TPlayer = { tribe: TribeKey; gold: number; mana: number; gems: number; xp: number; trophies: number; rev: number };
export type TState = { player: TPlayer; buildings: TBuilding[]; serverNow: number };

export const inProgress = (b: TBuilding, now: number): boolean => b.upEnds !== null && b.upEnds > now;

/** Nível do Salão da Tribo (o maior concluído). */
export function thLevel(bs: TBuilding[]): number {
  return Math.max(1, ...bs.filter((b) => b.kind === "hq").map((b) => b.level));
}

export const builderCount = (bs: TBuilding[]): number => bs.filter((b) => b.kind === "hut" && b.level >= 1).length;
export const busyCount = (bs: TBuilding[], now: number): number => bs.filter((b) => inProgress(b, now)).length;

/** Capacidade de armazenamento de ouro ou maná. */
export function capacity(bs: TBuilding[], res: "gold" | "mana"): number {
  let cap = 0;
  for (const b of bs) {
    if (b.level < 1 || !isBuild(b.kind)) continue;
    const def = BUILDINGS[b.kind];
    const ld = levelDef(b.kind, b.level);
    if (!ld?.cap) continue;
    if (b.kind === "hq" || def.stores === res) cap += ld.cap;
  }
  return cap;
}

/** Quanto o coletor tem guardado agora (para coletar). */
export function produced(b: TBuilding, now: number): number {
  if (!isBuild(b.kind)) return 0;
  const def = BUILDINGS[b.kind];
  if (!def.makes || b.level < 1) return 0;
  const ld = levelDef(b.kind, b.level);
  if (!ld?.rate || !ld.cap) return 0;
  if (inProgress(b, now)) return Math.min(ld.cap, b.stored);
  return Math.min(ld.cap, b.stored + (ld.rate * Math.max(0, now - b.collectedAt)) / 3_600_000);
}

export function footprint(kind: string, x: number, y: number): { x0: number; y0: number; x1: number; y1: number } {
  const s = sizeOf(kind);
  return { x0: x, y0: y, x1: x + s - 1, y1: y + s - 1 };
}

/** Cabe no terreno, sem pisar em outra construção? */
export function canPlace(bs: TBuilding[], kind: string, x: number, y: number, ignoreId?: string): boolean {
  const f = footprint(kind, x, y);
  if (f.x0 < 0 || f.y0 < 0 || f.x1 >= GRID || f.y1 >= GRID) return false;
  for (const b of bs) {
    if (b.id === ignoreId) continue;
    const g = footprint(b.kind, b.x, b.y);
    if (f.x0 <= g.x1 && f.x1 >= g.x0 && f.y0 <= g.y1 && f.y1 >= g.y0) return false;
  }
  return true;
}

export type Quote = {
  ok: boolean;
  error?: string;
  pay: Res;
  /** custo base no recurso `pay` */
  cost: number;
  secs: number;
  /** nível alvo */
  to: number;
  /** quanto falta no recurso (ouro/maná) */
  missing: number;
  /** gemas para cobrir o que falta */
  gemsForMissing: number;
};

const bad = (error: string): Quote => ({ ok: false, error, pay: "gold", cost: 0, secs: 0, to: 0, missing: 0, gemsForMissing: 0 });

function withFunds(p: TPlayer, pay: Res, cost: number, secs: number, to: number): Quote {
  const have = pay === "gold" ? p.gold : pay === "mana" ? p.mana : p.gems;
  const missing = Math.max(0, cost - have);
  return { ok: true, pay, cost, secs, to, missing, gemsForMissing: pay === "gems" ? 0 : gemsForResource(missing) };
}

/** Pode construir uma nova? Devolve o preço e o tempo. */
export function quoteBuild(s: TState, kind: string, now: number): Quote {
  if (!isBuild(kind) || kind === "hq") return bad("Construção inválida.");
  const def = BUILDINGS[kind];
  const th = thLevel(s.buildings);
  const have = s.buildings.filter((b) => b.kind === kind).length;
  if (have >= countFor(kind, th)) return bad("Você já tem o máximo desta construção. Melhore o Salão da Tribo para liberar mais.");
  if (busyCount(s.buildings, now) >= builderCount(s.buildings) && def.levels[0].secs > 0) return bad("Todos os obreiros estão ocupados.");
  if (kind === "hut") return withFunds(s.player, "gems", HUT_GEM_COST[have] ?? 1000, 0, 1);
  const ld = def.levels[0];
  return withFunds(s.player, def.pay, ld.cost, ld.secs, 1);
}

/** Pode melhorar esta construção? */
export function quoteUpgrade(s: TState, b: TBuilding, now: number): Quote {
  if (!isBuild(b.kind) || b.kind === "hut") return bad("Esta construção não pode ser melhorada.");
  if (b.level < 1 || inProgress(b, now)) return bad("Esta construção está em obras.");
  const th = thLevel(s.buildings);
  const to = b.level + 1;
  const def = BUILDINGS[b.kind];
  const ld = levelDef(b.kind, to);
  if (!ld) return bad("Nível máximo.");
  if (b.kind === "hq" ? to > MAX_TH : to > maxLevelFor(b.kind, th)) {
    return bad(b.kind === "hq" ? "O Salão da Tribo já está no nível máximo desta fase." : `Precisa do Salão da Tribo nível ${th + 1} para passar do nível ${b.level}.`);
  }
  if (busyCount(s.buildings, now) >= builderCount(s.buildings)) return bad("Todos os obreiros estão ocupados.");
  return withFunds(s.player, def.pay, ld.cost, ld.secs, to);
}

export function quoteRemove(s: TState, b: TBuilding, now: number): Quote {
  if (!isObstacle(b.kind)) return bad("Isto não é um obstáculo.");
  if (inProgress(b, now)) return bad("Já está sendo removido.");
  if (busyCount(s.buildings, now) >= builderCount(s.buildings)) return bad("Todos os obreiros estão ocupados.");
  const o = OBSTACLES[b.kind];
  return withFunds(s.player, "gold", o.cost, o.secs, 0);
}

/** Gemas para acelerar a obra de uma construção (0 se não está em obra). */
export function speedUpGems(b: TBuilding, now: number): number {
  if (!inProgress(b, now) || b.upEnds === null) return 0;
  return gemsForTime((b.upEnds - now) / 1000);
}

export const kindName = (k: Kind): string => (isBuild(k) ? BUILDINGS[k].name : isObstacle(k) ? OBSTACLES[k].name : k);
export const kindEmoji = (k: Kind): string => (isBuild(k) ? BUILDINGS[k].emoji : isObstacle(k) ? OBSTACLES[k].emoji : "❔");

/** Posição inicial da vila de quem acabou de escolher a tribo. */
export const START_LAYOUT: { kind: BuildKind; x: number; y: number }[] = [
  { kind: "hq", x: 18, y: 18 },
  { kind: "hut", x: 15, y: 14 },
  { kind: "hut", x: 23, y: 14 },
  { kind: "gold_mine", x: 11, y: 19 },
  { kind: "mana_pump", x: 26, y: 19 },
  { kind: "gold_store", x: 15, y: 24 },
  { kind: "mana_store", x: 22, y: 24 },
];

/** Gerador pseudo-aleatório simples (determinístico por semente). */
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Obstáculos espalhados fora da área inicial, sem sobreposição. */
export function startObstacles(seed: number, count = 28): { kind: Kind; x: number; y: number }[] {
  const r = rng(seed);
  const placed: TBuilding[] = START_LAYOUT.map((l, i) => ({ id: `s${i}`, kind: l.kind, level: 1, x: l.x, y: l.y, upTo: null, upEnds: null, upStarted: null, stored: 0, collectedAt: 0 }));
  const out: { kind: Kind; x: number; y: number }[] = [];
  let tries = 0;
  while (out.length < count && tries++ < 600) {
    const kind = (["bush", "bush", "tree", "tree", "rock"] as const)[Math.floor(r() * 5)];
    const x = Math.floor(r() * GRID);
    const y = Math.floor(r() * GRID);
    // deixa respirar em volta da base inicial
    if (x > 8 && x < 33 && y > 10 && y < 30) continue;
    if (!canPlace(placed, kind, x, y)) continue;
    placed.push({ id: `o${out.length}`, kind, level: 1, x, y, upTo: null, upEnds: null, upStarted: null, stored: 0, collectedAt: 0 });
    out.push({ kind, x, y });
  }
  return out;
}
