import type { FeedDef, FeedId, GuestDef, GuestId } from "../core/types";

type Station = FeedDef["station"];
const direct = (name: string, emoji: string): Station => ({ name, emoji, kind: "direct", slots: 0, cookTime: 0, burnAfter: 0 });
const cook = (name: string, emoji: string, cookTime: number, burnAfter = 4): Station => ({ name, emoji, kind: "cook", slots: 3, cookTime, burnAfter });
const press = (name: string, emoji: string, cookTime: number, slots = 2): Station => ({ name, emoji, kind: "press", slots, cookTime, burnAfter: 0 });

const OVEN = (t: number) => cook("Forno de pedra", "🔥", t);
const COALS = (t: number) => cook("Brasas", "♨️", t);

/**
 * Cardápio das refeições da Bíblia. Cada prato tem a sua estação: algumas entregam na hora,
 * o forno, as brasas e a panela dão o ponto e queimam se esquecer, e as talhas esperam.
 */
const FEED_ARR: FeedDef[] = [
  { id: "agua", name: "Água", emoji: "💧", price: 4, station: direct("Poço", "🪣") },
  { id: "coalhada", name: "Coalhada e leite", emoji: "🥛", price: 6, station: direct("Jarros", "🏺") },
  { id: "ervas", name: "Ervas amargas", emoji: "🥬", price: 6, station: direct("Cesto de ervas", "🧺") },
  { id: "mana", name: "Maná", emoji: "🍪", price: 7, station: direct("Campo de maná", "🌾") },
  { id: "frutas", name: "Frutas", emoji: "🍇", price: 6, station: direct("Videira", "🍇") },
  { id: "pao", name: "Pão", emoji: "🥖", price: 10, station: OVEN(5) },
  { id: "azimo", name: "Pão sem fermento", emoji: "🫓", price: 9, station: OVEN(4) },
  { id: "bolomana", name: "Bolo de maná", emoji: "🥮", price: 10, station: OVEN(5) },
  { id: "paocevada", name: "Pão de cevada", emoji: "🥖", price: 9, station: OVEN(4) },
  { id: "bezerro", name: "Bezerro assado", emoji: "🥩", price: 14, station: COALS(7) },
  { id: "cabrito", name: "Cabrito assado", emoji: "🍖", price: 12, station: COALS(6) },
  { id: "cordeiro", name: "Cordeiro assado", emoji: "🍖", price: 13, station: COALS(6) },
  { id: "codorniz", name: "Codorniz assada", emoji: "🍗", price: 10, station: COALS(5) },
  { id: "peixe", name: "Peixe assado", emoji: "🐟", price: 12, station: cook("Grelha", "♨️", 6) },
  { id: "lentilhas", name: "Guisado de lentilhas", emoji: "🍲", price: 11, station: cook("Panela", "🫕", 6) },
  { id: "vinho", name: "Vinho novo", emoji: "🍷", price: 9, station: press("Talhas de pedra", "🏺", 3) },
];

export const FEEDS: Record<FeedId, FeedDef> = Object.fromEntries(FEED_ARR.map((f) => [f.id, f]));

const G = (id: GuestId, name: string, faces: string[], feeds: FeedId[], patience: number): GuestDef => ({ id, name, faces, feeds, patience });

const GUEST_ARR: GuestDef[] = [
  // Abraão e os três visitantes
  G("visitante", "Visitante", ["🧔"], ["agua"], 15),
  G("viajante", "Viajante cansado", ["🚶"], ["pao"], 15),
  G("peregrino", "Peregrino", ["👳"], ["coalhada", "pao"], 18),
  G("pastor", "Pastor de Manre", ["🧑‍🌾"], ["bezerro"], 17),
  G("jovem", "Jovem pastor", ["👦"], ["agua", "coalhada"], 17),
  G("tres", "Os três visitantes", ["🧔", "🧔", "🧔"], ["pao", "bezerro", "coalhada"], 24),
  // Jacó e Esaú
  G("esau", "Esaú faminto", ["🧑‍🦰"], ["lentilhas", "pao"], 16),
  G("cacador", "Caçador", ["🏹"], ["cabrito"], 16),
  G("pastor2", "Pastor", ["👨‍🌾"], ["agua", "pao"], 16),
  G("servo", "Servo", ["🧒"], ["lentilhas"], 14),
  G("mercador", "Mercador de Gileade", ["🧔‍♂️", "🐪"], ["agua", "lentilhas", "cabrito"], 24),
  // A primeira Páscoa
  G("familia", "Família israelita", ["👨‍👩‍👧"], ["cordeiro", "azimo", "ervas"], 22),
  G("avo", "Avô", ["👴"], ["azimo"], 14),
  G("mae", "Mãe", ["👩"], ["ervas", "azimo"], 15),
  G("jovem3", "Jovem", ["🧑"], ["cordeiro"], 15),
  G("menina", "Menina", ["👧"], ["agua", "azimo"], 14),
  // Maná e codornizes
  G("israelita", "Israelita", ["🧑"], ["mana"], 14),
  G("familia4", "Família no deserto", ["👨‍👩‍👦"], ["codorniz", "mana", "agua"], 23),
  G("idosa", "Idosa", ["👵"], ["bolomana"], 16),
  G("menino4", "Menino", ["👦"], ["mana", "bolomana"], 16),
  G("murmurador", "Descontente", ["🙁"], ["codorniz"], 12),
  // As bodas de Caná
  G("convidado", "Convidado", ["🧑"], ["vinho"], 15),
  G("mestresala", "Mestre-sala", ["🤵"], ["vinho", "pao"], 18),
  G("noivos", "Os noivos", ["🤵", "👰"], ["vinho", "cordeiro", "frutas"], 26),
  G("convidada", "Convidada", ["👩"], ["frutas", "vinho"], 17),
  G("musico", "Músico", ["🎻"], ["vinho"], 15),
  // Os pães e os peixes
  G("menino6", "Menino", ["👦"], ["paocevada", "peixe"], 16),
  G("mae6", "Mãe", ["👩"], ["peixe"], 15),
  G("pescador", "Pescador", ["🎣"], ["peixe", "agua"], 16),
  G("familia6", "Família da multidão", ["👨‍👩‍👧"], ["paocevada", "peixe", "agua"], 25),
  G("discipulo", "Discípulo", ["🧑"], ["paocevada"], 14),
];

export const GUESTS: Record<GuestId, GuestDef> = Object.fromEntries(GUEST_ARR.map((g) => [g.id, g]));

/** Quanto vale o pedido completo de um convidado. */
export const orderValue = (g: GuestId): number => GUESTS[g].feeds.reduce((a, f) => a + FEEDS[f].price, 0);
