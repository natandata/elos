// Troféus e títulos do Vista o Herói (client-safe). As contagens vêm de dress_achievements.

export type Counts = { games: number; wins: number; podiums: number; mega: number; mega_wins: number; fives: number; rare: number; tickets: number };

export type Trophy = { key: string; icon: string; title: string; hint: string; got: (c: Counts) => boolean; have: (c: Counts) => number; need: number };

export const TROPHIES: Trophy[] = [
  { key: "first", icon: "🎀", title: "Estreante da Passarela", hint: "Jogue a 1ª partida", got: (c) => c.games >= 1, have: (c) => c.games, need: 1 },
  { key: "g10", icon: "👗", title: "Modelo de Casa", hint: "Jogue 10 partidas", got: (c) => c.games >= 10, have: (c) => c.games, need: 10 },
  { key: "g50", icon: "💃", title: "Estrela da Moda", hint: "Jogue 50 partidas", got: (c) => c.games >= 50, have: (c) => c.games, need: 50 },
  { key: "w1", icon: "🥇", title: "Primeira Coroa", hint: "Vença 1 partida", got: (c) => c.wins >= 1, have: (c) => c.wins, need: 1 },
  { key: "w10", icon: "👑", title: "Rainha da Passarela", hint: "Vença 10 partidas", got: (c) => c.wins >= 10, have: (c) => c.wins, need: 10 },
  { key: "p10", icon: "🏅", title: "Sempre no Pódio", hint: "10 pódios (1º, 2º ou 3º)", got: (c) => c.podiums >= 10, have: (c) => c.podiums, need: 10 },
  { key: "m1", icon: "🌟", title: "Desfilou no Mega", hint: "Jogue 1 Mega Desfile", got: (c) => c.mega >= 1, have: (c) => c.mega, need: 1 },
  { key: "mw", icon: "🏆", title: "Campeã do Mega", hint: "Vença um Mega Desfile", got: (c) => c.mega_wins >= 1, have: (c) => c.mega_wins, need: 1 },
  { key: "f25", icon: "⭐", title: "Chuva de Estrelas", hint: "Receba 25 notas 5 estrelas", got: (c) => c.fives >= 25, have: (c) => c.fives, need: 25 },
  { key: "r3", icon: "💜", title: "Colecionadora", hint: "Compre 3 peças raras", got: (c) => c.rare >= 3, have: (c) => c.rare, need: 3 },
  { key: "r10", icon: "💎", title: "Guarda-roupa Real", hint: "Compre 10 peças raras", got: (c) => c.rare >= 10, have: (c) => c.rare, need: 10 },
];

export const trophyOf = (key: string | null | undefined) => TROPHIES.find((t) => t.title === key);
