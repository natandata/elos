// Construções que surgem durante as cenas (a torre de Babel, a escada de Jacó...): listas de blocos [x, y, z, id].
import { B } from "../../blocks/blocks";
import { SHINAR, BERSEBA } from "./genesis";

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

export const STRUCTS: Record<string, () => Block[]> = { babel_tower: babelTower, jacob_ladder: jacobLadder };

/** Ponto (y) do degrau k da escada de Jacó, para pousar os anjos. */
export const ladderStep = (k: number): { x: number; y: number; z: number } => ({ x: BERSEBA.betel.x, y: 44 + k, z: BERSEBA.betel.z - 2 - k });
