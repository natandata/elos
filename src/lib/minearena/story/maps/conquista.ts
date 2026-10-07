// Mapas da Fase 5 (início): Os Espias (Canaã), Moisés e a Terra Prometida (monte Nebo), Raabe e Jericó (em ./jerico) e Josué e o Jordão (a travessia).
import { B } from "../../blocks/blocks";
import { fbm2 } from "../../world/noise";
import type { StoryMapDef } from "../types";
import { type ChunkCtx } from "./builder";
import { type MapSpec, groundOf, house, makeMap, palm, tent } from "./gen";

/** Muro quadrado de `t` blocos de espessura e altura `h`, sobre o chão `gy`. */
function ring(c: ChunkCtx, x0: number, z0: number, x1: number, z1: number, gy: number, h: number, t: number, id: number): void {
  c.fill(x0, gy + 1, z0, x1, gy + h, z0 + t - 1, id);
  c.fill(x0, gy + 1, z1 - t + 1, x1, gy + h, z1, id);
  c.fill(x0, gy + 1, z0 + t, x0 + t - 1, gy + h, z1 - t, id);
  c.fill(x1 - t + 1, gy + 1, z0 + t, x1, gy + h, z1 - t, id);
}

// ============================================================ OS ESPIAS (Canaã)
export const ESPIAS = { cades: { x: 24, z: 100 }, escol: { x: 112, z: 52 }, cidade: { x: 140, z: 24 } };

const espias: MapSpec = {
  id: "espias",
  name: "A terra de Canaã, do Negebe a Escol",
  w: 160,
  d: 128,
  seed: 11111,
  time: 0.14,
  bgm: "espias",
  spawn: { x: 24, z: 106, yaw: 0 },
  zones: {
    start: { x: 24, z: 106, r: 5 },
    acampamento: { x: ESPIAS.cades.x, z: ESPIAS.cades.z, r: 10 },
    negebe: { x: 64, z: 80, r: 8 },
    escol: { x: ESPIAS.escol.x, z: ESPIAS.escol.z, r: 9 },
    cidade: { x: ESPIAS.cidade.x, z: 42, r: 8 },
  },
  base: 25,
  amp: 3,
  scale: 34,
  flat: [
    { x: ESPIAS.cades.x, z: ESPIAS.cades.z, r: 10, h: 25 },
    { x: 24, z: 106, r: 6, h: 25 },
    { x: ESPIAS.escol.x, z: ESPIAS.escol.z, r: 12, h: 25 },
    { x: ESPIAS.cidade.x, z: 34, r: 18, h: 25 },
    { x: 64, z: 80, r: 8, h: 25 },
  ],
  surf: (x, z, k) => {
    if (fbm2(11111 + 5, x / 26, z / 26, 2) > 0.62 && Math.hypot(x - ESPIAS.cades.x, z - ESPIAS.cades.z) > 14) k.top = B.dry_grass;
  },
  tree: (x, z, r, k) => {
    // o vale de Escol: um pomar de videiras (copa com frutos)
    if (Math.hypot(x - ESPIAS.escol.x, z - ESPIAS.escol.z) < 10) return r < 0.7 ? { trunk: 3, radius: 2, leaf: B.fruit_leaves } : null;
    if (k.top === B.dry_grass || r > 0.12) return null;
    for (const s of [ESPIAS.cades, ESPIAS.escol, { x: 64, z: 80 }, { x: ESPIAS.cidade.x, z: 34 }]) if (Math.hypot(x - s.x, z - s.z) < 14) return null;
    return { trunk: 5, radius: 3, leaf: B.leaves };
  },
  treeCell: 6,
  cover: (x, z, r, k) => (k.top === B.grass ? (r < 0.04 ? B.flower_yellow : r < 0.16 ? B.tallgrass : 0) : r < 0.05 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    const { x, z } = ESPIAS.cades;
    for (const [dx, dz] of [[-8, -5], [7, -6], [-9, 5], [8, 6], [0, -10]]) tent(c, x + dx - 2, 25, z + dz - 2);
    // a cidade fortificada com os filhos de Anaque: muralha alta com torres e portão ao sul
    const cx = ESPIAS.cidade.x;
    ring(c, cx - 9, 15, cx + 9, 33, 25, 9, 2, B.cobble);
    c.fill(cx - 1, 26, 32, cx + 1, 31, 33, B.air);
    for (const [tx, tz] of [[cx - 11, 13], [cx + 8, 13], [cx - 11, 31], [cx + 8, 31]]) {
      c.fill(tx, 26, tz, tx + 3, 36, tz + 3, B.cobble);
      c.set(tx + 1, 37, tz + 1, B.torch);
    }
    for (const [hx, hz] of [[cx - 5, 19], [cx + 1, 19], [cx - 5, 25], [cx + 1, 25]]) house(c, hx, 25, hz, 4, 4, 3, B.cobble, B.planks, 0);
  },
};
export const ESPIAS_MAP: StoryMapDef = makeMap(espias);

// ============================================================ O MONTE NEBO (a Terra Prometida vista de longe)
export const NEBO = { camp: { x: 72, z: 30 }, mount: { x: 72, z: 112 }, radius: 46, top: 40 };

const nebo: MapSpec = {
  id: "nebo",
  name: "As campinas de Moabe e o monte Nebo",
  w: 144,
  d: 160,
  seed: 13131,
  time: 0.14,
  bgm: "nebo",
  spawn: { x: 72, z: 14, yaw: Math.PI },
  zones: {
    start: { x: 72, z: 14, r: 5 },
    acampamento: { x: NEBO.camp.x, z: NEBO.camp.z, r: 12 },
    meio: { x: 72, z: 88, r: 6 },
    cume: { x: NEBO.mount.x, z: NEBO.mount.z, r: 5 },
  },
  base: 24,
  amp: 2,
  scale: 36,
  flat: [
    { x: NEBO.camp.x, z: NEBO.camp.z, r: 14, h: 24 },
    { x: 72, z: 14, r: 6, h: 24 },
    { x: 72, z: 62, r: 10, h: 24 },
  ],
  surf: (x, z, k) => {
    k.top = B.dry_grass;
    k.sub = B.dirt;
    // a Terra Prometida, além do muro invisível: o vale verde, o Jordão e as colinas de Canaã
    if (z >= 160) {
      k.top = B.grass;
      const dj = Math.abs(z - 182);
      if (dj < 6) {
        k.h = 22 + (dj > 4 ? 1 : 0);
        k.water = k.h < 23 ? 23 : 0;
        k.top = B.sand;
      } else if (z > 192) k.h = Math.max(k.h, 24 + Math.round((fbm2(13131 + 9, x / 30, z / 30, 2) - 0.3) * 14));
      return;
    }
    const dm = Math.hypot(x - NEBO.mount.x, z - NEBO.mount.z);
    if (dm < NEBO.radius) {
      const t = Math.min(1, (NEBO.radius - dm) / (NEBO.radius - 5));
      k.h = Math.max(k.h, 24 + Math.round((NEBO.top - 24) * t));
      if (t > 0.3) {
        k.top = B.stone;
        k.sub = B.stone;
      }
    }
  },
  tree: (x, z, r, k) => (z >= 160 && r < 0.12 && k.top === B.grass ? { trunk: 5, radius: 3, leaf: B.leaves } : null),
  cover: (x, z, r, k) => (k.top === B.grass && r < 0.1 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    const { x, z } = NEBO.camp;
    for (const [dx, dz] of [[-12, -3], [12, -3], [-8, -9], [8, -9], [0, -12], [-13, 5], [13, 5]]) tent(c, x + dx - 2, 24, z + dz - 2);
    // Jericó, a cidade das palmeiras, ao longe
    ring(c, 60, 204, 84, 228, groundOf(nebo, 72, 216), 7, 2, B.sandstone);
    for (const [px, pz] of [[40, 200], [96, 202], [52, 196], [90, 196]]) palm(c, px, groundOf(nebo, px, pz), pz, 6);
  },
};
export const NEBO_MAP: StoryMapDef = makeMap(nebo);

// ============================================================ O JORDÃO
export const JORDAO = { z0: 70, z1: 100, level: 23, cx: 64 };
/** Altura do leito do rio em cada linha z (as margens descem até o fundo). */
export function riverFloor(z: number): number {
  const { z0, z1 } = JORDAO;
  if (z < z0 || z > z1) return 24;
  // margens suaves: no máximo 1 bloco de degrau por passo
  return Math.max(20, 24 - Math.min(z - z0, z1 - z));
}

const jordao: MapSpec = {
  id: "jordao",
  name: "O Jordão, na época da colheita",
  w: 128,
  d: 160,
  seed: 12121,
  time: 0.14,
  bgm: "jordao",
  spawn: { x: 64, z: 20, yaw: Math.PI },
  zones: {
    start: { x: 64, z: 20, r: 5 },
    acampamento: { x: 64, z: 38, r: 12 },
    margem: { x: 64, z: 64, r: 5 },
    leito: { x: 64, z: 85, r: 9 },
    outra_margem: { x: 64, z: 108, r: 8 },
    gilgal: { x: 64, z: 130, r: 8 },
  },
  base: 24,
  amp: 1,
  scale: 40,
  flat: [
    { x: 64, z: 38, r: 16, h: 24 },
    { x: 64, z: 20, r: 6, h: 24 },
    { x: 64, z: 130, r: 12, h: 24 },
  ],
  surf: (x, z, k) => {
    if (z >= JORDAO.z0 && z <= JORDAO.z1) {
      const f = riverFloor(z);
      k.h = f;
      k.top = B.sand;
      k.sub = B.sand;
      if (f < 24) k.water = JORDAO.level;
      return;
    }
    k.top = z > JORDAO.z1 ? B.grass : B.dry_grass;
    if (z > JORDAO.z1) {
      k.sub = B.dirt;
    }
  },
  tree: (x, z, r, k) => (r < 0.06 && k.top === B.grass && Math.hypot(x - 64, z - 130) > 16 ? { trunk: 5, radius: 3, leaf: B.leaves } : r < 0.05 && z < 60 && Math.hypot(x - 64, z - 38) > 20 ? { trunk: 5, radius: 3, leaf: B.dry_leaves } : null),
  cover: (x, z, r, k) => (k.top === B.grass ? (r < 0.1 ? B.tallgrass : 0) : r < 0.05 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    for (const [dx, dz] of [[-10, -4], [10, -4], [-6, 5], [7, 5], [0, -10], [-14, 3], [14, 3]]) tent(c, 64 + dx - 2, 24, 38 + dz - 2);
    for (const [px, pz] of [[20, 60], [108, 62], [22, 112], [106, 116]]) palm(c, px, groundOf(jordao, px, pz), pz, 6);
  },
};
export const JORDAO_MAP: StoryMapDef = makeMap(jordao);
