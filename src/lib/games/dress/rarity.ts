// Raridade e preço das peças do "Vista o Herói" (client-safe; a mesma lista está no banco, em dress_family_price).
// Peças comuns são de graça. As raras (épicas e lendárias) custam Bilhetes Dourados e ficam no guarda-roupa para sempre.

export type Rarity = "common" | "epic" | "legend" | "limited";

/** Edição limitada: só saem nas ofertas raras do Madureira Shopping (3 unidades por 24 horas) e não aparecem no armário até serem compradas. */
export const LIMITED_FAMILIES = ["madcrown", "aurora", "galadress", "starmaid", "starcape", "crystal", "starwand", "comet", "constel", "auroracuff"] as const;
const LIMITED = new Set<string>(LIMITED_FAMILIES);

const LEGEND = new Set(["crown", "diadem", "tiara", "royal", "jeweled", "scepter", "embroidered", "gown", "mermaid", "wings", "stars", "halo", "chandelier", "medallion", "fascinator"]);
const EPIC = new Set([
  "helmet", "armor", "necklace", "cape", "caped", "metal", "laurel", "flowers", "harp", "trumpet", "alabaster", "lamp", "sword",
  "toga", "kaftan", "jumpsuit", "bolero", "poncho", "sunhat", "feather", "pearlband", "parasol", "fan", "mirror", "pearls", "layered", "cuff", "watch", "wedge", "kitten", "earstars", "drops",
]);

export const rarityOf = (family: string): Rarity => (LIMITED.has(family) ? "limited" : LEGEND.has(family) ? "legend" : EPIC.has(family) ? "epic" : "common");
export const RARITY_ICON: Record<Rarity, string> = { common: "", epic: "💜", legend: "⭐", limited: "🔥" };
/** Edição limitada não tem preço de prateleira (9999 = fora de alcance); o preço de verdade vem da oferta rara. */
export const RARITY_PRICE: Record<Rarity, number> = { common: 0, epic: 60, legend: 150, limited: 9999 };
/** Quanto custa a família (0 = grátis). */
export const priceOf = (family: string): number => RARITY_PRICE[rarityOf(family)];

export const LEGEND_FAMILIES = [...LEGEND];
export const EPIC_FAMILIES = [...EPIC];

export const isLimited = (family: string): boolean => LIMITED.has(family);
