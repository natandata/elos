import type { GameKey } from "./catalog";

/** Um dos 3 primeiros do ranking de troféus (vem da função `trophy_top3`). */
export type TrophyLeader = { name: string | null; avatar: string | null; trophies: number };

/** Linha do balanço semanal de um jogo (vem da função `weekly_games_stats`). */
export type WeeklyGame = {
  game: string;
  matches: number;
  minutes: number;
  players: number;
  top: { name: string | null; avatar: string | null; plays: number } | null;
};

type Meta = { key: GameKey; title: string; emoji: string; href: string; cover: string | null; bg: string };

/** Jogos que contam no destaque semanal (os que guardam partidas no servidor). */
export const WEEKLY_META: Record<string, Meta> = {
  arena: { key: "arena", title: "Arena dos Heróis", emoji: "🏰", href: "/app/jogos/arena", cover: "/arena/capa.webp", bg: "#1b1208" },
  memory: { key: "memory", title: "Memória dos Heróis", emoji: "🃏", href: "/app/jogos/memoria", cover: "/memoria/capa.webp", bg: "#2a2a3a" },
  dress: { key: "dress", title: "Vista o Herói", emoji: "👗", href: "/app/jogos/vestir", cover: "/dress/capa.webp", bg: "#34104f" },
  arenasoccer: { key: "arenasoccer", title: "ArenaSoccer", emoji: "⚽", href: "/app/jogos/arenasoccer", cover: "/arenasoccer/capa.webp", bg: "linear-gradient(135deg,#0d3b22,#1f9a52)" },
  quiz: { key: "quiz", title: "Quiz do Dia", emoji: "🧠", href: "/app/jogos/quiz", cover: null, bg: "linear-gradient(135deg,#3b2a8a,#7a3fd1)" },
  verse: { key: "verse", title: "Complete o Versículo", emoji: "📖", href: "/app/jogos/versiculo", cover: null, bg: "linear-gradient(135deg,#7a4a12,#d6a23a)" },
  who: { key: "who", title: "Quem Sou Eu?", emoji: "🕵️", href: "/app/jogos/quem-sou-eu", cover: null, bg: "linear-gradient(135deg,#124a52,#2fa3a8)" },
  order: { key: "order", title: "Ordene os Fatos", emoji: "⏳", href: "/app/jogos/ordem", cover: null, bg: "linear-gradient(135deg,#5a1a2e,#c24a6a)" },
  duel: { key: "duel", title: "Duelo 1x1 do Quiz", emoji: "⚡", href: "/app/jogos/duelo", cover: null, bg: "linear-gradient(135deg,#6a2a0e,#e0702a)" },
};

/** O jogo mais jogado da semana entre os liberados (empate: quem tem mais minutos). */
export function pickTopGame(rows: WeeklyGame[], allowed: string[]): WeeklyGame | null {
  const ok = rows.filter((r) => allowed.includes(r.game) && WEEKLY_META[r.game] && r.matches > 0);
  ok.sort((a, b) => b.matches - a.matches || b.minutes - a.minutes);
  return ok[0] ?? null;
}
