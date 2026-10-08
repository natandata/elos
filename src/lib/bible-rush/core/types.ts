// Tipos do Bible Rush: jogo de gerenciamento de tempo em fases bíblicas que envolvem refeições (estilo "barraca de comida").
// Tudo aqui é client-safe e dirigido por dados.

/** Identificador de um prato do cardápio (ex.: "pao", "peixe"). */
export type FeedId = string;
/** Identificador de um tipo de convidado (ex.: "esau", "familia"). */
export type GuestId = string;

/** Um prato. `direct` sai pronto da estação; `cook` assa e pode queimar; `press` fica pronto e espera. */
export type FeedDef = {
  id: FeedId;
  name: string;
  emoji: string;
  /** quanto vale no pedido */
  price: number;
  station: { name: string; emoji: string; kind: "direct" | "cook" | "press"; slots: number; cookTime: number; burnAfter: number };
};
export type GuestDef = {
  id: GuestId;
  /** "Esaú faminto" */
  name: string;
  /** o que aparece em pé no caminho (1 a 3 emojis) */
  faces: string[];
  /** pratos que o convidado pede (em qualquer ordem) */
  feeds: FeedId[];
  /** segundos até a paciência acabar */
  patience: number;
};

export type PatienceState = "happy" | "waiting" | "impatient" | "gone";
export type Rating = "perfect" | "excellent" | "good" | "late" | "failed";

export type Request = {
  id: number;
  guest: GuestId;
  /** o que ainda falta entregar */
  needs: FeedId[];
  /** o pedido completo (para mostrar o balão) */
  want: FeedId[];
  /** 1 = acabou de chegar, 0 = foi embora */
  patience: number;
  reward: number;
  /** o convidado está inquieto (paciência cai mais rápido até ser atendido) */
  restless: boolean;
  arrivedAt: number;
  /** passou pelo tutorial (paciência congelada) */
  guided: boolean;
};

export type Arrival = { at: number; guest: GuestId; guided?: boolean };

export type EventKind = "crowd" | "restless" | "storm";
export type LevelEvent = { at: number; kind: EventKind; text: string };

export type Generator = { first: number; start: number; min: number; accel: number; pool: GuestId[] };

export type LevelDef = {
  id: string;
  /** número da fase na campanha */
  number: number;
  arc: string;
  title: string;
  /** de quem é a história */
  hero: string;
  objective: string;
  ref: string;
  /** contexto bíblico mostrado depois da fase */
  context: string;
  note: string;
  /** nome do cenário (arquivo /bible-rush/cena-<scene>.webp) */
  scene: string;
  timeLimit: number;
  targetScore: number;
  /** convidados que podem esperar ao mesmo tempo */
  queueCap: number;
  maxAbandon: number;
  /** pratos do cardápio da fase (cada um tem a sua estação no balcão) */
  feeds: FeedId[];
  /** pratos que cabem na bandeja ao mesmo tempo */
  plateMax: number;
  schedule: Arrival[];
  events: LevelEvent[];
  generator?: Generator;
  /** tutorial guiado: um prato que sai direto da estação e um que precisa assar */
  tutorial?: { direct: FeedId; cook: FeedId };
  intro: string;
  outro: string;
};

export type ChallengeMode = "survival" | "speed" | "perfect";

export type Status = "ready" | "playing" | "won" | "lost";

export type Floater = { id: number; text: string; tone: "good" | "bad" | "info"; at: number; slot?: number };

export type Settings = {
  volume: number;
  music: boolean;
  sfx: boolean;
  textSpeed: "slow" | "normal" | "fast";
  uiScale: "normal" | "large";
  colorblind: boolean;
  reduceMotion: boolean;
};

export type SaveData = {
  unlockedChapter: number;
  stars: Record<string, number>;
  bestScores: Record<string, number>;
  achievements: string[];
  settings: Settings;
  gallery: string[];
  /** pedidos atendidos em sequência sem perder nenhum (vale entre fases) */
  serveStreak: number;
  totalServed: number;
  tutorialDone: boolean;
  seenIntro: string[];
  challengeBest: Record<string, number>;
};

export const DEFAULT_SETTINGS: Settings = { volume: 80, music: true, sfx: true, textSpeed: "normal", uiScale: "normal", colorblind: false, reduceMotion: false };
