// Fornalha de barro: o que cozinha e o que serve de combustível.
export const SMELT_TIME = 8;

/** entrada → saída */
export const SMELT: Record<string, string> = {
  raw_iron: "iron_ingot",
  raw_gold: "gold_ingot",
  sand: "glass",
  meat: "cooked_meat",
  cobble: "stone",
  log: "coal",
};

/** combustível → segundos de chama */
export const FUEL: Record<string, number> = {
  coal: 80,
  log: 15,
  planks: 7.5,
  stick: 5,
  sulfur: 60,
  ember_shard: 160,
};
