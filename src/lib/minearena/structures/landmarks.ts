// Lugares e monumentos bíblicos gigantes. Aparecem um de cada vez, a cada 10 minutos de jogo,
// longe do jogador (fora da distância de visão) e são gerados junto com o terreno quando ele chega perto.
import { B } from "../blocks/blocks";
import { SEA_LEVEL, WORLD_H } from "../config/config";
import { columnInfo } from "../world/worldgen";
import { rand01 } from "../world/noise";
import type { Builder } from "./structures";
import { structuresNear } from "./structures";

export type LandmarkId = "noe" | "babel" | "sarca" | "mar" | "bezerro" | "jerico" | "salomao" | "baleia";

/** Onde o monumento foi plantado (guardado no save; o terreno é gerado a partir disso). */
export interface LandmarkSite {
  id: LandmarkId;
  x: number;
  z: number;
  gy: number;
}

export interface LandmarkDef {
  id: LandmarkId;
  name: string;
  ref: string;
  /** Frase mostrada quando o jogador chega. */
  blurb: string;
  /** Meia-largura (x) e meio-comprimento (z) da área nivelada. */
  rx: number;
  rz: number;
  /** Altura máxima da obra acima do chão. */
  H: number;
  /** Maior altura de terreno aceita no local (a obra precisa caber no mundo). */
  maxGy: number;
  /** Lago circular escavado (a baleia). */
  pool?: { r: number; depth: number; red?: boolean };
  residents: { mob: string; dx: number; dy: number; dz: number }[];
  build(b: Builder): void;
}

const L = B.limestone;
const lim = (b: Builder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) => b.fill(x0, y0, z0, x1, y1, z1, id);

// ---------- Arca de Noé ----------
function arca(b: Builder): void {
  const A = 31; // meio-comprimento
  const W = 10; // meia-largura no alto
  const HH = 13;
  const hw = (x: number, y: number) => Math.round(W * Math.sqrt(Math.max(0, 1 - (x / (A + 1)) ** 2)) * (0.5 + 0.5 * Math.min(1, y / 8)));
  for (let x = -A; x <= A; x++) {
    for (let y = 0; y <= HH; y++) {
      const w = hw(x, y);
      for (let z = -w; z <= w; z++) {
        const wall = Math.abs(z) === w || x === -A || x === A;
        if (y === 0 || y === 5 || y === 9 || y === HH) b.set(x, y, z, B.cedar_planks);
        else b.set(x, y, z, wall ? B.cedar_planks : B.air);
      }
    }
  }
  // costelas de madeira por dentro
  for (let x = -A + 4; x <= A - 4; x += 6) {
    for (let y = 1; y < HH; y++) {
      const w = hw(x, y);
      if (w > 1) {
        b.set(x, y, -w + 1, B.cedar_log);
        b.set(x, y, w - 1, B.cedar_log);
      }
    }
  }
  // cabine do telhado, com janelas e telhado em duas águas
  for (let x = -20; x <= 20; x++) {
    for (let y = HH + 1; y <= HH + 4; y++) {
      for (const z of [-5, 5]) b.set(x, y, z, y === HH + 3 ? B.glass : B.planks);
      if (x === -20 || x === 20) for (let z = -5; z <= 5; z++) b.set(x, y, z, B.planks);
    }
    for (let z = -6; z <= 6; z++) b.set(x, HH + 5 - (Math.abs(z) > 3 ? 1 : 0) - (Math.abs(z) > 5 ? 1 : 0), z, B.cedar_planks);
  }
  // porta lateral, no nível do chão
  b.fill(-2, 1, -10, 2, 3, -4, B.air);
  // rampas por dentro: chão → 1º convés → 2º convés → telhado
  const ramp = (x0: number, dir: 1 | -1, yBase: number, n: number, deckY: number) => {
    b.fill(Math.min(x0, x0 + dir * (n - 1)), deckY, -1, Math.max(x0, x0 + dir * (n - 1)), deckY, 1, B.air);
    for (let k = 0; k < n; k++) b.fill(x0 + dir * k, yBase, -1, x0 + dir * k, yBase + k, 1, B.planks);
  };
  ramp(14, 1, 1, 5, 5);
  ramp(-14, -1, 6, 4, 9);
  ramp(14, 1, 10, 4, HH);
  // baús nos conveses
  b.chest(-10, 1, 0, "aldeia");
  b.chest(-24, 1, 0, "aldeia");
  b.chest(0, 6, 3, "ruina");
  b.chest(-6, 10, -2, "templo");
}

// ---------- Torre de Babel ----------
function babel(b: Builder): void {
  const S = [22, 19, 16, 13, 10, 7];
  const T = 4;
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    b.fill(-s, T * i + 1, -s, s, T * (i + 1), s, B.brick);
    b.fill(-s, T * (i + 1), -s, s, T * (i + 1), s, L);
    // arcos: janelas escuras no meio de cada face
    for (const o of [-s / 2, s / 2].map(Math.round)) {
      b.fill(o, T * i + 2, -s, o, T * i + 3, -s, B.air);
      b.fill(o, T * i + 2, s, o, T * i + 3, s, B.air);
      b.fill(-s, T * i + 2, o, -s, T * i + 3, o, B.air);
      b.fill(s, T * i + 2, o, s, T * i + 3, o, B.air);
    }
  }
  // rampas em espiral: cada degrau sobe um bloco, girando 90° por andar
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    for (let k = 0; k < T; k++) {
      const y = T * i + 1 + k;
      for (let w = 1; w <= 2; w++) {
        const x = s + w;
        const z = -s + 1 + k;
        const [rx, rz] = [[x, z], [-z, x], [-x, -z], [z, -x]][i % 4];
        b.set(rx, y, rz, B.brick);
        for (let d = 1; d < 3; d++) b.set(rx, y + d, rz, B.air);
      }
    }
  }
  const top = T * S.length;
  b.fill(-2, top + 1, -2, 2, top + 3, 2, B.gold_block);
  b.fill(-1, top + 4, -1, 1, top + 4, 1, B.gold_block);
  b.chest(5, top + 1, 5, "templo");
  b.chest(-5, top + 1, -5, "torre");
}

// ---------- Sarça Ardente ----------
function sarca(b: Builder): void {
  b.fill(-6, 0, -6, 6, 0, 6, B.dirt);
  b.fill(-5, 0, -5, 5, 0, 5, B.sand);
  // pedras do monte Horebe em volta
  for (let a = 0; a < 16; a++) {
    const x = Math.round(Math.cos((a / 16) * Math.PI * 2) * 6);
    const z = Math.round(Math.sin((a / 16) * Math.PI * 2) * 6);
    b.fill(x, 1, z, x, 1 + (a % 3), z, B.cobble);
  }
  b.fill(0, 1, 0, 0, 3, 0, B.log);
  b.set(1, 1, 0, B.log);
  b.set(-1, 1, 0, B.log);
  for (let x = -3; x <= 3; x++) {
    for (let y = 2; y <= 7; y++) {
      for (let z = -3; z <= 3; z++) {
        const d = Math.hypot(x, (y - 4.5) * 1.1, z);
        if (d > 3.3) continue;
        b.set(x, y, z, rand01(7, x, y, z) < 0.3 ? B.ember_block : B.leaves);
      }
    }
  }
}

// ---------- Mar Vermelho (um mar de verdade, de água vermelha) ----------
function mar(b: Builder): void {
  // ilhota de areia no meio com os restos do exército do Faraó
  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      const d = Math.hypot(x, z);
      if (d > 5) continue;
      b.fill(x, -12, z, x, d < 3.2 ? 1 : 0, z, B.sand);
    }
  }
  b.chest(0, 2, 0, "ruina");
  // carros e destroços boiando
  for (const [x, z] of [[-14, -8], [12, -16], [-20, 12], [18, 10], [4, 22], [-6, -24]] as const) {
    b.fill(x, -1, z, x + 2, -1, z + 1, B.planks);
    b.set(x, 0, z, B.log);
    b.set(x + 2, 0, z + 1, B.log);
  }
}

// ---------- Bezerro de Ouro ----------
function bezerro(b: Builder): void {
  b.fill(-12, 0, -12, 12, 0, 12, B.sand);
  lim(b, -7, 1, -7, 7, 1, 7, L);
  lim(b, -5, 2, -5, 5, 3, 5, L);
  // o bezerro: corpo, pernas, cabeça, chifres e rabo de ouro
  for (const [x, z] of [[-3, -1], [-3, 1], [3, -1], [3, 1]] as const) b.fill(x, 4, z, x, 5, z, B.gold_block);
  b.fill(-4, 6, -2, 3, 9, 2, B.gold_block);
  b.fill(4, 8, -1, 6, 11, 1, B.gold_block);
  b.fill(7, 8, -1, 7, 9, 1, B.gold_block);
  b.set(5, 12, -1, B.gold_block);
  b.set(5, 12, 1, B.gold_block);
  b.set(6, 10, -1, B.obsidian);
  b.set(6, 10, 1, B.obsidian);
  b.fill(-5, 7, 0, -5, 9, 0, B.gold_block);
  // as doze pedras do povo, em círculo, e as tábuas quebradas
  for (let a = 0; a < 12; a++) {
    const x = Math.round(Math.cos((a / 12) * Math.PI * 2) * 11);
    const z = Math.round(Math.sin((a / 12) * Math.PI * 2) * 11);
    b.fill(x, 1, z, x, 3, z, B.cobble);
  }
  b.set(8, 1, 9, B.limestone);
  b.set(9, 1, 9, B.limestone);
  b.chest(0, 4, 5, "templo");
}

// ---------- Muralhas e cidade de Jericó ----------
function jerico(b: Builder): void {
  const R = 26;
  const crest = (x: number, y: number, z: number) => b.set(x, y, z, (x + z) % 2 === 0 ? B.brick : B.air);
  for (let y = 1; y <= 10; y++) {
    b.fill(-R, y, -R, R, y, -R + 2, B.limestone);
    b.fill(-R, y, R - 2, R, y, R, B.limestone);
    b.fill(-R, y, -R, -R + 2, y, R, B.limestone);
    b.fill(R - 2, y, -R, R, y, R, B.limestone);
  }
  for (let t = -R; t <= R; t++) {
    crest(t, 11, -R);
    crest(t, 11, R);
    crest(-R, 11, t);
    crest(R, 11, t);
  }
  // torres de canto
  for (const [x, z] of [[-R, -R], [R, -R], [-R, R], [R, R]] as const) {
    const sx = x < 0 ? x : x - 5;
    const sz = z < 0 ? z : z - 5;
    b.fill(sx, 1, sz, sx + 5, 16, sz + 5, B.brick);
    b.fill(sx + 1, 1, sz + 1, sx + 4, 15, sz + 4, B.air);
    b.fill(sx, 16, sz, sx + 5, 16, sz + 5, L);
  }
  // portão ao sul
  b.fill(-3, 1, R - 2, 3, 7, R, B.air);
  for (const x of [-4, 4]) b.fill(x, 1, R - 2, x, 9, R, B.gold_block);
  // trecho caído (Js 6.20): entulho no lugar da muralha leste
  for (let z = -7; z <= 3; z++) {
    for (let x = R - 2; x <= R; x++) {
      b.fill(x, 1, z, x, 12, z, B.air);
      const h = Math.floor(rand01(11, x, z, 5) * 4);
      if (h > 0) b.fill(x, 1, z, x, h, z, rand01(12, x, z, 1) < 0.5 ? B.brick : B.cobble);
    }
  }
  // ruas e casas
  b.fill(-2, 0, -R + 3, 2, 0, R - 3, B.sand);
  b.fill(-R + 3, 0, -2, R - 3, 0, 2, B.sand);
  const house = (cx: number, cz: number, rise: number) => {
    b.fill(cx - 3, 1, cz - 3, cx + 3, 4, cz + 3, B.brick);
    b.fill(cx - 2, 1, cz - 2, cx + 2, 3, cz + 2, B.air);
    b.fill(cx - 3, 5, cz - 3, cx + 3, 5, cz + 3, B.planks);
    b.fill(cx - 1, 1, cz + 3, cx, 2, cz + 3, B.air); // porta
    if (rise) b.set(cx + 3, 3, cz, B.glass);
  };
  for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14], [-14, -7], [14, 7]] as const) house(x, z, (x + z) % 2 === 0 ? 1 : 0);
  // praça central: poço e baú do tesouro de Jericó
  b.fill(-1, 1, -1, 1, 1, 1, B.cobble);
  b.set(0, 1, 0, B.water);
  b.chest(5, 1, 5, "templo");
  b.chest(-5, 1, -5, "ruina");
}

// ---------- Templo de Salomão ----------
function salomao(b: Builder): void {
  lim(b, -22, 0, -34, 22, 0, 34, L);
  lim(b, -20, 1, -32, 20, 1, 32, L);
  // muro do pátio com portão ao sul
  for (let y = 2; y <= 5; y++) {
    b.fill(-20, y, -32, 20, y, -32, L);
    b.fill(-20, y, 32, 20, y, 32, L);
    b.fill(-20, y, -32, -20, y, 32, L);
    b.fill(20, y, -32, 20, y, 32, L);
  }
  b.fill(-3, 2, 32, 3, 5, 32, B.air);
  // altar de bronze no pátio
  b.fill(-3, 2, 18, 3, 3, 24, B.gold_block);
  b.fill(-2, 4, 19, 2, 4, 23, B.ember_block);
  // o templo: casa de cedro e calcário
  for (let y = 2; y <= 17; y++) {
    b.fill(-10, y, -30, 10, y, -30, L);
    b.fill(-10, y, 8, 10, y, 8, L);
    b.fill(-10, y, -30, -10, y, 8, L);
    b.fill(10, y, -30, 10, y, 8, L);
  }
  b.fill(-9, 2, -29, 9, 2, 7, B.cedar_planks);
  b.fill(-9, 3, -29, 9, 16, 7, B.air);
  for (let y = 18; y <= 22; y++) {
    const k = y - 18;
    b.fill(-10 + k * 2, y, -30, 10 - k * 2, y, 8, y === 22 ? B.gold_block : B.cedar_planks);
  }
  // pórtico (ulã) com as colunas Jaquim e Boaz
  b.fill(-3, 2, 8, 3, 8, 8, B.air);
  for (const x of [-6, 6]) {
    b.fill(x, 2, 12, x, 19, 12, B.gold_block);
    b.fill(x - 1, 20, 11, x + 1, 20, 13, B.gold_block);
  }
  // janelas altas e candelabros de ouro
  for (const z of [-24, -16, -8, 0]) {
    for (const x of [-10, 10]) b.fill(x, 10, z, x, 12, z, B.glass);
    b.fill(-6, 3, z, -6, 5, z, B.gold_block);
    b.fill(6, 3, z, 6, 5, z, B.gold_block);
  }
  // o Santo dos Santos, fechado por cedro
  b.fill(-9, 3, -22, 9, 16, -22, B.cedar_planks);
  b.fill(-1, 3, -22, 1, 5, -22, B.air);
  b.fill(-2, 3, -28, 2, 3, -24, B.gold_block);
  b.chest(0, 4, -26, "templo");
  b.chest(-6, 3, -27, "templo");
}

// ---------- Baleia de Jonas ----------
function baleia(b: Builder): void {
  const a = 22;
  const bh = 7;
  const c = 8;
  for (let x = -a - 9; x <= a; x++) {
    for (let y = -8; y <= 7; y++) {
      for (let z = -c - 1; z <= c + 1; z++) {
        let d: number;
        if (x >= -8) d = (x / a) ** 2 + (y / bh) ** 2 + (z / c) ** 2;
        else {
          const s = Math.max(0.3, 1 - (-8 - x) / 24);
          d = (y / (bh * s)) ** 2 + (z / (c * s)) ** 2;
        }
        if (d <= 1) b.set(x, y, z, y < -1 ? B.limestone : B.basalt);
      }
    }
  }
  // barbatana da cauda
  b.fill(-a - 12, 2, -9, -a - 9, 3, 9, B.basalt);
  b.fill(-a - 11, 4, -7, -a - 10, 5, 7, B.basalt);
  // boca aberta (túnel até o ventre oco, Jn 1.17) e dentes
  b.fill(6, 1, -2, a + 1, 3, 2, B.air);
  b.fill(6, 0, -2, a + 1, 0, 2, B.limestone);
  for (let z = -2; z <= 2; z += 2) {
    b.set(a, 3, z, B.limestone);
    b.set(a, 1, z, B.limestone);
  }
  b.fill(-6, 1, -4, 6, 4, 4, B.air);
  b.fill(-6, 0, -4, 6, 0, 4, B.limestone);
  b.chest(0, 1, 0, "templo");
  b.chest(-4, 1, 3, "ruina");
  // olhos e esguicho
  for (const z of [-5, 5]) b.set(a - 9, 3, z, B.obsidian);
  b.fill(8, 8, 0, 8, 13, 0, B.glass);
}

export const LANDMARKS: Record<LandmarkId, LandmarkDef> = {
  noe: {
    id: "noe",
    name: "Arca de Noé",
    ref: "Gn 6–9",
    blurb: "Uma arca imensa de cedro repousa sobre a terra seca. Dentro dela, os animais esperam.",
    rx: 34,
    rz: 13,
    H: 22,
    maxGy: 36,
    residents: [
      { mob: "boi", dx: -4, dy: 1, dz: 0 },
      { mob: "boi", dx: -4, dy: 1, dz: 2 },
      { mob: "cabra", dx: 6, dy: 1, dz: -1 },
      { mob: "cabra", dx: 6, dy: 1, dz: 2 },
      { mob: "galo", dx: 14, dy: 1, dz: 0 },
      { mob: "ovelha", dx: 18, dy: 1, dz: 1 },
      { mob: "ovelha", dx: -18, dy: 1, dz: -1 },
      { mob: "camelo", dx: 0, dy: 6, dz: -2 },
    ],
    build: arca,
  },
  babel: {
    id: "babel",
    name: "Torre de Babel",
    ref: "Gn 11.1–9",
    blurb: "“Vinde, edifiquemos uma torre cujo cume toque os céus.” Suba até o topo pelas rampas.",
    rx: 26,
    rz: 26,
    H: 31,
    maxGy: 30,
    residents: [{ mob: "escorpiao", dx: 28, dy: 1, dz: 28 }],
    build: babel,
  },
  sarca: {
    id: "sarca",
    name: "Sarça Ardente",
    ref: "Êx 3.1–6",
    blurb: "Uma sarça arde sem se consumir. Tire as sandálias dos pés: o lugar é terra santa.",
    rx: 8,
    rz: 8,
    H: 12,
    maxGy: 50,
    residents: [{ mob: "moises", dx: 5, dy: 1, dz: 4 }],
    build: sarca,
  },
  mar: {
    id: "mar",
    name: "Mar Vermelho",
    ref: "Êx 14.21–31",
    blurb: "O mar de águas vermelhas que se abriu para o povo. Ao centro, uma ilhota guarda os restos do exército do Faraó.",
    rx: 40,
    rz: 40,
    H: 8,
    maxGy: 40,
    pool: { r: 36, depth: 9, red: true },
    residents: [],
    build: mar,
  },
  bezerro: {
    id: "bezerro",
    name: "Bezerro de Ouro",
    ref: "Êx 32.1–6",
    blurb: "O povo fundiu o seu ouro num bezerro. Ao redor, as doze pedras do acampamento.",
    rx: 13,
    rz: 13,
    H: 14,
    maxGy: 44,
    residents: [{ mob: "filisteu", dx: 9, dy: 1, dz: -9 }],
    build: bezerro,
  },
  jerico: {
    id: "jerico",
    name: "Muralhas de Jericó",
    ref: "Js 6.1–21",
    blurb: "Os muros caíram ao som das trombetas. A cidade ainda guarda seu tesouro.",
    rx: 27,
    rz: 27,
    H: 18,
    maxGy: 42,
    residents: [
      { mob: "filisteu", dx: 10, dy: 1, dz: 0 },
      { mob: "filisteu", dx: -10, dy: 1, dz: 3 },
      { mob: "filisteu", dx: 0, dy: 1, dz: -12 },
      { mob: "filisteu", dx: 16, dy: 1, dz: 18 },
    ],
    build: jerico,
  },
  salomao: {
    id: "salomao",
    name: "Templo de Salomão",
    ref: "1 Rs 6–7",
    blurb: "A casa do Senhor, de pedra e cedro, com colunas de ouro à entrada: Jaquim e Boaz.",
    rx: 23,
    rz: 35,
    H: 24,
    maxGy: 36,
    residents: [
      { mob: "aldeao", dx: 3, dy: 2, dz: 26 },
      { mob: "aldeao_b", dx: -4, dy: 2, dz: 22 },
    ],
    build: salomao,
  },
  baleia: {
    id: "baleia",
    name: "Baleia de Jonas",
    ref: "Jn 1.17–2.10",
    blurb: "O grande peixe que o Senhor preparou. Há um espaço oco no ventre, e um tesouro.",
    rx: 46,
    rz: 46,
    H: 16,
    maxGy: 40,
    pool: { r: 40, depth: 11 },
    residents: [],
    build: baleia,
  },
};

/** Ordem em que os monumentos surgem (cronologia bíblica). */
export const LANDMARK_ORDER: LandmarkId[] = ["noe", "babel", "sarca", "mar", "bezerro", "jerico", "salomao", "baleia"];
export const LANDMARK_INTERVAL_S = 600;

const DIRS = ["norte", "nordeste", "leste", "sudeste", "sul", "sudoeste", "oeste", "noroeste"];
/** Direção (para onde olhar) de um ponto, com -Z = norte. */
export function compass(dx: number, dz: number): string {
  const a = Math.atan2(dx, -dz);
  return DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
}

/** Escolhe o local do próximo monumento: terra firme, plana e longe do jogador (fora da distância de visão). */
export function pickLandmarkSite(seed: number, id: LandmarkId, px: number, pz: number, viewBlocks: number, k: number, existing: LandmarkSite[] = []): LandmarkSite {
  const def = LANDMARKS[id];
  const ext = Math.max(def.rx, def.rz);
  const dist0 = viewBlocks + ext + 40;
  const a0 = rand01(seed + 4000, k, 1, 7) * Math.PI * 2;
  let best: { site: LandmarkSite; score: number } | null = null;
  for (let t = 0; t < 60; t++) {
    const a = a0 + t * 2.39996;
    const d = dist0 + (t % 6) * 14 + Math.floor(t / 6) * 10;
    const x = Math.round(px + Math.cos(a) * d);
    const z = Math.round(pz + Math.sin(a) * d);
    if (existing.some((e) => Math.hypot(e.x - x, e.z - z) < ext + Math.max(LANDMARKS[e.id].rx, LANDMARKS[e.id].rz) + 24)) continue;
    const c = columnInfo(seed, x, z);
    if (c.river || c.h <= SEA_LEVEL + 1) continue;
    const hs = [c.h];
    let rough = 0;
    const rr = ext * 0.8;
    for (let i = 0; i < 8; i++) {
      const cc = columnInfo(seed, Math.round(x + Math.cos((i / 8) * Math.PI * 2) * rr), Math.round(z + Math.sin((i / 8) * Math.PI * 2) * rr));
      hs.push(cc.h);
      if (cc.river) rough += 6;
    }
    hs.sort((p, q) => p - q);
    const gy = hs[Math.floor(hs.length / 2)];
    rough += hs[hs.length - 1] - hs[0];
    if (gy > def.maxGy || gy < SEA_LEVEL + 2 || gy + def.H >= WORLD_H - 1) continue;
    if (structuresNear(seed, x, z, ext + 45).length > 0) rough += 30;
    const score = rough + t * 0.4;
    if (!best || score < best.score) best = { site: { id, x, z, gy }, score };
    if (rough <= 5) break;
  }
  if (best) return best.site;
  // sem terreno bom: planta no ponto mais distante e nivela mesmo assim
  const x = Math.round(px + Math.cos(a0) * dist0);
  const z = Math.round(pz + Math.sin(a0) * dist0);
  const gy = Math.max(SEA_LEVEL + 3, Math.min(def.maxGy, columnInfo(seed, x, z).h));
  return { id, x, z, gy };
}
