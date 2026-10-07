// Mapas do restante de Gênesis: Sinar (Babel), Canaã (Abraão), Berseba–Harã (Isaque e Jacó) e Dotã–Egito (José).
import { B } from "../../blocks/blocks";
import { fbm2 } from "../../world/noise";
import type { StoryMapDef } from "../types";
import { type ChunkCtx, type Column } from "./builder";
import { type MapSpec, house, makeMap, palm, tent, well } from "./gen";
import { type CityCfg, cityBuild, cityGround } from "./mega";
import { tree } from "./builder";

// ============================================================ SINAR (Babel)
export const SHINAR = { tower: { x: 64, z: 50 }, yard: { x: 30, z: 62 } };

const shinarSpec: MapSpec = {
  id: "shinar",
  name: "A planície de Sinar",
  w: 128,
  d: 112,
  seed: 5151,
  time: 0.14,
  bgm: "babel",
  spawn: { x: 24, z: 80, yaw: 0 },
  zones: {
    start: { x: 24, z: 80, r: 5 },
    yard: { x: SHINAR.yard.x, z: SHINAR.yard.z, r: 8 },
    tower: { x: SHINAR.tower.x, z: SHINAR.tower.z, r: 14 },
    city: { x: 104, z: 56, r: 14 },
    river: { x: 64, z: 96, r: 8 },
  },
  base: 24,
  amp: 2,
  scale: 36,
  flat: [
    { x: SHINAR.tower.x, z: SHINAR.tower.z, r: 14, h: 24 },
    { x: SHINAR.yard.x, z: SHINAR.yard.z, r: 9, h: 24 },
    { x: 104, z: 56, r: 16, h: 24 },
  ],
  surf: (x, z, k) => {
    const rz = 98 + 4 * Math.sin(x / 12);
    const dr = Math.abs(z - rz);
    if (dr < 3.6 && z > 80) {
      k.h = 21;
      k.water = 23;
      k.top = B.sand;
      k.sub = B.sand;
    } else if (dr < 5.2 && z > 80) {
      k.top = B.sand;
      k.sub = B.sand;
      k.h = Math.min(k.h, 23);
    } else if (Math.hypot(x - SHINAR.tower.x, z - SHINAR.tower.z) < 15) {
      k.top = B.dirt;
    } else if (Math.hypot(x - SHINAR.yard.x, z - SHINAR.yard.z) < 10) {
      k.top = B.sand;
      k.sub = B.sand;
    } else if (fbm2(5151 + 9, x / 30, z / 30, 2) > 0.62) {
      k.top = B.sand;
      k.sub = B.sandstone;
    }
  },
  tree: (x, z, r, k) => {
    if (k.top !== B.grass || r > 0.14) return null;
    if (Math.hypot(x - SHINAR.tower.x, z - SHINAR.tower.z) < 18) return null;
    return { trunk: 5, radius: 3, leaf: B.leaves };
  },
  cover: (x, z, r, k) => (k.top === B.grass ? (r < 0.04 ? B.flower_yellow : r < 0.16 ? B.tallgrass : 0) : 0),
  extra: (c: ChunkCtx) => {
    // olaria: bancada e pilhas de tijolo
    c.set(SHINAR.yard.x, 25, SHINAR.yard.z, B.crafting_table);
    c.set(SHINAR.yard.x + 2, 25, SHINAR.yard.z, B.furnace);
    c.fill(SHINAR.yard.x - 6, 25, SHINAR.yard.z - 4, SHINAR.yard.x - 4, 26, SHINAR.yard.z - 3, B.brick);
    c.fill(SHINAR.yard.x + 5, 25, SHINAR.yard.z + 3, SHINAR.yard.x + 7, 25, SHINAR.yard.z + 4, B.brick);
    // a cidade de Sinar
    const hs: [number, number, number, number][] = [[92, 44, 6, 5], [100, 42, 5, 6], [110, 44, 6, 6], [94, 56, 6, 6], [104, 58, 6, 5], [114, 56, 5, 6], [92, 68, 5, 5], [102, 68, 6, 6], [112, 68, 6, 5]];
    for (const [x, z, w, d] of hs) house(c, x, 24, z, w, d, 4, B.sandstone, B.planks, 1);
    for (const [x, z] of [[88, 52], [120, 52], [88, 66], [120, 66]]) palm(c, x, 24, z, 6);
  },
};
export const SHINAR_MAP: StoryMapDef = makeMap(shinarSpec);

// ============================================================ CANAÃ (Abraão)
export const CANAA = { haran: { x: 22, z: 88 }, siquem: { x: 44, z: 40 }, betel: { x: 96, z: 28 }, mamre: { x: 66, z: 80 } };

const canaaSpec: MapSpec = {
  id: "canaa",
  name: "A terra que Deus mostrou",
  w: 128,
  d: 112,
  seed: 6262,
  time: 0.14,
  bgm: "abraao",
  spawn: { x: 22, z: 94, yaw: Math.PI },
  zones: {
    start: { x: 22, z: 94, r: 5 },
    haran: { x: CANAA.haran.x, z: CANAA.haran.z, r: 10 },
    siquem: { x: CANAA.siquem.x, z: CANAA.siquem.z, r: 8 },
    altar: { x: CANAA.siquem.x + 6, z: CANAA.siquem.z + 2, r: 4 },
    betel: { x: CANAA.betel.x, z: CANAA.betel.z, r: 7 },
    mamre: { x: CANAA.mamre.x, z: CANAA.mamre.z, r: 9 },
  },
  base: 26,
  amp: 5,
  scale: 30,
  flat: [
    { x: CANAA.haran.x, z: CANAA.haran.z, r: 8, h: 26 },
    { x: CANAA.siquem.x, z: CANAA.siquem.z, r: 9, h: 27 },
    { x: CANAA.betel.x, z: CANAA.betel.z, r: 6, h: 37 },
    { x: CANAA.mamre.x, z: CANAA.mamre.z, r: 10, h: 26 },
  ],
  surf: (x, z, k) => {
    if (fbm2(6262 + 5, x / 26, z / 26, 2) > 0.6) k.top = B.dry_grass;
  },
  tree: (x, z, r, k) => {
    if (k.top === B.sand || r > 0.2) return null;
    for (const s of Object.values(CANAA)) if (Math.hypot(x - s.x, z - s.z) < 12) return null;
    return { trunk: 5 + Math.floor(r * 20), radius: 3, leaf: B.leaves };
  },
  cover: (x, z, r, k) => (k.top === B.grass ? (r < 0.03 ? B.flower_yellow : r < 0.03 + 0.12 ? B.tallgrass : 0) : r < 0.05 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    // acampamento em Harã
    tent(c, CANAA.haran.x - 4, 26, CANAA.haran.z - 2);
    tent(c, CANAA.haran.x + 3, 26, CANAA.haran.z + 4);
    tent(c, CANAA.haran.x - 2, 26, CANAA.haran.z + 8);
    // o carvalho de Moré, em Siquém
    tree(c, CANAA.siquem.x, 27, CANAA.siquem.z - 9, { trunk: 9, radius: 5, leaf: B.leaves, wide: true });
    // os carvalhos de Manre
    for (const [dx, dz] of [[-12, -8], [12, -8], [0, 12]]) tree(c, CANAA.mamre.x + dx, 26, CANAA.mamre.z + dz, { trunk: 8, radius: 5, leaf: B.leaves, wide: true });
    tent(c, CANAA.mamre.x - 3, 26, CANAA.mamre.z - 2);
    // a pedra de Betel
    c.fill(CANAA.betel.x - 1, 38, CANAA.betel.z - 1, CANAA.betel.x + 1, 39, CANAA.betel.z + 1, B.cobble);
  },
};
export const CANAA_MAP: StoryMapDef = makeMap(canaaSpec);

// ============================================================ BERSEBA E HARÃ (Isaque e Jacó)
export const BERSEBA = { tents: { x: 30, z: 84 }, field: { x0: 50, x1: 64, z0: 78, z1: 92 }, betel: { x: 116, z: 24 }, haran: { x: 30, z: 26 }, peniel: { x: 92, z: 74 } };

const berseba: MapSpec = {
  id: "berseba",
  name: "Da terra de Isaque a Harã",
  w: 144,
  d: 112,
  seed: 7373,
  time: 0.14,
  bgm: "jaco",
  spawn: { x: 30, z: 92, yaw: Math.PI },
  zones: {
    start: { x: 30, z: 92, r: 5 },
    tendas: { x: BERSEBA.tents.x, z: BERSEBA.tents.z, r: 9 },
    campo: { x: 57, z: 85, r: 9 },
    estrada: { x: 70, z: 56, r: 6 },
    betel: { x: BERSEBA.betel.x, z: BERSEBA.betel.z, r: 7 },
    poco: { x: BERSEBA.haran.x, z: BERSEBA.haran.z, r: 7 },
    pasto: { x: 40, z: 38, r: 9 },
    peniel: { x: BERSEBA.peniel.x - 5, z: BERSEBA.peniel.z, r: 7 },
    esau: { x: 118, z: 78, r: 8 },
  },
  base: 25,
  amp: 4,
  scale: 30,
  flat: [
    { x: BERSEBA.tents.x, z: BERSEBA.tents.z, r: 9, h: 25 },
    { x: 57, z: 85, r: 10, h: 25 },
    { x: BERSEBA.betel.x, z: BERSEBA.betel.z, r: 6, h: 40 },
    { x: BERSEBA.haran.x, z: BERSEBA.haran.z, r: 7, h: 25 },
  ],
  surf: (x, z, k) => {
    const f = BERSEBA.field;
    if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) {
      k.h = 25;
      k.top = B.farmland;
      return;
    }
    // o vau do Jaboque (rio raso)
    const rx = 92 + 3 * Math.sin(z / 10);
    if (Math.abs(x - rx) < 4) {
      k.h = 22;
      k.water = 23;
      k.top = B.sand;
      k.sub = B.sand;
    } else if (Math.abs(x - rx) < 5.5) {
      k.top = B.sand;
      k.h = Math.min(k.h, 24);
    } else if (fbm2(7373 + 5, x / 26, z / 26, 2) > 0.64) k.top = B.dry_grass;
  },
  tree: (x, z, r, k) => {
    if (k.top !== B.grass && k.top !== B.dry_grass) return null;
    if (r > 0.16) return null;
    for (const s of [BERSEBA.tents, BERSEBA.betel, BERSEBA.haran, BERSEBA.peniel]) if (Math.hypot(x - s.x, z - s.z) < 11) return null;
    return { trunk: 5, radius: 3, leaf: B.leaves };
  },
  cover: (x, z, r, k) => {
    if (k.top === B.farmland) return (x - BERSEBA.field.x0) % 4 === 3 ? 0 : B.wheat_3;
    return k.top === B.grass ? (r < 0.03 ? B.flower_red : r < 0.15 ? B.tallgrass : 0) : 0;
  },
  extra: (c: ChunkCtx) => {
    tent(c, BERSEBA.tents.x - 5, 25, BERSEBA.tents.z - 3);
    tent(c, BERSEBA.tents.x + 2, 25, BERSEBA.tents.z + 3);
    well(c, BERSEBA.haran.x, 25, BERSEBA.haran.z);
    c.fill(BERSEBA.betel.x - 1, 41, BERSEBA.betel.z - 1, BERSEBA.betel.x + 1, 42, BERSEBA.betel.z + 1, B.cobble);
    for (const [dx, dz] of [[-10, 9], [11, 10], [3, -12]]) tree(c, BERSEBA.betel.x + dx, 40, BERSEBA.betel.z + dz, { trunk: 5, radius: 3, leaf: B.leaves });
  },
};
export const BERSEBA_MAP: StoryMapDef = makeMap(berseba);

// ============================================================ DOTÃ E EGITO (José)
export const EGITO = { dota: { x: 30, z: 44 }, cova: { x: 36, z: 52 }, nilo: 92, potifar: { x: 112, z: 64 }, prisao: { x: 128, z: 92 }, palacio: { x: 132, z: 40 }, celeiros: { x: 110, z: 40 }, campo: { x0: 100, x1: 112, z0: 76, z1: 90 } };

/** A megacidade do Faraó: cresce a leste do Nilo, em volta do palácio, de Potifar, da prisão e dos celeiros. */
export const EGITO_CITY: CityCfg = {
  seed: 8484,
  w: 520,
  d: 520,
  inCity: (x, z) => x > 92 + 3 * Math.sin(z / 12) + 9 && x < 514 && z > 4 && z < 514,
  keep: [
    { x: 112, z: 64, r: 15 },
    { x: 128, z: 92, r: 13 },
    { x: 132, z: 40, r: 17 },
    { x: 110, z: 40, r: 14 },
    { x: 106, z: 83, r: 12 },
    { x: 150, z: 100, r: 26 },
  ],
  pyramids: [
    { x: 330, z: 300, half: 80 },
    { x: 230, z: 430, half: 56 },
    { x: 440, z: 140, half: 50 },
  ],
};

function egitoSurf(x: number, z: number, k: Column): void {
    const c = EGITO.campo;
    const rx = EGITO.nilo + 3 * Math.sin(z / 12);
    if (Math.abs(x - rx) < 5) {
      k.h = 21;
      k.water = 23;
      k.top = B.sand;
      k.sub = B.sand;
      return;
    }
    if (Math.abs(x - rx) < 7) {
      k.top = B.sand;
      k.h = Math.min(k.h, 23);
      return;
    }
    if (x > rx) {
      // margem leste: Egito, de areia e arenito
      k.top = B.sand;
      k.sub = B.sandstone;
      if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1) {
        k.h = 24;
        k.top = B.farmland;
        k.sub = B.dirt;
      }
    } else if (fbm2(8484 + 5, x / 26, z / 26, 2) > 0.66) k.top = B.dry_grass;
}

const egito: MapSpec = {
  id: "egito",
  name: "De Dotã à cidade do Faraó",
  w: 520,
  d: 520,
  seed: 8484,
  time: 0.14,
  bgm: "jose",
  spawn: { x: 30, z: 56, yaw: Math.PI },
  zones: {
    start: { x: 30, z: 56, r: 5 },
    dota: { x: EGITO.dota.x, z: EGITO.dota.z, r: 9 },
    cova: { x: EGITO.cova.x, z: EGITO.cova.z, r: 5 },
    caravana: { x: 62, z: 58, r: 6 },
    potifar: { x: EGITO.potifar.x, z: EGITO.potifar.z, r: 8 },
    campo: { x: 106, z: 83, r: 8 },
    prisao: { x: EGITO.prisao.x, z: EGITO.prisao.z, r: 7 },
    palacio: { x: EGITO.palacio.x, z: EGITO.palacio.z, r: 9 },
    celeiros: { x: EGITO.celeiros.x, z: EGITO.celeiros.z, r: 8 },
    nilo: { x: EGITO.nilo, z: 56, r: 6 },
  },
  base: 25,
  amp: 4,
  scale: 30,
  flat: [
    { x: EGITO.dota.x, z: EGITO.dota.z, r: 9, h: 25 },
    { x: EGITO.potifar.x, z: EGITO.potifar.z, r: 9, h: 24 },
    { x: EGITO.prisao.x, z: EGITO.prisao.z, r: 8, h: 24 },
    { x: EGITO.palacio.x, z: EGITO.palacio.z, r: 12, h: 24 },
    { x: EGITO.celeiros.x, z: EGITO.celeiros.z, r: 9, h: 24 },
  ],
  surf: (x, z, k) => {
    egitoSurf(x, z, k);
    cityGround(EGITO_CITY, x, z, k);
  },
  tree: (x, z, r, k) => {
    if (r > 0.12 || (k.top !== B.grass && k.top !== B.dry_grass)) return null;
    if (Math.hypot(x - EGITO.dota.x, z - EGITO.dota.z) < 11 || Math.hypot(x - EGITO.cova.x, z - EGITO.cova.z) < 8) return null;
    return { trunk: 5, radius: 3, leaf: B.leaves };
  },
  cover: (x, z, r, k) => {
    if (k.top === B.farmland) return (x - EGITO.campo.x0) % 4 === 3 ? 0 : B.wheat_3;
    return k.top === B.grass ? (r < 0.03 ? B.flower_yellow : r < 0.14 ? B.tallgrass : 0) : 0;
  },
  extra: (c: ChunkCtx) => {
    cityBuild(EGITO_CITY, c);
    // a cova (cisterna seca) em Dotã
    c.fill(EGITO.cova.x - 1, 19, EGITO.cova.z - 1, EGITO.cova.x + 1, 30, EGITO.cova.z + 1, B.air);
    c.fill(EGITO.cova.x - 2, 19, EGITO.cova.z - 2, EGITO.cova.x + 2, 19, EGITO.cova.z + 2, B.cobble);
    c.set(EGITO.cova.x - 2, 26, EGITO.cova.z, B.cobble);
    // casa de Potifar
    house(c, EGITO.potifar.x - 5, 24, EGITO.potifar.z - 4, 11, 9, 5, B.sandstone, B.limestone, 1);
    // prisão
    house(c, EGITO.prisao.x - 4, 24, EGITO.prisao.z - 3, 9, 7, 4, B.cobble, B.cobble, 1);
    // palácio do Faraó
    c.fill(EGITO.palacio.x - 9, 24, EGITO.palacio.z - 7, EGITO.palacio.x + 9, 24, EGITO.palacio.z + 7, B.limestone);
    c.fill(EGITO.palacio.x - 8, 25, EGITO.palacio.z - 6, EGITO.palacio.x + 8, 32, EGITO.palacio.z + 6, B.limestone);
    c.fill(EGITO.palacio.x - 7, 25, EGITO.palacio.z - 5, EGITO.palacio.x + 7, 31, EGITO.palacio.z + 5, B.air);
    c.fill(EGITO.palacio.x - 8, 33, EGITO.palacio.z - 6, EGITO.palacio.x + 8, 33, EGITO.palacio.z + 6, B.gold_block);
    c.fill(EGITO.palacio.x - 2, 25, EGITO.palacio.z - 6, EGITO.palacio.x + 2, 28, EGITO.palacio.z - 6, B.air);
    for (const dx of [-6, -3, 3, 6]) c.fill(EGITO.palacio.x + dx, 25, EGITO.palacio.z - 7, EGITO.palacio.x + dx, 31, EGITO.palacio.z - 7, B.limestone);
    c.set(EGITO.palacio.x, 25, EGITO.palacio.z + 4, B.gold_block);
    c.set(EGITO.palacio.x - 3, 27, EGITO.palacio.z - 5, B.torch);
    c.set(EGITO.palacio.x + 3, 27, EGITO.palacio.z - 5, B.torch);
    // celeiros (cúpulas de arenito)
    for (const dx of [-5, 0, 5]) {
      const cx = EGITO.celeiros.x + dx;
      for (let y = 0; y < 5; y++) {
        const r = Math.max(1, 3 - Math.floor(y / 2));
        for (let ax = -r; ax <= r; ax++) for (let az = -r; az <= r; az++) if (Math.hypot(ax, az) <= r + 0.3 && (y >= 4 || Math.hypot(ax, az) > r - 1)) c.set(cx + ax, 25 + y, EGITO.celeiros.z + az, B.sandstone);
      }
      c.set(cx, 25, EGITO.celeiros.z + 3, B.air);
      c.set(cx, 26, EGITO.celeiros.z + 3, B.air);
    }
    // pirâmide ao fundo
    for (let y = 0; y < 22; y++) {
      const half = 17 - Math.floor(y * 0.78);
      c.fill(150 - half, 25 + y, 100 - half, 150 + half, 25 + y, 100 + half, B.sandstone);
    }
  },
};
export const EGITO_MAP: StoryMapDef = makeMap(egito);
