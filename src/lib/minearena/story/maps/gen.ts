// Fábrica de mapas da campanha: descreve o terreno por dados (altura, superfície, árvores, cobertura) e entrega um StoryMapDef.
// Os mapas continuam além da borda com o mesmo terreno natural (a borda é uma parede invisível, ver StoryDirector.limits).
import { B } from "../../blocks/blocks";
import { fbm2, smoothstep } from "../../world/noise";
import type { MapEnv, StoryMapDef, Zone } from "../types";
import { type Column, type ChunkCtx, buildChunk, scatter, tree } from "./builder";

/** Área plana (praça, acampamento, templo): `h` no centro, mistura suave até `r * 1.6`. */
export type Site = { x: number; z: number; r: number; h: number };
export type TreeSpec = { trunk: number; radius: number; leaf: number; log?: number; wide?: boolean };

export interface MapSpec {
  id: string;
  name: string;
  w: number;
  d: number;
  seed: number;
  time: number;
  bgm: string;
  spawn: { x: number; z: number; yaw: number };
  zones: Record<string, Zone>;
  /** relevo: altura média, amplitude e escala (blocos) das ondulações */
  base: number;
  amp: number;
  scale: number;
  flat?: Site[];
  /** ajustes por coluna: muda a superfície, escava rios (água) ou levanta morros */
  surf?: (x: number, z: number, k: Column) => void;
  /** árvore (ou nada) no ponto sorteado `r` (0–1) */
  tree?: (x: number, z: number, r: number, k: Column) => TreeSpec | null;
  treeCell?: number;
  /** planta/flor sobre o chão (0 = nada) */
  cover?: (x: number, z: number, r: number, k: Column) => number;
  /** construções fixas do cenário */
  extra?: (c: ChunkCtx, env: MapEnv) => void;
}

export function makeMap(spec: MapSpec): StoryMapDef {
  const column = (x: number, z: number): Column => {
    let h = spec.base + (fbm2(spec.seed, x / spec.scale, z / spec.scale, 3) - 0.5) * 2 * spec.amp;
    for (const s of spec.flat ?? []) {
      const d = Math.hypot(x - s.x, z - s.z);
      if (d < s.r) h = s.h;
      else if (d < s.r * 1.6) h = s.h + (h - s.h) * smoothstep(s.r, s.r * 1.6, d);
    }
    const k: Column = { h: Math.round(h), top: B.grass, sub: B.dirt, water: 0 };
    spec.surf?.(x, z, k);
    return k;
  };
  const decorate = (c: ChunkCtx, env: MapEnv): void => {
    if (spec.cover) {
      for (let lz = 0; lz < 16; lz++) {
        for (let lx = 0; lx < 16; lx++) {
          const x = c.x0 + lx;
          const z = c.z0 + lz;
          const k = column(x, z);
          if (k.water) continue;
          const id = spec.cover(x, z, c.rand(x, z, 3), k);
          if (id) c.set(x, k.h + 1, z, id);
        }
      }
    }
    if (spec.tree) {
      scatter(c, spec.treeCell ?? 8, 8, 11, (x, z, r) => {
        const k = column(x, z);
        if (k.water) return;
        const t = spec.tree!(x, z, r, k);
        if (t) tree(c, x, k.h, z, t);
      });
    }
    spec.extra?.(c, env);
  };
  return {
    id: spec.id,
    name: spec.name,
    w: spec.w,
    d: spec.d,
    spawn: spec.spawn,
    zones: spec.zones,
    time: spec.time,
    bgm: spec.bgm,
    generate: (cx, cz, env) => buildChunk(spec.seed, cx, cz, column, (c) => decorate(c, env)),
  };
}

/** Altura do terreno (para estruturas e cenas que precisam pousar no chão). */
export const groundOf = (spec: Pick<MapSpec, "base" | "amp" | "scale" | "seed" | "flat" | "surf">, x: number, z: number): number => {
  let h = spec.base + (fbm2(spec.seed, x / spec.scale, z / spec.scale, 3) - 0.5) * 2 * spec.amp;
  for (const s of spec.flat ?? []) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < s.r) h = s.h;
    else if (d < s.r * 1.6) h = s.h + (h - s.h) * smoothstep(s.r, s.r * 1.6, d);
  }
  const k: Column = { h: Math.round(h), top: B.grass, sub: B.dirt, water: 0 };
  spec.surf?.(x, z, k);
  return k.h;
};

// ---------- peças de cenário ----------
/** Casa simples de pedra/tijolo com porta aberta voltada para `facing` (+z = 0, -z = 1, +x = 2, -x = 3). */
export function house(c: ChunkCtx, x: number, gy: number, z: number, w: number, d: number, h: number, wall: number, roof: number, facing = 0): void {
  c.fill(x, gy, z, x + w - 1, gy, z + d - 1, B.dirt);
  c.fill(x, gy + 1, z, x + w - 1, gy + h, z + d - 1, wall);
  c.fill(x + 1, gy + 1, z + 1, x + w - 2, gy + h, z + d - 2, B.air);
  c.fill(x, gy + h + 1, z, x + w - 1, gy + h + 1, z + d - 1, roof);
  const dx = facing === 2 ? x + w - 1 : facing === 3 ? x : x + Math.floor(w / 2);
  const dz = facing === 0 ? z + d - 1 : facing === 1 ? z : z + Math.floor(d / 2);
  c.fill(dx, gy + 1, dz, dx, gy + 2, dz, B.air);
  c.set(x + 1, gy + 2, z + 1, B.torch);
}

/** Tenda de pastor: cobertura inclinada de tábuas sobre quatro estacas. */
export function tent(c: ChunkCtx, x: number, gy: number, z: number, len = 5): void {
  for (let k = 0; k < len; k++) {
    c.set(x + k, gy + 1, z, B.planks);
    c.set(x + k, gy + 1, z + 4, B.planks);
    c.set(x + k, gy + 2, z + 1, B.planks);
    c.set(x + k, gy + 2, z + 3, B.planks);
    c.set(x + k, gy + 3, z + 2, B.planks);
  }
  c.set(x, gy + 1, z + 2, B.air);
  c.set(x + 2, gy + 1, z + 2, B.torch);
}

/** Poço de pedra com água. */
export function well(c: ChunkCtx, x: number, gy: number, z: number): void {
  c.fill(x - 1, gy, z - 1, x + 1, gy + 1, z + 1, B.cobble);
  c.set(x, gy + 1, z, B.water);
  c.set(x, gy, z, B.water);
  c.set(x - 1, gy + 2, z - 1, B.log);
  c.set(x + 1, gy + 2, z - 1, B.log);
  c.set(x - 1, gy + 3, z - 1, B.planks);
  c.set(x, gy + 3, z - 1, B.planks);
  c.set(x + 1, gy + 3, z - 1, B.planks);
}

/** Palmeira (tronco fino e folhas largas no topo). */
export function palm(c: ChunkCtx, x: number, gy: number, z: number, hgt = 6): void {
  for (let k = 1; k <= hgt; k++) c.set(x, gy + k, z, B.log);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1]]) c.soft(x + dx, gy + hgt + (Math.abs(dx) + Math.abs(dz) > 1 ? 0 : 1), z + dz, B.palm_leaves);
  c.soft(x, gy + hgt + 1, z, B.palm_leaves);
}
