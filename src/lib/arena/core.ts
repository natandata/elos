// Tipos, geometria e sorteio da Arena. Sem DOM e sem Date/Math.random: o motor
// é determinístico — o servidor refaz a partida com as mesmas jogadas e tem
// que chegar no mesmo resultado que o navegador.

export const TICKS_PER_SEC = 20;
export const DT = 1 / TICKS_PER_SEC;
export const MATCH_TICKS = 3 * 60 * TICKS_PER_SEC;
/** No último minuto o Maná enche em dobro. */
export const DOUBLE_MANA_TICK = 2 * 60 * TICKS_PER_SEC;
export const MANA_MAX = 10;
export const MANA_START = 5;
export const MANA_SECS_PER_POINT = 2.8;

// campo: jogador (lado 0) embaixo, computador (lado 1) em cima
export const W = 16;
export const H = 26;
export const RIVER_TOP = 12;
export const RIVER_BOT = 14;
export const BRIDGES = [4, 12] as const;
export const BRIDGE_HALF = 1.2;
export const HAND_SIZE = 4;
export const DECK_SIZE = 8;

export type Side = 0 | 1;

export type Entity = {
  id: number;
  side: Side;
  type: "unit" | "tower";
  /** chave da carta (tropa) ou "atalaia"/"santuario" (construção) */
  card: string;
  /** só construções: 0 = pista esquerda, 1 = direita (Santuário = -1) */
  lane: number;
  x: number;
  y: number;
  /** posição no tick anterior (só pra suavizar a animação) */
  px: number;
  py: number;
  hp: number;
  maxHp: number;
  radius: number;
  dmg: number;
  atkTicks: number;
  range: number;
  /** tiles por tick */
  speed: number;
  flying: boolean;
  towersOnly: boolean;
  canHitAir: boolean;
  splash: number;
  /** multiplicador de dano contra construções */
  towerMult: number;
  hitSlow: number;
  hitSlowTicks: number;
  healAmount: number;
  healTicks: number;
  healRadius: number;
  cd: number;
  slowUntil: number;
  slowAmount: number;
};

export type GameState = {
  tick: number;
  seed: number;
  nextId: number;
  mana: [number, number];
  /** cartas na mão (HAND_SIZE) e fila das próximas, por lado */
  slots: [string[], string[]];
  queue: [string[], string[]];
  entities: Entity[];
  crowns: [number, number];
  /** nível de cada carta, por lado (1 se faltar) */
  levels: [Record<string, number>, Record<string, number>];
  /** estado dos sorteios do computador e do embaralhar */
  rng: [number, number];
  over: boolean;
  /** null + over = empate */
  winner: Side | null;
};

export type Input = { tick: number; side: Side; slot: number; x: number; y: number };

/** Eventos só pra animação: não fazem parte do estado do jogo (nem da verificação). */
export type GameEvent =
  | { t: "attack"; from: number; to: number; fromCard: string; x1: number; y1: number; x2: number; y2: number; ranged: boolean; side: Side; dmg: number }
  | { t: "hit"; id: number; x: number; y: number; dmg: number; side: Side }
  | { t: "heal"; id: number; x: number; y: number; amount: number }
  | { t: "spell"; key: string; x: number; y: number; r: number }
  | { t: "death"; id: number; x: number; y: number; tower: boolean; card: string; side: Side; flying: boolean; radius: number }
  | { t: "spawn"; x: number; y: number; card: string };

// ------------------------------------------------------------ sorteio

/** mulberry32: devolve [valor 0..1, novo estado]. */
export function rand(state: number): [number, number] {
  let a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

export function nextRand(state: GameState, side: Side): number {
  const [v, s] = rand(state.rng[side]);
  state.rng[side] = s;
  return v;
}

export function shuffleWith<T>(items: readonly T[], seed: number): T[] {
  let s = seed | 0;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const [v, ns] = rand(s);
    s = ns;
    const j = Math.floor(v * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ------------------------------------------------------------ geometria

export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Onde cada lado pode colocar tropas (poderes valem no campo todo). */
export function inDeployZone(side: Side, x: number, y: number): boolean {
  if (x < 0.5 || x > W - 0.5) return false;
  return side === 0 ? y >= RIVER_BOT + 0.6 && y <= H - 0.5 : y <= RIVER_TOP - 0.6 && y >= 0.5;
}

export function inField(x: number, y: number): boolean {
  return x >= 0 && x <= W && y >= 0 && y <= H;
}

export function nearestBridge(x: number): number {
  return Math.abs(x - BRIDGES[0]) <= Math.abs(x - BRIDGES[1]) ? BRIDGES[0] : BRIDGES[1];
}

export function onBridge(x: number): boolean {
  return Math.abs(x - BRIDGES[0]) <= BRIDGE_HALF || Math.abs(x - BRIDGES[1]) <= BRIDGE_HALF;
}
