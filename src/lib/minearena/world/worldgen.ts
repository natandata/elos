// Geração procedural do mundo (determinística pela seed).
import { B } from "../blocks/blocks";
import { CHUNK, SEA_LEVEL, WORLD_H } from "../config/config";
import { fbm2, noise3, rand01, smoothstep } from "./noise";
import type { LootTable } from "../structures/loot";
import { LANDMARKS, type LandmarkSite } from "../structures/landmarks";
import { CELL, STRUCTURE_BY_ID, structureAt } from "../structures/structures";

export type BiomeId = "planicie" | "floresta" | "deserto" | "montanha" | "lago" | "oasis" | "savana" | "libano" | "hermom" | "pantano" | "taiga" | "selva" | "oceano";
export const BIOME_NAME: Record<BiomeId, string> = {
  planicie: "Planícies de Sarom",
  floresta: "Floresta de Basã",
  deserto: "Deserto de Sur",
  montanha: "Montes de Efraim",
  lago: "Águas de Merom",
  oasis: "Oásis de En-Gedi",
  savana: "Campos de Sitim",
  libano: "Montes do Líbano",
  hermom: "Monte Hermom",
  pantano: "Brejos do Nilo",
  taiga: "Neves de Zalmom",
  selva: "Selva do Jordão",
  oceano: "Grande Mar",
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
  // penhascos: degraus bruscos de 12 blocos em terra firme
  if (h > SEA_LEVEL + 5) h += smoothstep(0.58, 0.6, fbm2(seed + 88, x / 90, z / 90, 2)) * 12;
  // ilhas no mar aberto
  if (h < SEA_LEVEL - 3) h += smoothstep(0.62, 0.7, fbm2(seed + 97, x / 50, z / 50, 2)) * (SEA_LEVEL + 3 - h);

  // rios: de estreitos a largos
  const rv = Math.abs(fbm2(seed + 77, x / 110, z / 110, 2) - 0.5);
  const rw = 0.03 + 0.03 * smoothstep(0.5, 0.75, fbm2(seed + 79, x / 260, z / 260, 2));
  const river = rv < rw;
  if (river) {
    const k = 1 - rv / rw;
    h = h + (SEA_LEVEL - 3 - h) * Math.min(1, k * 1.4);
  }
  h = Math.floor(Math.min(WORLD_H - 8, Math.max(4, h)));

  const desertish = temp > 0.56 && moist < 0.5;
  const oasisK = desertish && !river && h > SEA_LEVEL - 2 && h <= SEA_LEVEL + 9 ? smoothstep(0.5, 0.62, fbm2(seed + 61, x / 70, z / 70, 2)) : 0;
  if (oasisK > 0) h = Math.floor(h + (SEA_LEVEL - 1 - h) * oasisK);

  // brejo: terreno raso e encharcado em clima ameno e úmido
  const swamp = !river && oasisK === 0 && moist > 0.54 && temp > 0.4 && temp < 0.6 && h > SEA_LEVEL - 2 && h <= SEA_LEVEL + 5 && smoothstep(0.55, 0.62, fbm2(seed + 101, x / 120, z / 120, 2)) > 0.5;
  if (swamp) h = SEA_LEVEL - 1 + Math.floor(det * 3.5);

  let biome: BiomeId;
  if (oasisK > 0.12) biome = "oasis";
  else if (swamp) biome = "pantano";
  else if (h <= SEA_LEVEL - 9) biome = "oceano";
  else if (h <= SEA_LEVEL) biome = "lago";
  else if (h >= 52) biome = "hermom";
  else if (h >= 44) biome = moist > 0.5 ? "libano" : "montanha";
  else if (temp < 0.34) biome = "taiga";
  else if (desertish) biome = "deserto";
  else if (temp > 0.58 && moist > 0.66) biome = "selva";
  else if (temp > 0.5 && moist < 0.5) biome = "savana";
  else if (moist > 0.52) biome = "floresta";
  else biome = "planicie";
  return { h, biome, river };
}

export function biomeAt(seed: number, x: number, z: number): BiomeId {
  return columnInfo(seed, Math.floor(x), Math.floor(z)).biome;
}

/** Procura um ponto de terra firme perto da origem pra o jogador nascer. */
export function findSpawn(seed: number): { x: number; y: number; z: number } {
  // começa em terreno baixo e verde (nada de pico nevado ou deserto no primeiro minuto)
  const good = new Set<BiomeId>(["planicie", "floresta", "savana"]);
  for (const strict of [true, false]) {
    for (let r = 0; r < 500; r += 6) {
      for (let a = 0; a < 8; a++) {
        const x = Math.round(Math.cos((a / 8) * Math.PI * 2) * r);
        const z = Math.round(Math.sin((a / 8) * Math.PI * 2) * r);
        const c = columnInfo(seed, x, z);
        if (c.h <= SEA_LEVEL + 1 || c.river || c.biome === "montanha" || c.biome === "hermom") continue;
        if (strict && (!good.has(c.biome) || c.h > SEA_LEVEL + 14)) continue;
        return { x: x + 0.5, y: c.h + 1.2, z: z + 0.5 };
      }
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

export function generateChunk(seed: number, cx: number, cz: number, landmarks: LandmarkSite[] = []): { data: Uint8Array; maxY: number; chests: GenChest[] } {
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
      const rocky = biome === "montanha" || biome === "hermom";
      const beach = h <= SEA_LEVEL + 1 && !rocky && biome !== "pantano";

      for (let y = 0; y <= h; y++) {
        let id: number;
        if (y === 0) id = B.bedrock;
        else if (y === h) id = desert || beach || h <= SEA_LEVEL ? B.sand : rocky ? (h >= 52 || biome === "hermom" ? B.snow : B.stone) : B.grass;
        else if (y >= h - 3) id = desert || beach || h <= SEA_LEVEL ? (desert && y < h - 2 ? B.sandstone : B.sand) : rocky ? B.stone : B.dirt;
        else id = B.stone;

        if (y > 1 && y < h - 3) {
          const t1 = noise3(seed + 91, wx / 16, y / 10, wz / 16) - 0.5;
          const t2 = noise3(seed + 93, wx / 22 + 100, y / 14, wz / 22) - 0.5;
          const room = noise3(seed + 95, wx / 28, y / 16, wz / 28) > 0.74;
          if (t1 * t1 + t2 * t2 < 0.0028 || room) {
            id = y <= 6 ? B.lava : y <= 11 && noise3(seed + 97, wx / 18, y / 6, wz / 18) > 0.66 ? B.water : B.air;
          } else if (id === B.stone) {
            const r = rand01(seed + 7, wx, y, wz);
            if (r < 0.0016 && y < 14) id = B.sapphire_ore;
            else if (r < 0.0055 && y < 20) id = B.gold_ore;
            else if (r < 0.0125 && y < 34) id = B.iron_ore;
            else if (r < 0.028) id = B.coal_ore;
          }
        }
        if (y === h && biome === "taiga" && id === B.grass && noise3(seed + 111, wx / 14, 0, wz / 14) > 0.48) id = B.snow;
        if (y >= h - 2 && biome === "pantano" && h <= SEA_LEVEL) id = B.dirt;
        data[idx(lx, y, lz)] = id;
      }
      for (let y = h + 1; y <= SEA_LEVEL; y++) data[idx(lx, y, lz)] = B.water;
      if (data[idx(lx, h, lz)] === B.grass && h > SEA_LEVEL && h + 1 < WORLD_H) {
        const fr = rand01(seed + 310, wx, 0, wz);
        if (fr < (biome === "savana" ? 0.2 : biome === "selva" ? 0.32 : biome === "pantano" ? 0.22 : 0.08)) data[idx(lx, h + 1, lz)] = B.tallgrass;
        else if (fr < 0.095 && (biome === "planicie" || biome === "floresta" || biome === "oasis" || biome === "pantano")) data[idx(lx, h + 1, lz)] = B.lily;
        if (fr < 0.2 && h + 1 > maxY) maxY = h + 1;
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

  // árvores (carvalho, cedro do Líbano, acácia de Sitim, tamareira) e cactos; olham uma margem pra copas que cruzam a borda
  for (let tx = x0 - 4; tx < x0 + CHUNK + 4; tx++) {
    for (let tz = z0 - 4; tz < z0 + CHUNK + 4; tz++) {
      const r = rand01(seed + 201, tx, 0, tz);
      if (r > 0.06) continue;
      const c = columnInfo(seed, tx, tz);
      if (c.river || c.h <= SEA_LEVEL) continue;
      const rr = (i: number) => rand01(seed + 202, tx, i, tz);
      const dens: Record<string, number> = { deserto: 0.004, oasis: 0.05, savana: 0.007, libano: 0.05, floresta: 0.035, planicie: 0.005, pantano: 0.03, taiga: 0.045, selva: 0.09 };
      const kind = c.biome === "deserto" ? (r < 0.0025 ? "cactus" : "palm") : c.biome === "oasis" ? "palm" : c.biome === "savana" ? "acacia" : c.biome === "libano" ? "cedar" : c.biome === "floresta" || c.biome === "planicie" || c.biome === "pantano" ? "oak" : c.biome === "taiga" ? "cedar" : c.biome === "selva" ? "jungle" : null;
      if (!kind || r >= (kind === "cactus" ? 0.006 : (dens[c.biome] ?? 0))) continue;
      if (kind !== "palm" && c.h <= SEA_LEVEL + 1) continue;
      if (kind === "cactus") {
        const ch = 2 + Math.floor(rr(1) * 2);
        for (let k = 1; k <= ch; k++) put(tx, c.h + k, tz, B.cactus, true);
      } else if (kind === "palm") {
        const th = 5 + Math.floor(rr(1) * 3);
        for (let k = 1; k <= th; k++) put(tx, c.h + k, tz, B.log, false);
        const top = c.h + th;
        put(tx, top + 1, tz, B.palm_leaves, true);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
          for (let i = 1; i <= 3; i++) put(tx + dx * i, top + (i === 3 ? 0 : 1), tz + dz * i, B.palm_leaves, true);
        }
      } else if (kind === "acacia") {
        const th = 4 + Math.floor(rr(1) * 2);
        for (let k = 1; k <= th; k++) put(tx, c.h + k, tz, B.log, false);
        const top = c.h + th;
        for (let ly = top + 1; ly <= top + 2; ly++) {
          const rad = ly === top + 1 ? 3 : 2;
          for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) if (!(Math.abs(dx) === rad && Math.abs(dz) === rad)) put(tx + dx, ly, tz + dz, B.leaves, true);
        }
      } else if (kind === "cedar") {
        const th = 9 + Math.floor(rr(1) * 5);
        for (let k = 1; k <= th; k++) put(tx, c.h + k, tz, B.cedar_log, false);
        const top = c.h + th;
        for (let ly = c.h + 4; ly <= top + 1; ly++) {
          const frac = (top + 1 - ly) / (th - 3);
          const rad = ly === top + 1 ? 0 : Math.min(3, Math.max(1, Math.round(frac * 3.2)));
          for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) if (!(rad > 1 && Math.abs(dx) === rad && Math.abs(dz) === rad)) put(tx + dx, ly, tz + dz, B.cedar_leaves, true);
        }
      } else if (kind === "jungle") {
        const th = 8 + Math.floor(rr(1) * 6);
        for (let k = 1; k <= th; k++) put(tx, c.h + k, tz, B.log, false);
        const top = c.h + th;
        for (let ly = top - 2; ly <= top + 2; ly++) {
          const rad = ly >= top + 1 ? 2 : 3;
          for (let dx = -rad; dx <= rad; dx++) {
            for (let dz = -rad; dz <= rad; dz++) {
              if (Math.abs(dx) === rad && Math.abs(dz) === rad && rand01(seed + 205, tx + dx, ly, tz + dz) < 0.6) continue;
              put(tx + dx, ly, tz + dz, B.leaves, true);
            }
          }
        }
      } else {
        const th = 4 + Math.floor(rr(1) * 3);
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
  }

  // geodos: bolhas de cristal (safira) escondidas no fundo da rocha
  for (let gcx = Math.floor((x0 - 6) / 96); gcx <= Math.floor((x0 + CHUNK + 6) / 96); gcx++) {
    for (let gcz = Math.floor((z0 - 6) / 96); gcz <= Math.floor((z0 + CHUNK + 6) / 96); gcz++) {
      if (rand01(seed + 601, gcx, 0, gcz) > 0.55) continue;
      const gx = gcx * 96 + 10 + Math.floor(rand01(seed + 602, gcx, 1, gcz) * 76);
      const gz = gcz * 96 + 10 + Math.floor(rand01(seed + 603, gcx, 2, gcz) * 76);
      const gy = 9 + Math.floor(rand01(seed + 604, gcx, 3, gcz) * 14);
      if (columnInfo(seed, gx, gz).h < gy + 9) continue;
      for (let dx = -5; dx <= 5; dx++) {
        for (let dy = -5; dy <= 5; dy++) {
          for (let dz = -5; dz <= 5; dz++) {
            const d = Math.hypot(dx, dy, dz);
            if (d > 5) continue;
            const id = d <= 2.4 ? B.air : d <= 3.3 ? (rand01(seed + 605, gx + dx, gy + dy, gz + dz) < 0.4 ? B.sapphire_ore : B.glass) : d <= 4.3 ? B.limestone : B.basalt;
            put(gx + dx, gy + dy, gz + dz, id, false);
          }
        }
      }
      if (gx >= x0 && gx < x0 + CHUNK && gz >= z0 && gz < z0 + CHUNK) {
        put(gx, gy - 2, gz, B.chest, false);
        chests.push({ x: gx, y: gy - 2, z: gz, table: "ruina" });
      }
    }
  }

  // minas abandonadas: corredores com vigas de madeira, tochas e baús
  for (let mrx = Math.floor((x0 - 70) / 64); mrx <= Math.floor((x0 + CHUNK) / 64); mrx++) {
    for (let mrz = Math.floor((z0 - 40) / 64); mrz <= Math.floor((z0 + CHUNK + 40) / 64); mrz++) {
      if (rand01(seed + 701, mrx, 0, mrz) > 0.4) continue;
      const ox = mrx * 64 + 8 + Math.floor(rand01(seed + 702, mrx, 1, mrz) * 40);
      const oz = mrz * 64 + 20 + Math.floor(rand01(seed + 703, mrx, 2, mrz) * 24);
      const my = 10 + Math.floor(rand01(seed + 704, mrx, 3, mrz) * 8);
      if (columnInfo(seed, ox, oz).h < my + 9) continue;
      const corridor = (ax: number, az: number, along: "x" | "z", len: number, k0: number) => {
        for (let t = 0; t <= len; t++) {
          const px = along === "x" ? ax + t : ax;
          const pz = along === "z" ? az + t : az;
          for (let w = -1; w <= 1; w++) {
            const wx = along === "x" ? px : px + w;
            const wz = along === "x" ? pz + w : pz;
            if (wx < x0 - 1 || wx > x0 + CHUNK || wz < z0 - 1 || wz > z0 + CHUNK) continue;
            put(wx, my, wz, B.cobble, false);
            for (let y = my + 1; y <= my + 3; y++) put(wx, y, wz, B.air, false);
            if ((t + k0) % 4 === 0) {
              if (Math.abs(w) === 1) for (let y = my + 1; y <= my + 3; y++) put(wx, y, wz, B.log, false);
              else put(wx, my + 3, wz, B.planks, false);
              if (Math.abs(w) === 1) put(wx, my + 3, wz, B.planks, false);
            } else if ((t + k0) % 4 === 2 && w === 1 && (t + k0) % 8 === 2) put(wx, my + 2, wz, B.torch, false);
          }
        }
      };
      corridor(ox, oz, "x", 56, 0);
      for (let k = 1; k <= 3; k++) corridor(ox + k * 14, oz - 18, "z", 36, k);
      const cx = ox + 40;
      const cz = oz + 1;
      if (cx >= x0 && cx < x0 + CHUNK && cz >= z0 && cz < z0 + CHUNK) {
        put(cx, my + 1, cz, B.chest, false);
        chests.push({ x: cx, y: my + 1, z: cz, table: "ruina" });
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

  // monumentos bíblicos gigantes (Arca, Babel, Jericó…): nivelam o terreno, escavam o mar (baleia) e constroem
  for (const lm of landmarks) {
    const def = LANDMARKS[lm.id];
    if (lm.x + def.rx < x0 || lm.x - def.rx >= x0 + CHUNK || lm.z + def.rz < z0 || lm.z - def.rz >= z0 + CHUNK) continue;
    const gy = lm.gy;
    maxY = Math.max(maxY, Math.min(WORLD_H - 1, gy + def.H));
    const surface = columnInfo(seed, lm.x, lm.z).biome === "deserto" ? B.sand : B.grass;
    for (let lz = 0; lz < CHUNK; lz++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        const dx = x0 + lx - lm.x;
        const dz = z0 + lz - lm.z;
        if (Math.abs(dx) > def.rx || Math.abs(dz) > def.rz) continue;
        const hc = heights[lx + lz * CHUNK];
        const top = Math.min(WORLD_H - 1, Math.max(hc, gy) + def.H);
        const rr = Math.hypot(dx, dz);
        if (def.pool && rr <= def.pool.r) {
          const floor = Math.max(1, gy - def.pool.depth - 1);
          for (let y = Math.min(hc, floor); y <= floor; y++) data[idx(lx, y, lz)] = y === 0 ? B.bedrock : B.sand;
          for (let y = floor + 1; y < gy; y++) data[idx(lx, y, lz)] = def.pool.red ? B.red_water : B.water;
          for (let y = gy; y <= top; y++) data[idx(lx, y, lz)] = B.air;
        } else {
          for (let y = Math.min(hc, gy) + 1; y < gy; y++) data[idx(lx, y, lz)] = B.cobble;
          data[idx(lx, gy, lz)] = def.pool && rr <= def.pool.r + 3 ? B.sand : surface;
          for (let y = gy + 1; y <= top; y++) data[idx(lx, y, lz)] = B.air;
        }
      }
    }
    const lseed = Math.abs(lm.x * 73856093 + lm.z * 19349663) % 2147483647;
    def.build({
      set: (dx, dy, dz, id) => put(lm.x + dx, gy + dy, lm.z + dz, id, false),
      fill: (a, b, c, d, e, f, id) => {
        for (let X = Math.max(a, x0 - lm.x); X <= Math.min(d, x0 + CHUNK - 1 - lm.x); X++) {
          for (let Z = Math.max(c, z0 - lm.z); Z <= Math.min(f, z0 + CHUNK - 1 - lm.z); Z++) {
            for (let Y = b; Y <= e; Y++) put(lm.x + X, gy + Y, lm.z + Z, id, false);
          }
        }
      },
      chest: (dx, dy, dz, table) => {
        const wx = lm.x + dx;
        const wz = lm.z + dz;
        put(wx, gy + dy, wz, B.chest, false);
        if (wx >= x0 && wx < x0 + CHUNK && wz >= z0 && wz < z0 + CHUNK) chests.push({ x: wx, y: gy + dy, z: wz, table });
      },
      rnd: (i) => rand01(lseed, i, 0, 0),
    });
  }

  return { data, maxY: Math.min(WORLD_H - 1, maxY + 1), chests };
}
