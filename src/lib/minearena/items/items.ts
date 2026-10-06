// Itens do MINEARENA (data-driven). Blocos viram itens automaticamente.
import { BLOCKS, type ToolType } from "../blocks/blocks";

export type Rarity = "comum" | "incomum" | "raro" | "epico" | "lendario" | "mitico";
export const RARITY_LABEL: Record<Rarity, string> = { comum: "Comum", incomum: "Incomum", raro: "Raro", epico: "Épico", lendario: "Lendário", mitico: "Mítico" };
export const RARITY_COLOR: Record<Rarity, string> = { comum: "#c9c9c9", incomum: "#5fd35f", raro: "#4aa3ff", epico: "#b362ff", lendario: "#ffb02e", mitico: "#ff4d6d" };

export type ItemKind = "block" | "material" | "tool" | "weapon" | "armor" | "food" | "ranged" | "ammo" | "shield";

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
  /** Poção: efeito, duração e cura imediata. */
  potion?: { kind: "heal" | "poison" | "slow" | "regen" | "strength" | "swift" | "resist"; secs: number; heal?: number };
  /** Usos até quebrar (ausente = não quebra). */
  durability?: number;
  /** Escudo: fração do dano de frente que ele segura. */
  shield?: { block: number };
  ranged?: { ammo: string; dmg: number; speed: number; cooldown: number; gravity: number; shape: "arrow" | "stone" };
}

export const ITEMS: Record<string, ItemDef> = {};
type NewItem = Omit<ItemDef, "maxStack" | "rarity"> & { maxStack?: number; rarity?: Rarity };
const add = (d: NewItem) => {
  ITEMS[d.key] = { maxStack: d.kind === "tool" || d.kind === "weapon" || d.kind === "armor" || d.kind === "ranged" || d.kind === "shield" ? 1 : 64, rarity: "comum", ...d };
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
mat("sulfur", "Enxofre", "🟡", 0xd9c93a, "incomum");
mat("ember_shard", "Brasa de Hinom", "🔸", 0xff8a1f, "raro");
add({ key: "ember_brand", name: "Tição do altar", kind: "tool", icon: "🔥", color: 0xff7a1a, rarity: "raro", maxStack: 1 });
add({ key: "bucket", name: "Balde de ferro", kind: "tool", icon: "🪣", color: 0xc9ced6, rarity: "incomum", maxStack: 1 });
add({ key: "bucket_water", name: "Balde com água", kind: "tool", icon: "🪣", color: 0x3a76d6, rarity: "incomum", maxStack: 1 });
add({ key: "bucket_lava", name: "Balde com lava", kind: "tool", icon: "🪣", color: 0xff6a1a, rarity: "raro", maxStack: 1 });
mat("feather", "Pena", "🪶", 0xf2f2f2);
mat("dung", "Esterco", "💩", 0x6a4a2a);
mat("herb", "Erva do campo", "🌿", 0x5da13a);
add({ key: "vial", name: "Frasco de barro", kind: "material", icon: "🏺", color: 0xb06a3a, maxStack: 16 });
const potion = (key: string, name: string, color: number, p: NonNullable<ItemDef["potion"]>) => add({ key, name, kind: "material", icon: "🧪", color, rarity: "incomum", maxStack: 8, potion: p });
potion("potion_heal", "Bálsamo de Gileade", 0xe0405a, { kind: "heal", secs: 0, heal: 10 });
potion("potion_regen", "Óleo da Alegria", 0x3fd68a, { kind: "regen", secs: 40 });
potion("potion_strength", "Força de Sansão", 0xd9533a, { kind: "strength", secs: 90 });
potion("potion_swift", "Pés de Gazela", 0xf0c93a, { kind: "swift", secs: 90 });
potion("potion_resist", "Escudo do Senhor", 0x4aa3ff, { kind: "resist", secs: 90 });
add({ key: "compass", name: "Bússola do peregrino", kind: "tool", icon: "🧭", color: 0xd7dce4, rarity: "incomum", maxStack: 1 });
add({ key: "clock", name: "Relógio de Acaz", kind: "tool", icon: "🕰️", color: 0xf0c93a, rarity: "incomum", maxStack: 1 });
add({ key: "map", name: "Mapa de pergaminho", kind: "tool", icon: "🗺️", color: 0xe8d9b0, rarity: "incomum", maxStack: 1 });
add({ key: "fishing_rod", name: "Vara de pescar", kind: "tool", icon: "🎣", color: 0x9b6b3a, rarity: "incomum", maxStack: 1 });

// ---- comida ----
const food = (key: string, name: string, icon: string, color: number, hunger: number, heal: number, rarity: Rarity = "comum") =>
  add({ key, name, kind: "food", icon, color, rarity, food: { hunger, heal } });
food("bread", "Pão", "🍞", 0xc98b3c, 5, 1);
food("apple", "Maçã", "🍎", 0xd63a3a, 3, 1);
food("meat", "Carne crua", "🥩", 0xc4504a, 2, 0);
food("cooked_meat", "Carne assada", "🍖", 0x9a5a2b, 8, 2, "incomum");
food("dates", "Tâmaras", "🌴", 0x8a4a22, 3, 1);
food("fish", "Peixe cru", "🐟", 0x7ea2c4, 2, 0);
food("cooked_fish", "Peixe assado", "🐟", 0xc98b5c, 7, 2, "incomum");

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
add({ key: "sword_spirit", name: "Espada do Espírito", kind: "weapon", icon: "🗡️", color: 0xfff2b0, rarity: "mitico", weapon: { dmg: 18, cooldown: 0.4, reach: 3.8 } });
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

// Armadura de Deus (Ef 6.13-17): recompensa de quem vence o Adversário
for (const [slot, key, name, icon, def] of [
  [0, "helmet_god", "Capacete da Salvação", "⛑️", 4],
  [1, "chest_god", "Couraça da Justiça", "🦺", 7],
  [2, "legs_god", "Cinto da Verdade", "👖", 6],
  [3, "boots_god", "Calçado do Evangelho", "👢", 4],
] as const) {
  add({ key, name, kind: "armor", icon, color: 0xf6d36a, rarity: "mitico", armor: { slot, def } });
}

// ---- escudos (Ef 6.16: "o escudo da fé") ----
const SHIELDS = [
  { id: "wood", label: "de madeira", color: 0xb88a52, block: 0.7, dur: 160, rarity: "comum" as Rarity },
  { id: "iron", label: "de ferro", color: 0xd7dce4, block: 0.8, dur: 340, rarity: "incomum" as Rarity },
  { id: "sapphire", label: "de safira", color: 0x3b82f6, block: 0.9, dur: 700, rarity: "epico" as Rarity },
];
for (const s of SHIELDS) add({ key: `shield_${s.id}`, name: `Escudo ${s.label}`, kind: "shield", icon: "🛡️", color: s.color, rarity: s.rarity, shield: { block: s.block }, durability: s.dur });
// Recompensa do Adversário: apaga todos os dardos inflamados e não quebra
add({ key: "shield_faith", name: "Escudo da Fé", kind: "shield", icon: "🛡️", color: 0xf6d36a, rarity: "mitico", shield: { block: 1 } });

// ---- durabilidade (a Armadura de Deus, a Espada do Espírito e o Escudo da Fé não quebram) ----
const TIER_DUR: Record<string, number> = { wood: 60, stone: 132, iron: 250, sapphire: 900 };
for (const t of TOOL_TIERS) {
  for (const k of ["pickaxe", "axe", "shovel", "hoe", "sword", "spear"]) ITEMS[`${k}_${t.id}`].durability = TIER_DUR[t.id];
}
ITEMS.sword_gideon.durability = 800;
ITEMS.sword_archangel.durability = 1200;
ITEMS.bow.durability = 380;
ITEMS.fishing_rod.durability = 64;
ITEMS.sling.durability = 500;
const ARMOR_DUR: Record<string, number> = { leather: 80, iron: 240, sapphire: 560 };
const SLOT_DUR = [0.8, 1.2, 1.1, 0.9];
for (const s of ARMOR_SETS) for (const p of ARMOR_PIECES) ITEMS[`${p.key}_${s.id}`].durability = Math.round(ARMOR_DUR[s.id] * SLOT_DUR[p.slot]);

export const itemDef = (key: string): ItemDef | undefined => ITEMS[key];
