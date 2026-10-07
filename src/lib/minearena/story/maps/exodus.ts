// Mapas de Êxodo (Fase 4): Egito e Midiã (Moisés), Gósen (Páscoa) e a margem do Mar Vermelho. As pragas usam o mapa do Egito (José).
import { B } from "../../blocks/blocks";
import { fbm2 } from "../../world/noise";
import type { StoryMapDef } from "../types";
import { type ChunkCtx } from "./builder";
import { type MapSpec, house, makeMap, palm, tent, well } from "./gen";

// ============================================================ EGITO E MIDIÃ (Moisés)
export const MOISES = { olaria: { x: 36, z: 60 }, poco: { x: 116, z: 78 }, tendas: { x: 128, z: 84 }, pasto: { x: 108, z: 60 }, horeb: { x: 140, z: 38 }, sarca: { x: 138, z: 50 } };

const moises: MapSpec = {
  id: "moises",
  name: "Do Egito a Midiã e ao monte Horebe",
  w: 160,
  d: 112,
  seed: 9595,
  time: 0.14,
  bgm: "exodo",
  spawn: { x: 30, z: 70, yaw: 0 },
  zones: {
    start: { x: 30, z: 70, r: 5 },
    olaria: { x: MOISES.olaria.x, z: MOISES.olaria.z, r: 9 },
    midia: { x: 104, z: 72, r: 8 },
    poco: { x: MOISES.poco.x, z: MOISES.poco.z, r: 7 },
    tendas: { x: MOISES.tendas.x, z: MOISES.tendas.z, r: 7 },
    pasto: { x: MOISES.pasto.x, z: MOISES.pasto.z, r: 9 },
    horebe: { x: 138, z: 72, r: 9 },
    sarca: { x: MOISES.sarca.x, z: MOISES.sarca.z, r: 5 },
    deserto: { x: 96, z: 40, r: 7 },
  },
  base: 24,
  amp: 2,
  scale: 34,
  flat: [
    { x: MOISES.olaria.x, z: MOISES.olaria.z, r: 9, h: 24 },
    { x: MOISES.poco.x, z: MOISES.poco.z, r: 6, h: 25 },
    { x: MOISES.tendas.x, z: MOISES.tendas.z, r: 7, h: 25 },
  ],
  surf: (x, z, k) => {
    k.top = B.sand;
    k.sub = B.sandstone;
    // o monte Horebe: cone suave, com um terraço onde arde a sarça
    const d = Math.hypot(x - MOISES.horeb.x, z - MOISES.horeb.z);
    const ds = Math.hypot(x - MOISES.sarca.x, z - MOISES.sarca.z);
    if (ds < 6) {
      k.h = 34;
      k.top = B.stone;
      k.sub = B.stone;
      return;
    }
    if (d < 36) {
      k.h = Math.max(k.h, 24 + Math.round(16 * (1 - d / 36)));
      if (k.h > 30) {
        k.top = B.stone;
        k.sub = B.stone;
      }
    } else if (x > 92 && fbm2(9595 + 7, x / 20, z / 20, 2) > 0.66) {
      k.top = B.stone;
      k.sub = B.stone;
    }
  },
  tree: () => null,
  cover: () => 0,
  extra: (c: ChunkCtx) => {
    // olaria do Egito: pilhas de tijolo e cabanas dos escravos
    for (const [dx, dz] of [[-6, -4], [5, 4], [-5, 6]]) c.fill(MOISES.olaria.x + dx, 25, MOISES.olaria.z + dz, MOISES.olaria.x + dx + 2, 26, MOISES.olaria.z + dz + 1, B.brick);
    for (const [x, z] of [[18, 78], [26, 84], [14, 66]]) house(c, x, 24, z, 5, 5, 3, B.sandstone, B.planks, 0);
    for (const [x, z] of [[44, 48], [50, 70]]) palm(c, x, 24, z, 6);
    // Midiã: o poço, a tenda de Jetro e palmeiras
    well(c, MOISES.poco.x, 25, MOISES.poco.z);
    tent(c, MOISES.tendas.x - 2, 25, MOISES.tendas.z - 2);
    tent(c, MOISES.tendas.x + 4, 25, MOISES.tendas.z + 3);
    for (const [dx, dz] of [[-9, 4], [10, -6], [3, 10]]) palm(c, MOISES.poco.x + dx, 25, MOISES.poco.z + dz, 6);
    // a sarça: folhas secas com brasas dentro
    c.fill(MOISES.sarca.x - 1, 35, MOISES.sarca.z - 1, MOISES.sarca.x + 1, 36, MOISES.sarca.z + 1, B.dry_leaves);
    c.set(MOISES.sarca.x, 35, MOISES.sarca.z, B.ember_block);
    c.set(MOISES.sarca.x, 36, MOISES.sarca.z, B.ember_block);
    c.set(MOISES.sarca.x - 2, 35, MOISES.sarca.z, B.torch);
    c.set(MOISES.sarca.x + 2, 35, MOISES.sarca.z, B.torch);
  },
};
export const MOISES_MAP: StoryMapDef = makeMap(moises);

// ============================================================ GÓSEN (Páscoa)
export const GOSEN = { casa: { x: 58, z: 48 }, campo: { x0: 80, x1: 94, z0: 78, z1: 92 } };

const gosen: MapSpec = {
  id: "gosen",
  name: "A terra de Gósen",
  w: 128,
  d: 112,
  seed: 9696,
  time: 0.14,
  bgm: "pascoa",
  spawn: { x: 22, z: 92, yaw: Math.PI },
  zones: {
    start: { x: 22, z: 92, r: 5 },
    casa: { x: 61, z: 52, r: 9 },
    porta: { x: 61, z: 54, r: 3 },
    currais: { x: 40, z: 84, r: 7 },
    campo: { x: 87, z: 85, r: 8 },
    reuniao: { x: 100, z: 66, r: 7 },
    saida: { x: 112, z: 22, r: 7 },
  },
  base: 24,
  amp: 2,
  scale: 36,
  flat: [
    { x: 61, z: 52, r: 18, h: 24 },
    { x: 40, z: 84, r: 8, h: 24 },
  ],
  surf: (x, z, k) => {
    const f = GOSEN.campo;
    if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) {
      k.h = 24;
      k.top = B.farmland;
      return;
    }
    k.top = fbm2(9696 + 3, x / 28, z / 28, 2) > 0.58 ? B.sand : B.dry_grass;
    if (k.top === B.sand) k.sub = B.sandstone;
  },
  tree: (x, z, r, k) => (r < 0.07 && k.top === B.dry_grass && Math.hypot(x - 61, z - 52) > 22 ? { trunk: 5, radius: 3, leaf: B.dry_leaves } : null),
  cover: (x, z, r, k) => {
    if (k.top === B.farmland) return (x - GOSEN.campo.x0) % 4 === 3 ? 0 : B.wheat_3;
    return k.top === B.dry_grass && r < 0.1 ? B.tallgrass : 0;
  },
  extra: (c: ChunkCtx) => {
    // as casas dos hebreus; a primeira (com a porta marcada) fica no centro
    house(c, GOSEN.casa.x, 24, GOSEN.casa.z, 6, 6, 4, B.sandstone, B.planks, 0);
    const hs: [number, number][] = [[44, 48], [74, 48], [88, 48], [40, 62], [56, 66], [72, 64], [88, 62], [30, 50]];
    for (const [x, z] of hs) house(c, x, 24, z, 6, 6, 4, B.sandstone, B.planks, 0);
    // currais de cordeiros (cerca de pedra)
    for (let dx = -6; dx <= 6; dx++) for (const dz of [-6, 6]) c.set(40 + dx, 25, 84 + dz, B.cobble);
    for (let dz = -5; dz <= 5; dz++) for (const dx of [-6, 6]) c.set(40 + dx, 25, 84 + dz, B.cobble);
    c.set(40, 25, 90, B.air);
    for (const [x, z] of [[20, 70], [106, 50], [100, 90]]) palm(c, x, 24, z, 6);
  },
};
export const GOSEN_MAP: StoryMapDef = makeMap(gosen);

// ============================================================ MAR VERMELHO
/** Um mar grande: ~120 blocos de travessia. O corredor aberto por Deus (17 de largura) fica entre x0 e x1. */
export const SEA = { cx: 96, x0: 88, x1: 104, z0: 71, z1: 189, level: 23, shoreN: 64, shoreS: 200 };
const S0 = 70;
const S1 = 190;
/** Altura do fundo do mar em cada linha z (a praia desce até o fundo e sobe do outro lado). */
export function seaFloor(z: number): number {
  if (z < S0 || z > S1) return 24;
  // as margens descem 1 bloco por passo (o jogador só sobe 1 bloco com um pulo)
  return Math.max(17, 24 - Math.min(z - S0, S1 - z));
}

const mar: MapSpec = {
  id: "mar",
  name: "A margem do Mar Vermelho",
  w: 192,
  d: 224,
  seed: 9797,
  time: 0.14,
  bgm: "mar",
  spawn: { x: 96, z: 20, yaw: 0 },
  zones: {
    start: { x: 96, z: 20, r: 5 },
    acampamento: { x: 96, z: 40, r: 12 },
    margem: { x: 96, z: SEA.shoreN, r: 5 },
    travessia: { x: 96, z: 130, r: 8 },
    outra_margem: { x: 96, z: 208, r: 9 },
  },
  base: 24,
  amp: 1,
  scale: 40,
  flat: [{ x: 96, z: 40, r: 16, h: 24 }],
  surf: (x, z, k) => {
    if (z >= S0 && z <= S1) {
      const f = seaFloor(z);
      k.h = f;
      k.top = B.sand;
      k.sub = B.sand;
      if (f < 24) k.water = SEA.level;
      return;
    }
    if (z > S1) {
      k.h = 24 + Math.round(Math.max(0, fbm2(9797, x / 18, z / 18, 2) - 0.45) * 14);
      k.top = B.sand;
      k.sub = B.sandstone;
      return;
    }
    k.top = z > 60 ? B.sand : B.dry_grass;
    if (z > 60) k.sub = B.sand;
  },
  tree: (x, z, r, k) => (r < 0.05 && z < 56 && k.top === B.dry_grass && Math.hypot(x - 96, z - 40) > 20 ? { trunk: 5, radius: 3, leaf: B.dry_leaves } : null),
  cover: (x, z, r, k) => (k.top === B.dry_grass && r < 0.08 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    for (const [dx, dz] of [[-12, -5], [10, -7], [-5, 7], [13, 6], [0, -12], [-18, 3], [18, 2], [-10, 12], [8, 13]]) tent(c, 96 + dx - 2, 24, 40 + dz - 2);
    for (const [x, z] of [[60, 20], [132, 24], [70, 212], [124, 214]]) palm(c, x, 24, z, 6);
  },
};
export const MAR_MAP: StoryMapDef = makeMap(mar);
