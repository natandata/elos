// Geena, o Vale de Hinom: a dimensão de fogo. Cavernas de rocha calcinada, mar de lava, fortalezas e o trono do Adversário.
import { B } from "../blocks/blocks";
import { CHUNK, WORLD_H } from "../config/config";
import type { LootTable } from "../structures/loot";
import type { Builder } from "../structures/structures";
import { fbm2, noise2, rand01 } from "./noise";

export const GEENA_LAVA = 18;
/** Onde o jogador chega (portal de volta) e onde fica o trono de Satanás. */
export const GEENA_ARRIVAL = { x: 0, z: 0, floorY: 24 };
export const ARENA = { x: 170, z: 0, floorY: 22, radius: 20 };

export interface GeenaChest {
  x: number;
  y: number;
  z: number;
  table: LootTable;
}

const idx = (x: number, y: number, z: number) => x + z * CHUNK + y * CHUNK * CHUNK;

export function geenaFloor(seed: number, x: number, z: number): number {
  const n = fbm2(seed + 701, x / 64, z / 64, 3);
  return Math.max(6, Math.min(44, Math.floor(4 + (n - 0.2) * 70)));
}
export function geenaCeiling(seed: number, x: number, z: number, floor: number): number {
  const n = fbm2(seed + 702, x / 55, z / 55, 3);
  return Math.max(floor + 10, Math.min(58, Math.floor(58 - n * 26)));
}

// ---- fortalezas ----
export interface GeenaFortress {
  key: string;
  ox: number;
  oz: number;
  gy: number;
  seed: number;
}
const FCELL = 88;

export function fortressAt(seed: number, cx: number, cz: number): GeenaFortress | null {
  if (rand01(seed + 950, cx, 0, cz) > 0.55) return null;
  const ox = cx * FCELL + 16 + Math.floor(rand01(seed + 951, cx, 1, cz) * (FCELL - 32));
  const oz = cz * FCELL + 16 + Math.floor(rand01(seed + 952, cx, 2, cz) * (FCELL - 32));
  if (Math.hypot(ox - GEENA_ARRIVAL.x, oz - GEENA_ARRIVAL.z) < 36 || Math.hypot(ox - ARENA.x, oz - ARENA.z) < 56) return null;
  const gy = Math.max(21, geenaFloor(seed, ox, oz));
  return { key: `g${cx},${cz}`, ox, oz, gy, seed: Math.floor(rand01(seed + 953, cx, 3, cz) * 2 ** 30) };
}

export function fortressesNear(seed: number, x: number, z: number, range: number): GeenaFortress[] {
  const out: GeenaFortress[] = [];
  for (let cx = Math.floor((x - range) / FCELL); cx <= Math.floor((x + range) / FCELL); cx++) {
    for (let cz = Math.floor((z - range) / FCELL); cz <= Math.floor((z + range) / FCELL); cz++) {
      const f = fortressAt(seed, cx, cz);
      if (f && Math.hypot(f.ox - x, f.oz - z) <= range) out.push(f);
    }
  }
  return out;
}

export const FORTRESS_RESIDENTS = [
  { mob: "demonio", dx: 3, dz: 3 },
  { mob: "demonio", dx: -3, dz: 2 },
  { mob: "demonio", dx: 0, dz: -3 },
];

function buildFortress(b: Builder): void {
  b.fill(-7, 0, -7, 7, 0, 7, B.basalt_brick);
  b.fill(-7, 1, -7, 7, 9, 7, B.air);
  for (let y = 1; y <= 5; y++) {
    b.fill(-7, y, -7, 7, y, -7, B.basalt_brick);
    b.fill(-7, y, 7, 7, y, 7, B.basalt_brick);
    b.fill(-7, y, -7, -7, y, 7, B.basalt_brick);
    b.fill(7, y, -7, 7, y, 7, B.basalt_brick);
  }
  for (let x = -7; x <= 7; x += 2) {
    b.set(x, 6, -7, B.basalt_brick);
    b.set(x, 6, 7, B.basalt_brick);
  }
  for (let z = -7; z <= 7; z += 2) {
    b.set(-7, 6, z, B.basalt_brick);
    b.set(7, 6, z, B.basalt_brick);
  }
  for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7]] as const) {
    b.fill(x - 1, 1, z - 1, x + 1, 9, z + 1, B.basalt_brick);
    b.set(x, 10, z, B.ember_block);
  }
  b.fill(-1, 1, 7, 1, 3, 7, B.air); // portão
  b.fill(0, 0, -1, 0, 0, 1, B.ember_block);
  b.chest(0, 1, -5, "fortaleza");
  b.chest(-5, 1, 4, "fortaleza");
}

export function generateGeena(seed: number, cx: number, cz: number): { data: Uint8Array; maxY: number; chests: GeenaChest[] } {
  const data = new Uint8Array(CHUNK * CHUNK * WORLD_H);
  const x0 = cx * CHUNK;
  const z0 = cz * CHUNK;
  let maxY = 0;
  const chests: GeenaChest[] = [];
  const floors = new Int16Array(CHUNK * CHUNK);

  for (let lz = 0; lz < CHUNK; lz++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const wx = x0 + lx;
      const wz = z0 + lz;
      let f = geenaFloor(seed, wx, wz);
      let c = geenaCeiling(seed, wx, wz, f);
      let lavaTop = GEENA_LAVA;
      const da = Math.hypot(wx - ARENA.x, wz - ARENA.z);
      if (da <= 30) {
        // arena do trono: plataforma elevada, fosso de lava e teto alto
        c = Math.max(c, 60);
        if (da <= ARENA.radius) f = ARENA.floorY;
        else if (da <= 24) {
          f = 19;
          lavaTop = 21;
        } else f = Math.round(ARENA.floorY + (f - ARENA.floorY) * ((da - 24) / 6));
        // pontes nos quatro pontos cardeais
        if (da > ARENA.radius - 1 && da <= 26 && (Math.abs(wx - ARENA.x) <= 1 || Math.abs(wz - ARENA.z) <= 1)) {
          f = ARENA.floorY;
          lavaTop = 0;
        }
      }
      const dr = Math.hypot(wx - GEENA_ARRIVAL.x, wz - GEENA_ARRIVAL.z);
      if (dr <= 9) {
        f = GEENA_ARRIVAL.floorY;
        c = Math.max(c, 40);
      }
      // colunas e estalactites
      const pillar = noise2(seed + 703, wx / 9, wz / 9) > 0.8 && da > 30 && dr > 12;
      const stalac = noise2(seed + 704, wx / 6, wz / 6) > 0.78 ? 2 + Math.floor(rand01(seed + 705, wx, 0, wz) * 7) : 0;
      floors[lx + lz * CHUNK] = f;

      data[idx(lx, 0, lz)] = B.bedrock;
      for (let y = 1; y < f; y++) {
        let id = B.basalt;
        const r = rand01(seed + 706, wx, y, wz);
        if (r < 0.018) id = B.sulfur_ore;
        else if (r < 0.0235) id = B.gold_ore;
        else if (r < 0.0275) id = B.sapphire_ore;
        else if (r < 0.031 && y < 16) id = B.lava;
        data[idx(lx, y, lz)] = id;
      }
      data[idx(lx, f, lz)] = f <= lavaTop || da <= ARENA.radius ? B.basalt : B.ash;
      if (da <= ARENA.radius) data[idx(lx, f, lz)] = B.basalt_brick;
      if (f - 1 > 0 && da > ARENA.radius) data[idx(lx, f - 1, lz)] = B.ash;
      for (let y = f + 1; y <= lavaTop; y++) data[idx(lx, y, lz)] = B.lava;
      for (let y = c; y <= 62; y++) data[idx(lx, y, lz)] = B.basalt;
      data[idx(lx, WORLD_H - 1, lz)] = B.bedrock;
      if (pillar) for (let y = f + 1; y < c; y++) data[idx(lx, y, lz)] = B.basalt;
      if (stalac > 0) for (let y = c - 1; y >= Math.max(f + 2, c - stalac); y--) data[idx(lx, y, lz)] = B.basalt;
      if (rand01(seed + 707, wx, c, wz) < 0.014 && c - 1 > f + 2) data[idx(lx, c - 1, lz)] = B.ember_block;
      maxY = Math.max(maxY, 62, f);
    }
  }

  const put = (wx: number, y: number, wz: number, id: number) => {
    const lx = wx - x0;
    const lz = wz - z0;
    if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 1 || y >= WORLD_H - 1) return;
    data[idx(lx, y, lz)] = id;
  };

  // ---- portal de volta (plataforma de chegada) ----
  if (Math.abs(x0 - GEENA_ARRIVAL.x) < 24 && Math.abs(z0 - GEENA_ARRIVAL.z) < 24) {
    const gy = GEENA_ARRIVAL.floorY;
    for (let dx = -8; dx <= 8; dx++) {
      for (let dz = -8; dz <= 8; dz++) {
        if (Math.hypot(dx, dz) > 8.5) continue;
        for (let y = gy + 1; y <= gy + 9; y++) put(dx, y, dz, B.air);
        put(dx, gy, dz, Math.hypot(dx, dz) > 7 ? B.obsidian : B.basalt_brick);
      }
    }
    for (let y = gy + 1; y <= gy + 5; y++) {
      for (let dx = -1; dx <= 2; dx++) {
        const edge = y === gy + 1 || y === gy + 5 || dx === -1 || dx === 2;
        put(dx, y, 4, edge ? B.obsidian : B.portal);
      }
    }
    for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]] as const) {
      put(dx, gy + 1, dz, B.ember_block);
      put(dx, gy + 2, dz, B.ember_block);
    }
  }

  // ---- arena de Satanás: pilares, trono e fosso ----
  if (Math.abs(x0 - ARENA.x) < 40 && Math.abs(z0 - ARENA.z) < 40) {
    const gy = ARENA.floorY;
    for (let dx = -28; dx <= 28; dx++) {
      for (let dz = -28; dz <= 28; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= 27) for (let y = gy + 1; y <= 58; y++) put(ARENA.x + dx, y, ARENA.z + dz, B.air);
      }
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const px = ARENA.x + Math.round(Math.cos(a) * 15);
      const pz = ARENA.z + Math.round(Math.sin(a) * 15);
      for (let y = gy + 1; y <= gy + 9; y++) put(px, y, pz, B.basalt_brick);
      put(px, gy + 10, pz, B.ember_block);
    }
    // trono
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) put(ARENA.x + dx, gy + 1, ARENA.z + dz, B.obsidian);
    for (let dz = -1; dz <= 1; dz++) for (let y = gy + 2; y <= gy + 8; y++) put(ARENA.x + 3, y, ARENA.z + dz, B.obsidian);
    put(ARENA.x + 3, gy + 9, ARENA.z, B.ember_block);
    // faróis de brasa vistos de longe
    for (const [dx, dz] of [[-22, -22], [22, -22], [-22, 22], [22, 22]] as const) for (let y = gy; y <= 56; y++) if (y % 3 !== 0) put(ARENA.x + dx, y, ARENA.z + dz, B.ember_block);
  }

  // ---- fortalezas ----
  for (let fcx = Math.floor((x0 - 20) / FCELL); fcx <= Math.floor((x0 + CHUNK + 20) / FCELL); fcx++) {
    for (let fcz = Math.floor((z0 - 20) / FCELL); fcz <= Math.floor((z0 + CHUNK + 20) / FCELL); fcz++) {
      const f = fortressAt(seed, fcx, fcz);
      if (!f) continue;
      if (f.ox + 9 < x0 || f.ox - 9 >= x0 + CHUNK || f.oz + 9 < z0 || f.oz - 9 >= z0 + CHUNK) continue;
      const gy = f.gy;
      for (let lz = 0; lz < CHUNK; lz++) {
        for (let lx = 0; lx < CHUNK; lx++) {
          const dx = x0 + lx - f.ox;
          const dz = z0 + lz - f.oz;
          if (Math.abs(dx) > 9 || Math.abs(dz) > 9) continue;
          const fl = floors[lx + lz * CHUNK];
          for (let y = Math.min(fl, gy) + 1; y < gy; y++) data[idx(lx, y, lz)] = B.basalt;
          data[idx(lx, gy, lz)] = B.ash;
          for (let y = gy + 1; y <= Math.min(WORLD_H - 3, gy + 14); y++) data[idx(lx, y, lz)] = B.air;
        }
      }
      buildFortress({
        set: (dx, dy, dz, id) => put(f.ox + dx, gy + dy, f.oz + dz, id),
        fill: (a, b2, c2, d2, e2, f2, id) => {
          for (let X = Math.max(a, x0 - f.ox); X <= Math.min(d2, x0 + CHUNK - 1 - f.ox); X++) {
            for (let Z = Math.max(c2, z0 - f.oz); Z <= Math.min(f2, z0 + CHUNK - 1 - f.oz); Z++) {
              for (let Y = b2; Y <= e2; Y++) put(f.ox + X, gy + Y, f.oz + Z, id);
            }
          }
        },
        chest: (dx, dy, dz, table) => {
          const wx = f.ox + dx;
          const wz = f.oz + dz;
          put(wx, gy + dy, wz, B.chest);
          if (wx >= x0 && wx < x0 + CHUNK && wz >= z0 && wz < z0 + CHUNK) chests.push({ x: wx, y: gy + dy, z: wz, table });
        },
        rnd: (i) => rand01(f.seed, i, 0, 0),
      });
    }
  }

  return { data, maxY: WORLD_H - 1, chests };
}
