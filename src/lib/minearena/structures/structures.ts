// Estruturas dos tempos bíblicos geradas pelo mundo: aldeia de Canaã, templo, torre de vigia e ruínas de Jericó.
import { B } from "../blocks/blocks";
import { SEA_LEVEL } from "../config/config";
import { rand01 } from "../world/noise";
import { type BiomeId, columnInfo } from "../world/worldgen";
import type { LootTable } from "./loot";

export type StructureId = "aldeia" | "templo" | "torre" | "ruina";

export interface Builder {
  set(dx: number, dy: number, dz: number, id: number): void;
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void;
  chest(dx: number, dy: number, dz: number, table: LootTable): void;
  /** Número aleatório determinístico (0–1) da estrutura. */
  rnd(i: number): number;
}

export interface StructureDef {
  id: StructureId;
  name: string;
  /** Retângulo ocupado: x de -rx a rx; z de -rzA a rzB (relativo ao centro). */
  rx: number;
  rzA: number;
  rzB: number;
  clearH: number;
  weights: Partial<Record<BiomeId, number>>;
  residents: { mob: string; dx: number; dz: number }[];
  build(b: Builder): void;
}

function house(b: Builder, cx: number, cz: number, w: number, withChest: boolean) {
  const x0 = cx - 3;
  const x1 = cx + 3;
  const z0 = cz - 3;
  const z1 = cz + 3;
  b.fill(x0, 0, z0, x1, 0, z1, B.planks);
  b.fill(x0, 1, z0, x1, 3, z1, B.air);
  for (let y = 1; y <= 3; y++) {
    b.fill(x0, y, z0, x1, y, z0, B.brick);
    b.fill(x0, y, z1, x1, y, z1, B.brick);
    b.fill(x0, y, z0, x0, y, z1, B.brick);
    b.fill(x1, y, z0, x1, y, z1, B.brick);
  }
  b.fill(x0, 4, z0, x1, 4, z1, B.planks); // terraço plano
  b.fill(x0, 5, z0, x1, 5, z0, B.brick);
  b.fill(x0, 5, z1, x1, 5, z1, B.brick);
  b.fill(x0, 5, z0, x0, 5, z1, B.brick);
  b.fill(x1, 5, z0, x1, 5, z1, B.brick);
  // porta voltada para o centro da aldeia
  if (Math.abs(cx) > Math.abs(cz)) {
    const dx = cx > 0 ? x0 : x1;
    b.fill(dx, 1, cz, dx, 2, cz, B.air);
  } else {
    const dz = cz > 0 ? z0 : z1;
    b.fill(cx, 1, dz, cx, 2, dz, B.air);
  }
  b.set(cx - 3, 2, cz + (w % 2 ? 1 : -1), B.glass);
  b.set(cx + 3, 2, cz + (w % 2 ? -1 : 1), B.glass);
  b.set(cx + (w % 2 ? 2 : -2), 1, cz + 2, B.crafting_table);
  if (withChest) b.chest(cx - 2, 1, cz - 2, "aldeia");
}

/** Horta irrigada: terra arada com trigo maduro e um canal de água no meio. */
function field(b: Builder, cx: number, cz: number) {
  b.fill(cx - 2, 0, cz - 2, cx + 2, 0, cz + 2, B.farmland);
  b.fill(cx - 2, 1, cz - 2, cx + 2, 1, cz + 2, B.wheat_3);
  b.fill(cx, 0, cz - 2, cx, 0, cz + 2, B.water);
  b.fill(cx, 1, cz - 2, cx, 1, cz + 2, B.air);
}

const STRUCTURES: Record<StructureId, StructureDef> = {
  aldeia: {
    id: "aldeia",
    name: "Aldeia de Canaã",
    rx: 17,
    rzA: 17,
    rzB: 17,
    clearH: 8,
    weights: { planicie: 4, floresta: 4, savana: 3, oasis: 2 },
    residents: [
      { mob: "aldeao", dx: 4, dz: 1 },
      { mob: "aldeao_b", dx: -4, dz: -1 },
      { mob: "aldeao_c", dx: 1, dz: 5 },
    ],
    build(b) {
      // poço no centro
      b.fill(-1, 0, -1, 1, 1, 1, B.cobble);
      b.set(0, 1, 0, B.air);
      b.fill(0, -2, 0, 0, 0, 0, B.water);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) b.fill(x, 2, z, x, 3, z, B.planks);
      b.fill(-1, 4, -1, 1, 4, 1, B.planks);
      house(b, -10, -9, 1, false);
      house(b, 10, -9, 2, true);
      house(b, -10, 9, 3, false);
      house(b, 10, 9, 4, false);
      if (b.rnd(1) > 0.4) house(b, 0, -13, 5, false);
      // o ferreiro da aldeia (1 Sm 13.20: cada um descia para afiar o seu machado)
      b.set(4, 1, -4, B.altar);
      field(b, -14, 0);
      field(b, 14, 0);
      field(b, 0, 13);
    },
  },
  templo: {
    id: "templo",
    name: "Templo do Senhor",
    rx: 10,
    rzA: 8,
    rzB: 11,
    clearH: 12,
    weights: { planicie: 2, deserto: 3, savana: 1, libano: 1 },
    residents: [
      { mob: "filisteu", dx: 4, dz: 3 },
      { mob: "filisteu", dx: -4, dz: 3 },
    ],
    build(b) {
      b.fill(-9, 0, -7, 9, 0, 7, B.limestone);
      b.fill(-2, 0, 8, 2, 0, 8, B.limestone); // degraus de entrada
      b.fill(-3, 0, 9, 3, 0, 9, B.limestone);
      b.fill(-9, 1, -7, 9, 7, 7, B.air);
      for (let y = 1; y <= 6; y++) {
        b.fill(-9, y, -7, 9, y, -7, B.limestone);
        b.fill(-9, y, 7, 9, y, 7, B.limestone);
        b.fill(-9, y, -7, -9, y, 7, B.limestone);
        b.fill(9, y, -7, 9, y, 7, B.limestone);
      }
      b.fill(-9, 7, -7, 9, 7, 7, B.limestone); // teto
      b.fill(-2, 1, 7, 2, 4, 7, B.air); // portal
      for (const x of [-3, 3]) b.fill(x, 1, 7, x, 6, 7, B.gold_block);
      for (const z of [-4, 0, 4]) {
        b.set(-9, 3, z, B.glass);
        b.set(-9, 4, z, B.glass);
        b.set(9, 3, z, B.glass);
        b.set(9, 4, z, B.glass);
      }
      // colunas do salão
      for (const x of [-5, 5]) for (const z of [0, 3, 6]) b.fill(x, 1, z, x, 6, z, B.limestone);
      // véu e Santo dos Santos
      b.fill(-8, 1, -2, 8, 6, -2, B.limestone);
      b.fill(-1, 1, -2, 1, 4, -2, B.air);
      b.set(0, 1, -6, B.gold_block);
      b.set(0, 2, -6, B.gold_block);
      b.set(-2, 1, -6, B.sapphire_ore);
      b.set(2, 1, -6, B.sapphire_ore);
      b.chest(0, 1, -4, "templo");
      b.chest(-6, 1, -6, "templo");
    },
  },
  torre: {
    id: "torre",
    name: "Torre de vigia",
    rx: 4,
    rzA: 4,
    rzB: 17,
    clearH: 16,
    weights: { planicie: 1, floresta: 1, deserto: 1, montanha: 3, libano: 3, hermom: 2, savana: 1 },
    residents: [{ mob: "filisteu", dx: 0, dz: 6 }],
    build(b) {
      b.fill(-3, 0, -3, 3, 0, 3, B.cobble);
      b.fill(-3, 1, -3, 3, 11, 3, B.cobble);
      b.fill(-2, 1, -2, 2, 11, 2, B.air);
      b.fill(-3, 12, -3, 3, 12, 3, B.cobble);
      b.fill(-3, 13, -3, 3, 13, 3, B.cobble);
      b.fill(-2, 13, -2, 2, 13, 2, B.air);
      for (const [x, z] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-3, 2], [3, -2]] as const) b.set(x, 13, z, B.air);
      b.fill(0, 1, 3, 0, 2, 3, B.air); // porta
      b.set(-3, 6, 0, B.glass);
      b.set(3, 6, 0, B.glass);
      // rampa de acesso ao topo
      for (let i = 0; i < 12; i++) b.fill(-1, 1, 4 + i, 1, 12 - i, 4 + i, B.cobble);
      b.fill(-1, 13, 3, 1, 13, 3, B.air);
      b.chest(0, 13, -1, "torre");
      b.chest(0, 1, -1, "torre");
    },
  },
  ruina: {
    id: "ruina",
    name: "Ruínas de Jericó",
    rx: 13,
    rzA: 13,
    rzB: 13,
    clearH: 8,
    weights: { deserto: 3, planicie: 1, montanha: 1, savana: 1 },
    residents: [{ mob: "filisteu", dx: 3, dz: 3 }],
    build(b) {
      for (let dx = -12; dx <= 12; dx++) {
        for (let dz = -12; dz <= 12; dz++) {
          const d = Math.hypot(dx, dz);
          if (d >= 10 && d <= 11.8) {
            const h = Math.floor(b.rnd(100 + dx * 31 + dz * 7) ** 1.6 * 6);
            if (b.rnd(300 + dx * 13 + dz * 3) < 0.28) continue;
            const mat = b.rnd(500 + dx + dz * 17) < 0.5 ? B.brick : b.rnd(700 + dx * 3 + dz) < 0.5 ? B.cobble : B.limestone;
            b.fill(dx, 0, dz, dx, h, dz, mat);
          } else if (d < 9 && b.rnd(900 + dx * 17 + dz * 5) < 0.06) b.set(dx, 1, dz, B.cobble);
        }
      }
      b.fill(-1, 0, -1, 1, 0, 1, B.limestone);
      b.chest(0, 1, 0, "ruina");
      if (b.rnd(2) > 0.7) b.set(0, 1, 1, B.gold_block);
    },
  },
};

export const STRUCTURE_BY_ID = STRUCTURES;
export const CELL = 84;

export interface StructureSpot {
  id: StructureId;
  key: string;
  ox: number;
  oz: number;
  gy: number;
  seed: number;
}

/** A célula tem uma estrutura? (determinístico pela seed) */
export function structureAt(seed: number, cx: number, cz: number): StructureSpot | null {
  if (rand01(seed + 900, cx, 0, cz) > 0.5) return null;
  const ox = cx * CELL + 14 + Math.floor(rand01(seed + 901, cx, 1, cz) * (CELL - 28));
  const oz = cz * CELL + 14 + Math.floor(rand01(seed + 902, cx, 2, cz) * (CELL - 28));
  const info = columnInfo(seed, ox, oz);
  if (info.h <= SEA_LEVEL + 1 || info.river) return null;
  const cands = (Object.values(STRUCTURES) as StructureDef[]).map((s) => ({ s, w: s.weights[info.biome] ?? 0 })).filter((c) => c.w > 0);
  if (cands.length === 0) return null;
  let roll = rand01(seed + 903, cx, 3, cz) * cands.reduce((t, c) => t + c.w, 0);
  let pick = cands[0].s;
  for (const c of cands) {
    roll -= c.w;
    if (roll <= 0) {
      pick = c.s;
      break;
    }
  }
  return { id: pick.id, key: `${cx},${cz}`, ox, oz, gy: info.h, seed: Math.floor(rand01(seed + 904, cx, 4, cz) * 2 ** 30) };
}

/** Estruturas num raio (em blocos) ao redor de um ponto. */
export function structuresNear(seed: number, x: number, z: number, range: number): StructureSpot[] {
  const out: StructureSpot[] = [];
  for (let cx = Math.floor((x - range) / CELL); cx <= Math.floor((x + range) / CELL); cx++) {
    for (let cz = Math.floor((z - range) / CELL); cz <= Math.floor((z + range) / CELL); cz++) {
      const s = structureAt(seed, cx, cz);
      if (s && Math.hypot(s.ox - x, s.oz - z) <= range) out.push(s);
    }
  }
  return out;
}
