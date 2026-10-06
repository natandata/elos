// Blocos do MINEARENA (data-driven: pra criar um bloco novo, adicione uma entrada aqui).
export type ToolType = "hand" | "pick" | "axe" | "shovel" | "hoe";
export type SoundKind = "stone" | "dirt" | "wood" | "sand" | "glass" | "leaf";
export type LootEntry = { item: string; min: number; max: number; chance: number };

export type Box = [number, number, number, number, number, number];

export interface BlockDef {
  id: number;
  key: string;
  name: string;
  /** Cores (hex) de cima, lado e baixo. `sideTop` pinta a faixa de cima do lado (grama, neve). */
  top: number;
  side: number;
  bottom: number;
  sideTop?: number;
  /** Segundos pra quebrar sem ferramenta. */
  hardness: number;
  tool: ToolType;
  /** Nível mínimo de ferramenta pra render o drop (0 = qualquer). */
  tier: number;
  loot: LootEntry[];
  solid: boolean;
  /** Esconde as faces dos vizinhos. */
  opaque: boolean;
  liquid?: boolean;
  /** Vai pra malha translúcida. */
  blend?: boolean;
  /** Emite luz própria (não escurece em cavernas). */
  glow?: boolean;
  sound: SoundKind;
  /** Pode ser colocado como item de bloco. */
  placeable: boolean;
  /** "cross" = planta em X; "panel" = placa fina na lateral da célula (portas abertas, escadas de mão); "boxes" = caixas parciais (lajes e degraus). */
  shape?: "cube" | "cross" | "panel" | "boxes";
  /** Painel: lado da célula onde fica (0 +x · 1 −x · 2 +z · 3 −z). */
  pdir?: 0 | 1 | 2 | 3;
  /** Caixas (0–1 dentro da célula) de blocos parciais: colisão e malha. */
  boxes?: Box[];
  /** Dá pra escalar. */
  climb?: boolean;
  /** Porta: metade (b/t) e se está aberta. */
  door?: { half: "b" | "t"; open: boolean };
  /** Fluidos: tipo e nível (fonte = nível máximo: água 8, lava 4). */
  fluid?: "water" | "lava";
  level?: number;
}

const BASE_KEYS = [
  "air",
  "grass",
  "dirt",
  "stone",
  "cobble",
  "sand",
  "sandstone",
  "log",
  "planks",
  "leaves",
  "coal_ore",
  "iron_ore",
  "gold_ore",
  "sapphire_ore",
  "water",
  "lava",
  "glass",
  "brick",
  "bedrock",
  "snow",
  "crafting_table",
  "gold_block",
  "cactus",
  "limestone",
  "chest",
  "furnace",
  "furnace_lit",
  "farmland",
  "wheat_0",
  "wheat_1",
  "wheat_2",
  "wheat_3",
  "lily",
  "tallgrass",
  "bed",
  "water_1",
  "water_2",
  "water_3",
  "water_4",
  "water_5",
  "water_6",
  "water_7",
  "lava_1",
  "lava_2",
  "lava_3",
  "obsidian",
  "cedar_log",
  "cedar_leaves",
  "cedar_planks",
  "palm_leaves",
  "basalt",
  "ash",
  "sulfur_ore",
  "ember_block",
  "basalt_brick",
  "portal",
  "altar",
  "torch",
] as const;
export type BaseKey = (typeof BASE_KEYS)[number];
export const MATS = ["planks", "cobble", "brick", "limestone", "sandstone", "cedar_planks"] as const;
export type Mat = (typeof MATS)[number];
type D4 = 0 | 1 | 2 | 3;
export type BlockKey = BaseKey | "door_b" | "door_t" | `door_o${D4}${"b" | "t"}` | `ladder_${D4}` | `slab_${Mat}` | `stairs_${Mat}_${D4}`;
const D4S: D4[] = [0, 1, 2, 3];
const KEYS: BlockKey[] = [
  ...BASE_KEYS,
  "door_b",
  "door_t",
  ...D4S.flatMap((d) => [`door_o${d}b`, `door_o${d}t`] as BlockKey[]),
  ...D4S.map((d) => `ladder_${d}` as BlockKey),
  ...MATS.map((m) => `slab_${m}` as BlockKey),
  ...MATS.flatMap((m) => D4S.map((d) => `stairs_${m}_${d}` as BlockKey)),
];

/** Atalho: B.stone, B.water… */
export const B = Object.fromEntries(KEYS.map((k, i) => [k, i])) as Record<BlockKey, number>;

type Spec = Omit<BlockDef, "id" | "key">;
const drop = (item: string, min = 1, max = 1, chance = 1): LootEntry => ({ item, min, max, chance });
const blk = (name: string, c: number, hardness: number, tool: ToolType, tier: number, loot: LootEntry[], sound: SoundKind, extra: Partial<Spec> = {}): Spec => ({
  name,
  top: c,
  side: c,
  bottom: c,
  hardness,
  tool,
  tier,
  loot,
  solid: true,
  opaque: true,
  sound,
  placeable: true,
  ...extra,
});

const flow = (kind: "water" | "lava", level: number): Spec => ({
  ...blk(kind === "water" ? "Água corrente" : "Lava corrente", kind === "water" ? 0x3a76d6 : 0xff6a1a, Infinity, "hand", 0, [], "dirt", {
    solid: false,
    opaque: false,
    liquid: true,
    blend: kind === "water",
    glow: kind === "lava",
    placeable: false,
    fluid: kind,
    level,
  }),
});

const plant = (name: string, c: number, loot: LootEntry[]): Spec =>
  blk(name, c, 0.05, "hand", 0, loot, "leaf", { solid: false, opaque: false, shape: "cross", placeable: false });

const BASE_SPECS: Record<BaseKey, Spec> = {
  air: blk("Ar", 0, 0, "hand", 0, [], "stone", { solid: false, opaque: false, placeable: false }),
  grass: blk("Grama", 0x5da13a, 0.8, "shovel", 0, [drop("dirt"), drop("seeds", 1, 1, 0.1)], "dirt", { side: 0x7b5a33, sideTop: 0x5da13a, bottom: 0x7b5a33 }),
  dirt: blk("Terra", 0x7b5a33, 0.7, "shovel", 0, [drop("dirt")], "dirt"),
  stone: blk("Pedra", 0x7d7d80, 4, "pick", 1, [drop("cobble")], "stone"),
  cobble: blk("Pedra lavrada", 0x6a6a6e, 4, "pick", 1, [drop("cobble")], "stone"),
  sand: blk("Areia", 0xe3d398, 0.6, "shovel", 0, [drop("sand")], "sand"),
  sandstone: blk("Arenito", 0xd2b977, 2, "pick", 1, [drop("sandstone")], "stone"),
  log: blk("Tronco de carvalho", 0x5d4630, 2.5, "axe", 0, [drop("log")], "wood", { top: 0xb08a50, bottom: 0xb08a50 }),
  planks: blk("Tábuas de cedro", 0xb88a52, 1.8, "axe", 0, [drop("planks")], "wood"),
  leaves: blk("Folhas de carvalho", 0x3f8a2e, 0.25, "hand", 0, [drop("stick", 1, 2, 0.25), drop("apple", 1, 1, 0.07)], "leaf", { opaque: false }),
  coal_ore: blk("Minério de carvão", 0x34343a, 5, "pick", 1, [drop("coal", 1, 2)], "stone"),
  iron_ore: blk("Minério de ferro", 0xc79a78, 6, "pick", 2, [drop("raw_iron")], "stone"),
  gold_ore: blk("Minério de ouro", 0xf3d34d, 7, "pick", 3, [drop("raw_gold")], "stone"),
  sapphire_ore: blk("Minério de safira", 0x2b6fe0, 8, "pick", 3, [drop("sapphire")], "stone", { glow: true }),
  water: blk("Água", 0x3a76d6, Infinity, "hand", 0, [], "dirt", { solid: false, opaque: false, liquid: true, blend: true, placeable: false, fluid: "water", level: 8 }),
  lava: blk("Lava", 0xff6a1a, Infinity, "hand", 0, [], "stone", { solid: false, opaque: false, liquid: true, glow: true, placeable: false, fluid: "lava", level: 4 }),
  glass: blk("Vidro", 0xcfe9f2, 0.4, "hand", 0, [], "glass", { opaque: false, blend: true }),
  brick: blk("Tijolo de barro", 0xa4533b, 4, "pick", 1, [drop("brick")], "stone"),
  bedrock: blk("Rocha-mãe", 0x2b2b2e, Infinity, "hand", 0, [], "stone", { placeable: false }),
  snow: blk("Neve", 0xf2f6fa, 0.3, "shovel", 0, [drop("snow")], "dirt", { side: 0x7b5a33, sideTop: 0xf2f6fa, bottom: 0x7b5a33 }),
  crafting_table: blk("Bancada de carpinteiro", 0x8a5d33, 2, "axe", 0, [drop("crafting_table")], "wood", { top: 0xa9794a, bottom: 0xb88a52 }),
  gold_block: blk("Bloco de ouro de Ofir", 0xf0c93a, 6, "pick", 3, [drop("gold_block")], "stone"),
  cactus: blk("Cacto", 0x2f8f43, 0.6, "hand", 0, [drop("cactus")], "leaf"),
  limestone: blk("Calcário do templo", 0xe8e0cc, 3, "pick", 1, [drop("limestone")], "stone"),
  chest: blk("Arca", 0x8a5d33, 2.5, "axe", 0, [], "wood"),
  furnace: blk("Fornalha de barro", 0x6a6a6e, 3.5, "pick", 1, [drop("furnace")], "stone"),
  farmland: blk("Terra arada", 0x5a3d22, 0.6, "shovel", 0, [drop("dirt")], "dirt", { placeable: false }),
  wheat_0: plant("Trigo (broto)", 0x6aa84f, [drop("seeds")]),
  wheat_1: plant("Trigo (crescendo)", 0x7cb342, [drop("seeds")]),
  wheat_2: plant("Trigo (quase maduro)", 0x9ab53a, [drop("seeds", 1, 2), drop("wheat", 1, 1, 0.3)]),
  wheat_3: plant("Trigo maduro", 0xd9b13b, [drop("wheat", 1, 3), drop("seeds", 1, 3)]),
  lily: { ...plant("Lírio do campo", 0xf2f2f2, [drop("lily")]), placeable: true },
  tallgrass: plant("Mato", 0x5da13a, [drop("seeds", 1, 1, 0.12)]),
  bed: blk("Esteira de dormir", 0xc2272d, 0.6, "axe", 0, [drop("bed")], "wood", { top: 0xc2272d, side: 0xb88a52, bottom: 0xb88a52 }),
  water_1: flow("water", 1),
  water_2: flow("water", 2),
  water_3: flow("water", 3),
  water_4: flow("water", 4),
  water_5: flow("water", 5),
  water_6: flow("water", 6),
  water_7: flow("water", 7),
  lava_1: flow("lava", 1),
  lava_2: flow("lava", 2),
  lava_3: flow("lava", 3),
  obsidian: blk("Obsidiana", 0x1d1233, 14, "pick", 4, [drop("obsidian")], "stone"),
  cedar_log: blk("Tronco de cedro", 0x6a3a28, 2.5, "axe", 0, [drop("cedar_log")], "wood", { top: 0xb9825a, bottom: 0xb9825a }),
  cedar_leaves: blk("Folhas de cedro", 0x2f6a4a, 0.25, "hand", 0, [drop("stick", 1, 2, 0.3)], "leaf", { opaque: false }),
  cedar_planks: blk("Tábuas de cedro do Líbano", 0xa8583a, 1.8, "axe", 0, [drop("cedar_planks")], "wood"),
  palm_leaves: blk("Palmas de tamareira", 0x7aa83a, 0.25, "hand", 0, [drop("stick", 1, 1, 0.2), drop("dates", 1, 2, 0.18)], "leaf", { opaque: false }),
  basalt: blk("Rocha calcinada", 0x3a2a2e, 3, "pick", 1, [drop("basalt")], "stone"),
  ash: blk("Cinza", 0x6a5a5a, 0.5, "shovel", 0, [drop("ash")], "sand"),
  sulfur_ore: blk("Enxofre", 0xd9c93a, 3, "pick", 1, [drop("sulfur", 1, 3)], "stone"),
  ember_block: blk("Brasa viva", 0xff7a1a, 1.5, "pick", 0, [drop("ember_shard", 2, 4)], "glass", { glow: true }),
  basalt_brick: blk("Muralha de Hinom", 0x4a2a30, 4, "pick", 1, [drop("basalt_brick")], "stone"),
  portal: blk("Portal do Abismo", 0x8a2be2, 0.1, "hand", 0, [], "glass", { solid: false, opaque: false, blend: true, glow: true, placeable: false }),
  altar: blk("Altar do ferreiro", 0x6a6a6e, 4, "pick", 1, [drop("altar")], "stone", { top: 0xe0b83a }),
  torch: blk("Tocha", 0xffb02e, 0.05, "hand", 0, [drop("torch")], "wood", { solid: false, opaque: false, shape: "cross", glow: true }),
  furnace_lit: blk("Fornalha acesa", 0x6a6a6e, 3.5, "pick", 1, [drop("furnace")], "stone", { glow: true, placeable: false }),
};

// ---- portas, escadas de mão, lajes e degraus (gerados) ----
const GEN: Record<string, Spec> = {};
const WOOD_DOOR = 0xa9794a;
GEN.door_b = blk("Porta de madeira", WOOD_DOOR, 1.5, "axe", 0, [drop("door_b")], "wood", { door: { half: "b", open: false } });
GEN.door_t = blk("Porta de madeira", WOOD_DOOR, 1.5, "axe", 0, [], "wood", { placeable: false, door: { half: "t", open: false } });
for (const d of D4S) {
  for (const h of ["b", "t"] as const) {
    GEN[`door_o${d}${h}`] = blk("Porta aberta", WOOD_DOOR, 1.5, "axe", 0, h === "b" ? [drop("door_b")] : [], "wood", { solid: false, opaque: false, shape: "panel", pdir: d, placeable: false, door: { half: h, open: true } });
  }
  GEN[`ladder_${d}`] = blk("Escada de mão", 0x9b6b3a, 0.4, "axe", 0, [drop("ladder_0")], "wood", { solid: false, opaque: false, shape: "panel", pdir: d, climb: true, placeable: d === 0 });
}
const MAT_NAME: Record<Mat, string> = { planks: "tábuas", cobble: "pedra lavrada", brick: "tijolo", limestone: "calcário", sandstone: "arenito", cedar_planks: "cedro" };
const STAIR_BOXES: Box[][] = [
  [[0, 0, 0, 1, 0.5, 1], [0.5, 0.5, 0, 1, 1, 1]],
  [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0, 0.5, 1, 1]],
  [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0.5, 1, 1, 1]],
  [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0, 1, 1, 0.5]],
];
for (const m of MATS) {
  const base = BASE_SPECS[m];
  GEN[`slab_${m}`] = { ...base, name: `Laje de ${MAT_NAME[m]}`, loot: [drop(`slab_${m}`)], solid: false, opaque: false, shape: "boxes", boxes: [[0, 0, 0, 1, 0.5, 1]], hardness: base.hardness * 0.6 };
  for (const d of D4S) {
    GEN[`stairs_${m}_${d}`] = { ...base, name: `Degraus de ${MAT_NAME[m]}`, loot: [drop(`stairs_${m}_0`)], solid: false, opaque: false, shape: "boxes", boxes: STAIR_BOXES[d], placeable: d === 0, hardness: base.hardness * 0.75 };
  }
}
const SPECS = { ...BASE_SPECS, ...GEN } as Record<BlockKey, Spec>;

export const BLOCKS: BlockDef[] = KEYS.map((key, id) => ({ id, key, ...SPECS[key] }));
export const BLOCK_BY_KEY = new Map(BLOCKS.map((b) => [b.key, b]));

export const blockDef = (id: number): BlockDef => BLOCKS[id] ?? BLOCKS[0];

/** Caixas de colisão dos blocos parciais, por id. */
export const BOXES: (Box[] | null)[] = Array.from({ length: 256 }, (_, i) => BLOCKS[i]?.boxes ?? null);
export const CLIMBABLE = new Uint8Array(256);
for (const b of BLOCKS) if (b.climb) CLIMBABLE[b.id] = 1;

export const FLUID_MAX = { water: 8, lava: 4 } as const;
/** Bloco de fluido com esse nível (fonte = máximo). */
export const fluidId = (kind: "water" | "lava", level: number): number =>
  kind === "water" ? (level >= 8 ? B.water : B.water_1 + level - 1) : level >= 4 ? B.lava : B.lava_1 + level - 1;
export const isFluid = (id: number, kind?: "water" | "lava"): boolean => {
  const f = BLOCKS[id]?.fluid;
  return !!f && (!kind || f === kind);
};

/** Segundos pra quebrar com a ferramenta dada, e se o drop vale. */
export function breakInfo(def: BlockDef, toolType: ToolType, toolTier: number, toolSpeed: number): { time: number; harvest: boolean } {
  if (!Number.isFinite(def.hardness)) return { time: Infinity, harvest: false };
  const matches = def.tool !== "hand" && toolType === def.tool;
  const harvest = def.tier === 0 || (matches && toolTier >= def.tier);
  const speed = matches ? toolSpeed : 1;
  return { time: Math.max(0.1, (def.hardness / speed) * (harvest ? 1 : 3.3)), harvest };
}

/** Hex → [r,g,b] em espaço linear (a malha usa cores de vértice). */
export function rgb(hex: number): [number, number, number] {
  const f = (v: number) => Math.pow(v / 255, 2.2);
  return [f((hex >> 16) & 255), f((hex >> 8) & 255), f(hex & 255)];
}
