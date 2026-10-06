// Receitas do MINEARENA (data-driven). `station: "bancada"` exige uma Bancada por perto.
import { MATS } from "../blocks/blocks";
import { ARMOR_PIECES, ARMOR_SETS, TIER_MATERIAL, TOOL_TIERS } from "../items/items";

export type Ingredient = { item: string; count: number };
export interface Recipe {
  id: string;
  result: Ingredient;
  ingredients: Ingredient[];
  station?: "bancada";
}

const R: Recipe[] = [];
const rec = (result: string, count: number, ingredients: Ingredient[], station?: "bancada") => {
  R.push({ id: `${result}#${R.length}`, result: { item: result, count }, ingredients, station });
};
const i = (item: string, count = 1): Ingredient => ({ item, count });

// básico (sem bancada)
rec("planks", 4, [i("log")]);
rec("planks", 4, [i("cedar_log")]);
rec("stick", 4, [i("planks", 2)]);
rec("crafting_table", 1, [i("planks", 4)]);
rec("pebble", 8, [i("cobble")]);
rec("bread", 1, [i("wheat", 3)]);
rec("arrow", 4, [i("stick"), i("coal")]);
rec("torch", 4, [i("coal"), i("stick")]);
rec("door_b", 1, [i("planks", 6)]);
rec("ladder_0", 3, [i("stick", 7)]);
for (const m of MATS) {
  rec(`slab_${m}`, 6, [i(m, 3)]);
  rec(`stairs_${m}_0`, 4, [i(m, 6)]);
}
rec("sandstone", 1, [i("sand", 4)]);

// com bancada
for (const t of TOOL_TIERS) {
  const m = TIER_MATERIAL[t.id];
  rec(`pickaxe_${t.id}`, 1, [i(m, 3), i("stick", 2)], "bancada");
  rec(`axe_${t.id}`, 1, [i(m, 3), i("stick", 2)], "bancada");
  rec(`hoe_${t.id}`, 1, [i(m, 2), i("stick", 2)], "bancada");
  rec(`shovel_${t.id}`, 1, [i(m, 1), i("stick", 2)], "bancada");
  rec(`sword_${t.id}`, 1, [i(m, 2), i("stick", 1)], "bancada");
  rec(`spear_${t.id}`, 1, [i(m, 1), i("stick", 3)], "bancada");
}
const ARMOR_COST = [5, 8, 7, 4];
for (const s of ARMOR_SETS) {
  const m = s.id === "leather" ? "leather" : s.id === "iron" ? "iron_ingot" : "sapphire";
  for (const p of ARMOR_PIECES) rec(`${p.key}_${s.id}`, 1, [i(m, ARMOR_COST[p.slot])], "bancada");
}
rec("brick", 4, [i("dirt", 2), i("sand", 2)], "bancada");
rec("bed", 1, [i("wool", 3), i("planks", 3)], "bancada");
rec("arrow", 4, [i("stick"), i("feather")]);
rec("bucket", 1, [i("iron_ingot", 3)], "bancada");
rec("cedar_planks", 4, [i("cedar_log")]);
rec("ember_brand", 1, [i("coal"), i("iron_ingot")], "bancada");
rec("chest", 1, [i("planks", 8)], "bancada");
rec("furnace", 1, [i("cobble", 8)], "bancada");
rec("altar", 1, [i("iron_ingot", 4), i("cobble", 4), i("gold_ingot")], "bancada");
rec("shield_wood", 1, [i("planks", 6), i("iron_ingot")], "bancada");
rec("shield_iron", 1, [i("iron_ingot", 6), i("planks", 2)], "bancada");
rec("shield_sapphire", 1, [i("sapphire", 4), i("iron_ingot", 2)], "bancada");
rec("limestone", 4, [i("sandstone", 4)], "bancada");
rec("gold_block", 1, [i("gold_ingot", 4)], "bancada");
rec("bow", 1, [i("stick", 3), i("wool", 3)], "bancada");
rec("sling", 1, [i("leather", 2), i("stick"), i("sapphire")], "bancada");
rec("sword_gideon", 1, [i("sapphire", 2), i("gold_ingot", 2), i("stick")], "bancada");

export const RECIPES: Recipe[] = R;
