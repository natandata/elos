import type { FeedDef, FeedId, SpeciesDef, SpeciesId } from "../core/types";

/**
 * Cardápio da Cozinha da Arca. Noé recebeu a ordem de juntar todo alimento para os animais (Gênesis 6:21).
 * Cada prato tem a sua estação: o celeiro entrega na hora; o forno e a grelha dão o ponto e queimam se esquecer;
 * a prensa faz o suco e espera.
 */
export const FEEDS: Record<FeedId, FeedDef> = {
  hay: { id: "hay", name: "Feno", emoji: "🌾", price: 6, station: { name: "Celeiro", emoji: "🛖", kind: "direct", slots: 0, cookTime: 0, burnAfter: 0 } },
  grain: { id: "grain", name: "Pão de grãos", emoji: "🥖", price: 10, station: { name: "Forno de pedra", emoji: "🔥", kind: "cook", slots: 3, cookTime: 5, burnAfter: 4 } },
  fruit: { id: "fruit", name: "Suco de frutas", emoji: "🧃", price: 8, station: { name: "Prensa", emoji: "🍇", kind: "press", slots: 2, cookTime: 3, burnAfter: 0 } },
  fish: { id: "fish", name: "Peixe assado", emoji: "🐟", price: 12, station: { name: "Grelha", emoji: "♨️", kind: "cook", slots: 3, cookTime: 6, burnAfter: 4 } },
};

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  sheep: { id: "sheep", name: "ovelha", plural: "ovelhas", emoji: "🐑", feeds: ["hay"], patience: 15 },
  rabbit: { id: "rabbit", name: "coelho", plural: "coelhos", emoji: "🐇", feeds: ["fruit"], patience: 14 },
  dove: { id: "dove", name: "pomba", plural: "pombas", emoji: "🕊️", feeds: ["grain"], patience: 15 },
  parrot: { id: "parrot", name: "papagaio", plural: "papagaios", emoji: "🦜", feeds: ["fruit"], patience: 14 },
  horse: { id: "horse", name: "cavalo", plural: "cavalos", emoji: "🐴", feeds: ["hay", "grain"], patience: 18 },
  camel: { id: "camel", name: "camelo", plural: "camelos", emoji: "🐪", feeds: ["hay"], patience: 16 },
  lion: { id: "lion", name: "leão", plural: "leões", emoji: "🦁", feeds: ["fish"], patience: 15 },
  bear: { id: "bear", name: "urso", plural: "ursos", emoji: "🐻", feeds: ["fruit", "fish"], patience: 19 },
};

export const FEED_LIST = Object.values(FEEDS);

/** Quanto vale o pedido completo de uma espécie. */
export const orderValue = (s: SpeciesId): number => SPECIES[s].feeds.reduce((a, f) => a + FEEDS[f].price, 0);
