/** Jogos que o admin pode mostrar ou esconder para os jogadores (client-safe). */
export type Visibility = "auto" | "visible" | "hidden";

export type GameKey = "quiz" | "verse" | "who" | "order" | "arena" | "memory" | "duel" | "collection" | "dress" | "minearena" | "biblerush" | "arenasoccer" | "arenacampanha" | "ultimatribo" | "quemdesenha";

export const GAME_CATALOG: { key: GameKey; emoji: string; title: string }[] = [
  { key: "quiz", emoji: "🧠", title: "Quiz do Dia" },
  { key: "verse", emoji: "📖", title: "Complete o Versículo" },
  { key: "who", emoji: "🕵️", title: "Quem Sou Eu?" },
  { key: "order", emoji: "⏳", title: "Ordene os Fatos" },
  { key: "arena", emoji: "🏰", title: "Arena dos Heróis (inclui 1x1, duplas, torneios e missões)" },
  { key: "memory", emoji: "🃏", title: "Memória dos Heróis" },
  { key: "duel", emoji: "⚡", title: "Duelo 1x1 do Quiz" },
  { key: "collection", emoji: "🗂️", title: "Coleção de cartas" },
  { key: "dress", emoji: "👗", title: "Vista o Herói (inclui a Passarela)" },
  { key: "minearena", emoji: "⛏️", title: "MineArena" },
  { key: "biblerush", emoji: "🛶", title: "Bible Rush" },
  { key: "arenasoccer", emoji: "⚽", title: "ArenaSoccer (vendido na Loja)" },
  { key: "arenacampanha", emoji: "🛡️", title: "Campanha da Arena dos Heróis (só batalhar; ver cartas e arenas é livre)" },
  { key: "ultimatribo", emoji: "🪓", title: "A Última Tribo (em construção: só admin e acesso antecipado)" },
  { key: "quemdesenha", emoji: "🎨", title: "Quem Desenha? (em construção: só admin e acesso antecipado)" },
];

export const GAME_KEYS = GAME_CATALOG.map((g) => g.key);
export const isGameKey = (k: string): k is GameKey => (GAME_KEYS as string[]).includes(k);
