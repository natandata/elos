// MAP_02B_FIELDS: os campos fora do Éden onde vivem Caim e Abel. Mapa limitado de 96×80, já com o mundo depois da queda.
import { B } from "../../blocks/blocks";
import { fbm2 } from "../../world/noise";
import type { MapEnv, StoryMapDef } from "../types";
import { type Column, type ChunkCtx, buildChunk, scatter, tree } from "./builder";

export const FIELDS_W = 96;
export const FIELDS_D = 80;
const SEED = 4242;

export const FIELDS_SITES = { abelAltar: { x: 28, z: 40 }, cainAltar: { x: 68, z: 40 }, wheat: { x0: 58, x1: 80, z0: 54, z1: 70 }, pasture: { x: 26, z: 60 } };

function column(x: number, z: number, env: MapEnv): Column {
  void env;
  let h = Math.round(24 + fbm2(SEED, x / 22, z / 22, 3) * 4);
  let top: number = B.dry_grass;
  const w = FIELDS_SITES.wheat;
  if (x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1) {
    h = 24;
    top = B.farmland;
  }
  for (const a of [FIELDS_SITES.abelAltar, FIELDS_SITES.cainAltar]) if (Math.hypot(x - a.x, z - a.z) < 5) h = 24;
  return { h, top, sub: top === B.stone || top === B.snow ? B.stone : B.dirt, water: 0 };
}

function altar(c: ChunkCtx, ax: number, az: number): void {
  c.fill(ax - 1, 25, az - 1, ax + 1, 25, az + 1, B.cobble);
  c.fill(ax, 26, az, ax, 26, az, B.cobble);
  c.set(ax - 2, 25, az, B.torch);
  c.set(ax + 2, 25, az, B.torch);
}

function decorate(c: ChunkCtx, env: MapEnv): void {
  const w = FIELDS_SITES.wheat;
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const x = c.x0 + lx;
      const z = c.z0 + lz;
      const k = column(x, z, env);
      if (k.top === B.farmland) {
        // fileiras de trigo maduro com um corredor entre elas
        c.set(x, k.h + 1, z, (x - w.x0) % 4 === 3 ? B.air : B.wheat_3);
        continue;
      }
      if (k.top === B.dry_grass && c.rand(x, z, 3) < 0.03) c.set(x, k.h + 1, z, B.tallgrass);
    }
  }
  scatter(c, 9, 8, 17, (x, z, r) => {
    if (r > 0.4) return;
    const k = column(x, z, env);
    if (k.top !== B.dry_grass) return;
    for (const a of [FIELDS_SITES.abelAltar, FIELDS_SITES.cainAltar]) if (Math.hypot(x - a.x, z - a.z) < 9) return;
    tree(c, x, k.h, z, { trunk: 5 + Math.floor(c.rand(x, z, 22) * 3), radius: 3, leaf: B.dry_leaves });
  });
  altar(c, FIELDS_SITES.abelAltar.x, FIELDS_SITES.abelAltar.z);
  altar(c, FIELDS_SITES.cainAltar.x, FIELDS_SITES.cainAltar.z);
}

export const FIELDS_MAP: StoryMapDef = {
  id: "fields",
  name: "Os campos de Caim e Abel",
  w: FIELDS_W,
  d: FIELDS_D,
  spawn: { x: 48, z: 30, yaw: 0 },
  zones: {
    start: { x: 48, z: 30, r: 5 },
    abelAltar: { x: 28, z: 42, r: 5 },
    cainAltar: { x: 68, z: 42, r: 5 },
    wheat: { x: 69, z: 62, r: 10 },
    pasture: { x: 26, z: 60, r: 10 },
    middle: { x: 48, z: 42, r: 6 },
  },
  time: 0.16,
  bgm: "fields",
  generate: (cx, cz, env) => buildChunk(SEED, cx, cz, (x, z) => column(x, z, env), (c) => decorate(c, env)),
};
