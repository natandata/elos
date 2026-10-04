// Catálogo de cartas colecionáveis (client-safe: não revela resposta nenhuma).

export type Rarity = "comum" | "raro" | "epico" | "lendario";

export type GameCard = { key: string; name: string; emoji: string; rarity: Rarity; blurb: string };

export const RARITY_LABEL: Record<Rarity, string> = {
  comum: "Comum",
  raro: "Rara",
  epico: "Épica",
  lendario: "Lendária",
};

// Peso de sorteio no baú (maior = mais frequente).
export const RARITY_WEIGHT: Record<Rarity, number> = { comum: 60, raro: 28, epico: 10, lendario: 2 };

export const CARDS: GameCard[] = [
  // personagens (ganhos no "Quem Sou Eu?" ou no baú)
  { key: "noe", name: "Noé", emoji: "🛶", rarity: "comum", blurb: "Obedeceu a Deus e construiu a arca." },
  { key: "moises", name: "Moisés", emoji: "🌊", rarity: "epico", blurb: "Liderou o povo para fora do Egito." },
  { key: "davi", name: "Davi", emoji: "🪨", rarity: "epico", blurb: "Pastor, rei e salmista." },
  { key: "daniel", name: "Daniel", emoji: "🦁", rarity: "raro", blurb: "Fiel a Deus até na cova dos leões." },
  { key: "jose", name: "José do Egito", emoji: "🧥", rarity: "raro", blurb: "Do poço ao palácio, sem largar a fé." },
  { key: "ester", name: "Ester", emoji: "👑", rarity: "raro", blurb: "Rainha corajosa que salvou seu povo." },
  { key: "jonas", name: "Jonas", emoji: "🐋", rarity: "comum", blurb: "Aprendeu a obedecer na barriga de um peixe." },
  { key: "pedro", name: "Pedro", emoji: "🎣", rarity: "comum", blurb: "Pescador que virou pescador de gente." },
  { key: "paulo", name: "Paulo", emoji: "✉️", rarity: "epico", blurb: "De perseguidor a apóstolo e escritor de cartas." },
  { key: "rute", name: "Rute", emoji: "🌾", rarity: "raro", blurb: "Lealdade que mudou a história." },
  { key: "salomao", name: "Salomão", emoji: "🏛️", rarity: "raro", blurb: "Pediu sabedoria e recebeu muito mais." },
  { key: "sansao", name: "Sansão", emoji: "💪", rarity: "comum", blurb: "Força enorme, dada por Deus." },
  { key: "elias", name: "Elias", emoji: "🔥", rarity: "raro", blurb: "Profeta do fogo no monte Carmelo." },
  { key: "abraao", name: "Abraão", emoji: "⭐", rarity: "epico", blurb: "O pai da fé, com descendentes como as estrelas." },
  { key: "zaqueu", name: "Zaqueu", emoji: "🌳", rarity: "comum", blurb: "Subiu numa árvore e mudou de vida." },
  { key: "debora", name: "Débora", emoji: "🌴", rarity: "raro", blurb: "Juíza e profetisa que liderou com coragem." },
  // objetos e lugares (só no baú)
  { key: "arca", name: "A Arca", emoji: "🚢", rarity: "comum", blurb: "Abrigo seguro em meio ao dilúvio." },
  { key: "sarca", name: "Sarça Ardente", emoji: "🌿", rarity: "raro", blurb: "Queimava e não se consumia." },
  { key: "tabuas", name: "Tábuas da Lei", emoji: "📜", rarity: "raro", blurb: "Os Dez Mandamentos no monte Sinai." },
  { key: "harpa", name: "A Harpa", emoji: "🎵", rarity: "comum", blurb: "Os louvores de Davi." },
  { key: "funda", name: "A Funda", emoji: "🎯", rarity: "comum", blurb: "Simples, mas nas mãos certas." },
  { key: "estrela", name: "Estrela de Belém", emoji: "🌟", rarity: "epico", blurb: "Guiou os magos até Jesus." },
  { key: "manjedoura", name: "Manjedoura", emoji: "🍼", rarity: "raro", blurb: "O primeiro berço do Salvador." },
  { key: "paes", name: "Pães e Peixes", emoji: "🍞", rarity: "comum", blurb: "Pouco nas mãos de Jesus virou fartura." },
  { key: "pomba", name: "A Pomba", emoji: "🕊️", rarity: "comum", blurb: "Trouxe o ramo de oliveira para Noé." },
  { key: "trombeta", name: "Trombetas de Jericó", emoji: "📯", rarity: "comum", blurb: "Os muros caíram após a marcha." },
  { key: "escada", name: "Escada de Jacó", emoji: "🪜", rarity: "raro", blurb: "O sonho que ligou a terra ao céu." },
  { key: "biblia", name: "A Bíblia", emoji: "📖", rarity: "epico", blurb: "A Palavra que guia o caminho." },
  { key: "chama", name: "Chama de Pentecostes", emoji: "🔥", rarity: "lendario", blurb: "O Espírito Santo desceu sobre os discípulos." },
  { key: "alianca", name: "Arca da Aliança", emoji: "⛩️", rarity: "lendario", blurb: "O sinal da presença de Deus com o povo." },
];

export const CARD_BY_KEY = new Map(CARDS.map((c) => [c.key, c]));

export const RARITY_STYLE: Record<Rarity, string> = {
  comum: "border-slate-300 bg-slate-50 text-slate-800",
  raro: "border-sky-300 bg-sky-50 text-sky-900",
  epico: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900",
  lendario: "border-amber-400 bg-amber-50 text-amber-900",
};
