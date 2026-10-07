// A megacidade do Egito (a cidade do Faraó): avenidas, milhares de casas de tijolo, templos, obeliscos e pirâmides gigantes.
// Usada nos mapas dos capítulos passados no Egito (José, Moisés, Pragas e Páscoa): os lugares da história continuam onde estavam, e a cidade cresce em volta.
import { B } from "../../blocks/blocks";
import { CHUNK } from "../../config/config";
import { rand01 } from "../../world/noise";
import type { Column, ChunkCtx } from "./builder";
import { house, palm } from "./gen";

export interface CityCfg {
  seed: number;
  w: number;
  d: number;
  /** onde a cidade existe */
  inCity: (x: number, z: number) => boolean;
  /** lugares da história (círculos) que a cidade não pode cobrir */
  keep: { x: number; z: number; r: number }[];
  /** pirâmides gigantes (escalonadas): centro e meia-largura da base */
  pyramids: { x: number; z: number; half: number }[];
}

const CELL = 13;
const BLOCK = 5;
const TOP = 61;

const isRoadCell = (i: number, j: number): boolean => ((i % BLOCK) + BLOCK) % BLOCK === 0 || ((j % BLOCK) + BLOCK) % BLOCK === 0;
const inKeep = (cfg: CityCfg, x: number, z: number, pad = 0): boolean => cfg.keep.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + pad);
const inPyramid = (cfg: CityCfg, x: number, z: number, pad = 0): boolean => cfg.pyramids.some((p) => Math.abs(x - p.x) < p.half + pad && Math.abs(z - p.z) < p.half + pad);

/** Chão da cidade: tudo na altura 24; avenidas de arenito; quintais de areia. */
export function cityGround(cfg: CityCfg, x: number, z: number, k: Column): void {
  if (!cfg.inCity(x, z) || inKeep(cfg, x, z)) return;
  k.h = 24;
  k.water = 0;
  k.fall = undefined;
  k.sub = B.sandstone;
  const road = isRoadCell(Math.floor(x / CELL), Math.floor(z / CELL));
  k.top = road ? B.sandstone : (x * 7 + z * 13) % 11 === 0 ? B.dry_grass : B.sand;
}

function pyramid(c: ChunkCtx, p: { x: number; z: number; half: number }): void {
  if (c.x0 > p.x + p.half || c.x0 + CHUNK < p.x - p.half || c.z0 > p.z + p.half || c.z0 + CHUNK < p.z - p.half) return;
  const tiers = 8;
  const stepH = Math.floor((TOP - 25) / tiers);
  for (let y = 25; y <= TOP; y++) {
    const k = Math.min(tiers - 1, Math.floor((y - 25) / stepH));
    const half = Math.round(p.half * (1 - k / (tiers + 0.6)));
    const mat = y >= TOP - 3 ? B.gold_block : k >= tiers - 2 ? B.limestone : (k + (y - 25 === 0 ? 1 : 0)) % 2 === 0 ? B.sandstone : B.limestone;
    c.fill(p.x - half, y, p.z - half, p.x + half, y, p.z + half, mat);
  }
  // a entrada, ao sul, e uma faixa de tocha
  c.fill(p.x - 1, 25, p.z + p.half - 3, p.x + 1, 28, p.z + p.half, B.air);
}

function temple(c: ChunkCtx, x0: number, z0: number, rnd: number): void {
  const s = 24;
  c.fill(x0, 25, z0, x0 + s, 25, z0 + s, B.limestone);
  // salão: paredes, colunas e telhado
  c.fill(x0 + 3, 26, z0 + 8, x0 + s - 3, 32, z0 + s - 2, B.sandstone);
  c.fill(x0 + 4, 26, z0 + 9, x0 + s - 4, 31, z0 + s - 3, B.air);
  c.fill(x0 + 10, 26, z0 + s - 2, x0 + 14, 30, z0 + s - 2, B.air);
  for (let k = 0; k < 4; k++) c.fill(x0 + 5 + k * 4, 26, z0 + 4, x0 + 6 + k * 4, 33, z0 + 5, B.limestone);
  c.fill(x0 + 3, 33, z0 + 3, x0 + s - 3, 33, z0 + s - 2, B.limestone);
  // pilonos na frente (muros em trapézio) e dois obeliscos
  c.fill(x0 + 1, 26, z0 + 1, x0 + 6, 38, z0 + 2, B.sandstone);
  c.fill(x0 + s - 6, 26, z0 + 1, x0 + s - 1, 38, z0 + 2, B.sandstone);
  for (const ox of [-2, s + 2]) {
    c.fill(x0 + ox, 26, z0 + 1, x0 + ox + 1, 44, z0 + 2, B.limestone);
    c.set(x0 + ox, 45, z0 + 1, B.gold_block);
  }
  if (rnd < 0.5) c.set(x0 + 12, 27, z0 + 14, B.gold_block);
  c.set(x0 + 11, 27, z0 + s - 4, B.torch);
  c.set(x0 + 13, 27, z0 + s - 4, B.torch);
}

/** Casas, templos, obeliscos, palmeiras e pirâmides: tudo o que forma a megacidade neste chunk. */
export function cityBuild(cfg: CityCfg, c: ChunkCtx): void {
  const gx0 = Math.floor((c.x0 - 28) / CELL);
  const gx1 = Math.floor((c.x0 + CHUNK + 28) / CELL);
  const gz0 = Math.floor((c.z0 - 28) / CELL);
  const gz1 = Math.floor((c.z0 + CHUNK + 28) / CELL);
  for (let i = gx0; i <= gx1; i++) {
    for (let j = gz0; j <= gz1; j++) {
      const bi = Math.floor(i / BLOCK);
      const bj = Math.floor(j / BLOCK);
      const ci = ((i % BLOCK) + BLOCK) % BLOCK;
      const cj = ((j % BLOCK) + BLOCK) % BLOCK;
      const cx = i * CELL;
      const cz = j * CELL;
      if (cx < 4 || cz < 4 || cx > cfg.w - 18 || cz > cfg.d - 18) continue;
      if (isRoadCell(i, j)) {
        // cruzamentos: obelisco; ao longo das avenidas: palmeiras
        if (ci === 0 && cj === 0 && cfg.inCity(cx + 6, cz + 6) && !inKeep(cfg, cx + 6, cz + 6, 6) && !inPyramid(cfg, cx + 6, cz + 6, 4) && rand01(cfg.seed + 9, bi, 1, bj) < 0.55) {
          c.fill(cx + 5, 25, cz + 5, cx + 7, 27, cz + 7, B.limestone);
          c.fill(cx + 6, 28, cz + 6, cx + 6, 40, cz + 6, B.limestone);
          c.set(cx + 6, 41, cz + 6, B.gold_block);
        } else if ((ci === 0) !== (cj === 0) && (i + j) % 2 === 0) {
          const px = ci === 0 ? cx + (j % 2 ? 1 : CELL - 2) : cx + 6;
          const pz = cj === 0 ? cz + (i % 2 ? 1 : CELL - 2) : cz + 6;
          if (c.inside(px, pz) && cfg.inCity(px, pz) && !inKeep(cfg, px, pz, 3) && !inPyramid(cfg, px, pz, 3)) palm(c, px, 24, pz, 6);
        }
        continue;
      }
      // templos ocupam o centro de alguns quarteirões
      const templeBlock = rand01(cfg.seed + 5, bi, 2, bj) < 0.28;
      if (templeBlock && ci >= 2 && ci <= 3 && cj >= 2 && cj <= 3) {
        if (ci === 2 && cj === 2) {
          const tx = cx + 1;
          const tz = cz + 1;
          if (cfg.inCity(tx + 12, tz + 12) && !inKeep(cfg, tx + 12, tz + 12, 14) && !inPyramid(cfg, tx + 12, tz + 12, 14)) temple(c, tx, tz, rand01(cfg.seed + 6, bi, 3, bj));
        }
        continue;
      }
      if (rand01(cfg.seed + 1, i, 1, j) < 0.05) continue;
      const w = 6 + Math.floor(rand01(cfg.seed + 1, i, 2, j) * 5);
      const dd = 6 + Math.floor(rand01(cfg.seed + 1, i, 3, j) * 5);
      const x0 = cx + 1 + Math.floor(rand01(cfg.seed + 1, i, 4, j) * (CELL - w - 1));
      const z0 = cz + 1 + Math.floor(rand01(cfg.seed + 1, i, 5, j) * (CELL - dd - 1));
      const mx = x0 + w / 2;
      const mz = z0 + dd / 2;
      if (!cfg.inCity(x0, z0) || !cfg.inCity(x0 + w, z0 + dd) || !cfg.inCity(x0, z0 + dd) || !cfg.inCity(x0 + w, z0)) continue;
      if (inKeep(cfg, mx, mz, Math.max(w, dd) / 2 + 3) || inPyramid(cfg, mx, mz, Math.max(w, dd) / 2 + 3)) continue;
      // porta voltada para a avenida mais próxima
      const ax = Math.round(mx / (CELL * BLOCK)) * CELL * BLOCK + CELL / 2;
      const az = Math.round(mz / (CELL * BLOCK)) * CELL * BLOCK + CELL / 2;
      const facing = Math.abs(mx - ax) < Math.abs(mz - az) ? (mx < ax ? 2 : 3) : mz < az ? 0 : 1;
      const tall = rand01(cfg.seed + 1, i, 6, j) < 0.22 ? 3 : 0;
      const r = rand01(cfg.seed + 1, i, 7, j);
      house(c, x0, 24, z0, w, dd, 4 + tall, r < 0.45 ? B.sandstone : r < 0.8 ? B.brick : B.limestone, r < 0.5 ? B.planks : B.sandstone, facing);
    }
  }
  for (const p of cfg.pyramids) pyramid(c, p);
}
