// Mapas da Fase 6 (reino unido): Samuel (Siló), Saul (terra de Benjamim) e Davi, o Pastor (Belém e o palácio de Saul).
import { B } from "../../blocks/blocks";
import { fbm2 } from "../../world/noise";
import type { StoryMapDef } from "../types";
import { type ChunkCtx } from "./builder";
import { type MapSpec, groundOf, house, makeMap, palm, tent } from "./gen";

const oliveTree = (r: number) => (r < 0.1 ? { trunk: 4, radius: 3, leaf: B.leaves } : null);

// ============================================================ SAMUEL (Siló)
export const SILO = { casa: { x: 30, z: 100 }, tab: { x: 90, z: 52 }, ana: { x: 92, z: 66 }, eli: { x: 84, z: 64 }, bed: { x: 88, z: 47 }, ebenezer: { x: 130, z: 90 } };

const silo: MapSpec = {
  id: "silo",
  name: "Siló, onde ficava o santuário do Senhor",
  w: 160,
  d: 128,
  seed: 18181,
  time: 0.14,
  bgm: "silo",
  spawn: { x: 30, z: 108, yaw: Math.PI },
  zones: {
    start: { x: 30, z: 108, r: 5 },
    ana: { x: SILO.ana.x, z: SILO.ana.z, r: 5 },
    eli: { x: SILO.eli.x, z: SILO.eli.z, r: 4 },
    leito: { x: SILO.bed.x, z: SILO.bed.z, r: 3 },
    ebenezer: { x: SILO.ebenezer.x, z: SILO.ebenezer.z, r: 5 },
  },
  base: 25,
  amp: 3,
  scale: 34,
  flat: [
    { x: 30, z: 106, r: 10, h: 25 },
    { x: SILO.tab.x, z: 56, r: 24, h: 25 },
    { x: SILO.ebenezer.x, z: SILO.ebenezer.z, r: 8, h: 25 },
  ],
  surf: (x, z, k) => {
    if (fbm2(18181 + 3, x / 26, z / 26, 2) > 0.62) k.top = B.dry_grass;
  },
  tree: (x, z, r) => {
    for (const s of [SILO.casa, SILO.tab, SILO.ebenezer, { x: 30, z: 106 }]) if (Math.hypot(x - s.x, z - s.z) < (s === SILO.tab ? 30 : 14)) return null;
    return oliveTree(r);
  },
  treeCell: 7,
  cover: (x, z, r, k) => (k.top === B.grass ? (r < 0.04 ? B.flower_yellow : r < 0.14 ? B.tallgrass : 0) : r < 0.05 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    house(c, 24, 25, 96, 8, 7, 4, B.sandstone, B.planks, 0);
    // o santuário: átrio cercado, tenda com a arca e a lâmpada de Deus
    const x0 = 80;
    const x1 = 100;
    const z0 = 40;
    const z1 = 60;
    const fence = (x: number, z: number) => {
      if (z === z1 && x >= 89 && x <= 91) return;
      if ((x - x0 + (z - z0)) % 3 === 0) c.fill(x, 26, z, x, 28, z, B.cedar_planks);
      else c.fill(x, 26, z, x, 27, z, B.limestone);
    };
    for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) fence(x, z);
    for (let z = z0 + 1; z < z1; z++) for (const x of [x0, x1]) fence(x, z);
    c.fill(84, 26, 42, 96, 29, 52, B.cedar_planks);
    c.fill(85, 26, 43, 95, 28, 51, B.air);
    c.fill(89, 26, 52, 91, 27, 52, B.air);
    c.fill(84, 30, 42, 96, 30, 52, B.brick);
    for (let dx = -1; dx <= 1; dx++) c.set(90 + dx, 26, 44, B.gold_block);
    c.set(89, 27, 44, B.gold_block);
    c.set(91, 27, 44, B.gold_block);
    c.set(90, 27, 44, B.torch);
    c.set(86, 26, 47, B.planks);
    c.set(86, 27, 47, B.torch);
    // o lugar onde Eli se assenta, ao lado da porta (uma pedra)
    c.fill(83, 26, 63, 84, 26, 64, B.limestone);
    for (const [px, pz] of [[120, 30], [20, 40], [60, 120]]) palm(c, px, groundOf(silo, px, pz), pz, 6);
  },
};
export const SILO_MAP: StoryMapDef = makeMap(silo);

// ============================================================ SAUL (terra de Benjamim)
export const BENJAMIM = { casa: { x: 28, z: 110 }, montes: { x: 80, z: 60 }, zufe: { x: 130, z: 50 }, mispa: { x: 150, z: 104 }, jabes: { x: 60, z: 26 }, gilgal: { x: 170, z: 40 } };
const CRATES: [number, number][] = [[152, 104], [160, 106], [154, 110], [158, 112], [162, 102], [150, 108]];

const benjamim: MapSpec = {
  id: "benjamim",
  name: "Benjamim: de Gibeá a Gilgal",
  w: 192,
  d: 144,
  seed: 19191,
  time: 0.14,
  bgm: "saul",
  spawn: { x: 28, z: 116, yaw: Math.PI },
  zones: {
    start: { x: 28, z: 116, r: 5 },
    montes: { x: BENJAMIM.montes.x, z: BENJAMIM.montes.z, r: 10 },
    zufe: { x: BENJAMIM.zufe.x, z: BENJAMIM.zufe.z, r: 8 },
    mispa: { x: BENJAMIM.mispa.x, z: BENJAMIM.mispa.z, r: 8 },
    jabes: { x: 60, z: 40, r: 7 },
    gilgal: { x: BENJAMIM.gilgal.x, z: BENJAMIM.gilgal.z, r: 8 },
  },
  base: 25,
  amp: 4,
  scale: 34,
  flat: [
    { x: 28, z: 114, r: 10, h: 25 },
    { x: BENJAMIM.zufe.x, z: BENJAMIM.zufe.z, r: 12, h: 25 },
    { x: BENJAMIM.mispa.x, z: BENJAMIM.mispa.z, r: 14, h: 25 },
    { x: 60, z: 34, r: 16, h: 25 },
    { x: BENJAMIM.gilgal.x, z: BENJAMIM.gilgal.z, r: 12, h: 25 },
    { x: 80, z: 60, r: 8, h: 25 },
  ],
  surf: (x, z, k) => {
    if (fbm2(19191 + 3, x / 28, z / 28, 2) > 0.6) k.top = B.dry_grass;
  },
  tree: (x, z, r) => {
    for (const s of [BENJAMIM.casa, BENJAMIM.zufe, BENJAMIM.mispa, { x: 60, z: 34 }, BENJAMIM.gilgal, { x: 28, z: 114 }]) if (Math.hypot(x - s.x, z - s.z) < 16) return null;
    return oliveTree(r);
  },
  treeCell: 7,
  cover: (x, z, r, k) => (k.top === B.grass ? (r < 0.04 ? B.flower_yellow : r < 0.14 ? B.tallgrass : 0) : r < 0.05 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    house(c, 22, 25, 104, 8, 7, 4, B.sandstone, B.planks, 0);
    // Zufe: a casa e o lugar alto, com um altar de pedra
    house(c, 122, 25, 44, 8, 8, 5, B.sandstone, B.limestone, 2);
    c.fill(135, 26, 49, 137, 27, 51, B.cobble);
    // Mispá: a assembleia, com a bagagem onde Saul se esconde
    c.fill(144, 26, 94, 156, 26, 98, B.limestone);
    for (const [bx, bz] of CRATES) c.fill(bx, 26, bz, bx + 1, 27, bz + 1, (bx + bz) % 2 === 0 ? B.planks : B.cedar_planks);
    // Jabes-Gileade: muro e portão; as tendas de Naás ao leste
    c.fill(50, 26, 16, 70, 29, 17, B.cobble);
    c.fill(50, 26, 36, 70, 29, 37, B.cobble);
    c.fill(50, 26, 18, 51, 29, 35, B.cobble);
    c.fill(69, 26, 18, 70, 29, 35, B.cobble);
    c.fill(58, 26, 36, 62, 28, 37, B.air);
    for (const [tx, tz] of [[78, 18], [84, 24], [78, 30], [90, 20], [90, 32]]) tent(c, tx, groundOf(benjamim, tx, tz), tz);
    // Gilgal: um altar e tendas
    c.fill(169, 26, 39, 171, 27, 41, B.cobble);
    for (const [tx, tz] of [[160, 32], [178, 46], [162, 50]]) tent(c, tx, groundOf(benjamim, tx, tz), tz);
  },
};
export const BENJAMIM_MAP: StoryMapDef = makeMap(benjamim);

// ============================================================ DAVI, O PASTOR (Belém)
export const BELEM = { casa: { x: 32, z: 86 }, pasto: { x: 84, z: 68 }, palacio: { x: 146, z: 40 }, portao: { x: 22, z: 74 } };

const belem: MapSpec = {
  id: "belem",
  name: "Belém e o palácio de Saul",
  w: 176,
  d: 128,
  seed: 20202,
  time: 0.14,
  bgm: "davi",
  spawn: { x: 22, z: 100, yaw: Math.PI },
  zones: {
    start: { x: 22, z: 100, r: 5 },
    portao: { x: BELEM.portao.x, z: BELEM.portao.z, r: 5 },
    casa: { x: BELEM.casa.x, z: BELEM.casa.z, r: 9 },
    pasto: { x: BELEM.pasto.x, z: BELEM.pasto.z, r: 12 },
    palacio: { x: BELEM.palacio.x, z: BELEM.palacio.z + 12, r: 8 },
  },
  base: 25,
  amp: 3,
  scale: 34,
  flat: [
    { x: 22, z: 100, r: 6, h: 25 },
    { x: BELEM.casa.x, z: BELEM.casa.z, r: 12, h: 25 },
    { x: BELEM.portao.x, z: BELEM.portao.z, r: 6, h: 25 },
    { x: BELEM.pasto.x, z: BELEM.pasto.z, r: 14, h: 25 },
    { x: BELEM.palacio.x, z: BELEM.palacio.z, r: 20, h: 25 },
  ],
  surf: (x, z, k) => {
    if (fbm2(20202 + 3, x / 26, z / 26, 2) > 0.64 && Math.hypot(x - BELEM.pasto.x, z - BELEM.pasto.z) > 16) k.top = B.dry_grass;
  },
  tree: (x, z, r) => {
    for (const s of [BELEM.casa, BELEM.pasto, BELEM.palacio, BELEM.portao, { x: 22, z: 100 }]) if (Math.hypot(x - s.x, z - s.z) < 15) return null;
    return oliveTree(r);
  },
  treeCell: 7,
  cover: (x, z, r, k) => (k.top === B.grass ? (r < 0.05 ? B.flower_yellow : r < 0.2 ? B.tallgrass : 0) : r < 0.05 ? B.tallgrass : 0),
  extra: (c: ChunkCtx) => {
    // a casa de Jessé e outras casas de Belém
    house(c, 24, 25, 82, 10, 8, 5, B.sandstone, B.planks, 2);
    for (const [hx, hz] of [[10, 66], [36, 66], [12, 90], [44, 94]]) house(c, hx, 25, hz, 6, 6, 4, B.sandstone, B.planks, 0);
    // o curral baixo do pasto
    for (let x = 72; x <= 96; x++) for (const z of [58, 78]) c.set(x, 26, z, B.cobble);
    for (let z = 59; z <= 77; z++) for (const x of [72, 96]) c.set(x, 26, z, B.cobble);
    c.fill(83, 26, 78, 85, 26, 78, B.air);
    // o palácio de Saul em Gibeá
    const px = BELEM.palacio.x;
    const pz = BELEM.palacio.z;
    c.fill(px - 12, 25, pz - 9, px + 12, 25, pz + 9, B.limestone);
    c.fill(px - 10, 26, pz - 7, px + 10, 33, pz + 7, B.limestone);
    c.fill(px - 9, 26, pz - 6, px + 9, 32, pz + 6, B.air);
    c.fill(px - 10, 34, pz - 7, px + 10, 34, pz + 7, B.cedar_planks);
    c.fill(px - 2, 26, pz + 7, px + 2, 30, pz + 7, B.air);
    for (const dx of [-6, 6]) c.set(px + dx, 27, pz + 6, B.torch);
    c.set(px, 26, pz - 4, B.gold_block);
    for (const [x, z] of [[100, 110], [140, 100], [60, 110]]) palm(c, x, groundOf(belem, x, z), z, 6);
  },
};
export const BELEM_MAP: StoryMapDef = makeMap(belem);
