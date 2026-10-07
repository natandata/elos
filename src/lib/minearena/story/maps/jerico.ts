// Jericó: uma cidade gigante, do tamanho de um bioma, com muralha dupla, torres, quatro portões, avenidas, centenas de casas e o palácio do rei.
// Os muros são gerados por dados (células agrupadas por chunk), para que possam desabar com o grito de Josué (env.fell).
import { B } from "../../blocks/blocks";
import { CHUNK } from "../../config/config";
import { fbm2, rand01 } from "../../world/noise";
import type { MapEnv, StoryMapDef } from "../types";
import { type ChunkCtx, scatter } from "./builder";
import { type MapSpec, groundOf, house, makeMap, palm, tent } from "./gen";

export const JERICO = {
  w: 480,
  d: 480,
  cx: 240,
  cz: 250,
  outer: 120,
  inner: 60,
  t: 3,
  hOuter: 12,
  hInner: 10,
  camp: { x: 240, z: 60 },
  raabe: { x: 127, z: 300 },
  window: { x: 114, z: 300 },
  hills: { x: 40, z: 300 },
};
const { cx: CX, cz: CZ, t: T } = JERICO;
const cheb = (x: number, z: number): number => Math.max(Math.abs(x - CX), Math.abs(z - CZ));
const CELL = 13;

// ---------- a muralha como dados ----------
type Cell = [number, number, number, number];
/** A casa de Raabe fica no trecho do muro externo, a oeste (Josué 2:15): esse trecho permanece de pé. */
const spared = (x: number, z: number): boolean => x <= CX - JERICO.outer + T - 1 && z >= 286 && z <= 314;

function wallMat(x: number, y: number, z: number): number {
  return (x + y + z) % 5 === 0 ? B.sandstone : B.brick;
}

function allWallCells(): Cell[] {
  const out: Cell[] = [];
  const ring = (H: number, h: number): void => {
    for (let x = CX - H; x <= CX + H; x++) {
      for (let z = CZ - H; z <= CZ + H; z++) {
        const d = cheb(x, z);
        if (d > H || d <= H - T) continue;
        const xSide = Math.abs(x - CX) >= Math.abs(z - CZ);
        const gate = xSide ? Math.abs(z - CZ) <= 4 : Math.abs(x - CX) <= 4;
        const win = H === JERICO.outer && xSide && x < CX && z >= JERICO.window.z - 1 && z <= JERICO.window.z;
        for (let y = 25; y <= 24 + h; y++) {
          if (gate && y <= 24 + h - 3) continue;
          if (win && (y === 28 || y === 29)) continue;
          out.push([x, y, z, wallMat(x, y, z)]);
        }
      }
    }
  };
  ring(JERICO.outer, JERICO.hOuter);
  ring(JERICO.inner, JERICO.hInner);
  const tower = (tx: number, tz: number, r: number, top: number): void => {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let y = 25; y <= top; y++) out.push([tx + dx, y, tz + dz, wallMat(tx + dx, y, tz + dz)]);
        const edge = Math.abs(dx) === r || Math.abs(dz) === r;
        if (edge && (dx + dz) % 2 === 0) out.push([tx + dx, top + 1, tz + dz, B.sandstone]);
      }
    }
    out.push([tx, top + 1, tz, B.torch]);
  };
  const o = JERICO.outer - 1;
  for (const [dx, dz] of [[-o, -o], [o, -o], [-o, o], [o, o], [-70, -o], [70, -o], [-70, o], [70, o], [-o, -70], [o, -70], [-o, 70], [o, 70]]) tower(CX + dx, CZ + dz, 3, 40);
  const i = JERICO.inner - 1;
  for (const [dx, dz] of [[-i, -i], [i, -i], [-i, i], [i, i]]) tower(CX + dx, CZ + dz, 2, 33);
  return out;
}

let CACHE: { standing: Map<number, number[]>; fallen: Map<number, number[]>; fall: Cell[] } | null = null;
const bkey = (cx: number, cz: number): number => cx * 4096 + cz;
function cache() {
  if (CACHE) return CACHE;
  const standing = new Map<number, number[]>();
  const fallen = new Map<number, number[]>();
  const fall: Cell[] = [];
  const rubble: Cell[] = [];
  const put = (m: Map<number, number[]>, c: Cell): void => {
    const k = bkey(Math.floor(c[0] / CHUNK), Math.floor(c[2] / CHUNK));
    let a = m.get(k);
    if (!a) m.set(k, (a = []));
    a.push(c[0], c[1], c[2], c[3]);
  };
  for (const c of allWallCells()) {
    put(standing, c);
    if (spared(c[0], c[2])) put(fallen, c);
    else {
      fall.push([c[0], c[1], c[2], B.air]);
      if (c[1] <= 26 && rand01(77, c[0], 0, c[2]) < (c[1] === 25 ? 0.4 : 0.12)) {
        const r: Cell = [c[0], c[1], c[2], B.cobble];
        put(fallen, r);
        rubble.push(r);
      }
    }
  }
  fall.sort((a, b) => b[1] - a[1]);
  CACHE = { standing, fallen, fall: [...fall, ...rubble] };
  return CACHE;
}

/** Os blocos que desabam com o grito: do alto para baixo; por fim, o entulho. */
export function jericoFall(): Cell[] {
  return cache().fall;
}

// ---------- casas ----------
const rectCheb = (x0: number, z0: number, x1: number, z1: number): [number, number] => {
  const nx = Math.min(Math.max(CX, x0), x1);
  const nz = Math.min(Math.max(CZ, z0), z1);
  return [cheb(nx, nz), Math.max(cheb(x0, z0), cheb(x1, z0), cheb(x0, z1), cheb(x1, z1))];
};

function houses(c: ChunkCtx): void {
  const gx0 = Math.floor((c.x0 - 14) / CELL);
  const gx1 = Math.floor((c.x0 + CHUNK + 14) / CELL);
  const gz0 = Math.floor((c.z0 - 14) / CELL);
  const gz1 = Math.floor((c.z0 + CHUNK + 14) / CELL);
  for (let i = gx0; i <= gx1; i++) {
    for (let j = gz0; j <= gz1; j++) {
      if (rand01(555, i, 1, j) < 0.04) continue;
      const w = 5 + Math.floor(rand01(555, i, 2, j) * 5);
      const dd = 5 + Math.floor(rand01(555, i, 3, j) * 5);
      const x0 = i * CELL + 2 + Math.floor(rand01(555, i, 4, j) * (CELL - w - 3));
      const z0 = j * CELL + 2 + Math.floor(rand01(555, i, 5, j) * (CELL - dd - 3));
      const x1 = x0 + w - 1;
      const z1 = z0 + dd - 1;
      const [dmin, dmax] = rectCheb(x0, z0, x1, z1);
      const between = dmin >= 70 && dmax <= 108;
      const inside = dmin >= 44 && dmax <= 54;
      if (!between && !inside) continue;
      // avenidas (as quatro que levam aos portões)
      if (x1 >= CX - 7 && x0 <= CX + 7) continue;
      if (z1 >= CZ - 7 && z0 <= CZ + 7) continue;
      // a casa de Raabe e o seu quintal
      if (x0 <= 140 && z1 >= 284 && z0 <= 316) continue;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const facing = Math.abs(mx - CX) <= Math.abs(mz - CZ) ? (mx < CX ? 2 : 3) : mz < CZ ? 0 : 1;
      const tall = rand01(555, i, 6, j) < 0.3 ? 1 : 0;
      const wall = rand01(555, i, 7, j) < 0.5 ? B.brick : B.sandstone;
      house(c, x0, 24, z0, w, dd, 4 + tall, wall, rand01(555, i, 8, j) < 0.5 ? B.planks : B.cedar_planks, facing);
    }
  }
}

function palace(c: ChunkCtx): void {
  // a plataforma, o palácio do rei e as quatro torres de ouro
  c.fill(206, 25, 216, 274, 25, 284, B.limestone);
  c.fill(226, 26, 236, 254, 38, 264, B.limestone);
  c.fill(228, 26, 238, 252, 37, 262, B.air);
  c.fill(238, 26, 236, 242, 31, 238, B.air);
  c.set(240, 38, 237, B.torch);
  for (let k = 0; k < 8; k++) c.set(230 + k * 3, 26, 240, B.torch);
  for (const [tx, tz] of [[221, 231], [255, 231], [221, 265], [255, 265]]) {
    c.fill(tx, 26, tz, tx + 5, 48, tz + 5, B.sandstone);
    c.fill(tx + 1, 49, tz + 1, tx + 4, 49, tz + 4, B.gold_block);
  }
  c.fill(238, 26, 214, 242, 26, 215, B.limestone);
}

const jerico: MapSpec = {
  id: "jerico",
  name: "Jericó, a grande cidade das palmeiras",
  w: JERICO.w,
  d: JERICO.d,
  seed: 14141,
  time: 0.14,
  bgm: "jerico",
  spawn: { x: 240, z: 24, yaw: Math.PI },
  zones: {
    start: { x: 240, z: 24, r: 5 },
    acampamento: { x: JERICO.camp.x, z: JERICO.camp.z, r: 16 },
    cerco: { x: 240, z: 100, r: 8 },
    cidade: { x: 240, z: 142, r: 8 },
    casa: { x: JERICO.raabe.x, z: JERICO.raabe.z, r: 5 },
    janela: { x: JERICO.window.x, z: JERICO.window.z, r: 3 },
    montes: { x: JERICO.hills.x, z: JERICO.hills.z, r: 8 },
    // o circuito ao redor da muralha externa
    c1: { x: 106, z: 116, r: 8 },
    w: { x: 106, z: 250, r: 8 },
    c4: { x: 106, z: 384, r: 8 },
    n: { x: 240, z: 384, r: 8 },
    c3: { x: 374, z: 384, r: 8 },
    e: { x: 374, z: 250, r: 8 },
    c2: { x: 374, z: 116, r: 8 },
  },
  base: 24,
  amp: 1,
  scale: 44,
  flat: [
    { x: CX, z: CZ, r: 178, h: 24 },
    { x: JERICO.camp.x, z: JERICO.camp.z, r: 22, h: 24 },
    { x: 240, z: 24, r: 8, h: 24 },
  ],
  surf: (x, z, k) => {
    const d = cheb(x, z);
    if (d <= JERICO.outer + 1) {
      k.top = B.dirt;
      k.sub = B.dirt;
      const road = Math.abs(x - CX) <= 5 || Math.abs(z - CZ) <= 5 || d >= 111 || (d >= 61 && d <= 68);
      if (road) k.top = B.sandstone;
      if (d <= 40) k.top = B.limestone;
      return;
    }
    k.top = fbm2(14141 + 3, x / 30, z / 30, 2) > 0.58 ? B.sand : B.dry_grass;
    if (k.top === B.sand) k.sub = B.sandstone;
    // as colinas a oeste, onde os espias se escondem
    const dh = Math.hypot(x - JERICO.hills.x, z - JERICO.hills.z);
    if (dh < 36) {
      k.h = Math.max(k.h, 24 + Math.round(14 * (1 - dh / 36)));
      k.top = B.stone;
      k.sub = B.stone;
      return;
    }
    // o Jordão, a leste (margens de 1 bloco por passo)
    if (x >= 436 && x <= 462) {
      const f = Math.max(20, 24 - Math.min(x - 436, 462 - x));
      k.h = f;
      k.top = B.sand;
      k.sub = B.sand;
      k.water = f < 23 ? 23 : 0;
    }
  },
  tree: () => null,
  cover: (x, z, r, k) => (k.top === B.dry_grass && r < 0.07 && cheb(x, z) > 124 ? B.tallgrass : 0),
  extra: (c: ChunkCtx, env: MapEnv) => {
    // acampamento de Israel, ao sul
    const { x: cx0, z: cz0 } = JERICO.camp;
    for (const [dx, dz] of [[-12, -4], [12, -4], [-8, -10], [8, -10], [0, -14], [-16, 4], [16, 4], [-6, 8], [6, 8], [-20, -8], [20, -8], [0, 12]]) tent(c, cx0 + dx - 2, 24, cz0 + dz - 2);
    // muralhas e torres (em pé ou já desabadas)
    const cells = (env.fell ? cache().fallen : cache().standing).get(bkey(c.cx, c.cz));
    if (cells) for (let i = 0; i < cells.length; i += 4) c.set(cells[i], cells[i + 1], cells[i + 2], cells[i + 3]);
    houses(c);
    palace(c);
    // a casa de Raabe, encostada no muro externo, e a janela voltada para fora
    house(c, 123, 24, 294, 9, 13, 5, B.sandstone, B.planks, 2);
    c.fill(123, 28, 299, 123, 29, 300, B.air);
    // palmeiras ao longo das avenidas
    for (let k = -108; k <= 108; k += 12) {
      for (const sgn of [-1, 1]) {
        const a: [number, number][] = [[CX + sgn * 7, CZ + k], [CX + k, CZ + sgn * 7]];
        for (const [px, pz] of a) if (c.inside(px, pz) && cheb(px, pz) < 110 && !(px > 206 && px < 274 && pz > 216 && pz < 284)) palm(c, px, 24, pz, 5);
      }
    }
    // o mercado, perto do portão sul
    for (const dx of [-26, -18, 12, 20]) for (const dz of [0, 12]) tent(c, CX + dx, 24, 142 + dz);
    // palmeiras: um mar de palmeiras fora da cidade
    scatter(c, 14, 6, 21, (x, z, r) => {
      if (r > 0.5 || cheb(x, z) < 134 || x > 430 || x < 4 || z < 4 || x > JERICO.w - 4 || z > JERICO.d - 4) return;
      if (Math.hypot(x - JERICO.camp.x, z - JERICO.camp.z) < 34 || Math.hypot(x - JERICO.hills.x, z - JERICO.hills.z) < 40) return;
      palm(c, x, groundOf(jerico, x, z), z, 6);
    });
  },
};
export const JERICO_MAP: StoryMapDef = makeMap(jerico);
