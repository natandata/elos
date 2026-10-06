// MAP_01_EDEN / MAP_02_FALL: o Jardim do Éden (e o mundo depois da queda). Mapa limitado de 112×112.
import { B } from "../../blocks/blocks";
import { fbm2, smoothstep } from "../../world/noise";
import type { MapEnv, StoryMapDef } from "../types";
import { type Column, type ChunkCtx, buildChunk, outside, scatter, tree } from "./builder";

export const EDEN_W = 112;
export const EDEN_D = 112;
const SEED = 7717;

const riverX = (z: number): number => 56 + 14 * Math.sin(z / 15) + 6 * Math.sin(z / 6.3 + 1);
const riverW = (z: number): number => 2.4 + Math.max(0, z - 34) / 34;
const lakeD = (x: number, z: number): number => Math.hypot((x - 62) / 17, (z - 99) / 12);
const PLATEAU_EDGE = 31;

export const EDEN_SITES = {
  life: { x: 34, z: 54 },
  knowledge: { x: 82, z: 58 },
  gate: { x: 104, z: 62 },
  meadow: { x: 56, z: 64 },
};

function height(x: number, z: number): number {
  let h = 24 + fbm2(SEED, x / 28, z / 28, 3) * 5;
  const dm = Math.hypot(x - 56, z - 64);
  h = 24 + (h - 24) * smoothstep(8, 26, dm);
  if (z < PLATEAU_EDGE) h = 36 + fbm2(SEED + 5, x / 20, z / 20, 2) * 2;
  const edge = Math.min(x, z, EDEN_W - 1 - x, EDEN_D - 1 - z);
  const corridor = x >= 92 && Math.abs(z - 62) <= 4;
  if (!corridor) {
    if (edge < 12) h += smoothstep(12, 0, edge) * 11;
    if (edge < 0) h = Math.min(58, h + -edge * 3 + 8);
  }
  for (const s of [EDEN_SITES.knowledge, EDEN_SITES.life]) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < 9) h = 24 + smoothstep(9, 3, d) * 2.4;
  }
  return Math.round(h);
}

function column(x: number, z: number, env: MapEnv): Column {
  let h = height(x, z);
  const out = outside(x, z, EDEN_W, EDEN_D);
  const edge = Math.min(x, z, EDEN_W - 1 - x, EDEN_D - 1 - z);
  const grass = env.fallen ? B.dry_grass : B.grass;
  let top: number = grass;
  let water = 0;
  let fall: number | undefined;

  const rx = riverX(z);
  const dr = Math.abs(x - rx);
  const wr = riverW(z);
  const inRiver = out === 0 && dr < wr && z >= 0;
  if (inRiver) {
    if (z < PLATEAU_EDGE) {
      h -= 3;
      water = h + 2;
      top = B.sand;
    } else if (z <= PLATEAU_EDGE + 2) {
      h = 24;
      fall = 35;
      water = 25;
      top = B.sand;
    } else {
      h = 21;
      water = 23;
      top = B.sand;
    }
  } else if (out === 0 && dr < wr + 1.6 && z > PLATEAU_EDGE + 2) {
    top = B.sand;
    h = Math.min(h, 23);
  }
  const ld = lakeD(x, z);
  if (ld < 1) {
    h = Math.round(24 - (1 - ld) * 7);
    water = 23;
    top = B.sand;
  } else if (ld < 1.12) {
    top = B.sand;
    h = Math.min(h, 23);
  }

  if (out > 0 || edge < 5) top = h > 40 ? B.snow : h > 30 ? B.stone : top === B.sand ? B.sand : B.stone;
  else if (z < PLATEAU_EDGE && z >= PLATEAU_EDGE - 1 && !inRiver) top = B.stone;
  else if (z >= PLATEAU_EDGE && z <= PLATEAU_EDGE + 2 && height(x, z) >= 30) top = B.stone;
  if (x >= 92 && Math.abs(z - 62) <= 4 && out === 0) top = B.limestone;
  return { h, top, sub: top === B.sand ? B.sand : top === B.snow ? B.stone : top === B.stone || top === B.limestone ? B.stone : B.dirt, water, fall };
}

function bareOf(env: MapEnv) {
  return { leaf: env.fallen ? B.dry_leaves : B.leaves, fruit: env.fallen ? B.dry_leaves : B.fruit_leaves, life: env.fallen ? B.dry_leaves : B.life_leaves };
}

function decorate(c: ChunkCtx, env: MapEnv): void {
  const L = bareOf(env);
  // flores, mato e lírios
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const x = c.x0 + lx;
      const z = c.z0 + lz;
      if (outside(x, z, EDEN_W, EDEN_D) > 0) continue;
      const k = column(x, z, env);
      if (k.water || k.top !== (env.fallen ? B.dry_grass : B.grass)) continue;
      const r = c.rand(x, z, 3);
      if (env.fallen) {
        if (r < 0.02) c.set(x, k.h + 1, z, B.tallgrass);
        continue;
      }
      if (r < 0.05) c.set(x, k.h + 1, z, B.flower_red);
      else if (r < 0.09) c.set(x, k.h + 1, z, B.flower_yellow);
      else if (r < 0.13) c.set(x, k.h + 1, z, B.flower_blue);
      else if (r < 0.15) c.set(x, k.h + 1, z, B.lily);
      else if (r < 0.3) c.set(x, k.h + 1, z, B.tallgrass);
    }
  }
  // árvores
  scatter(c, 7, 8, 11, (x, z, r) => {
    if (outside(x, z, EDEN_W, EDEN_D) > 0 || Math.min(x, z, EDEN_W - 1 - x, EDEN_D - 1 - z) < 3) return;
    const k = column(x, z, env);
    if (k.water || k.top !== (env.fallen ? B.dry_grass : B.grass)) return;
    if (Math.hypot(x - 56, z - 64) < 13 && r < 0.9) return;
    if (Math.hypot(x - EDEN_SITES.life.x, z - EDEN_SITES.life.z) < 11 || Math.hypot(x - EDEN_SITES.knowledge.x, z - EDEN_SITES.knowledge.z) < 11) return;
    if (x >= 92 && Math.abs(z - 62) <= 7) return;
    const forest = x < 30 || x > 84 || z < 40;
    if (r > (forest ? 0.78 : 0.34)) return;
    const kind = c.rand(x, z, 21);
    if (kind < 0.5) tree(c, x, k.h, z, { trunk: 5 + Math.floor(c.rand(x, z, 22) * 3), radius: 3, leaf: L.leaf });
    else if (kind < 0.8) tree(c, x, k.h, z, { trunk: 4 + Math.floor(c.rand(x, z, 23) * 2), radius: 3, leaf: L.fruit });
    else tree(c, x, k.h, z, { trunk: 8 + Math.floor(c.rand(x, z, 24) * 3), radius: 4, leaf: L.leaf, wide: true });
  });
  // Árvore da Vida (dourada) e Árvore do Conhecimento (frutos vermelhos)
  const lh = column(EDEN_SITES.life.x, EDEN_SITES.life.z, env).h;
  tree(c, EDEN_SITES.life.x, lh, EDEN_SITES.life.z, { trunk: 10, radius: 6, leaf: L.life, wide: true });
  const kh = column(EDEN_SITES.knowledge.x, EDEN_SITES.knowledge.z, env).h;
  tree(c, EDEN_SITES.knowledge.x, kh, EDEN_SITES.knowledge.z, { trunk: 8, radius: 5, leaf: L.fruit, wide: true });
  // portão do Éden (arco de calcário e ouro) no corredor leste
  const gx = EDEN_SITES.gate.x;
  const gz = EDEN_SITES.gate.z;
  const gh = 24;
  for (const dz of [-5, 5]) {
    c.fill(gx, gh + 1, gz + dz, gx + 1, gh + 9, gz + dz, B.limestone);
    c.fill(gx, gh + 10, gz + dz, gx + 1, gh + 10, gz + dz, B.gold_block);
  }
  c.fill(gx, gh + 9, gz - 5, gx + 1, gh + 9, gz + 5, B.limestone);
  c.fill(gx, gh + 10, gz - 5, gx + 1, gh + 10, gz + 5, B.gold_block);
  if (!env.fallen) for (const dz of [-4, 4]) c.set(gx - 1, gh + 4, gz + dz, B.torch);
  else for (const dz of [-4, 4]) c.set(gx - 1, gh + 4, gz + dz, B.torch);
}

export function edenColumn(x: number, z: number, env: MapEnv): Column {
  return column(x, z, env);
}

export const EDEN_MAP: StoryMapDef = {
  id: "eden",
  name: "O Jardim do Éden",
  w: EDEN_W,
  d: EDEN_D,
  spawn: { x: 66, z: 78, yaw: 0 },
  zones: {
    start: { x: 66, z: 78, r: 5 },
    river: { x: Math.round(riverX(70)), z: 70, r: 6 },
    waterfall: { x: Math.round(riverX(26)), z: 38, r: 8 },
    meadow: { x: 56, z: 64, r: 10 },
    life: { x: EDEN_SITES.life.x, z: EDEN_SITES.life.z, r: 9 },
    knowledge: { x: EDEN_SITES.knowledge.x, z: EDEN_SITES.knowledge.z, r: 9 },
    eve: { x: 46, z: 84, r: 6 },
    gate: { x: EDEN_SITES.gate.x - 4, z: EDEN_SITES.gate.z, r: 6 },
    outside: { x: 109, z: 62, r: 2 },
  },
  time: 0.12,
  bgm: "eden",
  generate: (cx, cz, env) => buildChunk(SEED, cx, cz, (x, z) => column(x, z, env), (c) => decorate(c, env)),
};
