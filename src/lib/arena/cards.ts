// Catálogo de cartas da Arena dos Heróis (client-safe).
// Números em "tiles" (o campo tem 16 x 26) e segundos. Mexa aqui pra equilibrar.

export type CardKind = "unit" | "spell";

export type ArenaCard = {
  key: string;
  name: string;
  emoji: string;
  kind: CardKind;
  /** Custo em Maná (0–10). */
  cost: number;
  desc: string;
  // --- tropas ---
  /** Quantas tropas nascem de uma vez. */
  count?: number;
  hp?: number;
  dmg?: number;
  /** Segundos entre ataques. */
  atkSpeed?: number;
  /** Alcance em tiles (corpo a corpo ≈ 0.8). */
  range?: number;
  /** Tiles por segundo. */
  speed?: number;
  /** Raio do corpo (colisão e alcance). */
  radius?: number;
  flying?: boolean;
  /** Só ataca construções (Atalaias e Santuário). */
  towersOnly?: boolean;
  /** Pode acertar tropas voadoras. */
  canHitAir?: boolean;
  /** Dano em área em volta do alvo (tiles). */
  splash?: number;
  /** Ilustração em /public/arena/<key>.webp (poderes: .svg); sem ela, usa o emoji. */
  art?: boolean;
  /** Multiplicador do dano contra construções (tropas). */
  unitTowerMult?: number;
  /** Cada golpe deixa o alvo lento (0–1) por alguns segundos. */
  hitSlow?: { amount: number; secs: number };
  /** Cura aliados por perto de tempos em tempos. */
  heal?: { amount: number; secs: number; radius: number };
  // --- poderes ---
  radiusSpell?: number;
  spellDmg?: number;
  /** Multiplicador do dano contra construções. */
  towerMult?: number;
  /** Lentidão (0–1 da velocidade perdida) e duração em segundos. */
  slow?: number;
  slowSecs?: number;
};

export const ARENA_CARDS: ArenaCard[] = [
  { key: "davi", name: "Davi", emoji: "🪨", art: true, kind: "unit", cost: 3, desc: "Atira de longe com a funda.", hp: 130, dmg: 30, atkSpeed: 1.0, range: 5, speed: 1.5, radius: 0.5, canHitAir: true },
  { key: "sansao", name: "Sansão", emoji: "💪", art: true, kind: "unit", cost: 4, desc: "Força enorme: dano alto de perto.", hp: 330, dmg: 60, atkSpeed: 1.3, range: 0.9, speed: 1.5, radius: 0.6 },
  { key: "gideao", name: "Gideão e os 300", emoji: "🎺", art: true, kind: "unit", cost: 3, desc: "Três guerreiros de uma vez.", count: 3, hp: 75, dmg: 18, atkSpeed: 0.8, range: 0.8, speed: 1.8, radius: 0.4 },
  { key: "miguel", name: "Arcanjo Miguel", emoji: "👼", art: true, kind: "unit", cost: 4, desc: "Voa por cima do rio e do exército.", hp: 200, dmg: 34, atkSpeed: 1.1, range: 1.0, speed: 1.8, radius: 0.6, flying: true, canHitAir: true },
  { key: "moises", name: "Moisés", emoji: "🌊", art: true, kind: "unit", cost: 5, desc: "Seu cajado deixa os inimigos lentos.", hp: 400, dmg: 32, atkSpeed: 1.4, range: 4.5, speed: 1.1, radius: 0.6, canHitAir: true, hitSlow: { amount: 0.4, secs: 2 } },
  { key: "josue", name: "Josué", emoji: "🔥", art: true, kind: "unit", cost: 4, desc: "Derruba muros: muito dano em construções.", hp: 310, dmg: 36, atkSpeed: 1.2, range: 0.9, speed: 1.5, radius: 0.55, unitTowerMult: 1.8 },
  { key: "noe", name: "Noé", emoji: "🛶", art: true, kind: "unit", cost: 4, desc: "Cura os aliados que estão por perto.", hp: 340, dmg: 20, atkSpeed: 1.2, range: 1.0, speed: 1.2, radius: 0.6, heal: { amount: 40, secs: 2, radius: 3.5 } },
  { key: "jesus", name: "Jesus", emoji: "✝️", art: true, kind: "unit", cost: 6, desc: "Não ataca: cura e protege os aliados.", hp: 450, dmg: 0, atkSpeed: 1, range: 0, speed: 1.3, radius: 0.6, heal: { amount: 55, secs: 2, radius: 4.5 } },
  { key: "salomao", name: "Salomão", emoji: "🏛️", art: true, kind: "unit", cost: 5, desc: "Sábio resistente que ataca de longe.", hp: 330, dmg: 40, atkSpeed: 1.3, range: 5, speed: 1.2, radius: 0.6, canHitAir: true },
  { key: "ester", name: "Rainha Ester", emoji: "👑", art: true, kind: "unit", cost: 4, desc: "Ataca de longe e deixa os inimigos um pouco lentos.", hp: 230, dmg: 34, atkSpeed: 1.4, range: 5, speed: 1.3, radius: 0.5, canHitAir: true, hitSlow: { amount: 0.25, secs: 1.5 } },
  { key: "jose", name: "José do Egito", emoji: "🌾", art: true, kind: "unit", cost: 3, desc: "Guardou o grão: resistente e firme.", hp: 360, dmg: 22, atkSpeed: 1.2, range: 0.9, speed: 1.4, radius: 0.5 },
  { key: "maria", name: "Maria", emoji: "💙", art: true, kind: "unit", cost: 3, desc: "Cura os aliados por perto e ataca de leve.", hp: 220, dmg: 14, atkSpeed: 1.2, range: 3.5, speed: 1.3, radius: 0.45, canHitAir: true, heal: { amount: 30, secs: 2, radius: 3.5 } },
  { key: "daniel", name: "Daniel e o Leão", emoji: "🦁", art: true, kind: "unit", cost: 4, desc: "Com o leão ao lado, acerta em área.", hp: 320, dmg: 30, atkSpeed: 1.2, range: 0.9, speed: 1.4, radius: 0.55, splash: 1.0 },
  { key: "joao", name: "João Batista", emoji: "💧", art: true, kind: "unit", cost: 3, desc: "Rápido e valente, corre até a batalha.", hp: 200, dmg: 34, atkSpeed: 0.9, range: 0.9, speed: 1.9, radius: 0.45 },
  { key: "fogo", name: "Fogo do Céu", emoji: "☄️", art: true, kind: "spell", cost: 4, desc: "Dano forte em área.", radiusSpell: 2.5, spellDmg: 175, towerMult: 0.45 },
  { key: "mar", name: "Mar Vermelho", emoji: "🌊", art: true, kind: "spell", cost: 3, desc: "Dano e deixa os inimigos lentos.", radiusSpell: 3, spellDmg: 55, towerMult: 0.4, slow: 0.5, slowSecs: 3 },
  { key: "trombetas", name: "Trombetas de Jericó", emoji: "📯", art: true, kind: "spell", cost: 2, desc: "Pequena área, derruba muros.", radiusSpell: 2, spellDmg: 70, towerMult: 1.5 },
];

export const ARENA_CARD_BY_KEY = new Map(ARENA_CARDS.map((c) => [c.key, c]));

/** Baralho inicial do jogador (a fase 1 ainda não tem montador de baralho). */
export const STARTER_DECK = ["davi", "joao", "jose", "gideao", "sansao", "maria", "mar", "trombetas"];

/** Baralho válido: 8 cartas diferentes que existem no catálogo. */
export function isValidDeck(deck: unknown): deck is string[] {
  return (
    Array.isArray(deck) &&
    deck.length === 8 &&
    new Set(deck).size === 8 &&
    deck.every((k) => typeof k === "string" && ARENA_CARD_BY_KEY.has(k))
  );
}

export const MAX_CARD_LEVEL = 5;
/** Pergaminhos pra chegar em cada nível (índice = nível de destino). */
export const UPGRADE_COST = [0, 0, 100, 250, 600, 1200] as const;
/** +5% de vida e dano por nível. */
export const levelMult = (level: number) => 1 + 0.05 * (Math.min(MAX_CARD_LEVEL, Math.max(1, Math.floor(level) || 1)) - 1);
export const upgradeCost = (toLevel: number) => UPGRADE_COST[toLevel] ?? 0;
/** Nível das cartas do computador conforme a arena (0–7). */
export const botLevelForArena = (arena: number) => Math.min(MAX_CARD_LEVEL, 1 + Math.floor(Math.max(0, arena) / 3));

export const ATALAIA = { hp: 360, dmg: 26, atkSpeed: 0.9, range: 6, radius: 1.1 };
export const SANTUARIO = { hp: 700, dmg: 30, atkSpeed: 1.0, range: 6.5, radius: 1.5 };
