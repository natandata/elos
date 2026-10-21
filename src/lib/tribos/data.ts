// Clash of Tribos: conteúdo e regras puras (client-safe). Números em segundos, ouro, maná e gemas.
// Mexa aqui para equilibrar. O servidor e a tela usam as mesmas funções.

export type TribeKey = "feras" | "bravos" | "reliquias";

export const TRIBES: Record<TribeKey, { name: string; mascot: string; animal: string; color: string; dark: string; tint: string; blurb: string }> = {
  feras: { name: "Feras", mascot: "🐆", animal: "Onça", color: "#f5b301", dark: "#a87500", tint: "#e9d9a0", blurb: "Rápidas e ferozes. Atacam primeiro e não pedem licença." },
  bravos: { name: "Bravos", mascot: "🦈", animal: "Tubarão", color: "#22a559", dark: "#127038", tint: "#b9e0c0", blurb: "Frios e persistentes. Quem entra no mar deles não sai." },
  reliquias: { name: "Relíquias", mascot: "🐼", animal: "Panda", color: "#e0443e", dark: "#9b231f", tint: "#ecc0b8", blurb: "Guardiãs de tesouros antigos. Calmas, mas inabaláveis." },
};
export const TRIBE_KEYS = Object.keys(TRIBES) as TribeKey[];
export const isTribe = (v: unknown): v is TribeKey => typeof v === "string" && (TRIBE_KEYS as string[]).includes(v);

export type Res = "gold" | "mana" | "gems";
export const RES_LABEL: Record<Res, string> = { gold: "Ouro", mana: "Maná", gems: "Gemas" };
export const RES_EMOJI: Record<Res, string> = { gold: "🪙", mana: "💧", gems: "💎" };

export const GRID = 40;
export const MAX_TH = 5;
export const START = { gold: 1500, mana: 1500, gems: 250 };

export type BuildKind = "hq" | "gold_mine" | "mana_pump" | "gold_store" | "mana_store" | "hut";
export type ObstacleKind = "bush" | "tree" | "rock";
export type Kind = BuildKind | ObstacleKind;

export type LevelDef = {
  cost: number;
  /** segundos para construir/melhorar até este nível */
  secs: number;
  /** produção por hora (coletores) */
  rate?: number;
  /** capacidade (coletor guarda; cofre/QG armazena) */
  cap?: number;
  /** nível do QG necessário */
  th?: number;
};

export type BuildDef = {
  kind: BuildKind;
  name: string;
  emoji: string;
  size: number;
  /** recurso usado para pagar (construir e melhorar) */
  pay: "gold" | "mana" | "gems";
  /** produz este recurso */
  makes?: "gold" | "mana";
  /** guarda este recurso */
  stores?: "gold" | "mana";
  desc: string;
  levels: LevelDef[];
  /** quantidade máxima por nível do QG (índice 0 = QG 1) */
  count: number[];
  /** nível máximo permitido por nível do QG */
  maxLevel: number[];
};

const L = (cost: number, secs: number, extra: Partial<LevelDef> = {}): LevelDef => ({ cost, secs, ...extra });

export const BUILDINGS: Record<BuildKind, BuildDef> = {
  hq: {
    kind: "hq", name: "Salão da Tribo", emoji: "🏛️", size: 4, pay: "gold",
    desc: "O coração da vila. Melhorá-lo libera construções e níveis novos.",
    levels: [L(0, 0, { cap: 1000 }), L(1000, 300, { cap: 2000 }), L(4000, 10800, { cap: 4000 }), L(25000, 21600, { cap: 8000 }), L(150000, 86400, { cap: 12000 })],
    count: [1, 1, 1, 1, 1], maxLevel: [1, 2, 3, 4, 5],
  },
  gold_mine: {
    kind: "gold_mine", name: "Mina de Ouro", emoji: "⛏️", size: 3, pay: "mana", makes: "gold",
    desc: "Produz ouro sozinha. Toque para coletar.",
    levels: [
      L(150, 10, { rate: 200, cap: 500 }), L(300, 60, { rate: 400, cap: 1000 }), L(700, 900, { rate: 600, cap: 1500 }), L(1400, 3600, { rate: 800, cap: 2500 }),
      L(3000, 7200, { rate: 1000, cap: 10000 }), L(7000, 21600, { rate: 1300, cap: 20000 }), L(14000, 43200, { rate: 1600, cap: 30000 }), L(28000, 86400, { rate: 1900, cap: 50000 }),
      L(56000, 172800, { rate: 2200, cap: 75000 }), L(84000, 259200, { rate: 2500, cap: 100000 }),
    ],
    count: [3, 4, 5, 6, 6], maxLevel: [2, 4, 6, 8, 10],
  },
  mana_pump: {
    kind: "mana_pump", name: "Poço de Maná", emoji: "💧", size: 3, pay: "gold", makes: "mana",
    desc: "Bombeia maná sozinho. Toque para coletar.",
    levels: [
      L(150, 10, { rate: 200, cap: 500 }), L(300, 60, { rate: 400, cap: 1000 }), L(700, 900, { rate: 600, cap: 1500 }), L(1400, 3600, { rate: 800, cap: 2500 }),
      L(3000, 7200, { rate: 1000, cap: 10000 }), L(7000, 21600, { rate: 1300, cap: 20000 }), L(14000, 43200, { rate: 1600, cap: 30000 }), L(28000, 86400, { rate: 1900, cap: 50000 }),
      L(56000, 172800, { rate: 2200, cap: 75000 }), L(84000, 259200, { rate: 2500, cap: 100000 }),
    ],
    count: [3, 4, 5, 6, 6], maxLevel: [2, 4, 6, 8, 10],
  },
  gold_store: {
    kind: "gold_store", name: "Cofre de Ouro", emoji: "🏦", size: 3, pay: "mana", stores: "gold",
    desc: "Guarda mais ouro. Sem espaço, a coleta trava.",
    levels: [L(300, 60, { cap: 1500 }), L(750, 1800, { cap: 3000 }), L(1500, 3600, { cap: 6000 }), L(3000, 7200, { cap: 12000 }), L(6000, 10800, { cap: 25000 }), L(12000, 21600, { cap: 45000 }), L(25000, 43200, { cap: 100000 }), L(50000, 86400, { cap: 225000 }), L(100000, 172800, { cap: 450000 })],
    count: [1, 1, 2, 2, 2], maxLevel: [1, 3, 6, 8, 9],
  },
  mana_store: {
    kind: "mana_store", name: "Reservatório de Maná", emoji: "🛢️", size: 3, pay: "gold", stores: "mana",
    desc: "Guarda mais maná. Sem espaço, a coleta trava.",
    levels: [L(300, 60, { cap: 1500 }), L(750, 1800, { cap: 3000 }), L(1500, 3600, { cap: 6000 }), L(3000, 7200, { cap: 12000 }), L(6000, 10800, { cap: 25000 }), L(12000, 21600, { cap: 45000 }), L(25000, 43200, { cap: 100000 }), L(50000, 86400, { cap: 225000 }), L(100000, 172800, { cap: 450000 })],
    count: [1, 1, 2, 2, 2], maxLevel: [1, 3, 6, 8, 9],
  },
  hut: {
    kind: "hut", name: "Cabana do Obreiro", emoji: "🛖", size: 2, pay: "gems",
    desc: "Cada cabana é um obreiro a mais: constrói e melhora ao mesmo tempo.",
    levels: [L(0, 0)],
    count: [5, 5, 5, 5, 5], maxLevel: [1, 1, 1, 1, 1],
  },
};
export const BUILD_KINDS = Object.keys(BUILDINGS) as BuildKind[];

/** Obreiros: começam com 2; a 3ª, 4ª e 5ª cabanas custam gemas. */
export const START_BUILDERS = 2;
export const HUT_GEM_COST = [0, 0, 250, 500, 1000];

export const OBSTACLES: Record<ObstacleKind, { name: string; emoji: string; size: number; cost: number; secs: number; xp: number }> = {
  bush: { name: "Arbusto", emoji: "🌿", size: 1, cost: 20, secs: 10, xp: 1 },
  tree: { name: "Árvore", emoji: "🌳", size: 2, cost: 100, secs: 30, xp: 3 },
  rock: { name: "Pedra", emoji: "🪨", size: 2, cost: 300, secs: 90, xp: 6 },
};
export const OBSTACLE_KINDS = Object.keys(OBSTACLES) as ObstacleKind[];
export const OBSTACLE_GEM_CHANCE = 0.14;

export const isObstacle = (k: string): k is ObstacleKind => k in OBSTACLES;
export const isBuild = (k: string): k is BuildKind => k in BUILDINGS;
export const sizeOf = (k: string): number => (isBuild(k) ? BUILDINGS[k].size : isObstacle(k) ? OBSTACLES[k].size : 1);

/** Nível definido (1 = primeiro). */
export const levelDef = (k: BuildKind, level: number): LevelDef | null => BUILDINGS[k].levels[level - 1] ?? null;
export const maxLevelFor = (k: BuildKind, th: number): number => BUILDINGS[k].maxLevel[Math.max(0, Math.min(MAX_TH, th) - 1)];
export const countFor = (k: BuildKind, th: number): number => BUILDINGS[k].count[Math.max(0, Math.min(MAX_TH, th) - 1)];

/** Nível do jogador a partir do XP (50, 150, 300, 500…). */
export const xpForLevel = (lvl: number): number => 25 * lvl * (lvl - 1);
export function playerLevel(xp: number): number {
  let l = 1;
  while (xp >= xpForLevel(l + 1)) l++;
  return l;
}
export const xpForSecs = (secs: number): number => Math.max(1, Math.floor(Math.sqrt(Math.max(0, secs))));

/** Gemas para terminar agora o que falta (≈1 gema por minuto → 20 por hora → 260 por dia → 1000 por semana). */
export function gemsForTime(secsLeft: number): number {
  const t = Math.ceil(Math.max(0, secsLeft));
  if (t <= 0) return 0;
  if (t <= 60) return 1;
  if (t <= 3600) return 1 + Math.floor((19 * (t - 60)) / 3540);
  if (t <= 86400) return 20 + Math.floor((240 * (t - 3600)) / 82800);
  return 260 + Math.floor((740 * (t - 86400)) / 518400);
}

/** Gemas para cobrir o que falta de ouro ou maná (100 → 1, 1.000 → ~6, 100.000 → ~260). */
export function gemsForResource(missing: number): number {
  if (missing <= 0) return 0;
  return Math.max(1, Math.ceil(Math.pow(missing / 100, 0.805)));
}

export function fmtDuration(secs: number): string {
  let s = Math.max(0, Math.ceil(secs));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}min`;
  if (m) return `${m}min ${s}s`;
  return `${s}s`;
}

export const fmtNum = (n: number): string => Math.floor(n).toLocaleString("pt-BR");
