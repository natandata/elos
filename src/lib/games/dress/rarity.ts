// Raridade e preço das peças do "Vista o Herói" (client-safe; a mesma lista está no banco, em dress_family_price).
// Peças comuns são de graça. As raras (épicas e lendárias) custam Bilhetes Dourados e ficam no guarda-roupa para sempre.

export type Rarity = "common" | "epic" | "legend";

const LEGEND = new Set(["crown", "diadem", "tiara", "royal", "jeweled", "scepter", "embroidered", "gown", "mermaid", "wings", "stars", "halo", "chandelier", "medallion", "fascinator"]);
const EPIC = new Set([
  "helmet", "armor", "necklace", "cape", "caped", "metal", "laurel", "flowers", "harp", "trumpet", "alabaster", "lamp", "sword",
  "toga", "kaftan", "jumpsuit", "bolero", "poncho", "sunhat", "feather", "pearlband", "parasol", "fan", "mirror", "pearls", "layered", "cuff", "watch", "wedge", "kitten", "earstars", "drops",
]);

export const rarityOf = (family: string): Rarity => (LEGEND.has(family) ? "legend" : EPIC.has(family) ? "epic" : "common");
export const RARITY_ICON: Record<Rarity, string> = { common: "", epic: "💜", legend: "⭐" };
export const RARITY_PRICE: Record<Rarity, number> = { common: 0, epic: 60, legend: 150 };
/** Quanto custa a família (0 = grátis). */
export const priceOf = (family: string): number => RARITY_PRICE[rarityOf(family)];

export const LEGEND_FAMILIES = [...LEGEND];
export const EPIC_FAMILIES = [...EPIC];
