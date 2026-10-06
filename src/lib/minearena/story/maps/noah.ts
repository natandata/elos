// MAP_03_NOAH: o vale onde Noé constrói a arca. Mapa limitado de 128×112, com floresta, campo, rio e o estaleiro.
import { B } from "../../blocks/blocks";
import { fbm2, smoothstep } from "../../world/noise";
import type { MapEnv, StoryMapDef } from "../types";
import { type Column, type ChunkCtx, buildChunk, outside, scatter, tree } from "./builder";

export const NOAH_W = 128;
export const NOAH_D = 112;
const SEED = 3141;

/** A arca: casco de 28×11, base no chão (y=24). */
export const ARK = { x0: 60, x1: 87, z0: 51, z1: 61, y0: 24, doorX: [73, 74] as number[] };
export const ARK_INSIDE = { x0: ARK.x0 + 1, x1: ARK.x1 - 1, z0: ARK.z0 + 1, z1: ARK.z1 - 1, y0: ARK.y0 + 1, y1: ARK.y0 + 6 };

/** Todos os blocos da arca concluída: [x, y, z, id]. */
export function arkBlocks(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const { x0, x1, z0, z1, y0 } = ARK;
  const cx = (x0 + x1) / 2;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      // proa e popa afinam
      const dx = Math.abs(x - cx) / ((x1 - x0) / 2);
      const taper = dx > 0.82 ? 2 : dx > 0.65 ? 1 : 0;
      if (z < z0 + taper || z > z1 - taper) continue;
      const wall = z === z0 + taper || z === z1 - taper || x === x0 || x === x1;
      out.push([x, y0, z, z === Math.round((z0 + z1) / 2) ? B.log : B.cedar_planks]);
      if (wall) for (let y = y0 + 1; y <= y0 + 6; y++) out.push([x, y, z, y > y0 + 4 ? B.cedar_planks : B.planks]);
      if (!wall) {
        out.push([x, y0 + 3, z, B.planks]);
        out.push([x, y0 + 7, z, x % 4 === 0 ? B.log : B.cedar_planks]);
      }
    }
  }
  // pilares internos
  for (let x = x0 + 4; x < x1; x += 6) for (const z of [z0 + 3, z1 - 3]) for (let y = y0 + 1; y <= y0 + 6; y++) out.push([x, y, z, B.log]);
  // cabine e telhado em duas águas
  const midZ = Math.round((z0 + z1) / 2);
  for (let x = x0 + 8; x <= x1 - 8; x++) {
    out.push([x, y0 + 8, midZ, B.cedar_planks]);
    out.push([x, y0 + 8, midZ - 2, B.cedar_planks]);
    out.push([x, y0 + 8, midZ + 2, B.cedar_planks]);
    out.push([x, y0 + 9, midZ - 1, B.cedar_planks]);
    out.push([x, y0 + 9, midZ + 1, B.cedar_planks]);
    out.push([x, y0 + 10, midZ, B.cedar_planks]);
  }
  // janelas e tochas
  for (let x = x0 + 4; x <= x1 - 4; x += 5) {
    out.push([x, y0 + 5, z0, B.glass]);
    out.push([x, y0 + 5, z1, B.glass]);
  }
  for (const [tx, tz] of [[x0 + 2, midZ], [x1 - 2, midZ], [cx | 0, z0 + 1], [cx | 0, z1 - 1]]) out.push([tx, y0 + 4, tz, B.torch]);
  return out;
}

/** A porta: abertura de 2×3 na lateral sul. */
export function arkDoorCells(): [number, number, number][] {
  const cells: [number, number, number][] = [];
  for (const x of ARK.doorX) for (let y = ARK.y0 + 1; y <= ARK.y0 + 3; y++) cells.push([x, y, ARK.z0]);
  return cells;
}

/** Estacas e costelas da base: mostram onde a arca será construída. */
function scaffold(c: ChunkCtx): void {
  const { x0, x1, z0, z1, y0 } = ARK;
  for (let x = x0; x <= x1; x += 3) {
    for (const z of [z0, z1]) {
      c.set(x, y0 + 1, z, B.cedar_log);
      c.set(x, y0 + 2, z, B.cedar_log);
    }
  }
  for (let z = z0; z <= z1; z++) {
    c.set(x0, y0 + 1, z, B.cedar_log);
    c.set(x1, y0 + 1, z, B.cedar_log);
  }
  // pilhas de tábuas e ferramentas ao redor
  for (const [px, pz] of [[x0 - 6, z0 - 3], [x0 - 7, z1 + 4], [x1 + 6, z0 - 2]]) {
    c.fill(px, y0 + 1, pz, px + 1, y0 + 2, pz + 2, B.planks);
  }
}

/** Pomar ao sul da arca: árvores frutíferas garantidas para a missão de alimento. */
const ORCHARD: [number, number][] = [[56, 77], [62, 74], [68, 77], [70, 83], [64, 87], [57, 85], [63, 80]];

const riverZ = (x: number): number => 98 + 4 * Math.sin(x / 11);

function height(x: number, z: number): number {
  let h = 24 + fbm2(SEED, x / 26, z / 26, 3) * 4;
  const dm = Math.hypot(x - 74, z - 56);
  h = 24 + (h - 24) * smoothstep(14, 30, dm);
  const edge = Math.min(x, z, NOAH_W - 1 - x, NOAH_D - 1 - z);
  if (edge < 12) h += smoothstep(12, 0, edge) * 10;
  if (edge < 0) h = Math.min(58, h + -edge * 3 + 8);
  // colina ao nordeste: terreno alto
  const dh = Math.hypot(x - 108, z - 20);
  if (dh < 18) h += smoothstep(18, 0, dh) * 8;
  return Math.round(h);
}

function column(x: number, z: number): Column {
  let h = height(x, z);
  const out = outside(x, z, NOAH_W, NOAH_D);
  const edge = Math.min(x, z, NOAH_W - 1 - x, NOAH_D - 1 - z);
  let top: number = B.grass;
  let water = 0;
  const dr = Math.abs(z - riverZ(x));
  if (out === 0 && dr < 3.2 && z > 80) {
    h = 21;
    water = 23;
    top = B.sand;
  } else if (out === 0 && dr < 4.8 && z > 80) {
    top = B.sand;
    h = Math.min(h, 23);
  }
  // terreno do estaleiro: terra batida
  if (x >= ARK.x0 - 5 && x <= ARK.x1 + 5 && z >= ARK.z0 - 4 && z <= ARK.z1 + 4) {
    h = 24;
    top = B.dirt;
  }
  if (out > 0 || edge < 5) top = h > 40 ? B.snow : h > 30 ? B.stone : top === B.sand ? B.sand : B.stone;
  return { h, top, sub: top === B.sand ? B.sand : top === B.stone || top === B.snow ? B.stone : B.dirt, water };
}

export function noahColumn(x: number, z: number): Column {
  return column(x, z);
}

function decorate(c: ChunkCtx, env: MapEnv): void {
  void env;
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const x = c.x0 + lx;
      const z = c.z0 + lz;
      if (outside(x, z, NOAH_W, NOAH_D) > 0) continue;
      const k = column(x, z);
      if (k.water || k.top !== B.grass) continue;
      const r = c.rand(x, z, 3);
      if (r < 0.03) c.set(x, k.h + 1, z, B.flower_yellow);
      else if (r < 0.05) c.set(x, k.h + 1, z, B.flower_red);
      else if (r < 0.2) c.set(x, k.h + 1, z, B.tallgrass);
      else if (r < 0.215) c.set(x, k.h + 1, z, B.lily);
    }
  }
  // floresta densa a oeste (madeira para a arca) e árvores esparsas no resto
  scatter(c, 6, 8, 13, (x, z, r) => {
    if (outside(x, z, NOAH_W, NOAH_D) > 0 || Math.min(x, z, NOAH_W - 1 - x, NOAH_D - 1 - z) < 3) return;
    const k = column(x, z);
    if (k.water || k.top !== B.grass) return;
    if (x >= ARK.x0 - 8 && x <= ARK.x1 + 8 && z >= ARK.z0 - 8 && z <= ARK.z1 + 8) return;
    const forest = x < 44;
    if (r > (forest ? 0.85 : 0.18)) return;
    const kind = c.rand(x, z, 21);
    if (forest && kind < 0.55) tree(c, x, k.h, z, { trunk: 6 + Math.floor(c.rand(x, z, 22) * 3), radius: 3, leaf: B.leaves, log: B.log });
    else if (kind < 0.8) tree(c, x, k.h, z, { trunk: 5 + Math.floor(c.rand(x, z, 23) * 2), radius: 3, leaf: B.leaves });
    else tree(c, x, k.h, z, { trunk: 9, radius: 4, leaf: B.leaves, wide: true });
  });
  for (const [x, z] of ORCHARD) tree(c, x, column(x, z).h, z, { trunk: 5, radius: 3, leaf: B.fruit_leaves });
  scaffold(c);
}

export const NOAH_MAP: StoryMapDef = {
  id: "noah",
  name: "O vale da arca",
  w: NOAH_W,
  d: NOAH_D,
  spawn: { x: 44, z: 56, yaw: -Math.PI / 2 },
  zones: {
    start: { x: 44, z: 56, r: 6 },
    camp: { x: 56, z: 56, r: 6 },
    forest: { x: 20, z: 56, r: 18 },
    arkSite: { x: 74, z: 56, r: 17 },
    arkDoor: { x: 73, z: 48, r: 4 },
    arkInside: { x: 74, z: 56, r: 15 },
    arkEnter: { x: 74, z: 56, r: 3.5 },
    meadow: { x: 100, z: 74, r: 14 },
    orchard: { x: 63, z: 80, r: 10 },
    hill: { x: 108, z: 20, r: 10 },
  },
  time: 0.1,
  bgm: "noah",
  generate: (cx, cz, env) => {
    const g = buildChunk(SEED, cx, cz, (x, z) => column(x, z), (c) => decorate(c, env));
    return g;
  },
};
