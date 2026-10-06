import type { FeedDef, FeedId, PenDef, PenId, SpeciesDef, SpeciesId } from "../core/types";

export const FEEDS: Record<FeedId, FeedDef> = {
  hay: { id: "hay", name: "Palha", emoji: "🌾" },
  grain: { id: "grain", name: "Grãos", emoji: "🌰" },
  fruit: { id: "fruit", name: "Frutas", emoji: "🍎" },
  fish: { id: "fish", name: "Peixe seco", emoji: "🐟" },
};

export const PENS: Record<PenId, PenDef> = {
  pasture: { id: "pasture", name: "Pasto", emoji: "🌿", blurb: "Para os animais pequenos de pasto." },
  stable: { id: "stable", name: "Estábulo", emoji: "🛖", blurb: "Para os animais grandes de carga." },
  cages: { id: "cages", name: "Jaulas", emoji: "⛓️", blurb: "Para os animais fortes e de garras." },
  aviary: { id: "aviary", name: "Aviário", emoji: "🪺", blurb: "Para as aves." },
};

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  sheep: { id: "sheep", name: "ovelha", plural: "ovelhas", emoji: "🐑", feeds: ["hay"], pen: "pasture", patience: 20, reward: 9 },
  rabbit: { id: "rabbit", name: "coelho", plural: "coelhos", emoji: "🐇", feeds: ["fruit"], pen: "pasture", patience: 19, reward: 9 },
  dove: { id: "dove", name: "pomba", plural: "pombas", emoji: "🕊️", feeds: ["grain"], pen: "aviary", patience: 20, reward: 9 },
  parrot: { id: "parrot", name: "papagaio", plural: "papagaios", emoji: "🦜", feeds: ["fruit"], pen: "aviary", patience: 18, reward: 10 },
  horse: { id: "horse", name: "cavalo", plural: "cavalos", emoji: "🐴", feeds: ["hay", "grain"], pen: "stable", patience: 23, reward: 14 },
  camel: { id: "camel", name: "camelo", plural: "camelos", emoji: "🐪", feeds: ["hay"], pen: "stable", patience: 21, reward: 10 },
  lion: { id: "lion", name: "leão", plural: "leões", emoji: "🦁", feeds: ["fish"], pen: "cages", patience: 19, reward: 11 },
  bear: { id: "bear", name: "urso", plural: "ursos", emoji: "🐻", feeds: ["fruit", "fish"], pen: "cages", patience: 23, reward: 14 },
};

export const FEED_LIST = Object.values(FEEDS);
export const PEN_LIST = Object.values(PENS);
