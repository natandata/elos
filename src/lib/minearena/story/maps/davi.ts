// Mapas da Fase 6 (Davi): o vale de Elá (Davi e Golias), En-Gedi e Haquilá (Davi e Saul) e Hebrom/Jerusalém (Davi, Rei).
import { B } from "../../blocks/blocks";
import { fbm2 } from "../../world/noise";
import type { StoryMapDef } from "../types";
import { type ChunkCtx } from "./builder";
import { type MapSpec, groundOf, house, makeMap, palm, tent } from "./gen";

const oliveTree = (r: number) => (r < 0.08 ? { trunk: 4, radius: 3, leaf: B.leaves } : null);
const dryCover = (x: number, z: number, r: number, k: { top: number }) => (k.top === B.grass ? (r < 0.04 ? B.flower_yellow : r < 0.14 ? B.tallgrass : 0) : r < 0.04 ? B.tallgrass : 0);

// ============================================================ DAVI E GOLIAS (vale de Elá)
export const ELA = {
  campo: { x: 34, z: 60 },
  tenda: { x: 50, z: 50 },
  ribeiro: { x: 100, z: 60 },
  frente: { x: 76, z: 60 },
  filisteus: { x: 158, z: 60 },
};
/** O ribeiro serpenteia de norte a sul no meio do vale. */
export const brookX = (z: number): number => 100 + 3 * Math.sin(z / 10);

const ela: MapSpec = {
  id: "elah",
  name: "O vale de Elá",
  w: 200,
  d: 120,
  seed: 21212,
  time: 0.14,
  bgm: "golias",
  spawn: { x: 28, z: 66, yaw: -Math.PI / 2 },
  zones: {
    start: { x: 28, z: 66, r: 5 },
    campo: { x: ELA.campo.x, z: ELA.campo.z, r: 9 },
    tenda: { x: ELA.tenda.x, z: ELA.tenda.z + 4, r: 5 },
    ribeiro: { x: ELA.ribeiro.x, z: ELA.ribeiro.z, r: 10 },
    frente: { x: ELA.frente.x, z: ELA.frente.z, r: 5 },
  },
  base: 25,
  amp: 2,
  scale: 34,
  flat: [
    { x: ELA.campo.x, z: ELA.campo.z, r: 20, h: 25 },
    { x: ELA.tenda.x, z: ELA.tenda.z, r: 8, h: 25 },
    { x: ELA.frente.x, z: ELA.frente.z, r: 12, h: 25 },
    { x: ELA.filisteus.x, z: ELA.filisteus.z, r: 22, h: 25 },
  ],
  surf: (x, z, k) => {
    const dr = Math.abs(x - brookX(z));
    if (dr < 2.4) {
      k.h = 23;
      k.water = 24;
      k.top = B.sand;
      k.sub = B.sand;
    } else if (dr < 3.8) {
      k.h = Math.min(k.h, 24);
      k.top = B.sand;
      k.sub = B.sand;
    } else if (fbm2(21212 + 3, x / 24, z / 24, 2) > 0.62) k.top = B.dry_grass;
  },
  tree: (x, z, r) => {
    if (Math.abs(x - brookX(z)) < 8) return null;
    for (const s of [ELA.campo, ELA.tenda, ELA.frente, ELA.filisteus, { x: 28, z: 66 }]) if (Math.hypot(x - s.x, z - s.z) < 16) return null;
    return oliveTree(r);
  },
  treeCell: 8,
  cover: dryCover,
  extra: (c: ChunkCtx) => {
    // pavilhão de Saul e as tendas do acampamento de Israel
    house(c, 44, 25, 44, 10, 8, 5, B.planks, B.cedar_planks, 2);
    for (const [tx, tz] of [[18, 40], [24, 76], [34, 36], [40, 82], [20, 56]]) tent(c, tx, groundOf(ela, tx, tz), tz);
    // as tendas dos filisteus, do outro lado do vale
    for (const [tx, tz] of [[150, 36], [158, 44], [150, 76], [166, 82], [170, 54], [172, 68]]) tent(c, tx, groundOf(ela, tx, tz), tz);
    // as pedras lisas do ribeiro: blocos de cinza no leito (o leito fica 1 bloco abaixo da margem)
    for (let z = 34; z <= 88; z += 4) c.set(Math.round(brookX(z)), 24, z, B.ash);
    for (const [px, pz] of [[100, 20], [96, 100]]) palm(c, px, groundOf(ela, px, pz), pz, 5);
  },
};
export const ELA_MAP: StoryMapDef = makeMap(ela);

// ============================================================ DAVI E SAUL (En-Gedi e Haquilá)
export const ENGEDI = { caverna: { x: 96, z: 86 }, fundo: { x: 96, z: 52 }, colina: { x: 96, z: 108 }, hakila: { x: 160, z: 100 }, morro: { x: 126, z: 60 }, davi: { x: 28, z: 104 } };

const engedi: MapSpec = {
  id: "engedi",
  name: "O deserto de En-Gedi e o monte de Haquilá",
  w: 200,
  d: 130,
  seed: 22222,
  time: 0.2,
  bgm: "engedi",
  spawn: { x: 28, z: 108, yaw: Math.PI },
  zones: {
    start: { x: 28, z: 108, r: 5 },
    caverna: { x: ENGEDI.caverna.x, z: ENGEDI.caverna.z, r: 4 },
    fundo: { x: ENGEDI.fundo.x, z: ENGEDI.fundo.z, r: 3 },
    colina: { x: ENGEDI.colina.x, z: ENGEDI.colina.z, r: 6 },
    acampamento: { x: ENGEDI.hakila.x - 8, z: ENGEDI.hakila.z, r: 6 },
    cabeceira: { x: ENGEDI.hakila.x, z: ENGEDI.hakila.z + 4, r: 2.6 },
    morro: { x: ENGEDI.morro.x, z: ENGEDI.morro.z, r: 6 },
  },
  base: 25,
  amp: 3,
  scale: 32,
  flat: [
    { x: 28, z: 106, r: 10, h: 25 },
    { x: ENGEDI.caverna.x, z: 66, r: 26, h: 25 },
    { x: ENGEDI.colina.x, z: ENGEDI.colina.z, r: 10, h: 25 },
    { x: ENGEDI.hakila.x, z: ENGEDI.hakila.z, r: 16, h: 25 },
    { x: ENGEDI.morro.x, z: ENGEDI.morro.z, r: 8, h: 25 },
  ],
  surf: (x, z, k) => {
    const n = fbm2(22222 + 3, x / 22, z / 22, 2);
    if (n > 0.58) k.top = B.sand;
    else if (n > 0.4) k.top = B.dry_grass;
  },
  tree: (x, z, r) => {
    for (const s of [ENGEDI.caverna, { x: 96, z: 56 }, ENGEDI.colina, ENGEDI.hakila, ENGEDI.morro, { x: 28, z: 106 }]) if (Math.hypot(x - s.x, z - s.z) < 18) return null;
    return r < 0.05 ? { trunk: 4, radius: 3, leaf: B.leaves } : null;
  },
  treeCell: 8,
  cover: (x, z, r, k) => (k.top === B.dry_grass ? (r < 0.1 ? B.tallgrass : 0) : k.top === B.grass ? (r < 0.05 ? B.flower_yellow : 0) : 0),
  extra: (c: ChunkCtx) => {
    // o morro de arenito com a caverna: a boca fica ao sul (z maior) e a câmara no fundo, ao norte
    const cx = ENGEDI.caverna.x;
    const cz = 56;
    for (let x = cx - 18; x <= cx + 18; x++) {
      for (let z = cz - 16; z <= cz + 30; z++) {
        const d = Math.hypot((x - cx) / 1.1, (z - cz) / 1.6);
        const h = Math.round(12 - d * 0.55);
        if (h < 1) continue;
        // as colunas do túnel só ganham o teto (dá para andar por baixo onde o morro tem 3 ou mais de altura)
        const tunnel = Math.abs(x - cx) <= 1 && z >= cz + 2;
        const from = tunnel ? (h >= 3 ? Math.min(29, 25 + h) : 99) : 26;
        for (let y = tunnel ? Math.min(29, 24 + h) + 1 : 26; y <= 25 + h && from < 99; y++) c.set(x, y, z, (x + y + z) % 7 === 0 ? B.limestone : B.sandstone);
      }
    }
    // a câmara no fundo e um nicho no canto, onde Davi e seus homens se escondem
    c.fill(cx - 4, 26, cz - 8, cx + 4, 29, cz + 1, B.air);
    c.fill(cx + 3, 26, cz - 9, cx + 5, 28, cz - 7, B.air);
    for (let z = cz + 6; z <= cz + 24; z += 6) for (const dx of [-2, 2]) c.set(cx + dx, 27, z, B.torch);
    c.set(cx - 3, 27, cz + 1, B.torch);
    c.set(cx + 3, 27, cz + 1, B.torch);
    // o acampamento de Saul em Haquilá: tendas em círculo, a lança fincada junto à cabeça do rei
    const hx = ENGEDI.hakila.x;
    const hz = ENGEDI.hakila.z;
    for (const [dx, dz] of [[-14, -10], [10, -12], [-16, 10], [14, 8], [0, -16], [0, 18]]) tent(c, hx + dx, groundOf(engedi, hx + dx, hz + dz), hz + dz);
    c.fill(hx - 1, 26, hz + 6, hx - 1, 28, hz + 6, B.cedar_log);
    c.set(hx - 1, 29, hz + 6, B.stone);
    c.set(hx + 1, 26, hz + 5, B.glass);
    for (const [px, pz] of [[60, 20], [150, 30], [40, 60]]) palm(c, px, groundOf(engedi, px, pz), pz, 5);
  },
};
export const ENGEDI_MAP: StoryMapDef = makeMap(engedi);

// ============================================================ DAVI, REI (Hebrom e Jerusalém)
export const JERUSALEM = {
  hebrom: { x: 36, z: 104 },
  arca: { x: 68, z: 44 },
  portao: { x: 128, z: 70 },
  cidade: { x: 160, z: 70 },
  tenda: { x: 176, z: 74 },
  palacio: { x: 166, z: 48 },
};
const CITY_H = 28;
const CITY_R = 24;

const jerusalem: MapSpec = {
  id: "jerusalem",
  name: "De Hebrom a Jerusalém, a cidade de Davi",
  w: 220,
  d: 140,
  seed: 23232,
  time: 0.14,
  bgm: "davi_rei",
  spawn: { x: 30, z: 108, yaw: -Math.PI / 2 },
  zones: {
    start: { x: 30, z: 108, r: 5 },
    hebrom: { x: JERUSALEM.hebrom.x, z: JERUSALEM.hebrom.z, r: 9 },
    arca: { x: JERUSALEM.arca.x, z: JERUSALEM.arca.z, r: 6 },
    portao: { x: JERUSALEM.portao.x, z: JERUSALEM.portao.z, r: 5 },
    cidade: { x: JERUSALEM.cidade.x, z: JERUSALEM.cidade.z, r: 8 },
    tenda: { x: JERUSALEM.tenda.x, z: JERUSALEM.tenda.z, r: 4 },
    palacio: { x: JERUSALEM.palacio.x, z: JERUSALEM.palacio.z + 12, r: 5 },
  },
  base: 25,
  amp: 3,
  scale: 34,
  flat: [
    { x: 30, z: 106, r: 8, h: 25 },
    { x: JERUSALEM.hebrom.x, z: JERUSALEM.hebrom.z, r: 12, h: 25 },
    { x: JERUSALEM.arca.x, z: JERUSALEM.arca.z, r: 12, h: 25 },
    { x: JERUSALEM.portao.x - 4, z: JERUSALEM.portao.z, r: 6, h: 25 },
    { x: JERUSALEM.cidade.x, z: JERUSALEM.cidade.z, r: CITY_R, h: CITY_H },
  ],
  surf: (x, z, k) => {
    if (fbm2(23232 + 3, x / 26, z / 26, 2) > 0.62 && Math.hypot(x - JERUSALEM.cidade.x, z - JERUSALEM.cidade.z) > 40) k.top = B.dry_grass;
    if (Math.hypot(x - JERUSALEM.cidade.x, z - JERUSALEM.cidade.z) < CITY_R + 2) k.top = B.limestone;
  },
  tree: (x, z, r) => {
    for (const s of [JERUSALEM.hebrom, JERUSALEM.arca, JERUSALEM.cidade, { x: 30, z: 106 }, JERUSALEM.portao]) if (Math.hypot(x - s.x, z - s.z) < (s === JERUSALEM.cidade ? 38 : 14)) return null;
    return oliveTree(r);
  },
  treeCell: 7,
  cover: dryCover,
  extra: (c: ChunkCtx) => {
    // Hebrom: o carvalho de Manre e uma casa
    house(c, 22, 25, 96, 8, 7, 4, B.sandstone, B.planks, 0);
    // Baalá de Judá: a casa onde estava a arca da aliança
    house(c, JERUSALEM.arca.x - 5, 25, JERUSALEM.arca.z - 10, 10, 8, 5, B.sandstone, B.limestone, 0);
    c.set(JERUSALEM.arca.x, 26, JERUSALEM.arca.z - 4, B.gold_block);
    // Jebus/Jerusalém: muralha de calcário com um portão a oeste; casas dentro
    const cx = JERUSALEM.cidade.x;
    const cz = JERUSALEM.cidade.z;
    for (let x = cx - CITY_R - 1; x <= cx + CITY_R + 1; x++) {
      for (let z = cz - CITY_R - 1; z <= cz + CITY_R + 1; z++) {
        const d = Math.hypot(x - cx, z - cz);
        if (d < CITY_R - 0.5 || d > CITY_R + 0.6) continue;
        if (x < cx - CITY_R + 4 && Math.abs(z - JERUSALEM.portao.z) <= 2) continue; // o portão
        c.fill(x, CITY_H + 1, z, x, CITY_H + 7, z, (x + z) % 6 === 0 ? B.sandstone : B.limestone);
        if ((x + z) % 2 === 0) c.set(x, CITY_H + 8, z, B.limestone);
      }
    }
    for (const [hx, hz, hw, hd] of [[142, 52, 8, 7], [142, 82, 8, 7], [164, 84, 6, 5], [150, 76, 6, 5]]) house(c, hx, CITY_H, hz, hw, hd, 4, B.sandstone, B.planks, 0);
    // a tenda que Davi armou para a arca
    c.fill(JERUSALEM.tenda.x - 3, CITY_H + 1, JERUSALEM.tenda.z - 3, JERUSALEM.tenda.x + 3, CITY_H + 4, JERUSALEM.tenda.z + 3, B.cedar_planks);
    c.fill(JERUSALEM.tenda.x - 2, CITY_H + 1, JERUSALEM.tenda.z - 2, JERUSALEM.tenda.x + 2, CITY_H + 3, JERUSALEM.tenda.z + 2, B.air);
    c.fill(JERUSALEM.tenda.x - 4, CITY_H + 1, JERUSALEM.tenda.z, JERUSALEM.tenda.x - 3, CITY_H + 2, JERUSALEM.tenda.z, B.air);
    c.set(JERUSALEM.tenda.x, CITY_H + 1, JERUSALEM.tenda.z, B.gold_block);
    // o palácio de cedro que Hirão de Tiro construiu para Davi
    const px = JERUSALEM.palacio.x;
    const pz = JERUSALEM.palacio.z;
    c.fill(px - 10, CITY_H, pz - 8, px + 10, CITY_H, pz + 8, B.limestone);
    c.fill(px - 9, CITY_H + 1, pz - 7, px + 9, CITY_H + 6, pz + 7, B.cedar_planks);
    c.fill(px - 8, CITY_H + 1, pz - 6, px + 8, CITY_H + 5, pz + 6, B.air);
    c.fill(px - 9, CITY_H + 7, pz - 7, px + 9, CITY_H + 7, pz + 7, B.brick);
    c.fill(px - 2, CITY_H + 1, pz + 7, px + 2, CITY_H + 4, pz + 7, B.air);
    for (const dx of [-5, 5]) c.set(px + dx, CITY_H + 2, pz + 6, B.torch);
    for (const [x, z] of [[100, 110], [60, 20], [200, 110]]) palm(c, x, groundOf(jerusalem, x, z), z, 6);
  },
};
export const JERUSALEM_MAP: StoryMapDef = makeMap(jerusalem);
