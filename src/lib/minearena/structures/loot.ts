// Tabelas de saque dos baús das estruturas (determinísticas pela seed e pela posição).
import type { Stack } from "../items/inventory";
import { rand01 } from "../world/noise";

type Entry = { item: string; min: number; max: number; w: number };
export type LootTable = "aldeia" | "templo" | "torre" | "ruina" | "fortaleza";

const TABLES: Record<LootTable, { rolls: [number, number]; entries: Entry[] }> = {
  aldeia: {
    rolls: [4, 7],
    entries: [
      { item: "bread", min: 2, max: 5, w: 10 },
      { item: "apple", min: 2, max: 4, w: 8 },
      { item: "wheat", min: 3, max: 8, w: 8 },
      { item: "wool", min: 2, max: 5, w: 6 },
      { item: "leather", min: 1, max: 4, w: 6 },
      { item: "stick", min: 4, max: 10, w: 6 },
      { item: "coal", min: 2, max: 6, w: 6 },
      { item: "raw_iron", min: 1, max: 3, w: 3 },
      { item: "pickaxe_stone", min: 1, max: 1, w: 2 },
      { item: "helmet_leather", min: 1, max: 1, w: 2 },
    ],
  },
  templo: {
    rolls: [5, 8],
    entries: [
      { item: "gold_ingot", min: 2, max: 6, w: 8 },
      { item: "iron_ingot", min: 3, max: 8, w: 8 },
      { item: "sapphire", min: 1, max: 3, w: 4 },
      { item: "cooked_meat", min: 3, max: 6, w: 6 },
      { item: "arrow", min: 8, max: 20, w: 5 },
      { item: "bow", min: 1, max: 1, w: 3 },
      { item: "chest_iron", min: 1, max: 1, w: 2 },
      { item: "legs_iron", min: 1, max: 1, w: 2 },
      { item: "sword_iron", min: 1, max: 1, w: 2 },
      { item: "sword_gideon", min: 1, max: 1, w: 0.6 },
      { item: "obsidian", min: 4, max: 9, w: 4 },
    ],
  },
  torre: {
    rolls: [3, 6],
    entries: [
      { item: "arrow", min: 6, max: 16, w: 10 },
      { item: "pebble", min: 8, max: 20, w: 6 },
      { item: "bread", min: 2, max: 4, w: 6 },
      { item: "iron_ingot", min: 1, max: 4, w: 5 },
      { item: "coal", min: 3, max: 8, w: 6 },
      { item: "spear_stone", min: 1, max: 1, w: 3 },
      { item: "boots_iron", min: 1, max: 1, w: 1.5 },
      { item: "obsidian", min: 2, max: 5, w: 2.5 },
    ],
  },
  fortaleza: {
    rolls: [4, 7],
    entries: [
      { item: "sulfur", min: 3, max: 8, w: 8 },
      { item: "ember_shard", min: 2, max: 6, w: 8 },
      { item: "gold_ingot", min: 2, max: 6, w: 7 },
      { item: "sapphire", min: 1, max: 4, w: 6 },
      { item: "iron_ingot", min: 3, max: 8, w: 6 },
      { item: "obsidian", min: 4, max: 10, w: 5 },
      { item: "cooked_meat", min: 4, max: 8, w: 5 },
      { item: "chest_iron", min: 1, max: 1, w: 2 },
      { item: "pickaxe_sapphire", min: 1, max: 1, w: 1 },
      { item: "sword_sapphire", min: 1, max: 1, w: 1.2 },
    ],
  },
  ruina: {
    rolls: [3, 6],
    entries: [
      { item: "raw_gold", min: 1, max: 4, w: 8 },
      { item: "gold_ingot", min: 1, max: 3, w: 4 },
      { item: "sapphire", min: 1, max: 2, w: 3 },
      { item: "limestone", min: 4, max: 10, w: 6 },
      { item: "iron_ingot", min: 1, max: 3, w: 5 },
      { item: "cooked_meat", min: 2, max: 4, w: 4 },
      { item: "helmet_iron", min: 1, max: 1, w: 1.5 },
    ],
  },
};

/** Sorteia o conteúdo (27 espaços) de um baú de estrutura. */
export function rollLoot(table: LootTable, seed: number, x: number, y: number, z: number): Stack[] {
  const t = TABLES[table];
  const slots: Stack[] = Array.from({ length: 27 }, () => null);
  const total = t.entries.reduce((s, e) => s + e.w, 0);
  const n = t.rolls[0] + Math.floor(rand01(seed + 31, x, y, z) * (t.rolls[1] - t.rolls[0] + 1));
  for (let i = 0; i < n; i++) {
    let pick = rand01(seed + 32 + i, x, y, z) * total;
    let e = t.entries[0];
    for (const c of t.entries) {
      pick -= c.w;
      if (pick <= 0) {
        e = c;
        break;
      }
    }
    const count = e.min + Math.floor(rand01(seed + 70 + i, x, y, z) * (e.max - e.min + 1));
    const slot = Math.floor(rand01(seed + 110 + i, x, y, z) * 27);
    for (let k = 0; k < 27; k++) {
      const idx = (slot + k) % 27;
      if (!slots[idx]) {
        slots[idx] = { item: e.item, count };
        break;
      }
    }
  }
  return slots;
}
