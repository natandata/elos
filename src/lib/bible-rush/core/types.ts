// Tipos do Bible Rush: jogo de gerenciamento de tempo em fases bíblicas. Tudo aqui é client-safe e dirigido por dados.

export type FeedId = "hay" | "grain" | "fruit" | "fish";
export type PenId = "pasture" | "stable" | "cages" | "aviary";
export type SpeciesId = "sheep" | "rabbit" | "horse" | "camel" | "lion" | "bear" | "dove" | "parrot";

export type FeedDef = { id: FeedId; name: string; emoji: string };
export type PenDef = { id: PenId; name: string; emoji: string; blurb: string };
export type SpeciesDef = {
  id: SpeciesId;
  /** "ovelha(s)" */
  name: string;
  plural: string;
  emoji: string;
  /** alimentos que o par precisa receber (em qualquer ordem) */
  feeds: FeedId[];
  pen: PenId;
  /** segundos até a paciência acabar */
  patience: number;
  reward: number;
};

/** Item de um pedido: o sistema de necessidades é abstrato (alimentar, levar a um lugar, entregar...). */
export type NeedItem = { kind: "feed"; id: FeedId } | { kind: "place"; id: PenId };

export type PatienceState = "happy" | "waiting" | "impatient" | "gone";
export type Rating = "perfect" | "excellent" | "good" | "late" | "failed";

export type Request = {
  id: number;
  species: SpeciesId;
  /** o que ainda falta fazer */
  needs: NeedItem[];
  /** 1 = acabou de chegar, 0 = foi embora */
  patience: number;
  reward: number;
  priority: number;
  /** o animal está inquieto (paciência cai mais rápido até ser alimentado) */
  restless: boolean;
  arrivedAt: number;
  /** passou pelo tutorial (paciência congelada) */
  guided: boolean;
};

export type Arrival = { at: number; species: SpeciesId; guided?: boolean };

export type EventKind = "crowd" | "restless" | "storm";
export type LevelEvent = { at: number; kind: EventKind; text: string };

export type Generator = { first: number; start: number; min: number; accel: number; pool: SpeciesId[] };

export type LevelDef = {
  id: string;
  /** número da fase na campanha */
  number: number;
  arc: string;
  title: string;
  hero: string;
  objective: string;
  ref: string;
  /** contexto bíblico mostrado depois da fase */
  context: string;
  note: string;
  timeLimit: number;
  targetScore: number;
  /** pares que podem esperar ao mesmo tempo */
  queueCap: number;
  maxAbandon: number;
  feeds: FeedId[];
  pens: PenId[];
  stock: Record<FeedId, number>;
  schedule: Arrival[];
  events: LevelEvent[];
  generator?: Generator;
  tutorial?: boolean;
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
