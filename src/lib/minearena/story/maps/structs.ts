// Construções que surgem durante as cenas (a torre de Babel, a escada de Jacó...): listas de blocos [x, y, z, id].
import { B } from "../../blocks/blocks";
import { SHINAR, BERSEBA } from "./genesis";
import { SEA, seaFloor } from "./exodus";
import { JORDAO, riverFloor } from "./conquista";
import { jericoFall } from "./jerico";
import { gazaGateCells, templeFallCells } from "./juizes";
import { DESERTO, SINAI, TAB } from "./sinai";

type Block = [number, number, number, number];

/** A torre de Babel: zigurate de cinco andares de tijolo, com o cume tocando o céu. */
function babelTower(): Block[] {
  const out: Block[] = [];
  const { x, z } = SHINAR.tower;
  let y0 = 25;
  for (let lvl = 0; lvl < 5; lvl++) {
    const hs = 12 - lvl * 2;
    const hgt = 7;
    for (let y = y0; y < y0 + hgt; y++) {
      for (let dx = -hs; dx <= hs; dx++) {
        for (const dz of [-hs, hs]) out.push([x + dx, y, z + dz, (dx + y) % 5 === 0 ? B.sandstone : B.brick]);
      }
      for (let dz = -hs + 1; dz <= hs - 1; dz++) {
        for (const dx of [-hs, hs]) out.push([x + dx, y, z + dz, (dz + y) % 5 === 0 ? B.sandstone : B.brick]);
      }
    }
    // terraço
    for (let dx = -hs; dx <= hs; dx++) for (let dz = -hs; dz <= hs; dz++) out.push([x + dx, y0 + hgt, z + dz, B.sandstone]);
    // porta de cada andar (lado sul) e tochas
    y0 += hgt;
    for (const dx of [-hs, hs]) out.push([x + dx, y0 + 1, z - hs + 1, B.torch]);
  }
  // o cume
  for (let y = 0; y < 5; y++) out.push([x, y0 + 1 + y, z, y === 4 ? B.gold_block : B.limestone]);
  return out;
}

/** A escada de Jacó: rampa de calcário subindo ao céu, com degraus largos e brilho de ouro. */
function jacobLadder(): Block[] {
  const out: Block[] = [];
  const { x, z } = BERSEBA.betel;
  for (let k = 0; k < 24; k++) {
    const y = 43 + k;
    const zz = z - 2 - k;
    for (let dx = -2; dx <= 2; dx++) out.push([x + dx, y, zz, k % 6 === 5 ? B.gold_block : B.limestone]);
  }
  return out;
}

/** O corredor do Mar Vermelho: a água sai (ou volta) de uma ponta à outra, deixando paredes de água dos lados. */
function seaRows(id: number, fromFar: boolean): Block[] {
  const out: Block[] = [];
  const zs: number[] = [];
  for (let z = SEA.z0; z <= SEA.z1; z++) zs.push(z);
  if (fromFar) zs.reverse();
  for (const z of zs) for (let x = SEA.x0; x <= SEA.x1; x++) for (let y = seaFloor(z) + 1; y <= SEA.level; y++) out.push([x, y, z, id]);
  return out;
}

/** A água que sai da rocha em Refidim: uma poça rasa ao pé da rocha. */
function rockWater(): Block[] {
  const out: Block[] = [];
  const { x, z } = DESERTO.pool;
  for (let dz = -3; dz <= 0; dz++) for (let dx = -2; dx <= 2; dx++) out.push([x + dx, 24, z + dz, B.water]);
  return out;
}

/** O tabernáculo: átrio cercado, altar do holocausto, bacia, tenda com o lugar santo e o santíssimo (com a arca). */
function tabernacle(): Block[] {
  const out: Block[] = [];
  const { x0, x1, z0, z1 } = TAB;
  const cx = DESERTO.tab.x;
  // cerca de linho (calcário) com colunas de cedro a cada 3 blocos; a entrada fica ao norte
  const fence = (x: number, z: number) => {
    if (z === z0 && x >= cx - 1 && x <= cx + 1) return;
    if (((x - x0) + (z - z0)) % 3 === 0) for (let y = 25; y <= 27; y++) out.push([x, y, z, B.cedar_planks]);
    else for (let y = 25; y <= 26; y++) out.push([x, y, z, B.limestone]);
  };
  for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) fence(x, z);
  for (let z = z0 + 1; z < z1; z++) for (const x of [x0, x1]) fence(x, z);
  // altar do holocausto (bronze) e bacia de bronze
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) out.push([cx + dx, 25, 134 + dz, B.cobble]);
  out.push([cx, 26, 134, B.ember_block]);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) out.push([cx + dx, 25, 141 + dz, B.cobble]);
  out.push([cx, 25, 141, B.water]);
  // a tenda: paredes de tábuas de cedro, cobertura vermelha (peles tingidas), entrada ao norte
  const tx0 = cx - 4;
  const tx1 = cx + 4;
  const tz0 = 146;
  const tz1 = 156;
  for (let y = 25; y <= 28; y++) {
    for (let x = tx0; x <= tx1; x++) {
      for (const z of [tz0, tz1]) if (!(z === tz0 && x >= cx - 1 && x <= cx + 1 && y <= 26)) out.push([x, y, z, B.cedar_planks]);
    }
    for (let z = tz0 + 1; z < tz1; z++) for (const x of [tx0, tx1]) out.push([x, y, z, B.cedar_planks]);
  }
  for (let x = tx0; x <= tx1; x++) for (let z = tz0; z <= tz1; z++) out.push([x, 29, z, B.brick]);
  // o véu separa o lugar santo do santíssimo
  for (let y = 25; y <= 28; y++) for (let x = tx0 + 1; x < tx1; x++) out.push([x, y, 152, B.brick]);
  // dentro: castiçal de ouro, mesa dos pães, e no santíssimo a arca da aliança com dois querubins
  out.push([cx - 2, 25, 149, B.gold_block], [cx - 2, 26, 149, B.torch], [cx + 2, 25, 149, B.cedar_planks], [cx + 2, 26, 149, B.limestone]);
  for (let dx = -1; dx <= 1; dx++) out.push([cx + dx, 25, 154, B.gold_block]);
  out.push([cx - 1, 26, 154, B.gold_block], [cx + 1, 26, 154, B.gold_block], [cx, 26, 154, B.torch]);
  return out;
}

/** O leito do Jordão: a água some (ou volta) de uma ponta à outra, a partir de cima do rio. */
function riverRows(id: number, fromFar: boolean): Block[] {
  const out: Block[] = [];
  const zs: number[] = [];
  for (let z = JORDAO.z0; z <= JORDAO.z1; z++) zs.push(z);
  if (fromFar) zs.reverse();
  for (const z of zs) for (let x = 0; x < 128; x++) for (let y = riverFloor(z) + 1; y <= JORDAO.level; y++) out.push([x, y, z, id]);
  return out;
}
/** O rio seca: aparecem no leito as doze pedras do memorial e a arca da aliança, no meio. */
function jordanOpen(): Block[] {
  const out = riverRows(B.air, false);
  for (let k = 0; k < 12; k++) out.push([52 + (k % 4) * 7, 21, 78 + Math.floor(k / 4) * 7, B.cobble]);
  out.push([64, 21, 85, B.gold_block], [65, 21, 85, B.gold_block]);
  return out;
}

const CALF = SINAI.calf;
/** O bezerro de ouro sobre um pedestal, com fogueiras de festa dos dois lados. */
function calf(): Block[] {
  const out: Block[] = [];
  for (let x = CALF.x - 3; x <= CALF.x + 3; x++) for (let z = CALF.z - 1; z <= CALF.z + 1; z++) out.push([x, 25, z, B.limestone]);
  for (let x = CALF.x - 2; x <= CALF.x + 1; x++) for (let y = 26; y <= 27; y++) out.push([x, y, CALF.z, B.gold_block]);
  out.push([CALF.x + 2, 27, CALF.z, B.gold_block], [CALF.x + 2, 28, CALF.z, B.gold_block], [CALF.x + 3, 27, CALF.z, B.gold_block]);
  out.push([CALF.x + 2, 28, CALF.z - 1, B.gold_block], [CALF.x + 2, 28, CALF.z + 1, B.gold_block], [CALF.x - 3, 27, CALF.z, B.gold_block]);
  out.push([CALF.x - 5, 25, CALF.z, B.ember_block], [CALF.x + 5, 25, CALF.z, B.ember_block]);
  return out;
}
/** Some tudo o que o bezerro de ouro trouxe (a pedra do pedestal, o ouro e as fogueiras). */
function calfGone(): Block[] {
  const list = calf().map(([x, y, z]): Block => [x, y, z, B.air]);
  return list.reverse();
}

export const STRUCTS: Record<string, () => Block[]> = { babel_tower: babelTower, jacob_ladder: jacobLadder, sea_open: () => seaRows(B.air, false), sea_close: () => seaRows(B.water, true), rock_water: rockWater, tabernacle, calf, calf_gone: calfGone, jordan_open: jordanOpen, jordan_close: () => riverRows(B.water, true), jerico_fall: jericoFall, gaza_gate: gazaGateCells, temple_fall: templeFallCells };

/** Ponto (y) do degrau k da escada de Jacó, para pousar os anjos. */
export const ladderStep = (k: number): { x: number; y: number; z: number } => ({ x: BERSEBA.betel.x, y: 44 + k, z: BERSEBA.betel.z - 2 - k });
