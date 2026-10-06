// Geração procedural do mundo (determinística pela seed).
import { B } from "../blocks/blocks";
import { CHUNK, SEA_LEVEL, WORLD_H } from "../config/config";
import { fbm2, noise3, rand01, smoothstep } from "./noise";
import type { LootTable } from "../structures/loot";
import { CELL, STRUCTURE_BY_ID, structureAt } from "../structures/structures";

export type BiomeId = "planicie" | "floresta" | "deserto" | "montanha" | "lago";
export const BIOME_NAME: Record<BiomeId, string> = {
  planicie: "Planícies de Sarom",
  floresta: "Floresta de Basã",
  deserto: "Deserto de Sur",
  montanha: "Montes de Efraim",
  lago: "Águas de Merom",
};

export interface Column {
  h: number;
  biome: BiomeId;
  river: boolean;
}

export function columnInfo(seed: number, x: number, z: number): Column {
  const cont = fbm2(seed, x / 260, z / 260, 3);
  const mont = fbm2(seed + 11, x / 150, z / 150, 4);
  const temp = fbm2(seed + 23, x / 320, z / 320, 2);
  const moist = fbm2(seed + 37, x / 280, z / 280, 2);
  const det = fbm2(seed + 51, x / 40, z / 40, 3);

  let h = SEA_LEVEL + 4 + (cont - 0.5) * 60 + det * 6;
  h += smoothstep(0.5, 0.68, mont) * 30 * (0.5 + det);

  const rv = Math.abs(fbm2(seed + 77, x / 110, z / 110, 2) - 0.5);
  const river = rv < 0.03;
  if (river) {
    const k = 1 - rv / 0.03;
    h = h + (SEA_LEVEL - 3 - h) * Math.min(1, k * 1.4);
  }
  h = Math.floor(Math.min(WORLD_H - 8, Math.max(4, h)));

  let biome: BiomeId;
  if (h <= SEA_LEVEL) biome = "lago";
  else if (h >= 44) biome = "montanha";
  else if (temp > 0.56 && moist < 0.5) biome = "deserto";
  else if (moist > 0.52) biome = "floresta";
  else biome = "planicie";
  return { h, biome, river };
}

export function biomeAt(seed: number, x: number, z: number): BiomeId {
  return columnInfo(seed, Math.floor(x), Math.floor(z)).biome;
}

/** Procura um ponto de terra firme perto da origem pra o jogador nascer. */
export function findSpawn(seed: number): { x: number; y: number; z: number } {
  for (let r = 0; r < 500; r += 6) {
    for (let a = 0; a < 8; a++) {
      const x = Math.round(Math.cos((a / 8) * Math.PI * 2) * r);
      const z = Math.round(Math.sin((a / 8) * Math.PI * 2) * r);
      const c = columnInfo(seed, x, z);
      if (c.h > SEA_LEVEL + 1 && c.biome !== "montanha" && !c.river) return { x: x + 0.5, y: c.h + 1.2, z: z + 0.5 };
    }
  }
  const c = columnInfo(seed, 0, 0);
  return { x: 0.5, y: Math.max(c.h, SEA_LEVEL) + 2, z: 0.5 };
}

const idx = (x: number, y: number, z: number) => x + z * CHUNK + y * CHUNK * CHUNK;

export interface GenChest {
  x: number;
  y: number;
  z: number;
  table: LootTable;
}

export function generateChunk(seed: number, cx: number, cz: number): { data: Uint8Array; maxY: number; chests: GenChest[] } {
  const data = new Uint8Array(CHUNK * CHUNK * WORLD_H);
  const x0 = cx * CHUNK;
  const z0 = cz * CHUNK;
  let maxY = 0;
  const heights = new Int16Array(CHUNK * CHUNK);
  const chests: GenChest[] = [];

  for (let lz = 0; lz < CHUNK; lz++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const wx = x0 + lx;
      const wz = z0 + lz;
      const { h, biome } = columnInfo(seed, wx, wz);
      heights[lx + lz * CHUNK] = h;
      const desert = biome === "deserto";
      const beach = h <= SEA_LEVEL + 1 && biome !== "montanha";

      for (let y = 0; y <= h; y++) {
        let id: number;
        if (y === 0) id = B.bedrock;
        else if (y === h) id = desert || beach || h <= SEA_LEVEL ? B.sand : biome === "montanha" ? (h >= 52 ? B.snow : B.stone) : B.grass;
        else if (y >= h - 3) id = desert || beach || h <= SEA_LEVEL ? (desert && y < h - 2 ? B.sandstone : B.sand) : biome === "montanha" ? B.stone : B.dirt;
        else id = B.stone;

        if (y > 1 && y < h - 3) {
          const t1 = noise3(seed + 91, wx / 16, y / 10, wz / 16) - 0.5;
          const t2 = noise3(seed + 93, wx / 22 + 100, y / 14, wz / 22) - 0.5;
          const room = noise3(seed + 95, wx / 28, y / 16, wz / 28) > 0.74;
          if (t1 * t1 + t2 * t2 < 0.0028 || room) {
            id = y <= 6 ? B.lava : B.air;
          } else if (id === B.stone) {
            const r = rand01(seed + 7, wx, y, wz);
            if (r < 0.0016 && y < 14) id = B.sapphire_ore;
            else if (r < 0.0055 && y < 20) id = B.gold_ore;
            else if (r < 0.0125 && y < 34) id = B.iron_ore;
            else if (r < 0.028) id = B.coal_ore;
          }
        }
        data[idx(lx, y, lz)] = id;
      }
      for (let y = h + 1; y <= SEA_LEVEL; y++) data[idx(lx, y, lz)] = B.water;
      if (data[idx(lx, h, lz)] === B.grass && h > SEA_LEVEL && h + 1 < WORLD_H) {
        const fr = rand01(seed + 310, wx, 0, wz);
        if (fr < 0.08) data[idx(lx, h + 1, lz)] = B.tallgrass;
        else if (fr < 0.095 && (biome === "planicie" || biome === "floresta")) data[idx(lx, h + 1, lz)] = B.lily;
        if (fr < 0.095 && h + 1 > maxY) maxY = h + 1;
      }
      maxY = Math.max(maxY, h, h < SEA_LEVEL ? SEA_LEVEL : 0);
    }
  }

  const put = (wx: number, y: number, wz: number, id: number, onlyAir: boolean) => {
    const lx = wx - x0;
    const lz = wz - z0;
    if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 0 || y >= WORLD_H) return;
    const i = idx(lx, y, lz);
    if (onlyAir && data[i] !== B.air) return;
    data[i] = id;
    if (y > maxY) maxY = y;
  };

  // árvores e cactos (olham uma margem em volta pra copas que cruzam a borda do chunk)
  for (let tx = x0 - 2; tx < x0 + CHUNK + 2; tx++) {
    for (let tz = z0 - 2; tz < z0 + CHUNK + 2; tz++) {
      const r = rand01(seed + 201, tx, 0, tz);
      if (r > 0.04) continue;
      const c = columnInfo(seed, tx, tz);
      if (c.h <= SEA_LEVEL + 1 || c.river) continue;
      if (c.biome === "deserto") {
        if (r < 0.006) {
          const ch = 2 + Math.floor(rand01(seed + 203, tx, 1, tz) * 2);
          for (let k = 1; k <= ch; k++) put(tx, c.h + k, tz, B.cactus, true);
        }
        continue;
      }
      const density = c.biome === "floresta" ? 0.035 : c.biome === "planicie" ? 0.005 : 0;
      if (r >= density) continue;
      const th = 4 + Math.floor(rand01(seed + 202, tx, 1, tz) * 3);
      for (let k = 1; k <= th; k++) put(tx, c.h + k, tz, B.log, false);
      const top = c.h + th;
      for (let ly = top - 2; ly <= top + 1; ly++) {
        const rad = ly >= top ? 1 : 2;
        for (let dx = -rad; dx <= rad; dx++) {
          for (let dz = -rad; dz <= rad; dz++) {
            if (Math.abs(dx) === rad && Math.abs(dz) === rad && (rad === 1 || rand01(seed + 204, tx + dx, ly, tz + dz) < 0.5)) continue;
            put(tx + dx, ly, tz + dz, B.leaves, true);
          }
        }
      }
    }
  }

  // estruturas bíblicas (aldeia, templo, torre, ruínas): nivela o terreno e constrói
  for (let ccx = Math.floor((x0 - 24) / CELL); ccx <= Math.floor((x0 + CHUNK + 24) / CELL); ccx++) {
    for (let ccz = Math.floor((z0 - 24) / CELL); ccz <= Math.floor((z0 + CHUNK + 24) / CELL); ccz++) {
      const sp = structureAt(seed, ccx, ccz);
      if (!sp) continue;
      const def = STRUCTURE_BY_ID[sp.id];
      if (sp.ox + def.rx < x0 || sp.ox - def.rx >= x0 + CHUNK || sp.oz + def.rzB < z0 || sp.oz - def.rzA >= z0 + CHUNK) continue;
      const gy = sp.gy;
      if (gy + 20 > maxY) maxY = Math.min(WORLD_H - 1, gy + 20);
      const surface = columnInfo(seed, sp.ox, sp.oz).biome === "deserto" ? B.sand : B.grass;
      for (let lz = 0; lz < CHUNK; lz++) {
        for (let lx = 0; lx < CHUNK; lx++) {
          const dx = x0 + lx - sp.ox;
          const dz = z0 + lz - sp.oz;
          if (dx < -def.rx || dx > def.rx || dz < -def.rzA || dz > def.rzB) continue;
          const hc = heights[lx + lz * CHUNK];
          for (let y = Math.min(hc, gy) + 1; y < gy; y++) data[idx(lx, y, lz)] = B.cobble;
          data[idx(lx, gy, lz)] = surface;
          for (let y = gy + 1; y <= Math.min(WORLD_H - 1, Math.max(hc, gy) + 12); y++) data[idx(lx, y, lz)] = B.air;
        }
      }
      def.build({
        set: (dx, dy, dz, id) => put(sp.ox + dx, gy + dy, sp.oz + dz, id, false),
        fill: (a, b, c, d, e, f, id) => {
          for (let X = Math.max(a, x0 - sp.ox); X <= Math.min(d, x0 + CHUNK - 1 - sp.ox); X++) {
            for (let Z = Math.max(c, z0 - sp.oz); Z <= Math.min(f, z0 + CHUNK - 1 - sp.oz); Z++) {
              for (let Y = b; Y <= e; Y++) put(sp.ox + X, gy + Y, sp.oz + Z, id, false);
            }
          }
        },
        chest: (dx, dy, dz, table) => {
          const wx = sp.ox + dx;
          const wz = sp.oz + dz;
          put(wx, gy + dy, wz, B.chest, false);
          if (wx >= x0 && wx < x0 + CHUNK && wz >= z0 && wz < z0 + CHUNK) chests.push({ x: wx, y: gy + dy, z: wz, table });
        },
        rnd: (i) => rand01(sp.seed, i, 0, 0),
      });
    }
  }

  return { data, maxY: Math.min(WORLD_H - 1, maxY + 1), chests };
}
