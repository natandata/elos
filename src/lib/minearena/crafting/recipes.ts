// Receitas do MINEARENA (data-driven). `station: "bancada"` exige uma Bancada por perto.
import { MATS } from "../blocks/blocks";
import { ARMOR_PIECES, ARMOR_SETS, TIER_MATERIAL, TOOL_TIERS } from "../items/items";

export type Ingredient = { item: string; count: number };
export interface Recipe {
  id: string;
  result: Ingredient;
  ingredients: Ingredient[];
  station?: "bancada";
  /** Receita com formato (grade): linhas com letras e a legenda de cada letra. Sem isso, vale qualquer disposição. */
  pattern?: { rows: string[]; key: Record<string, string> };
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
rec("sign_0", 3, [i("planks", 6), i("stick")]);
rec("fishing_rod", 1, [i("stick", 3), i("wool", 2)]);
rec("map", 1, [i("leather"), i("coal"), i("stick")]);
rec("compass", 1, [i("iron_ingot", 4), i("gold_ingot")], "bancada");
rec("clock", 1, [i("gold_ingot", 4), i("sapphire")], "bancada");
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
rec("shield_iron", 1, [i("iron_ingot", 6), i("planks", 1)], "bancada");
rec("shield_sapphire", 1, [i("sapphire", 4), i("iron_ingot", 2)], "bancada");
rec("limestone", 4, [i("sandstone", 4)], "bancada");
rec("gold_block", 1, [i("gold_ingot", 4)], "bancada");
rec("bow", 1, [i("stick", 3), i("wool", 3)], "bancada");
rec("sling", 1, [i("leather", 2), i("stick"), i("sapphire")], "bancada");
rec("sword_gideon", 1, [i("sapphire", 2), i("gold_ingot", 2), i("stick")], "bancada");

// ---- formatos da grade de fabricação ----
const setPat = (result: string, rows: string[], key: Record<string, string>) => {
  const r = R.find((x) => x.result.item === result && !x.pattern);
  if (r) r.pattern = { rows, key };
};
for (const t of TOOL_TIERS) {
  const k = { M: TIER_MATERIAL[t.id], S: "stick" };
  setPat(`pickaxe_${t.id}`, ["MMM", " S ", " S "], k);
  setPat(`axe_${t.id}`, ["MM", "MS", " S"], k);
  setPat(`shovel_${t.id}`, ["M", "S", "S"], k);
  setPat(`hoe_${t.id}`, ["MM", " S", " S"], k);
  setPat(`sword_${t.id}`, ["M", "M", "S"], k);
  setPat(`spear_${t.id}`, ["  M", " S ", "S  "], k);
}
for (const s of ARMOR_SETS) {
  const m = s.id === "leather" ? "leather" : s.id === "iron" ? "iron_ingot" : "sapphire";
  const k = { M: m };
  setPat(`helmet_${s.id}`, ["MMM", "M M"], k);
  setPat(`chest_${s.id}`, ["M M", "MMM", "MMM"], k);
  setPat(`legs_${s.id}`, ["MMM", "M M", "M M"], k);
  setPat(`boots_${s.id}`, ["M M", "M M"], k);
}
setPat("shield_wood", ["PIP", "PPP", " P "], { P: "planks", I: "iron_ingot" });
setPat("shield_iron", ["IPI", "III", " I "], { P: "planks", I: "iron_ingot" });
setPat("shield_sapphire", ["SIS", "SIS"], { S: "sapphire", I: "iron_ingot" });
setPat("crafting_table", ["PP", "PP"], { P: "planks" });
setPat("chest", ["PPP", "P P", "PPP"], { P: "planks" });
setPat("furnace", ["CCC", "C C", "CCC"], { C: "cobble" });
setPat("bed", ["WWW", "PPP"], { W: "wool", P: "planks" });
setPat("door_b", ["PP", "PP", "PP"], { P: "planks" });
setPat("ladder_0", ["S S", "SSS", "S S"], { S: "stick" });
setPat("torch", ["C", "S"], { C: "coal", S: "stick" });
setPat("bucket", ["I I", " I "], { I: "iron_ingot" });
for (const m of MATS) {
  setPat(`slab_${m}`, ["MMM"], { M: m });
  setPat(`stairs_${m}_0`, ["M  ", "MM ", "MMM"], { M: m });
}

export const RECIPES: Recipe[] = R;

/** Disposição da grade: cada célula tem o nome do item ou null. `size` = 2 ou 3. */
export type GridCells = (string | null)[];

const trim = (rows: (string | null)[][]): (string | null)[][] => {
  let r0 = rows.length;
  let r1 = -1;
  let c0 = rows[0]?.length ?? 0;
  let c1 = -1;
  rows.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v) {
        r0 = Math.min(r0, r);
        r1 = Math.max(r1, r);
        c0 = Math.min(c0, c);
        c1 = Math.max(c1, c);
      }
    }),
  );
  if (r1 < 0) return [];
  return rows.slice(r0, r1 + 1).map((row) => row.slice(c0, c1 + 1));
};

/** Qual receita a grade forma? `cells` tem 9 posições (3 por linha); só as do tamanho `size` valem. */
export function matchGrid(cells: GridCells, size: number, nearBench: boolean): Recipe | null {
  const rows: (string | null)[][] = [];
  for (let r = 0; r < size; r++) rows.push(Array.from({ length: size }, (_, c) => cells[r * 3 + c] ?? null));
  const g = trim(rows);
  if (g.length === 0) return null;
  const flat = g.flat().filter((v): v is string => !!v);
  const ordered = [...R.filter((x) => x.pattern), ...R.filter((x) => !x.pattern)];
  for (const r of ordered) {
    if (r.station === "bancada" && (!nearBench || size < 3)) continue;
    if (r.pattern) {
      const p = r.pattern;
      const prow = p.rows.map((row) => Array.from(row).map((ch) => (ch === " " ? null : (p.key[ch] ?? null))));
      const pt = trim(prow);
      if (pt.length !== g.length || pt[0].length !== g[0].length) continue;
      const same = (a: (string | null)[][]) => a.every((row, ri) => row.every((v, ci) => v === g[ri][ci]));
      if (same(pt) || same(pt.map((row) => [...row].reverse()))) return r;
    } else {
      const need: string[] = r.ingredients.flatMap((x) => Array.from({ length: x.count }, () => x.item));
      if (need.length !== flat.length) continue;
      const a = [...need].sort().join("|");
      const b = [...flat].sort().join("|");
      if (a === b) return r;
    }
  }
  return null;
}

/** Posições (0–8) onde cada ingrediente da receita vai na grade, ou null se não cabe em `size`. */
export function gridLayout(r: Recipe, size: number): { cell: number; item: string }[] | null {
  const out: { cell: number; item: string }[] = [];
  if (r.pattern) {
    const rows = r.pattern.rows;
    if (rows.length > size || Math.max(...rows.map((x) => x.length)) > size) return null;
    rows.forEach((row, ri) =>
      Array.from(row).forEach((ch, ci) => {
        if (ch !== " " && r.pattern!.key[ch]) out.push({ cell: ri * 3 + ci, item: r.pattern!.key[ch] });
      }),
    );
    return out;
  }
  const items = r.ingredients.flatMap((x) => Array.from({ length: x.count }, () => x.item));
  if (items.length > size * size) return null;
  items.forEach((item, n) => out.push({ cell: Math.floor(n / size) * 3 + (n % size), item }));
  return out;
}
