// Mapas dos minigames (determinísticos pela seed): arena dos Jogos Vorazes, ilhas do Skywars e terrenos da Batalha de Construção.
import { B } from "../blocks/blocks";
import { CHUNK } from "../config/config";
import { fbm2, noise2, rand01 } from "../world/noise";
import { type Column, ChunkCtx, buildChunk, scatter, tree } from "../story/maps/builder";
import { house } from "../story/maps/gen";
import type { LootTable } from "../structures/loot";
import type { GenResult } from "../story/types";
import type { MiniGame, MiniMap } from "./types";

const C = 256; // centro de todos os mapas (coordenadas positivas)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const yawTo = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(-(tx - fx), -(tz - fz));

/** Põe um baú no mundo (e o registra para o saque) só no chunk dono da posição. */
function chest(c: ChunkCtx, x: number, y: number, z: number, table: LootTable): void {
  if (!c.inside(x, z)) return;
  c.set(x, y, z, B.chest);
  c.chests.push({ x, y, z, table });
}

// =====================================================================================================================
// JOGOS VORAZES
// =====================================================================================================================
const H = { gy: 34, water: 33, rPlat: 8.5, rLake: 32, limit: 140, pedR: 34.5 };

function hungerColumn(seed: number, x: number, z: number): Column {
  const d = Math.hypot(x - C, z - C);
  const land = 38 + (fbm2(seed, x / 36, z / 36, 3) - 0.5) * 2 * 10;
  if (d <= H.rPlat) return { h: H.gy, top: B.limestone, sub: B.stone, water: 0 };
  if (d < H.rLake) {
    const t = (d - H.rPlat) / (H.rLake - H.rPlat);
    const h = Math.round(27 + t * t * 8);
    return { h, top: B.sand, sub: B.sand, water: h < H.water ? H.water : 0 };
  }
  const b = smooth(clamp((d - 34) / 30, 0, 1));
  const h = Math.round(35 + (land - 35) * b);
  return { h, top: d < 36 ? B.sand : B.grass, sub: d < 36 ? B.sand : B.dirt, water: 0 };
}

type Site = { x: number; z: number; kind: "house" | "camp" | "chest" };
const siteCache = new Map<number, Site[]>();
/** Casas, acampamentos e baús soltos pelo mapa (iguais para todo mundo). */
function hungerSites(seed: number): Site[] {
  let s = siteCache.get(seed);
  if (s) return s;
  s = [];
  const cell = 26;
  for (let gx = 0; gx * cell < 512; gx++) {
    for (let gz = 0; gz * cell < 512; gz++) {
      const x = gx * cell + Math.floor(rand01(seed + 51, gx, 1, gz) * cell);
      const z = gz * cell + Math.floor(rand01(seed + 51, gx, 2, gz) * cell);
      const d = Math.hypot(x - C, z - C);
      if (d < 50 || d > 128) continue;
      const r = rand01(seed + 51, gx, 3, gz);
      if (r < 0.3) s.push({ x, z, kind: "house" });
      else if (r < 0.5) s.push({ x, z, kind: "camp" });
      else if (r < 0.78) s.push({ x, z, kind: "chest" });
    }
  }
  siteCache.set(seed, s);
  return s;
}

function hungerDecorate(seed: number, c: ChunkCtx): void {
  const col = (x: number, z: number) => hungerColumn(seed, x, z);
  // ---- Cornucópia: plataforma central, degraus de ouro e chifre
  for (let x = c.x0; x < c.x0 + CHUNK; x++) {
    for (let z = c.z0; z < c.z0 + CHUNK; z++) {
      const d = Math.hypot(x - C, z - C);
      if (d > H.rPlat + 0.5) continue;
      if (d <= 5.2) c.set(x, 35, z, B.limestone);
      if (d <= 3) c.set(x, 36, z, B.gold_block);
      if (d <= 1.1) for (let y = 37; y <= 41; y++) c.set(x, y, z, B.gold_block);
      if (d <= 0.5) c.set(x, 42, z, B.torch);
      // borda da plataforma em cobble (parece a mesa da Cornucópia)
      if (d > 7.6 && d <= H.rPlat) c.set(x, 35, z, B.cobble);
    }
  }
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * Math.PI) / 4;
    chest(c, Math.round(C + Math.cos(a) * 6.4), 35, Math.round(C + Math.sin(a) * 6.4), "fome_centro");
  }
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    chest(c, Math.round(C + Math.cos(a) * 4), 36, Math.round(C + Math.sin(a) * 4), "fome_centro");
  }
  // ---- 12 pontes (largura 3) sobre a água, com pilares e um baú em cada
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let s = H.rPlat - 0.5; s <= 31; s += 0.4) {
      for (let w = -1.5; w <= 1.5; w += 0.5) {
        const x = Math.round(C + ca * s - sa * w);
        const z = Math.round(C + sa * s + ca * w);
        if (!c.inside(x, z)) continue;
        c.set(x, H.gy, z, Math.abs(w) > 1.2 ? B.log : B.planks);
        if (Math.abs(w) > 1.2) c.set(x, H.gy + 1, z, B.air);
      }
    }
    for (const s of [13, 19, 25]) {
      for (const w of [-1.4, 1.4]) {
        const x = Math.round(C + ca * s - sa * w);
        const z = Math.round(C + sa * s + ca * w);
        if (!c.inside(x, z)) continue;
        for (let y = col(x, z).h + 1; y < H.gy; y++) c.set(x, y, z, B.log);
      }
    }
    chest(c, Math.round(C + ca * 19 - sa * 1.4), H.gy + 1, Math.round(C + sa * 19 + ca * 1.4), "fome_ponte");
  }
  // ---- 10 pedestais na margem
  for (let i = 0; i < 10; i++) {
    const a = ((i * 36 + 18) * Math.PI) / 180;
    const px = Math.round(C + Math.cos(a) * H.pedR);
    const pz = Math.round(C + Math.sin(a) * H.pedR);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = col(px + dx, pz + dz).h; y <= 36; y++) c.set(px + dx, y, pz + dz, y === 36 ? B.limestone : B.cobble);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = 37; y <= 40; y++) if (c.get(px + dx, y, pz + dz) !== B.air) c.set(px + dx, y, pz + dz, B.air);
  }
  // ---- casas, acampamentos e baús soltos
  const sites = hungerSites(seed);
  for (const st of sites) {
    if (st.x < c.x0 - 8 || st.x > c.x0 + CHUNK + 8 || st.z < c.z0 - 8 || st.z > c.z0 + CHUNK + 8) continue;
    const gy = col(st.x + 3, st.z + 3).h;
    if (st.kind === "house") {
      c.fill(st.x, gy - 4, st.z, st.x + 5, gy - 1, st.z + 5, B.dirt);
      house(c, st.x, gy, st.z, 6, 6, 4, B.cobble, B.planks, Math.floor(rand01(seed + 5, st.x, 1, st.z) * 4) === 0 ? 0 : 1);
      chest(c, st.x + 2, gy + 1, st.z + 2, "fome");
      chest(c, st.x + 3, gy + 1, st.z + 3, rand01(seed + 6, st.x, 2, st.z) < 0.35 ? "fome_ponte" : "fome");
    } else if (st.kind === "camp") {
      for (let a = 0; a < 8; a++) {
        const x = Math.round(st.x + Math.cos((a * Math.PI) / 4) * 2.5);
        const z = Math.round(st.z + Math.sin((a * Math.PI) / 4) * 2.5);
        c.set(x, col(x, z).h + 1, z, B.log);
      }
      c.set(st.x, col(st.x, st.z).h + 1, st.z, B.torch);
      chest(c, st.x + 1, col(st.x + 1, st.z).h + 1, st.z, "fome");
      chest(c, st.x - 1, col(st.x - 1, st.z).h + 1, st.z, "fome");
    } else {
      chest(c, st.x, col(st.x, st.z).h + 1, st.z, "fome");
    }
  }
  // ---- árvores e flores
  scatter(c, 6, 6, 11, (x, z, r) => {
    const d = Math.hypot(x - C, z - C);
    if (d < 42 || r > 0.62) return;
    for (const st of sites) if (Math.abs(st.x + 2.5 - x) < 6 && Math.abs(st.z + 2.5 - z) < 6) return;
    const k = col(x, z);
    if (k.water || k.top !== B.grass) return;
    tree(c, x, k.h, z, { trunk: 4 + Math.floor(r * 5), radius: 2, leaf: B.leaves });
  });
  for (let x = c.x0; x < c.x0 + CHUNK; x++) {
    for (let z = c.z0; z < c.z0 + CHUNK; z++) {
      const k = col(x, z);
      if (k.water || k.top !== B.grass || Math.hypot(x - C, z - C) < 40) continue;
      const r = c.rand(x, z, 3);
      if (c.get(x, k.h + 1, z) !== B.air) continue;
      if (r < 0.1) c.set(x, k.h + 1, z, B.tallgrass);
      else if (r < 0.125) c.set(x, k.h + 1, z, B.flower_red);
      else if (r < 0.14) c.set(x, k.h + 1, z, B.flower_yellow);
    }
  }
}

export function hungerMap(seed: number): MiniMap {
  const spawns = Array.from({ length: 10 }, (_, i) => {
    const a = ((i * 36 + 18) * Math.PI) / 180;
    const x = C + Math.cos(a) * H.pedR;
    const z = C + Math.sin(a) * H.pedR;
    return { x: Math.round(x) + 0.5, y: 37, z: Math.round(z) + 0.5, yaw: yawTo(x, z, C, C) };
  });
  return {
    game: "hunger",
    center: { x: C, z: C },
    spawns,
    limit: H.limit,
    voidY: -50,
    zone: [
      { wait: 80, shrink: 55, r: 105, dmg: 1 },
      { wait: 55, shrink: 45, r: 75, dmg: 1.5 },
      { wait: 45, shrink: 40, r: 48, dmg: 2 },
      { wait: 35, shrink: 35, r: 26, dmg: 3 },
      { wait: 25, shrink: 30, r: 8, dmg: 4 },
    ],
    cages: [],
    plots: [],
    time: 0.3,
    generate: (cx, cz) => buildChunk(seed, cx, cz, (x, z) => hungerColumn(seed, x, z), (c) => hungerDecorate(seed, c)),
  };
}

// =====================================================================================================================
// SKYWARS
// =====================================================================================================================
type Island = { x: number; z: number; r: number; top: number; depth: number; role: "center" | "spawn" | "mid" };

function skyIslands(): Island[] {
  const list: Island[] = [{ x: C, z: C, r: 15, top: 46, depth: 16, role: "center" }];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    list.push({ x: Math.round(C + Math.cos(a) * 50), z: Math.round(C + Math.sin(a) * 50), r: 8, top: 44, depth: 10, role: "spawn" });
  }
  for (let j = 0; j < 6; j++) {
    const a = ((30 + j * 60) * Math.PI) / 180;
    list.push({ x: Math.round(C + Math.cos(a) * 29), z: Math.round(C + Math.sin(a) * 29), r: 4.5, top: 45, depth: 7, role: "mid" });
  }
  return list;
}
const ISLANDS = skyIslands();
const SKY_SPAWNS = ISLANDS.filter((i) => i.role === "spawn");

function skyChests(): { x: number; y: number; z: number; table: LootTable }[] {
  const out: { x: number; y: number; z: number; table: LootTable }[] = [];
  for (const isl of ISLANDS) {
    const dx = C - isl.x;
    const dz = C - isl.z;
    const n = Math.hypot(dx, dz) || 1;
    const ux = dx / n;
    const uz = dz / n;
    if (isl.role === "spawn") {
      out.push({ x: Math.round(isl.x + ux * 3 - uz * 1.6), y: isl.top + 1, z: Math.round(isl.z + uz * 3 + ux * 1.6), table: "ceu" });
      out.push({ x: Math.round(isl.x + ux * 3 + uz * 1.6), y: isl.top + 1, z: Math.round(isl.z + uz * 3 - ux * 1.6), table: "ceu" });
    } else if (isl.role === "mid") out.push({ x: isl.x, y: isl.top + 1, z: isl.z, table: "ceu" });
    else {
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + 0.3;
        out.push({ x: Math.round(C + Math.cos(a) * 5), y: isl.top + 1, z: Math.round(C + Math.sin(a) * 5), table: "ceu_centro" });
      }
    }
  }
  return out;
}
const SKY_CHESTS = skyChests();

/** Altura da superfície da ilha naquela coluna (null = fora da ilha). */
function skySurface(seed: number, isl: Island, x: number, z: number): { top: number; bottom: number } | null {
  const d = Math.hypot(x - isl.x, z - isl.z);
  const reff = isl.r * (0.88 + 0.24 * noise2(seed + 3, x / 5, z / 5));
  if (d > reff) return null;
  const flat = isl.role === "spawn" && d < 3.4;
  const top = isl.top + (flat ? 0 : Math.round((fbm2(seed, x / 7, z / 7, 2) - 0.5) * 1.8));
  const f = clamp(d / reff, 0, 1);
  const bottom = top - 2 - Math.round(isl.depth * (1 - Math.pow(f, 1.5)) * (0.75 + 0.5 * noise2(seed + 9, x / 4, z / 4)));
  return { top, bottom };
}

function skyGenerate(seed: number, cx: number, cz: number): GenResult {
  const c = new ChunkCtx(cx, cz, seed);
  for (const isl of ISLANDS) {
    if (isl.x + isl.r + 5 < c.x0 || isl.x - isl.r - 5 > c.x0 + CHUNK || isl.z + isl.r + 5 < c.z0 || isl.z - isl.r - 5 > c.z0 + CHUNK) continue;
    for (let x = c.x0; x < c.x0 + CHUNK; x++) {
      for (let z = c.z0; z < c.z0 + CHUNK; z++) {
        const sf = skySurface(seed, isl, x, z);
        if (!sf) continue;
        for (let y = sf.bottom; y <= sf.top; y++) c.set(x, y, z, y === sf.top ? B.grass : y >= sf.top - 2 ? B.dirt : B.stone);
      }
    }
    // árvores pequenas (a altura vem da fórmula da ilha, então cada chunk desenha a parte que lhe cabe)
    if (isl.role !== "mid") {
      for (let t = 0; t < (isl.role === "center" ? 5 : 2); t++) {
        const a = rand01(seed + 70, isl.x, t, isl.z) * Math.PI * 2;
        const rr = (0.55 + 0.3 * rand01(seed + 71, isl.x, t, isl.z)) * isl.r;
        const x = Math.round(isl.x + Math.cos(a) * rr);
        const z = Math.round(isl.z + Math.sin(a) * rr);
        if (isl.role === "spawn" && Math.hypot(x - isl.x, z - isl.z) < 4.5) continue;
        const sf = skySurface(seed, isl, x, z);
        if (!sf) continue;
        tree(c, x, sf.top, z, { trunk: 3 + Math.floor(rand01(seed + 72, x, 1, z) * 3), radius: 2, leaf: B.leaves });
      }
    }
  }
  for (const ch of SKY_CHESTS) chest(c, ch.x, ch.y, ch.z, ch.table);
  // celas de vidro em volta de cada ponto de partida
  for (const s of SKY_SPAWNS) {
    for (let x = s.x - 1; x <= s.x + 1; x++) {
      for (let z = s.z - 1; z <= s.z + 1; z++) {
        for (let y = s.top + 1; y <= s.top + 3; y++) {
          const inner = x === s.x && z === s.z && y < s.top + 3;
          if (!inner) c.set(x, y, z, B.glass);
        }
      }
    }
  }
  return c.result();
}

export function skyMap(seed: number): MiniMap {
  return {
    game: "skywars",
    center: { x: C, z: C },
    spawns: SKY_SPAWNS.map((s) => ({ x: s.x + 0.5, y: s.top + 1.05, z: s.z + 0.5, yaw: yawTo(s.x, s.z, C, C) })),
    limit: 85,
    voidY: 12,
    zone: [
      { wait: 420, shrink: 70, r: 48, dmg: 2 },
      { wait: 50, shrink: 45, r: 20, dmg: 3 },
    ],
    cages: SKY_SPAWNS.map((s) => ({ x0: s.x - 1, y0: s.top + 1, z0: s.z - 1, x1: s.x + 1, y1: s.top + 3, z1: s.z + 1 })),
    plots: [],
    time: 0.3,
    generate: (cx, cz) => skyGenerate(seed, cx, cz),
  };
}

// =====================================================================================================================
// BATALHA DE CONSTRUÇÃO
// =====================================================================================================================
const BP = { size: 24, gap: 8, floor: 34, ceil: 58, cols: 4, rows: 2 };
const bx0 = C - Math.round((BP.cols * BP.size + (BP.cols - 1) * BP.gap) / 2);
const bz0 = C - Math.round((BP.rows * BP.size + (BP.rows - 1) * BP.gap) / 2);
const BUILD_PLOTS = Array.from({ length: BP.cols * BP.rows }, (_, i) => {
  const x = bx0 + (i % BP.cols) * (BP.size + BP.gap);
  const z = bz0 + Math.floor(i / BP.cols) * (BP.size + BP.gap);
  return { x0: x + 1, z0: z + 1, x1: x + BP.size - 2, z1: z + BP.size - 2, floorY: BP.floor, ceilY: BP.ceil, ox: x, oz: z };
});

function buildColumn(seed: number, x: number, z: number): Column {
  const inGrid = x >= bx0 - 6 && x < bx0 + BP.cols * BP.size + (BP.cols - 1) * BP.gap + 6 && z >= bz0 - 6 && z < bz0 + BP.rows * BP.size + (BP.rows - 1) * BP.gap + 6;
  if (inGrid) return { h: BP.floor, top: B.grass, sub: B.dirt, water: 0 };
  const d = Math.hypot(x - C, z - C);
  const b = smooth(clamp((d - 85) / 30, 0, 1));
  const h = Math.round(BP.floor + (fbm2(seed, x / 30, z / 30, 3) - 0.4) * 2 * 6 * b);
  return { h, top: B.grass, sub: B.dirt, water: 0 };
}

export function buildMap(seed: number): MiniMap {
  return {
    game: "build",
    center: { x: C, z: C },
    spawns: BUILD_PLOTS.map((p) => ({ x: (p.x0 + p.x1) / 2 + 0.5, y: BP.floor + 1.05, z: (p.z0 + p.z1) / 2 + 0.5, yaw: 0 })),
    limit: 150,
    voidY: -50,
    zone: [],
    cages: [],
    plots: BUILD_PLOTS.map(({ x0, z0, x1, z1, floorY, ceilY }) => ({ x0, z0, x1, z1, floorY, ceilY })),
    time: 0.3,
    generate: (cx, cz) =>
      buildChunk(seed, cx, cz, (x, z) => buildColumn(seed, x, z), (c) => {
        for (const p of BUILD_PLOTS) {
          for (let x = Math.max(c.x0, p.ox); x <= Math.min(c.x0 + CHUNK - 1, p.ox + BP.size - 1); x++) {
            for (let z = Math.max(c.z0, p.oz); z <= Math.min(c.z0 + CHUNK - 1, p.oz + BP.size - 1); z++) {
              const edge = x === p.ox || z === p.oz || x === p.ox + BP.size - 1 || z === p.oz + BP.size - 1;
              c.set(x, BP.floor, z, edge ? B.cobble : B.grass);
            }
          }
        }
        // caminhos entre os terrenos
        for (let x = c.x0; x < c.x0 + CHUNK; x++) {
          for (let z = c.z0; z < c.z0 + CHUNK; z++) {
            const inGrid = x >= bx0 && x < bx0 + BP.cols * BP.size + (BP.cols - 1) * BP.gap && z >= bz0 && z < bz0 + BP.rows * BP.size + (BP.rows - 1) * BP.gap;
            if (!inGrid) continue;
            const inPlot = BUILD_PLOTS.some((p) => x >= p.ox && x < p.ox + BP.size && z >= p.oz && z < p.oz + BP.size);
            if (!inPlot) c.set(x, BP.floor, z, B.sandstone);
          }
        }
        // árvores fora da área de jogo
        scatter(c, 9, 6, 13, (x, z, r) => {
          if (r > 0.5) return;
          const k = buildColumn(seed, x, z);
          const inGrid = x >= bx0 - 10 && x < bx0 + BP.cols * BP.size + (BP.cols - 1) * BP.gap + 10 && z >= bz0 - 10 && z < bz0 + BP.rows * BP.size + (BP.rows - 1) * BP.gap + 10;
          if (inGrid) return;
          tree(c, x, k.h, z, { trunk: 4 + Math.floor(r * 8), radius: 2, leaf: B.leaves });
        });
      }),
  };
}

export function miniMap(game: MiniGame, seed: number): MiniMap {
  return game === "hunger" ? hungerMap(seed) : game === "skywars" ? skyMap(seed) : buildMap(seed);
}
