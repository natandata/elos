// Comércio com os aldeões: troca de itens (o ouro é a moeda).
import type { Ingredient } from "../crafting/recipes";

export interface Trade {
  give: Ingredient;
  get: Ingredient;
}

const t = (give: string, gn: number, get: string, rn: number): Trade => ({ give: { item: give, count: gn }, get: { item: get, count: rn } });

export const TRADES: Record<string, Trade[]> = {
  // lavrador
  aldeao: [t("wheat", 8, "gold_ingot", 1), t("dung", 6, "gold_ingot", 1), t("gold_ingot", 1, "bread", 5), t("gold_ingot", 1, "torch", 6), t("gold_ingot", 2, "seeds", 12), t("gold_ingot", 1, "apple", 6)],
  // artesão
  aldeao_b: [t("leather", 4, "gold_ingot", 1), t("coal", 10, "gold_ingot", 1), t("gold_ingot", 1, "arrow", 12), t("gold_ingot", 3, "map", 1), t("gold_ingot", 4, "compass", 1), t("gold_ingot", 5, "clock", 1)],
  // pastora
  aldeao_c: [t("cooked_meat", 3, "gold_ingot", 1), t("wool", 6, "gold_ingot", 1), t("fish", 5, "gold_ingot", 1), t("gold_ingot", 1, "cooked_fish", 4), t("gold_ingot", 1, "fishing_rod", 1), t("gold_ingot", 6, "sapphire", 1)],
};
