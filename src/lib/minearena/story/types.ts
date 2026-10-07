import type { LootTable } from "../structures/loot";
// Modo História do MineArena: campanha linear e guiada, dirigida por dados.
// Tudo aqui é client-safe. A campanha NÃO usa o mundo infinito: cada capítulo roda num mapa limitado e construído para a narrativa.

export type Vec2 = { x: number; z: number };
export type Vec3 = { x: number; y: number; z: number };
/** Área circular no chão (centro x,z e raio). */
export type Zone = { x: number; z: number; r: number };

// ---------- mapas ----------
export type MapEnv = {
  /** o mundo depois da queda: grama e folhas secas, sem flores */
  fallen: boolean;
  /** nível da água do dilúvio (0 = sem dilúvio) */
  flood: number;
  /** as muralhas de Jericó já caíram */
  fell?: boolean;
};

export type GenResult = { data: Uint8Array; maxY: number; chests: { x: number; y: number; z: number; table: LootTable }[] };

export type StoryMapDef = {
  id: string;
  name: string;
  /** tamanho (blocos) a partir da origem (0,0) */
  w: number;
  d: number;
  spawn: { x: number; z: number; yaw: number };
  zones: Record<string, Zone>;
  /** hora do dia (0–1) quando o capítulo começa */
  time: number;
  generate: (cx: number, cz: number, env: MapEnv) => GenResult;
  /** trilha do capítulo */
  bgm: string;
};

// ---------- cutscenes e diálogos ----------
export type Pose = "bow" | "pray" | "wave" | "jump" | "kneel" | "point" | "idle";

export type CutStep =
  | { t: "cam"; to: Vec3; look: Vec3; dur: number; wait?: boolean }
  | { t: "camAt"; pos: Vec3; look: Vec3 }
  | { t: "fade"; to: 0 | 1; dur: number; text?: string }
  | { t: "bars"; on: boolean }
  | { t: "say"; who: string; text: string; ref?: string }
  | { t: "caption"; text: string; dur: number; sub?: string }
  | { t: "wait"; dur: number }
  | { t: "npcEnter"; npc: string; at: Vec2; mob?: string; face?: string }
  | { t: "npcGo"; npc: string; to: Vec2; speed?: number; wait?: boolean; via?: Vec2[] }
  | { t: "npcExit"; npc: string }
  | { t: "npcFace"; npc: string; target: string | Vec2 }
  | { t: "pose"; npc: string; pose: Pose; dur?: number }
  | { t: "effect"; kind: "sparkle" | "glow" | "fire" | "smoke" | "lightning" | "light" | "dust" | "holy" | "tears" | "hail" | "locust" | "frog"; at: Vec3; dur?: number }
  | { t: "env"; time?: number; weather?: "clear" | "rain" | "storm"; lock?: boolean; tint?: number; fog?: number; rainbow?: boolean }
  | { t: "teleport"; target: string; to: Vec3; yaw?: number }
  | { t: "music"; track: string }
  | { t: "sfx"; kind: string }
  | { t: "spawn"; mob: string; at: Vec2; count?: number; tag?: string }
  | { t: "call"; fn: string; arg?: number | string; wait?: boolean }
  | { t: "fire"; event: string }
  | { t: "shake"; dur: number; power: number };

export type Cutscene = { id: string; title?: string; steps: CutStep[] };

export type DialogueLine = { who: string; text: string; ref?: string };
export type Dialogue = { id: string; lines: DialogueLine[] };

// ---------- missões ----------
export type Objective =
  | { k: "reach"; zone: string; text: string; limit?: number; failScene?: string }
  | { k: "talk"; npc: string; dialogue: string; text: string }
  | { k: "collect"; item: string; count: number; text: string; consume?: boolean; at?: string }
  | { k: "harvest"; block: string[]; count: number; text: string; at?: string }
  | { k: "place"; zone: string; count: number; text: string; /** tipos de bloco que contam (regex sobre o nome); padrão: tábuas e troncos */ match?: string }
  | { k: "near"; tag: string; count: number; dist: number; text: string }
  | { k: "lead"; tag: string; count: number; to: string; near: number; text: string }
  | { k: "wait"; seconds: number; text: string }
  | { k: "event"; event: string; text: string; target?: { npc?: string; zone?: string } }
  | { k: "hit"; tag: string; count: number; text: string }
  | { k: "puzzle"; puzzle: string; text: string };

// ---------- desafios e relíquias ----------
export type PuzzleBase = { id: string; chapter: string; title: string; intro: string; /** onde procurar na Bíblia */ refs: string[]; /** dicas que aparecem depois de erros */ hints: string[] };
export type PuzzleDef = PuzzleBase &
  (
    | { kind: "order"; /** na ordem certa */ items: string[] }
    | { kind: "match"; pairs: [string, string][] }
    | { kind: "answer"; question: string; accept: string[] }
    | { kind: "quiz"; questions: { q: string; options: string[]; correct: number }[]; need: number }
    | { kind: "simon"; symbols: string[]; length: number; seq: number[] }
    | { kind: "lock"; clues: string[]; answer: string }
  );
/** Relíquia escondida de um capítulo: enterrada num ponto do mapa (cavar para achar). */
export type RelicDef = {
  chapter: string;
  name: string;
  emoji: string;
  desc: string;
  x: number;
  z: number;
  /** ponto de referência para a última dica: zona do mapa e nome */
  near: { zone: string; label: string };
  /** duas dicas escritas; a terceira (direção e distância) é calculada */
  hints: [string, string];
};

export type MissionState = "locked" | "available" | "active" | "completed";

export type Mission = {
  id: string;
  chapter: string;
  title: string;
  desc: string;
  /** objetivos em ordem */
  objectives: Objective[];
  /** referência bíblica mostrada no HUD */
  ref?: string;
  /** NPC relacionado (para o marcador) */
  npc?: string;
  /** missão que precisa estar concluída antes */
  requires?: string;
  /** cena ao começar / ao concluir */
  onStart?: string;
  onComplete?: string;
  /** NPCs a criar quando a missão começa: [mob, x, z, tag?] */
  spawn?: { mob: string; at: Vec2; tag?: string; id?: string; /** altura fixa (dentro de construções) */ y?: number }[];
  reward?: { item: string; count: number }[];
  /** itens entregues quando a missão começa */
  give?: { item: string; count: number }[];
  next?: string;
};

// ---------- capítulos e biblioteca ----------
export type LearnCard = {
  title: string;
  what: string;
  book: string;
  ref: string;
  characters: string[];
  concepts: string[];
  /** o que é dramatização do jogo, para não confundir com o texto bíblico */
  gameNote?: string;
};

export type ChapterDef = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  book: string;
  ref: string;
  period: string;
  /** mapa do capítulo (se já construído) */
  map?: string;
  /** missões na ordem */
  missions: string[];
  /** fase do plano de entrega; built = jogável agora */
  built: boolean;
  phase: number;
  learn?: LearnCard;
  /** livros liberados ao concluir */
  unlocksBooks: string[];
  achievement?: string;
};

export type BookKind = "narrativo" | "poetico" | "profeta_maior" | "profeta_menor";
export type BookDef = { id: string; name: string; kind: BookKind; summary: string };

export type AchievementDef = { id: string; name: string; desc: string; emoji: string };

// ---------- progresso e sessão ----------
export type Checkpoint = { missionId: string; objIndex: number; x: number; y: number; z: number; yaw: number };

export type StorySession = {
  chapterId: string;
  missionId: string;
  objIndex: number;
  progress: number;
  flags: Record<string, boolean>;
  done: string[];
  env: MapEnv;
  checkpoint: Checkpoint | null;
  /** personagens e animais da cena (para recriar ao carregar o jogo) */
  npcs: { id: string; mob: string; x: number; z: number; tag?: string; y?: number }[];
  /** anotações livres de cada capítulo (blocos colocados, etc.) */
  counters: Record<string, number>;
  history: { who: string; text: string }[];
  finished: boolean;
  /** a relíquia deste capítulo já foi achada nesta sessão */
  relic?: boolean;
  /** célula da relíquia (fixada na primeira vez que o chão foi lido) */
  relicCell?: { x: number; y: number; z: number };
  /** segundos jogados no capítulo (libera dicas) */
  playT?: number;
};

export type StoryProgress = {
  /** capítulos concluídos */
  completed: string[];
  /** livros da biblioteca já liberados */
  books: string[];
  achievements: string[];
  /** capítulo em andamento (sessão salva) */
  current: string | null;
  /** textos de aprendizado já vistos */
  seenLearn: string[];
  /** a campanha do Antigo Testamento foi concluída */
  otDone: boolean;
  /** capítulos com o desafio resolvido */
  puzzles: string[];
  /** capítulos com a relíquia achada */
  relics: string[];
};

// ---------- interface com a interface de usuário ----------
export type StoryUi = {
  /** fala atual (diálogo ou cutscene) */
  dialogue: { who: string; text: string; ref?: string; index: number; total: number; canSkipAll: boolean } | null;
  caption: { text: string; sub?: string } | null;
  /** cutscene em andamento (esconde o HUD) */
  cinematic: boolean;
  bars: boolean;
  /** 0 = tela normal, 1 = preta */
  fade: number;
  fadeText: string;
  /** tela "VOCÊ APRENDEU" */
  learn: LearnCard | null;
  /** fim de capítulo (depois do "aprendeu") */
  chapterEnd: { chapter: string; title: string; unlockedBooks: string[]; achievement?: string; puzzle: boolean; relic: "found" | "missing" | "none" } | null;
  /** fim do Antigo Testamento */
  finale: boolean;
  /** desafio aberto na tela */
  puzzle: PuzzleDef | null;
  /** relíquia recém-achada */
  relic: { name: string; emoji: string; desc: string; hunt: boolean } | null;
  history: { who: string; text: string }[];
};

export type StoryHud = {
  chapter: string;
  mission: string;
  objective: string;
  progress: string | null;
  ref: string | null;
  dist: number | null;
  /** o objetivo atual é um desafio (mostrar o botão para abrir) */
  puzzle: boolean;
  /** posição do marcador na tela (−1..1) ou direção quando fora da tela */
  wp: { sx: number; sy: number; on: boolean; angle: number } | null;
};
