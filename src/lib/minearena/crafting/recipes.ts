// Receitas do MINEARENA (data-driven). `station: "bancada"` exige uma Bancada por perto.
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
rec("stick", 4, [i("planks", 2)]);
rec("crafting_table", 1, [i("planks", 4)]);
rec("pebble", 8, [i("cobble")]);
rec("bread", 1, [i("wheat", 3)]);
rec("arrow", 4, [i("stick"), i("coal")]);
rec("sandstone", 1, [i("sand", 4)]);

// com bancada
for (const t of TOOL_TIERS) {
  const m = TIER_MATERIAL[t.id];
  rec(`pickaxe_${t.id}`, 1, [i(m, 3), i("stick", 2)], "bancada");
  rec(`axe_${t.id}`, 1, [i(m, 3), i("stick", 2)], "bancada");
  rec(`shovel_${t.id}`, 1, [i(m, 1), i("stick", 2)], "bancada");
  rec(`sword_${t.id}`, 1, [i(m, 2), i("stick", 1)], "bancada");
  rec(`spear_${t.id}`, 1, [i(m, 1), i("stick", 3)], "bancada");
}
const ARMOR_COST = [5, 8, 7, 4];
for (const s of ARMOR_SETS) {
  const m = s.id === "leather" ? "leather" : s.id === "iron" ? "iron_ingot" : "sapphire";
  for (const p of ARMOR_PIECES) rec(`${p.key}_${s.id}`, 1, [i(m, ARMOR_COST[p.slot])], "bancada");
}
rec("iron_ingot", 1, [i("raw_iron"), i("coal")], "bancada");
rec("gold_ingot", 1, [i("raw_gold"), i("coal")], "bancada");
rec("cooked_meat", 1, [i("meat"), i("coal")], "bancada");
rec("glass", 2, [i("sand", 2), i("coal")], "bancada");
rec("brick", 4, [i("cobble", 4)], "bancada");
rec("gold_block", 1, [i("gold_ingot", 4)], "bancada");
rec("bow", 1, [i("stick", 3), i("wool", 3)], "bancada");
rec("sling", 1, [i("leather", 2), i("stick"), i("sapphire")], "bancada");
rec("sword_gideon", 1, [i("sapphire", 2), i("gold_ingot", 2), i("stick")], "bancada");

export const RECIPES: Recipe[] = R;
