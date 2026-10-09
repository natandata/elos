// Minigames do MineArena: Jogos Vorazes (battle royale), Skywars e Batalha de Construção. Client-safe.
import type { GenResult } from "../story/types";

export type MiniGame = "hunger" | "skywars" | "build";

export interface MiniInfo {
  id: MiniGame;
  name: string;
  emoji: string;
  tagline: string;
  how: string[];
  min: number;
  max: number;
}

export const MINI_GAMES: MiniInfo[] = [
  {
    id: "hunger",
    name: "Jogos Vorazes",
    emoji: "🏹",
    tagline: "Battle royale: só um sobrevive.",
    how: ["Todos começam em volta da Cornucópia, no centro do mapa.", "Pontes sobre a água levam aos baús do centro (os melhores itens). Lá fora tem casas e ruínas com baús.", "A zona segura vai diminuindo: quem ficar fora dela perde vida.", "O último de pé vence."],
    min: 3,
    max: 10,
  },
  {
    id: "skywars",
    name: "Skywars",
    emoji: "☁️",
    tagline: "Ilhas no céu: derrube os outros no vazio.",
    how: ["Cada jogador começa numa ilha, dentro de uma cela de vidro.", "Abra os baús da sua ilha, monte uma ponte e vá pegar os melhores itens na ilha do meio.", "Quem cair no vazio está eliminado. Os baús são reabastecidos no meio da partida.", "O último de pé vence."],
    min: 2,
    max: 8,
  },
  {
    id: "build",
    name: "Batalha de Construção",
    emoji: "🏗️",
    tagline: "Construa o tema melhor que todo mundo.",
    how: ["Todos recebem o mesmo tema e um terreno só seu.", "Construa dentro do seu terreno: você tem todos os blocos (modo criativo).", "Quando o tempo acaba, cada construção é visitada e os outros dão nota de 1 a 5.", "A melhor nota ganha."],
    min: 2,
    max: 8,
  },
];
export const MINI_BY_ID = new Map(MINI_GAMES.map((g) => [g.id, g]));

export interface MiniPlayer {
  id: string;
  name: string;
}

export type ZoneStage = { wait: number; shrink: number; r: number; dmg: number };

export interface MiniMap {
  game: MiniGame;
  center: { x: number; z: number };
  /** pontos de partida (um por jogador) */
  spawns: { x: number; y: number; z: number; yaw: number }[];
  /** raio da parede invisível (hunger/skywars) */
  limit: number;
  /** abaixo disto o jogador cai no vazio e é eliminado */
  voidY: number;
  zone: ZoneStage[];
  /** celas de vidro (skywars): cantos mínimos e máximos, removidas na largada */
  cages: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }[];
  /** terrenos da batalha de construção */
  plots: { x0: number; z0: number; x1: number; z1: number; floorY: number; ceilY: number }[];
  time: number;
  generate: (cx: number, cz: number) => GenResult;
}

/** O que a interface precisa saber da partida (sai do motor a cada ~0,12 s). */
export interface MiniHud {
  game: MiniGame;
  phase: "countdown" | "play" | "judge" | "end";
  /** segundos restantes da fase atual */
  left: number;
  alive: number;
  total: number;
  spectating: boolean;
  /** zona: raio atual, raio alvo, e se está encolhendo */
  zone: { r: number; target: number; shrinking: boolean; nextIn: number } | null;
  outside: boolean;
  /** quem está vivo (nomes) e abates */
  kills: number;
  theme: string | null;
  /** batalha de construção: de quem é a construção em julgamento */
  judging: { name: string; mine: boolean; idx: number; of: number; voted: number | null } | null;
  /** avisos curtos de abate/eliminação */
  feed: { id: number; text: string }[];
  /** fim de partida */
  result: MiniResult | null;
  /** o jogador local está na rodada (quem entra depois assiste) */
  announce: string | null;
}

export interface MiniResult {
  title: string;
  /** colocação final, do 1º ao último */
  ranks: { id: string; name: string; place: number; note: string }[];
  mePlace: number;
}

export const THEMES = [
  "Arca de Noé",
  "Torre de Babel",
  "Templo de Salomão",
  "Muralha de Jericó",
  "Casa na árvore",
  "Castelo medieval",
  "Fazenda feliz",
  "Navio pirata",
  "Igreja da cidade",
  "Parque de diversões",
  "Vulcão",
  "Ilha deserta",
  "Floresta encantada",
  "Aquário gigante",
  "Estação espacial",
  "Cidade do futuro",
  "Cabana de pescador",
  "Moinho de vento",
  "Jardim do Éden",
  "Estádio de futebol",
  "Biblioteca",
  "Circo",
  "Dinossauro",
  "Sorveteria",
];
