// Itens do MINEARENA (data-driven). Blocos viram itens automaticamente.
import { BLOCKS, type ToolType } from "../blocks/blocks";

export type Rarity = "comum" | "incomum" | "raro" | "epico" | "lendario" | "mitico";
export const RARITY_LABEL: Record<Rarity, string> = { comum: "Comum", incomum: "Incomum", raro: "Raro", epico: "Épico", lendario: "Lendário", mitico: "Mítico" };
export const RARITY_COLOR: Record<Rarity, string> = { comum: "#c9c9c9", incomum: "#5fd35f", raro: "#4aa3ff", epico: "#b362ff", lendario: "#ffb02e", mitico: "#ff4d6d" };

export type ItemKind = "block" | "material" | "tool" | "weapon" | "armor" | "food" | "ranged" | "ammo";

export interface ItemDef {
  key: string;
  name: string;
  kind: ItemKind;
  icon: string;
  color: number;
  rarity: Rarity;
  maxStack: number;
  block?: number;
  tool?: { type: ToolType; tier: number; speed: number };
  weapon?: { dmg: number; cooldown: number; reach: number };
  armor?: { slot: 0 | 1 | 2 | 3; def: number };
  food?: { hunger: number; heal: number };
  ranged?: { ammo: string; dmg: number; speed: number; cooldown: number; gravity: number; shape: "arrow" | "stone" };
}

export const ITEMS: Record<string, ItemDef> = {};
type NewItem = Omit<ItemDef, "maxStack" | "rarity"> & { maxStack?: number; rarity?: Rarity };
const add = (d: NewItem) => {
  ITEMS[d.key] = { maxStack: d.kind === "tool" || d.kind === "weapon" || d.kind === "armor" || d.kind === "ranged" ? 1 : 64, rarity: "comum", ...d };
};

// ---- blocos ----
for (const b of BLOCKS) {
  if (!b.placeable) continue;
  const rare: Rarity = b.key === "sapphire_ore" ? "epico" : b.key === "gold_ore" || b.key === "gold_block" ? "raro" : b.key === "iron_ore" ? "incomum" : "comum";
  add({ key: b.key, name: b.name, kind: "block", icon: "", color: b.top, block: b.id, rarity: rare });
}

// ---- materiais ----
const mat = (key: string, name: string, icon: string, color: number, rarity: Rarity = "comum") => add({ key, name, kind: "material", icon, color, rarity });
mat("stick", "Graveto", "🥢", 0x9b6b3a);
mat("coal", "Carvão", "⚫", 0x2b2b2e);
mat("raw_iron", "Minério de ferro bruto", "🟤", 0xc79a78, "incomum");
mat("raw_gold", "Ouro bruto", "🟡", 0xf3d34d, "raro");
mat("iron_ingot", "Barra de ferro", "🔩", 0xc9ced6, "incomum");
mat("gold_ingot", "Barra de ouro", "🟨", 0xf0c93a, "raro");
mat("sapphire", "Safira", "💎", 0x2b6fe0, "epico");
mat("leather", "Couro", "🟫", 0x8a5a33);
mat("wool", "Lã", "🧶", 0xf2f2f2);
mat("wheat", "Trigo", "🌾", 0xd9b13b);
mat("seeds", "Sementes de trigo", "🌱", 0x9ab53a);
add({ key: "bucket", name: "Balde de ferro", kind: "tool", icon: "🪣", color: 0xc9ced6, rarity: "incomum", maxStack: 1 });
add({ key: "bucket_water", name: "Balde com água", kind: "tool", icon: "🪣", color: 0x3a76d6, rarity: "incomum", maxStack: 1 });
add({ key: "bucket_lava", name: "Balde com lava", kind: "tool", icon: "🪣", color: 0xff6a1a, rarity: "raro", maxStack: 1 });
mat("feather", "Pena", "🪶", 0xf2f2f2);

// ---- comida ----
const food = (key: string, name: string, icon: string, color: number, hunger: number, heal: number, rarity: Rarity = "comum") =>
  add({ key, name, kind: "food", icon, color, rarity, food: { hunger, heal } });
food("bread", "Pão", "🍞", 0xc98b3c, 5, 1);
food("apple", "Maçã", "🍎", 0xd63a3a, 3, 1);
food("meat", "Carne crua", "🥩", 0xc4504a, 2, 0);
food("cooked_meat", "Carne assada", "🍖", 0x9a5a2b, 8, 2, "incomum");
food("dates", "Tâmaras", "🌴", 0x8a4a22, 3, 1);

// ---- ferramentas e armas por tier ----
export const TOOL_TIERS = [
  { id: "wood", label: "de madeira", tier: 1, speed: 2, mat: "planks", color: 0xb88a52, sword: 4, rarity: "comum" as Rarity },
  { id: "stone", label: "de pedra", tier: 2, speed: 3.5, mat: "cobble", color: 0x8a8a8e, sword: 5, rarity: "comum" as Rarity },
  { id: "iron", label: "de ferro", tier: 3, speed: 5.5, mat: "iron_ingot", color: 0xd7dce4, sword: 6, rarity: "incomum" as Rarity },
  { id: "sapphire", label: "de safira", tier: 4, speed: 8, mat: "sapphire", color: 0x3b82f6, sword: 8, rarity: "epico" as Rarity },
];
export const TIER_MATERIAL: Record<string, string> = Object.fromEntries(TOOL_TIERS.map((t) => [t.id, t.mat]));
for (const t of TOOL_TIERS) {
  add({ key: `pickaxe_${t.id}`, name: `Picareta ${t.label}`, kind: "tool", icon: "⛏️", color: t.color, rarity: t.rarity, tool: { type: "pick", tier: t.tier, speed: t.speed }, weapon: { dmg: 2 + t.tier, cooldown: 0.8, reach: 3 } });
  add({ key: `axe_${t.id}`, name: `Machado ${t.label}`, kind: "tool", icon: "🪓", color: t.color, rarity: t.rarity, tool: { type: "axe", tier: t.tier, speed: t.speed }, weapon: { dmg: 3 + t.tier, cooldown: 0.9, reach: 3 } });
  add({ key: `shovel_${t.id}`, name: `Pá ${t.label}`, kind: "tool", icon: "⚒️", color: t.color, rarity: t.rarity, tool: { type: "shovel", tier: t.tier, speed: t.speed }, weapon: { dmg: 1 + t.tier, cooldown: 0.8, reach: 3 } });
  add({ key: `hoe_${t.id}`, name: `Enxada ${t.label}`, kind: "tool", icon: "⚒️", color: t.color, rarity: t.rarity, tool: { type: "hoe", tier: t.tier, speed: t.speed }, weapon: { dmg: 1 + t.tier, cooldown: 0.8, reach: 3 } });
  add({ key: `sword_${t.id}`, name: `Espada ${t.label}`, kind: "weapon", icon: "🗡️", color: t.color, rarity: t.rarity, weapon: { dmg: t.sword, cooldown: 0.5, reach: 3.2 } });
  add({ key: `spear_${t.id}`, name: `Lança ${t.label}`, kind: "weapon", icon: "🔱", color: t.color, rarity: t.rarity, weapon: { dmg: t.sword - 1, cooldown: 0.7, reach: 4.4 } });
}
add({ key: "sword_gideon", name: "Espada de Gideão", kind: "weapon", icon: "⚔️", color: 0xffb02e, rarity: "lendario", weapon: { dmg: 11, cooldown: 0.45, reach: 3.4 } });
add({ key: "sword_archangel", name: "Espada do Arcanjo", kind: "weapon", icon: "🔥", color: 0xff4d6d, rarity: "mitico", weapon: { dmg: 15, cooldown: 0.4, reach: 3.6 } });

// ---- à distância ----
add({ key: "bow", name: "Arco", kind: "ranged", icon: "🏹", color: 0x9b6b3a, rarity: "incomum", ranged: { ammo: "arrow", dmg: 6, speed: 26, cooldown: 0.8, gravity: 9, shape: "arrow" } });
add({ key: "sling", name: "Funda de Davi", kind: "ranged", icon: "🥏", color: 0x8a5a33, rarity: "lendario", ranged: { ammo: "pebble", dmg: 5, speed: 32, cooldown: 0.55, gravity: 5, shape: "stone" } });
add({ key: "arrow", name: "Flecha", kind: "ammo", icon: "➳", color: 0xd7c9a6 });
add({ key: "pebble", name: "Pedra lisa", kind: "ammo", icon: "⚪", color: 0xb8b8bc });

// ---- armaduras ----
export const ARMOR_SETS = [
  { id: "leather", label: "de couro", color: 0x8a5a33, def: [1, 3, 2, 1], rarity: "comum" as Rarity },
  { id: "iron", label: "de ferro", color: 0xc9ced6, def: [2, 5, 4, 2], rarity: "incomum" as Rarity },
  { id: "sapphire", label: "de safira", color: 0x3b82f6, def: [3, 6, 5, 3], rarity: "epico" as Rarity },
];
export const ARMOR_PIECES = [
  { slot: 0 as const, key: "helmet", name: "Elmo", icon: "⛑️" },
  { slot: 1 as const, key: "chest", name: "Peitoral", icon: "🦺" },
  { slot: 2 as const, key: "legs", name: "Calças", icon: "👖" },
  { slot: 3 as const, key: "boots", name: "Botas", icon: "👢" },
];
for (const s of ARMOR_SETS) {
  for (const p of ARMOR_PIECES) {
    add({ key: `${p.key}_${s.id}`, name: `${p.name} ${s.label}`, kind: "armor", icon: p.icon, color: s.color, rarity: s.rarity, armor: { slot: p.slot, def: s.def[p.slot] } });
  }
}

export const itemDef = (key: string): ItemDef | undefined => ITEMS[key];
