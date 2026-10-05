// Arenas da Arena dos Heróis: lugares bíblicos que se destravam com troféus (client-safe).

export const TROPHY_WIN = 30;
export const TROPHY_LOSS = 20;

/** Pergaminhos 📜 por partida (precisa durar pelo menos 75 s, como o XP). */
export const SCROLLS_WIN = 30;
export const SCROLLS_OTHER = 10;

export type ArenaTheme = {
  grass: string;
  grassAlt: string;
  shade: string;
  path: string;
  pathEdge: string;
  water: [string, string];
  waterEdge: string;
  waterLine: string;
  bushDark: string;
  bushMid: string;
  bushLight: string;
  bushShadow: string;
  rock: string;
  /** Chance (0–1) de um enfeite da margem ser pedra em vez de arbusto. */
  rockChance: number;
};

export type BiblicalArena = {
  key: string;
  name: string;
  emoji: string;
  /** Ilustração isométrica do lugar (em /public). */
  art: string;
  /** Troféus necessários pra entrar. */
  min: number;
  blurb: string;
  ref: string;
  theme: ArenaTheme;
};

export const ARENAS: BiblicalArena[] = [
  {
    key: "eden",
    art: "/arena/places/eden.webp",
    name: "Jardim do Éden",
    emoji: "🌳",
    min: 0,
    blurb: "Onde tudo começou: um jardim cheio de vida.",
    ref: "Gênesis 2",
    theme: {
      grass: "#76ba4b", grassAlt: "#6cb042", shade: "rgba(40,90,30,0.16)", path: "#dcbb7c", pathEdge: "#c29f60",
      water: ["#58b4ea", "#2f86c8"], waterEdge: "#1f6aa8", waterLine: "rgba(255,255,255,0.55)",
      bushDark: "#2f7d32", bushMid: "#43a047", bushLight: "#66bb6a", bushShadow: "rgba(20,60,20,0.35)", rock: "#8c96a3", rockChance: 0.2,
    },
  },
  {
    key: "ararate",
    art: "/arena/places/ararate.webp",
    name: "Monte Ararate",
    emoji: "⛰️",
    min: 200,
    blurb: "Onde a arca de Noé repousou depois do dilúvio.",
    ref: "Gênesis 8",
    theme: {
      grass: "#aebfb8", grassAlt: "#a2b5ad", shade: "rgba(60,80,90,0.16)", path: "#d2c2a4", pathEdge: "#b7a483",
      water: ["#7cc3e6", "#4a93c4"], waterEdge: "#3a78a6", waterLine: "rgba(255,255,255,0.7)",
      bushDark: "#2f5f4a", bushMid: "#3f7a5e", bushLight: "#5c9a7c", bushShadow: "rgba(20,50,45,0.35)", rock: "#9aa6b2", rockChance: 0.4,
    },
  },
  {
    key: "sinai",
    art: "/arena/places/sinai.webp",
    name: "Deserto do Sinai",
    emoji: "🏜️",
    min: 450,
    blurb: "Onde Moisés recebeu os Dez Mandamentos.",
    ref: "Êxodo 19–20",
    theme: {
      grass: "#e2c387", grassAlt: "#d9b97a", shade: "rgba(150,100,30,0.16)", path: "#c99a5b", pathEdge: "#a87c41",
      water: ["#5cc3cf", "#2d97ad"], waterEdge: "#1f7488", waterLine: "rgba(255,255,255,0.55)",
      bushDark: "#7d7134", bushMid: "#9a8c42", bushLight: "#bba95a", bushShadow: "rgba(110,80,30,0.35)", rock: "#b08a5c", rockChance: 0.5,
    },
  },
  {
    key: "jerico",
    art: "/arena/places/jerico.webp",
    name: "Muralhas de Jericó",
    emoji: "🏰",
    min: 750,
    blurb: "As muralhas caíram ao som das trombetas.",
    ref: "Josué 6",
    theme: {
      grass: "#a9a863", grassAlt: "#9d9c58", shade: "rgba(90,80,30,0.16)", path: "#e0c796", pathEdge: "#bfa56f",
      water: ["#6fb0b0", "#3f8590"], waterEdge: "#2d6670", waterLine: "rgba(255,255,255,0.5)",
      bushDark: "#4f7a2f", bushMid: "#678f3b", bushLight: "#86ad55", bushShadow: "rgba(50,70,20,0.35)", rock: "#a4977f", rockChance: 0.35,
    },
  },
  {
    key: "ela",
    art: "/arena/places/ela.webp",
    name: "Vale de Elá",
    emoji: "🪨",
    min: 1100,
    blurb: "Onde Davi enfrentou o gigante Golias.",
    ref: "1 Samuel 17",
    theme: {
      grass: "#a3c752", grassAlt: "#98bc47", shade: "rgba(70,100,20,0.16)", path: "#d9bf84", pathEdge: "#bfa468",
      water: ["#6bc2dc", "#3a93b8"], waterEdge: "#2b7596", waterLine: "rgba(255,255,255,0.55)",
      bushDark: "#587a24", bushMid: "#729a33", bushLight: "#93bb4f", bushShadow: "rgba(50,70,15,0.35)", rock: "#9a9588", rockChance: 0.45,
    },
  },
  {
    key: "galileia",
    art: "/arena/places/galileia.webp",
    name: "Mar da Galileia",
    emoji: "⛵",
    min: 1500,
    blurb: "Onde Jesus andou sobre as águas.",
    ref: "Mateus 14",
    theme: {
      grass: "#62b58f", grassAlt: "#57aa84", shade: "rgba(20,90,80,0.16)", path: "#ecd9a8", pathEdge: "#cdb883",
      water: ["#4aa8ec", "#1f6fc0"], waterEdge: "#16569a", waterLine: "rgba(255,255,255,0.65)",
      bushDark: "#1f7a5a", bushMid: "#2f9672", bushLight: "#55b794", bushShadow: "rgba(10,60,50,0.35)", rock: "#8ea0ad", rockChance: 0.2,
    },
  },
  {
    key: "jerusalem",
    art: "/arena/places/jerusalem.webp",
    name: "Jerusalém",
    emoji: "🕍",
    min: 2000,
    blurb: "A cidade do grande Rei, com o Templo de Salomão.",
    ref: "1 Reis 6",
    theme: {
      grass: "#cbc3ae", grassAlt: "#c1b8a1", shade: "rgba(110,90,50,0.16)", path: "#eadfc2", pathEdge: "#cdbf9c",
      water: ["#62aedb", "#3a82b8"], waterEdge: "#2b6794", waterLine: "rgba(255,255,255,0.6)",
      bushDark: "#6a7d3a", bushMid: "#829650", bushLight: "#a1b36d", bushShadow: "rgba(70,70,30,0.35)", rock: "#b3ac9a", rockChance: 0.3,
    },
  },
  {
    key: "nova",
    art: "/arena/places/nova.webp",
    name: "Nova Jerusalém",
    emoji: "✨",
    min: 2600,
    blurb: "A cidade de ouro, onde Deus enxuga toda lágrima.",
    ref: "Apocalipse 21",
    theme: {
      grass: "#f1d98f", grassAlt: "#ead07f", shade: "rgba(190,140,30,0.18)", path: "#fbf1cf", pathEdge: "#e2cf94",
      water: ["#8de6ff", "#42b6ea"], waterEdge: "#2c93c8", waterLine: "rgba(255,255,255,0.8)",
      bushDark: "#8ea83a", bushMid: "#a9c455", bushLight: "#c9df7e", bushShadow: "rgba(150,120,20,0.3)", rock: "#e3d6b0", rockChance: 0.2,
    },
  },
];

/** Em qual arena (índice) cada carta é liberada. A arena 0 é o baralho básico. */
export const CARD_UNLOCK_ARENA: Record<string, number> = {
  davi: 0, joao: 0, jose: 0, gideao: 0, sansao: 0, maria: 0, trombetas: 0, mar: 0,
  noe: 1,
  moises: 2,
  josue: 3,
  daniel: 4,
  jesus: 5,
  salomao: 6, ester: 6,
  miguel: 7, fogo: 7,
};

export function cardsUnlockedIn(arenaIdx: number): string[] {
  return Object.entries(CARD_UNLOCK_ARENA).filter(([, a]) => a === arenaIdx).map(([k]) => k);
}

/** `best` = maior total de troféus que o jogador já teve (não perde carta ao cair de arena). */
export function isCardUnlocked(key: string, best: number): boolean {
  const a = CARD_UNLOCK_ARENA[key];
  return a !== undefined && arenaIndexFor(best) >= a;
}

export function deckAllowed(deck: string[], best: number): boolean {
  return deck.every((k) => isCardUnlocked(k, best));
}

export function arenaIndexFor(trophies: number): number {
  let idx = 0;
  ARENAS.forEach((a, i) => {
    if (trophies >= a.min) idx = i;
  });
  return idx;
}

export function arenaProgress(trophies: number) {
  const idx = arenaIndexFor(trophies);
  const cur = ARENAS[idx];
  const next = ARENAS[idx + 1] ?? null;
  const pct = next ? Math.min(100, Math.round(((trophies - cur.min) / (next.min - cur.min)) * 100)) : 100;
  return { idx, cur, next, pct };
}

/** Variação de troféus de uma partida confirmada. */
export function trophyDelta(result: "win" | "loss" | "draw", verifiedFast = false): number {
  if (result === "win") return verifiedFast ? 0 : TROPHY_WIN;
  if (result === "loss") return -TROPHY_LOSS;
  return 0;
}
