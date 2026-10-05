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
  { key: "davi", name: "Davi", emoji: "🪨", kind: "unit", cost: 3, desc: "Atira de longe com a funda.", hp: 130, dmg: 30, atkSpeed: 1.0, range: 5, speed: 1.5, radius: 0.5, canHitAir: true },
  { key: "pedro", name: "Pedro", emoji: "🎣", kind: "unit", cost: 2, desc: "Rápido e barato, ótimo pra defender.", hp: 140, dmg: 22, atkSpeed: 0.9, range: 0.8, speed: 2.0, radius: 0.5 },
  { key: "sansao", name: "Sansão", emoji: "💪", kind: "unit", cost: 4, desc: "Força enorme: dano alto de perto.", hp: 330, dmg: 60, atkSpeed: 1.3, range: 0.9, speed: 1.5, radius: 0.6 },
  { key: "golias", name: "Golias", emoji: "🗿", kind: "unit", cost: 5, desc: "Gigante lento. Só ataca Atalaias e Santuário.", hp: 750, dmg: 55, atkSpeed: 1.5, range: 1.0, speed: 0.9, radius: 0.85, towersOnly: true },
  { key: "gideao", name: "Gideão e os 300", emoji: "🎺", kind: "unit", cost: 3, desc: "Três guerreiros de uma vez.", count: 3, hp: 75, dmg: 18, atkSpeed: 0.8, range: 0.8, speed: 1.8, radius: 0.4 },
  { key: "rebanho", name: "Rebanho de Noé", emoji: "🐑", kind: "unit", cost: 3, desc: "Quatro animaizinhos rápidos.", count: 4, hp: 45, dmg: 12, atkSpeed: 0.8, range: 0.7, speed: 2.0, radius: 0.35 },
  { key: "elias", name: "Elias", emoji: "🔥", kind: "unit", cost: 4, desc: "Fogo em área, atira de longe.", hp: 170, dmg: 38, atkSpeed: 1.7, range: 5.5, speed: 1.2, radius: 0.5, canHitAir: true, splash: 1.3 },
  { key: "anjo", name: "Anjo Guardião", emoji: "👼", kind: "unit", cost: 4, desc: "Voa por cima do rio e do exército.", hp: 190, dmg: 32, atkSpeed: 1.1, range: 1.0, speed: 1.8, radius: 0.5, flying: true, canHitAir: true },
  { key: "salomao", name: "Salomão", emoji: "🏛️", kind: "unit", cost: 5, desc: "Sábio resistente que ataca de longe.", hp: 360, dmg: 42, atkSpeed: 1.3, range: 5, speed: 1.2, radius: 0.6, canHitAir: true },
  { key: "fogo", name: "Fogo do Céu", emoji: "☄️", kind: "spell", cost: 4, desc: "Dano forte em área.", radiusSpell: 2.5, spellDmg: 150, towerMult: 0.4 },
  { key: "mar", name: "Mar Vermelho", emoji: "🌊", kind: "spell", cost: 3, desc: "Dano e deixa os inimigos lentos.", radiusSpell: 3, spellDmg: 55, towerMult: 0.4, slow: 0.5, slowSecs: 3 },
  { key: "trombetas", name: "Trombetas de Jericó", emoji: "📯", kind: "spell", cost: 2, desc: "Pequena área, derruba muros.", radiusSpell: 2, spellDmg: 70, towerMult: 1.5 },
];

export const ARENA_CARD_BY_KEY = new Map(ARENA_CARDS.map((c) => [c.key, c]));

/** Baralho inicial do jogador (a fase 1 ainda não tem montador de baralho). */
export const STARTER_DECK = ["davi", "pedro", "sansao", "golias", "gideao", "anjo", "fogo", "mar"];

export const ATALAIA = { hp: 360, dmg: 26, atkSpeed: 0.9, range: 6, radius: 1.1 };
export const SANTUARIO = { hp: 700, dmg: 30, atkSpeed: 1.0, range: 6.5, radius: 1.5 };
