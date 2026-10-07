// Mapas da Fase 5 (juízes): Gideão (o vale de Midiã), Sansão (Zorá, Timna e Gaza) e Rute (de Moabe a Belém).
import { B } from "../../blocks/blocks";
import { fbm2 } from "../../world/noise";
import type { StoryMapDef } from "../types";
import { type ChunkCtx, tree } from "./builder";
import { type MapSpec, groundOf, house, makeMap, palm, tent } from "./gen";

type Block = [number, number, number, number];

// ============================================================ GIDEÃO
export const GIDEAO = { lagar: { x: 36, z: 120 }, carvalho: { x: 46, z: 112 }, altar: { x: 70, z: 104 }, velo: { x: 60, z: 70 }, harode: { x: 96, z: 84 }, camp: { x: 140, z: 42 } };

const gideao: MapSpec = {
  id: "gideao",
  name: "Ofra, a fonte de Harode e o vale de Midiã",
  w: 176,
  d: 160,
  seed: 15151,
  time: 0.14,
  bgm: "gideao",
  spawn: { x: 24, z: 128, yaw: Math.PI },
  zones: {
    start: { x: 24, z: 128, r: 5 },
    lagar: { x: GIDEAO.lagar.x, z: GIDEAO.lagar.z, r: 6 },
    carvalho: { x: GIDEAO.carvalho.x, z: GIDEAO.carvalho.z, r: 5 },
    altar: { x: GIDEAO.altar.x, z: GIDEAO.altar.z, r: 5 },
    altar2: { x: 84, z: 98, r: 4 },
    velo: { x: GIDEAO.velo.x, z: GIDEAO.velo.z, r: 6 },
    harode: { x: GIDEAO.harode.x, z: GIDEAO.harode.z, r: 8 },
    ladoA: { x: 108, z: 42, r: 6 },
    ladoB: { x: 140, z: 74, r: 6 },
    ladoC: { x: 172, z: 42, r: 6 },
  },
  base: 25,
  amp: 3,
  scale: 34,
  flat: [
    { x: 24, z: 128, r: 6, h: 25 },
    { x: GIDEAO.lagar.x, z: GIDEAO.lagar.z, r: 9, h: 25 },
    { x: GIDEAO.carvalho.x, z: GIDEAO.carvalho.z, r: 6, h: 25 },
    { x: GIDEAO.altar.x, z: GIDEAO.altar.z, r: 9, h: 25 },
    { x: 84, z: 98, r: 6, h: 25 },
    { x: GIDEAO.velo.x, z: GIDEAO.velo.z, r: 10, h: 25 },
  ],
  surf: (x, z, k) => {
    // a fonte de Harode: uma poça rasa
    const dp = Math.hypot(x - GIDEAO.harode.x, z - GIDEAO.harode.z);
    if (dp < 6) {
      k.h = 24 - Math.round(2 * Math.min(1, (6 - dp) / 2));
      k.water = k.h < 23 ? 23 : 0;
      k.top = B.sand;
      return;
    }
    // o vale onde acampa Midiã: uma bacia, com as bordas altas onde ficam os trezentos
    const dc = Math.hypot(x - GIDEAO.camp.x, z - GIDEAO.camp.z);
    if (dc < 48) {
      k.h = dc < 14 ? 21 : 21 + Math.round((4 * (dc - 14)) / 34);
      k.top = B.dry_grass;
      return;
    }
    if (fbm2(15151 + 5, x / 28, z / 28, 2) > 0.62) k.top = B.dry_grass;
  },
  tree: (x, z, r, k) => {
    if (r > 0.1 || k.top === B.sand) return null;
    for (const s of [GIDEAO.lagar, GIDEAO.carvalho, GIDEAO.altar, GIDEAO.velo, GIDEAO.harode, { x: 24, z: 128 }, { x: 84, z: 98 }]) if (Math.hypot(x - s.x, z - s.z) < 13) return null;
    if (Math.hypot(x - GIDEAO.camp.x, z - GIDEAO.camp.z) < 40) return null;
    return { trunk: 5, radius: 3, leaf: B.leaves };
  },
  treeCell: 7,
  cover: (x, z, r, k) => (k.top === B.grass ? (r < 0.04 ? B.flower_yellow : r < 0.14 ? B.tallgrass : 0) : r < 0.05 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    // o lagar de Joás: um fosso de pedra com o trigo de Gideão
    const { x: lx, z: lz } = GIDEAO.lagar;
    c.fill(lx - 3, 25, lz - 3, lx + 3, 26, lz + 3, B.cobble);
    c.fill(lx - 2, 25, lz - 2, lx + 2, 26, lz + 2, B.air);
    c.fill(lx - 2, 25, lz - 2, lx + 2, 25, lz + 2, B.wheat_3);
    // o carvalho de Ofra, onde o Anjo se sentou, e a rocha da oferta
    tree(c, GIDEAO.carvalho.x, 25, GIDEAO.carvalho.z, { trunk: 9, radius: 5, leaf: B.leaves, wide: true });
    c.fill(GIDEAO.carvalho.x + 3, 26, GIDEAO.carvalho.z - 1, GIDEAO.carvalho.x + 5, 26, GIDEAO.carvalho.z + 1, B.stone);
    // o altar de Baal e o poste-ídolo de Joás
    const a = GIDEAO.altar;
    c.fill(a.x - 1, 26, a.z - 1, a.x + 1, 28, a.z + 1, B.cobble);
    for (let k = 26; k <= 31; k++) c.set(a.x + 4, k, a.z, B.log);
    // o velo de lã na eira
    c.set(GIDEAO.velo.x, 26, GIDEAO.velo.z, B.snow);
    // o acampamento de Midiã: tendas por toda a bacia
    const { x: cx, z: cz } = GIDEAO.camp;
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2 + (i % 3) * 0.2;
      const rr = 6 + (i % 4) * 7;
      const tx = Math.round(cx + Math.cos(ang) * rr);
      const tz = Math.round(cz + Math.sin(ang) * rr);
      tent(c, tx - 2, groundOf(gideao, tx, tz), tz - 2);
    }
  },
};
export const GIDEAO_MAP: StoryMapDef = makeMap(gideao);

// ============================================================ SANSÃO
export const GAZA = { x0: 144, x1: 176, z0: 76, z1: 108, gz0: 90, gz1: 94 };
export const SANSAO = { casa: { x: 30, z: 104 }, vinha: { x: 84, z: 84 }, monte: { x: 112, z: 56 }, dalila: { x: 100, z: 36 }, templo: { x: 160, z: 92 } };

/** O templo de Dagom (paredes, teto e as duas colunas): usado para construir e para desabar. */
export function templeCells(): Block[] {
  const out: Block[] = [];
  const x0 = 150;
  const x1 = 170;
  const z0 = 82;
  const z1 = 102;
  for (let y = 25; y <= 33; y++) {
    for (let x = x0; x <= x1; x++) {
      for (const z of [z0, z1]) out.push([x, y, z, (x + y) % 4 === 0 ? B.sandstone : B.limestone]);
    }
    for (let z = z0 + 1; z < z1; z++) {
      for (const x of [x0, x1]) {
        if (x === x0 && z >= 90 && z <= 94 && y <= 30) continue; // a porta, voltada para o portão da cidade
        out.push([x, y, z, (z + y) % 4 === 0 ? B.sandstone : B.limestone]);
      }
    }
  }
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) out.push([x, 34, z, B.planks]);
  for (const px of [157, 163]) for (let y = 25; y <= 33; y++) out.push([px, y, 92, B.cedar_planks]);
  return out;
}

const sansao: MapSpec = {
  id: "sansao",
  name: "Zorá, Timna e Gaza",
  w: 192,
  d: 144,
  seed: 16161,
  time: 0.14,
  bgm: "sansao",
  spawn: { x: 26, z: 112, yaw: Math.PI },
  zones: {
    start: { x: 26, z: 112, r: 5 },
    casa: { x: SANSAO.casa.x, z: SANSAO.casa.z, r: 8 },
    campo: { x: 52, z: 96, r: 6 },
    vinha: { x: SANSAO.vinha.x, z: SANSAO.vinha.z, r: 8 },
    gaza: { x: 134, z: 92, r: 6 },
    monte: { x: SANSAO.monte.x, z: SANSAO.monte.z, r: 5 },
    dalila: { x: SANSAO.dalila.x, z: SANSAO.dalila.z, r: 6 },
    templo: { x: SANSAO.templo.x, z: SANSAO.templo.z, r: 6 },
  },
  base: 24,
  amp: 2,
  scale: 36,
  flat: [
    { x: 26, z: 112, r: 6, h: 24 },
    { x: SANSAO.casa.x, z: SANSAO.casa.z, r: 10, h: 24 },
    { x: 52, z: 96, r: 6, h: 24 },
    { x: SANSAO.vinha.x, z: SANSAO.vinha.z, r: 10, h: 24 },
    { x: SANSAO.dalila.x, z: SANSAO.dalila.z, r: 8, h: 24 },
    { x: 160, z: 92, r: 30, h: 24 },
    { x: 134, z: 92, r: 8, h: 24 },
  ],
  surf: (x, z, k) => {
    k.top = fbm2(16161 + 3, x / 26, z / 26, 2) > 0.6 ? B.sand : B.dry_grass;
    if (k.top === B.sand) k.sub = B.sandstone;
    // o monte defronte de Hebrom
    const d = Math.hypot(x - SANSAO.monte.x, z - SANSAO.monte.z);
    if (d < 24) {
      const t = Math.min(1, (24 - d) / 19);
      k.h = Math.max(k.h, 24 + Math.round(14 * t));
      k.top = B.stone;
      k.sub = B.stone;
    }
  },
  tree: (x, z, r) => {
    // as videiras de Timna (copas com frutos)
    if (Math.hypot(x - SANSAO.vinha.x, z - SANSAO.vinha.z) < 10) return r < 0.5 ? { trunk: 2, radius: 2, leaf: B.fruit_leaves } : null;
    if (r > 0.08) return null;
    for (const s of [SANSAO.casa, SANSAO.vinha, SANSAO.dalila, { x: 52, z: 96 }, { x: 160, z: 92 }, { x: 134, z: 92 }, SANSAO.monte]) if (Math.hypot(x - s.x, z - s.z) < 30) return null;
    return { trunk: 5, radius: 3, leaf: B.dry_leaves };
  },
  treeCell: 6,
  cover: (x, z, r, k) => (k.top === B.dry_grass && r < 0.07 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    house(c, 24, 24, 98, 8, 7, 4, B.sandstone, B.planks, 0);
    house(c, 88, 24, 30, 7, 7, 4, B.sandstone, B.planks, 2);
    // Gaza: muralha com o portão fechado (as "portas" de madeira) e o templo de Dagom
    const { x0, x1, z0, z1, gz0, gz1 } = GAZA;
    c.fill(x0, 25, z0, x1, 32, z0 + 1, B.cobble);
    c.fill(x0, 25, z1 - 1, x1, 32, z1, B.cobble);
    c.fill(x0, 25, z0 + 2, x0 + 1, 32, z1 - 2, B.cobble);
    c.fill(x1 - 1, 25, z0 + 2, x1, 32, z1 - 2, B.cobble);
    c.fill(x0, 25, gz0, x0 + 1, 30, gz1, B.cedar_planks);
    for (const [x, y, z, id] of templeCells()) c.set(x, y, z, id);
    for (const [px, pz] of [[60, 120], [120, 120], [20, 70], [180, 40], [170, 130], [90, 120]]) palm(c, px, groundOf(sansao, px, pz), pz, 6);
  },
};
export const SANSAO_MAP: StoryMapDef = makeMap(sansao);

/** As portas de Gaza: saem do portão (somem) e são postas no alto do monte. */
export function gazaGateCells(): Block[] {
  const out: Block[] = [];
  const { gz0, gz1 } = GAZA;
  for (let z = gz0; z <= gz1; z++) for (let y = 25; y <= 30; y++) for (const x of [GAZA.x0, GAZA.x0 + 1]) out.push([x, y, z, B.air]);
  const { x, z } = SANSAO.monte;
  const top = 24 + 14;
  for (let k = 0; k < 5; k++) for (let y = top + 1; y <= top + 6; y++) out.push([x - 2 + k, y, z, k === 0 || k === 4 ? B.cedar_planks : B.planks]);
  return out;
}

/** O templo desaba: de cima para baixo, deixando entulho no chão. */
export function templeFallCells(): Block[] {
  const air = templeCells().map(([x, y, z]): Block => [x, y, z, B.air]).sort((a, b) => b[1] - a[1]);
  const rubble: Block[] = [];
  for (let x = 150; x <= 170; x++) for (let z = 82; z <= 102; z++) if ((x * 7 + z * 3) % 5 === 0) rubble.push([x, 25, z, B.cobble]);
  return [...air, ...rubble];
}

// ============================================================ RUTE
export const RUTE = { moabe: { x: 30, z: 96 }, belem: { x: 130, z: 38 }, campo: { x0: 90, x1: 118, z0: 66, z1: 86 }, eira: { x: 150, z: 88 }, porta: { x: 126, z: 32 } };

const rute: MapSpec = {
  id: "rute",
  name: "De Moabe a Belém, nos dias da sega",
  w: 176,
  d: 128,
  seed: 17171,
  time: 0.14,
  bgm: "rute",
  spawn: { x: 28, z: 106, yaw: Math.PI },
  zones: {
    start: { x: 28, z: 106, r: 5 },
    moabe: { x: RUTE.moabe.x, z: RUTE.moabe.z, r: 8 },
    estrada: { x: 72, z: 76, r: 6 },
    belem: { x: 126, z: 48, r: 10 },
    campo: { x: 104, z: 76, r: 10 },
    eira: { x: RUTE.eira.x, z: RUTE.eira.z, r: 7 },
    porta: { x: RUTE.porta.x, z: RUTE.porta.z, r: 5 },
  },
  base: 25,
  amp: 2,
  scale: 36,
  flat: [
    { x: 28, z: 106, r: 6, h: 25 },
    { x: RUTE.moabe.x, z: RUTE.moabe.z, r: 10, h: 25 },
    { x: 104, z: 76, r: 20, h: 25 },
    { x: RUTE.belem.x, z: RUTE.belem.z, r: 20, h: 25 },
    { x: RUTE.eira.x, z: RUTE.eira.z, r: 9, h: 25 },
  ],
  surf: (x, z, k) => {
    const f = RUTE.campo;
    if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) {
      k.h = 25;
      k.top = B.farmland;
      return;
    }
    if (Math.hypot(x - RUTE.eira.x, z - RUTE.eira.z) < 6) k.top = B.limestone;
    else if (fbm2(17171 + 5, x / 26, z / 26, 2) > 0.62) k.top = B.dry_grass;
  },
  tree: (x, z, r, k) => {
    if (r > 0.08 || k.top !== B.grass) return null;
    for (const s of [RUTE.moabe, { x: 104, z: 76 }, RUTE.belem, RUTE.eira, RUTE.porta]) if (Math.hypot(x - s.x, z - s.z) < 22) return null;
    return { trunk: 5, radius: 3, leaf: B.leaves };
  },
  treeCell: 7,
  cover: (x, z, r, k) => {
    if (k.top === B.farmland) return (x - RUTE.campo.x0) % 4 === 3 ? 0 : B.wheat_3;
    return k.top === B.grass ? (r < 0.04 ? B.flower_yellow : r < 0.14 ? B.tallgrass : 0) : r < 0.05 ? B.tallgrass : 0;
  },
  extra: (c: ChunkCtx) => {
    house(c, 22, 25, 92, 7, 6, 4, B.sandstone, B.planks, 2);
    house(c, 40, 25, 100, 6, 6, 4, B.sandstone, B.planks, 3);
    // Belém: casas em volta de uma praça e o portão onde os anciãos se assentam
    for (const [hx, hz] of [[108, 36], [116, 52], [134, 54], [146, 40], [142, 24], [112, 22], [126, 60], [100, 46]]) house(c, hx, 25, hz, 6, 6, 4, B.sandstone, B.planks, hz < 38 ? 0 : 1);
    c.fill(RUTE.porta.x - 4, 25, RUTE.porta.z, RUTE.porta.x - 4, 29, RUTE.porta.z, B.cobble);
    c.fill(RUTE.porta.x + 4, 25, RUTE.porta.z, RUTE.porta.x + 4, 29, RUTE.porta.z, B.cobble);
    c.fill(RUTE.porta.x - 4, 30, RUTE.porta.z, RUTE.porta.x + 4, 31, RUTE.porta.z, B.cobble);
    for (const dx of [-2, 2]) c.set(RUTE.porta.x + dx, 25, RUTE.porta.z + 2, B.planks);
    // a eira: montes de palha
    for (const [dx, dz] of [[-3, -2], [3, 2], [0, 4]]) c.fill(RUTE.eira.x + dx, 26, RUTE.eira.z + dz, RUTE.eira.x + dx + 1, 27, RUTE.eira.z + dz + 1, B.dry_leaves);
    for (const [px, pz] of [[60, 110], [120, 110], [30, 60], [160, 60]]) palm(c, px, groundOf(rute, px, pz), pz, 6);
  },
};
export const RUTE_MAP: StoryMapDef = makeMap(rute);
