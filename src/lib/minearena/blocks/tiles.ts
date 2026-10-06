// Mapa de texturas dos blocos (sem DOM: só nomes e posições no atlas).
import { type BaseKey, type BlockKey, MATS } from "./blocks";

export const TILE_NAMES = [
  "grass_top",
  "grass_side",
  "dirt",
  "stone",
  "cobble",
  "sand",
  "sandstone_side",
  "sandstone_top",
  "log_side",
  "log_top",
  "planks",
  "leaves",
  "coal_ore",
  "iron_ore",
  "gold_ore",
  "sapphire_ore",
  "water",
  "lava",
  "glass",
  "mudbrick",
  "bedrock",
  "snow_top",
  "snow_side",
  "table_top",
  "table_side",
  "gold_block",
  "cactus_side",
  "cactus_top",
  "limestone",
  "chest_top",
  "chest_side",
  "chest_front",
  "furnace_top",
  "furnace_side",
  "furnace_front",
  "furnace_front_lit",
  "farmland_top",
  "wheat_0",
  "wheat_1",
  "wheat_2",
  "wheat_3",
  "lily",
  "tallgrass",
  "bed_top",
  "bed_side",
  "obsidian",
  "cedar_log_side",
  "cedar_log_top",
  "cedar_leaves",
  "cedar_planks",
  "palm_leaves",
  "basalt",
  "ash",
  "sulfur_ore",
  "ember_block",
  "basalt_brick",
  "portal",
  "altar_top",
  "altar_side",
  "torch",
  "door_b",
  "door_t",
  "ladder",
  "sign",
  "tnt_top",
  "tnt_side",
  "red_water",
  "flower_red",
  "flower_yellow",
  "flower_blue",
  "fruit_leaves",
  "life_leaves",
  "dry_grass_top",
  "dry_grass_side",
  "dry_leaves",
] as const;
export type TileName = (typeof TILE_NAMES)[number];

export const ATLAS_COLS = 8;
export const TILE_PX = 16;
export const ATLAS_ROWS = Math.ceil(TILE_NAMES.length / ATLAS_COLS);
export const tileIndex = (n: TileName): number => TILE_NAMES.indexOf(n);

/** [topo, lado, base] de cada bloco. */
type Tiles = [TileName, TileName, TileName, TileName?];
const BASE_TILES: Record<BaseKey, Tiles> = {
  air: ["stone", "stone", "stone"],
  grass: ["grass_top", "grass_side", "dirt"],
  dirt: ["dirt", "dirt", "dirt"],
  stone: ["stone", "stone", "stone"],
  cobble: ["cobble", "cobble", "cobble"],
  sand: ["sand", "sand", "sand"],
  sandstone: ["sandstone_top", "sandstone_side", "sandstone_top"],
  log: ["log_top", "log_side", "log_top"],
  planks: ["planks", "planks", "planks"],
  leaves: ["leaves", "leaves", "leaves"],
  coal_ore: ["coal_ore", "coal_ore", "coal_ore"],
  iron_ore: ["iron_ore", "iron_ore", "iron_ore"],
  gold_ore: ["gold_ore", "gold_ore", "gold_ore"],
  sapphire_ore: ["sapphire_ore", "sapphire_ore", "sapphire_ore"],
  water: ["water", "water", "water"],
  lava: ["lava", "lava", "lava"],
  glass: ["glass", "glass", "glass"],
  brick: ["mudbrick", "mudbrick", "mudbrick"],
  bedrock: ["bedrock", "bedrock", "bedrock"],
  snow: ["snow_top", "snow_side", "dirt"],
  crafting_table: ["table_top", "table_side", "planks"],
  gold_block: ["gold_block", "gold_block", "gold_block"],
  cactus: ["cactus_top", "cactus_side", "cactus_top"],
  limestone: ["limestone", "limestone", "limestone"],
  chest: ["chest_top", "chest_side", "chest_top", "chest_front"],
  furnace: ["furnace_top", "furnace_side", "furnace_top", "furnace_front"],
  furnace_lit: ["furnace_top", "furnace_side", "furnace_top", "furnace_front_lit"],
  farmland: ["farmland_top", "dirt", "dirt"],
  wheat_0: ["wheat_0", "wheat_0", "wheat_0"],
  wheat_1: ["wheat_1", "wheat_1", "wheat_1"],
  wheat_2: ["wheat_2", "wheat_2", "wheat_2"],
  wheat_3: ["wheat_3", "wheat_3", "wheat_3"],
  lily: ["lily", "lily", "lily"],
  tallgrass: ["tallgrass", "tallgrass", "tallgrass"],
  bed: ["bed_top", "bed_side", "planks"],
  water_1: ["water", "water", "water"],
  water_2: ["water", "water", "water"],
  water_3: ["water", "water", "water"],
  water_4: ["water", "water", "water"],
  water_5: ["water", "water", "water"],
  water_6: ["water", "water", "water"],
  water_7: ["water", "water", "water"],
  lava_1: ["lava", "lava", "lava"],
  lava_2: ["lava", "lava", "lava"],
  lava_3: ["lava", "lava", "lava"],
  obsidian: ["obsidian", "obsidian", "obsidian"],
  cedar_log: ["cedar_log_top", "cedar_log_side", "cedar_log_top"],
  cedar_leaves: ["cedar_leaves", "cedar_leaves", "cedar_leaves"],
  cedar_planks: ["cedar_planks", "cedar_planks", "cedar_planks"],
  palm_leaves: ["palm_leaves", "palm_leaves", "palm_leaves"],
  basalt: ["basalt", "basalt", "basalt"],
  ash: ["ash", "ash", "ash"],
  sulfur_ore: ["sulfur_ore", "sulfur_ore", "sulfur_ore"],
  ember_block: ["ember_block", "ember_block", "ember_block"],
  basalt_brick: ["basalt_brick", "basalt_brick", "basalt_brick"],
  portal: ["portal", "portal", "portal"],
  altar: ["altar_top", "altar_side", "altar_side"],
  torch: ["torch", "torch", "torch"],
};

const GEN_TILES: Record<string, Tiles> = {
  tnt: ["tnt_top", "tnt_side", "tnt_top"],
  red_water: ["red_water", "red_water", "red_water"],
  flower_red: ["flower_red", "flower_red", "flower_red"],
  flower_yellow: ["flower_yellow", "flower_yellow", "flower_yellow"],
  flower_blue: ["flower_blue", "flower_blue", "flower_blue"],
  fruit_leaves: ["fruit_leaves", "fruit_leaves", "fruit_leaves"],
  life_leaves: ["life_leaves", "life_leaves", "life_leaves"],
  dry_grass: ["dry_grass_top", "dry_grass_side", "dirt"],
  dry_leaves: ["dry_leaves", "dry_leaves", "dry_leaves"],
  door_b: ["planks", "door_b", "planks"],
  door_t: ["planks", "door_t", "planks"],
};
for (const d of [0, 1, 2, 3]) {
  GEN_TILES[`door_o${d}b`] = ["door_b", "door_b", "door_b"];
  GEN_TILES[`door_o${d}t`] = ["door_t", "door_t", "door_t"];
  GEN_TILES[`ladder_${d}`] = ["ladder", "ladder", "ladder"];
  GEN_TILES[`sign_${d}`] = ["sign", "sign", "sign"];
}
for (const m of MATS) {
  GEN_TILES[`slab_${m}`] = BASE_TILES[m];
  for (const d of [0, 1, 2, 3]) GEN_TILES[`stairs_${m}_${d}`] = BASE_TILES[m];
}
/** [topo, lado, base] de cada bloco. */
export const BLOCK_TILES = { ...BASE_TILES, ...GEN_TILES } as Record<BlockKey, Tiles>;

/** UV [u0, v0, u1, v1] do tile (com meia-margem de pixel pra não vazar). */
export function tileUV(idx: number): [number, number, number, number] {
  const c = idx % ATLAS_COLS;
  const r = Math.floor(idx / ATLAS_COLS);
  const e = 0.0005;
  return [c / ATLAS_COLS + e, 1 - (r + 1) / ATLAS_ROWS + e, (c + 1) / ATLAS_COLS - e, 1 - r / ATLAS_ROWS - e];
}
