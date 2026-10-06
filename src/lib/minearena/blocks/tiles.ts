// Mapa de texturas dos blocos (sem DOM: só nomes e posições no atlas).
import type { BlockKey } from "./blocks";

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
] as const;
export type TileName = (typeof TILE_NAMES)[number];

export const ATLAS_COLS = 8;
export const TILE_PX = 16;
export const ATLAS_ROWS = Math.ceil(TILE_NAMES.length / ATLAS_COLS);
export const tileIndex = (n: TileName): number => TILE_NAMES.indexOf(n);

/** [topo, lado, base] de cada bloco. */
export const BLOCK_TILES: Record<BlockKey, [TileName, TileName, TileName]> = {
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
};

/** UV [u0, v0, u1, v1] do tile (com meia-margem de pixel pra não vazar). */
export function tileUV(idx: number): [number, number, number, number] {
  const c = idx % ATLAS_COLS;
  const r = Math.floor(idx / ATLAS_COLS);
  const e = 0.0005;
  return [c / ATLAS_COLS + e, 1 - (r + 1) / ATLAS_ROWS + e, (c + 1) / ATLAS_COLS - e, 1 - r / ATLAS_ROWS - e];
}
