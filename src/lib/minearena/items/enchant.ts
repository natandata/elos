// Bênçãos (encantamentos), desgaste e conserto. Tudo data-driven e puro (sem three.js).
import type { Ingredient } from "../crafting/recipes";
import type { Stack } from "./inventory";
import { type ItemDef, itemDef } from "./items";

export type EnchantKey = "zelo" | "perseveranca" | "fio" | "combate" | "abundancia" | "guarda" | "certeira";

export interface EnchantDef {
  key: EnchantKey;
  name: string;
  /** Versículo que inspira a bênção. */
  verse: string;
  effect: string;
  max: number;
  applies: (d: ItemDef) => boolean;
}

const digger = (d: ItemDef) => !!d.tool && d.tool.type !== "hoe";

export const ENCHANTS: EnchantDef[] = [
  { key: "zelo", name: "Zelo", verse: "Rm 12.11", effect: "+30% de velocidade ao quebrar por nível", max: 3, applies: (d) => !!d.tool },
  { key: "abundancia", name: "Abundância", verse: "Jo 10.10", effect: "chance de colher mais do que o normal", max: 3, applies: digger },
  { key: "fio", name: "Fio de Dois Gumes", verse: "Hb 4.12", effect: "+1,5 de dano por nível", max: 3, applies: (d) => d.kind === "weapon" },
  { key: "combate", name: "Combate Espiritual", verse: "Ef 6.12", effect: "+3 de dano contra o Maligno por nível", max: 3, applies: (d) => d.kind === "weapon" },
  { key: "certeira", name: "Flecha Certeira", verse: "Sl 127.4", effect: "+20% de dano à distância por nível", max: 3, applies: (d) => d.kind === "ranged" },
  { key: "guarda", name: "Guarda dos Anjos", verse: "Sl 91.11", effect: "+1 de defesa por nível", max: 3, applies: (d) => d.kind === "armor" },
  { key: "perseveranca", name: "Perseverança", verse: "Tg 1.12", effect: "o desgaste acontece menos vezes", max: 3, applies: (d) => d.durability !== undefined },
];
export const ENCHANT_BY_KEY = Object.fromEntries(ENCHANTS.map((e) => [e.key, e])) as Record<EnchantKey, EnchantDef>;

export const ROMAN = ["", "I", "II", "III", "IV", "V"];

export const enchantLevel = (s: Stack | null | undefined, k: EnchantKey): number => s?.ench?.[k] ?? 0;
export const isEnchanted = (s: Stack | null | undefined): boolean => !!s?.ench && Object.keys(s.ench).length > 0;

/** Bênçãos que cabem neste item (com o próximo nível ainda disponível). */
export function enchantsFor(s: Stack): EnchantDef[] {
  const d = s ? itemDef(s.item) : undefined;
  if (!s || !d) return [];
  return ENCHANTS.filter((e) => e.applies(d) && enchantLevel(s, e.key) < e.max);
}

/** Custo da bênção no próximo nível: safiras = nível + uma barra de ouro. */
export function enchantCost(s: Stack, k: EnchantKey): Ingredient[] {
  const next = enchantLevel(s, k) + 1;
  return [
    { item: "sapphire", count: next },
    { item: "gold_ingot", count: 1 },
  ];
}

/** Níveis de experiência gastos na bênção (1, 3 e 5). */
export const enchantLevelCost = (s: NonNullable<Stack>, k: EnchantKey): number => (enchantLevel(s, k) + 1) * 2 - 1;

export const maxDurability = (item: string): number => itemDef(item)?.durability ?? 0;
export const wearOf = (s: NonNullable<Stack>): number => s.wear ?? 0;
export const durabilityLeft = (s: NonNullable<Stack>): number => Math.max(0, maxDurability(s.item) - wearOf(s));
export const isWorn = (s: Stack | null | undefined): boolean => !!s && maxDurability(s.item) > 0 && wearOf(s) > 0;

/**
 * Gasta `n` usos do item. Devolve `true` se quebrou.
 * Perseverança nível L: cada uso só conta com chance 1/(L+1).
 */
export function applyWear(s: NonNullable<Stack>, n = 1, rand: () => number = Math.random): boolean {
  const max = maxDurability(s.item);
  if (max <= 0) return false;
  const lvl = enchantLevel(s, "perseveranca");
  let used = 0;
  for (let i = 0; i < n; i++) if (lvl === 0 || rand() < 1 / (lvl + 1)) used++;
  if (used === 0) return false;
  s.wear = wearOf(s) + used;
  return s.wear >= max;
}

/** Material que conserta o item (1 unidade devolve 35% da durabilidade). */
export function repairMaterial(item: string): string | null {
  const d = itemDef(item);
  if (!d || !d.durability) return null;
  if (item === "bow") return "stick";
  if (item === "sling") return "leather";
  if (item === "sword_gideon") return "gold_ingot";
  if (item === "sword_archangel") return "ember_shard";
  const suffix = item.slice(item.lastIndexOf("_") + 1);
  switch (suffix) {
    case "wood":
      return "planks";
    case "stone":
      return "cobble";
    case "iron":
      return "iron_ingot";
    case "sapphire":
      return "sapphire";
    case "leather":
      return "leather";
    default:
      return null;
  }
}
export const REPAIR_FRACTION = 0.35;

/** Quantas unidades de material faltam pra deixar o item novo. */
export function repairNeeded(s: NonNullable<Stack>): number {
  const max = maxDurability(s.item);
  return max > 0 ? Math.ceil(wearOf(s) / (max * REPAIR_FRACTION)) : 0;
}

export function repair(s: NonNullable<Stack>, units: number): void {
  const max = maxDurability(s.item);
  s.wear = Math.max(0, wearOf(s) - Math.round(max * REPAIR_FRACTION * units));
  if (s.wear === 0) delete s.wear;
}

/** Nome para mostrar, com as bênçãos. */
export function describeStack(s: NonNullable<Stack>): string {
  const d = itemDef(s.item);
  if (!d) return s.item;
  const parts = Object.entries(s.ench ?? {}).map(([k, l]) => `${ENCHANT_BY_KEY[k as EnchantKey]?.name ?? k} ${ROMAN[l as number] ?? l}`);
  const dur = d.durability ? ` · ${durabilityLeft(s)}/${d.durability}` : "";
  return `${d.name}${parts.length ? ` — ${parts.join(", ")}` : ""}${dur}`;
}
