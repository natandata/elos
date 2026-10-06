// Ferramentas para montar mapas de campanha chunk a chunk (determinísticos e com limite).
import { B } from "../../blocks/blocks";
import { CHUNK, WORLD_H } from "../../config/config";
import { rand01 } from "../../world/noise";
import type { GenResult, StoryMapDef } from "../types";

export const idx = (x: number, y: number, z: number): number => x + z * CHUNK + y * CHUNK * CHUNK;

/** Contexto de um chunk: escreve blocos em coordenadas de mundo, ignorando o que cai fora do chunk. */
export class ChunkCtx {
  data = new Uint8Array(CHUNK * CHUNK * WORLD_H);
  maxY = 0;
  chests: GenResult["chests"] = [];
  readonly x0: number;
  readonly z0: number;
  constructor(
    readonly cx: number,
    readonly cz: number,
    readonly seed: number,
  ) {
    this.x0 = cx * CHUNK;
    this.z0 = cz * CHUNK;
  }
  inside(x: number, z: number): boolean {
    return x >= this.x0 && x < this.x0 + CHUNK && z >= this.z0 && z < this.z0 + CHUNK;
  }
  set(x: number, y: number, z: number, id: number): void {
    if (y < 0 || y >= WORLD_H || !this.inside(x, z)) return;
    this.data[idx(x - this.x0, y, z - this.z0)] = id;
    if (y >= this.maxY) this.maxY = Math.min(WORLD_H - 1, y + 1);
  }
  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= WORLD_H || !this.inside(x, z)) return 0;
    return this.data[idx(x - this.x0, y, z - this.z0)];
  }
  /** só escreve se o espaço estiver vazio (folhas não apagam troncos) */
  soft(x: number, y: number, z: number, id: number): void {
    if (this.get(x, y, z) === B.air) this.set(x, y, z, id);
  }
  fill(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, id: number): void {
    for (let x = Math.max(x1, this.x0); x <= Math.min(x2, this.x0 + CHUNK - 1); x++) for (let z = Math.max(z1, this.z0); z <= Math.min(z2, this.z0 + CHUNK - 1); z++) for (let y = y1; y <= y2; y++) this.set(x, y, z, id);
  }
  rand(x: number, z: number, salt = 0): number {
    return rand01(this.seed + salt, x, salt, z);
  }
  result(): GenResult {
    return { data: this.data, maxY: this.maxY, chests: this.chests };
  }
}

export type Column = {
  /** altura da superfície sólida */
  h: number;
  top: number;
  sub: number;
  /** nível da água (0 = sem água) */
  water: number;
  /** água corrente vertical (cachoeira) ocupa de h+1 até este y */
  fall?: number;
};

/**
 * Gera o terreno de um chunk a partir de uma função de coluna e depois chama a decoração.
 * `col` é pura: a decoração pode consultá-la em colunas vizinhas (árvores que cruzam a borda do chunk).
 */
export function buildChunk(seed: number, cx: number, cz: number, col: (x: number, z: number) => Column, decorate: (c: ChunkCtx) => void): GenResult {
  const c = new ChunkCtx(cx, cz, seed);
  for (let lz = 0; lz < CHUNK; lz++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const x = c.x0 + lx;
      const z = c.z0 + lz;
      const k = col(x, z);
      for (let y = 0; y <= k.h; y++) {
        let id: number;
        if (y === 0) id = B.bedrock;
        else if (y === k.h) id = k.top;
        else if (y >= k.h - 3) id = k.sub;
        else id = B.stone;
        c.data[idx(lx, y, lz)] = id;
      }
      const top = Math.max(k.h, k.water, k.fall ?? 0);
      for (let y = k.h + 1; y <= Math.max(k.water, k.fall ?? 0); y++) c.data[idx(lx, y, lz)] = B.water;
      if (top >= c.maxY) c.maxY = Math.min(WORLD_H - 1, top + 1);
    }
  }
  decorate(c);
  return c.result();
}

/** Candidatos em grade jitterada (para árvores, flores...) cujo centro cai perto do chunk. */
export function scatter(c: ChunkCtx, cell: number, margin: number, salt: number, fn: (x: number, z: number, r: number) => void): void {
  const gx0 = Math.floor((c.x0 - margin) / cell);
  const gx1 = Math.floor((c.x0 + CHUNK + margin) / cell);
  const gz0 = Math.floor((c.z0 - margin) / cell);
  const gz1 = Math.floor((c.z0 + CHUNK + margin) / cell);
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gz = gz0; gz <= gz1; gz++) {
      const x = gx * cell + Math.floor(rand01(c.seed + salt, gx, 1, gz) * cell);
      const z = gz * cell + Math.floor(rand01(c.seed + salt, gx, 2, gz) * cell);
      fn(x, z, rand01(c.seed + salt, gx, 3, gz));
    }
  }
}

/** Árvore de copa redonda (carvalho grande, árvore frutífera ou dourada). */
export function tree(c: ChunkCtx, x: number, gy: number, z: number, opt: { trunk: number; radius: number; leaf: number; log?: number; wide?: boolean; seed?: number }): void {
  const log = opt.log ?? B.log;
  for (let k = 1; k <= opt.trunk; k++) {
    c.set(x, gy + k, z, log);
    if (opt.wide) {
      c.set(x + 1, gy + k, z, log);
      c.set(x, gy + k, z + 1, log);
      c.set(x + 1, gy + k, z + 1, log);
    }
  }
  const top = gy + opt.trunk;
  const R = opt.radius;
  for (let dy = -2; dy <= R; dy++) {
    const r = dy < 0 ? R - 1 + dy * 0 : Math.max(1, Math.round(R * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((R + 1) * (R + 1))))));
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > r + 0.3) continue;
        if (c.rand(x + dx, z + dz, 7 + dy) < 0.08 && d > r - 1) continue;
        const ox = opt.wide ? 0.5 : 0;
        if (Math.hypot(dx - ox, dz - ox) > r + 0.6) continue;
        c.soft(x + dx, top + dy, z + dz, opt.leaf);
      }
    }
  }
}

/** Suavização de distância à borda do mapa: 0 dentro, cresce fora. */
export const outside = (x: number, z: number, w: number, d: number): number => Math.max(0, -x, x - (w - 1), -z, z - (d - 1));

export type MapBuilder = Pick<StoryMapDef, "generate">;
