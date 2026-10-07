// Modo Campanha da Arena dos Heróis (client-safe): 8 arenas, cada uma com um chefe e uma ambientação.
import { CAMPAIGN_CARDS } from "./campaignCards";
import type { ArenaTheme } from "./arenas";

/** Os dois lados jogam com os 8 personagens. */
export const CAMPAIGN_DECK = CAMPAIGN_CARDS.map((c) => c.key);

export const CAMPAIGN_XP = 2;
/** Vitória mais rápida que isso não conta (evita partida fantasma). */
export const CAMPAIGN_MIN_SECONDS = 30;

export type CampaignStage = {
  n: number;
  /** chave do cenário desenhado no campo */
  scenery: string;
  /** carta do chefe */
  boss: string;
  name: string;
  setting: string;
  blurb: string;
  /** ilustração da arena (/public) */
  art: string;
  emoji: string;
  /** bônus de vida e dano do computador (0,1 = 10% mais forte) */
  botBoost: number;
  theme: ArenaTheme;
};

const T = (t: Partial<ArenaTheme> & Pick<ArenaTheme, "grass" | "grassAlt" | "path" | "pathEdge" | "water" | "waterEdge">): ArenaTheme => ({
  shade: "rgba(0,0,0,0.16)",
  waterLine: "rgba(255,255,255,0.5)",
  bushDark: "#2f7d32",
  bushMid: "#43a047",
  bushLight: "#66bb6a",
  bushShadow: "rgba(20,40,20,0.35)",
  rock: "#8c96a3",
  rockChance: 0.2,
  ...t,
});

export const CAMPAIGN_STAGES: CampaignStage[] = [
  {
    n: 1, scenery: "c-selva", boss: "amandinha", name: "Arena da Amandinha", setting: "Selva", emoji: "🌿", art: "/arena/campanha/arena-1.webp", botBoost: 0,
    blurb: "Uma floresta cheia de bichinhos. Cuidado: eles chegam em bando!",
    theme: T({ grass: "#3f8f3a", grassAlt: "#378533", shade: "rgba(10,50,15,0.22)", path: "#b58d56", pathEdge: "#98723f", water: ["#4aa8a0", "#2a7f86"], waterEdge: "#1c6068", bushDark: "#1f6a2b", bushMid: "#2e8b3a", bushLight: "#55b04e", rockChance: 0.25 }),
  },
  {
    n: 2, scenery: "c-paris", boss: "mbappe", name: "Arena do Mbappé", setting: "Paris", emoji: "🗼", art: "/arena/campanha/arena-2.webp", botBoost: 0.03,
    blurb: "Paris, à beira do Sena. Quem piscar, já era: ele é rapidíssimo.",
    theme: T({ grass: "#8bbf74", grassAlt: "#82b66b", path: "#e6dcc8", pathEdge: "#c9bda3", water: ["#6fa8d8", "#4a7fb5"], waterEdge: "#34608f", bushDark: "#3f7d3a", bushMid: "#5a9a4c", bushLight: "#86c06e", rock: "#b6bcc6", rockChance: 0.1 }),
  },
  {
    n: 3, scenery: "c-quartel", boss: "nery", name: "Arena do Nery", setting: "Quartel", emoji: "🪖", art: "/arena/campanha/arena-3.webp", botBoost: 0.06,
    blurb: "Campo de treinamento. O sargento é duro na queda e não perde o fôlego.",
    theme: T({ grass: "#7d8a52", grassAlt: "#747f4a", shade: "rgba(40,40,10,0.2)", path: "#b39a6a", pathEdge: "#8f7a4f", water: ["#8a7a52", "#6b5d3c"], waterEdge: "#4d4229", waterLine: "rgba(255,240,200,0.35)", bushDark: "#4b5a2b", bushMid: "#62753a", bushLight: "#7f9450", rockChance: 0.5 }),
  },
  {
    n: 4, scenery: "c-rock", boss: "henrique", name: "Arena do Henrique", setting: "Show de Rock", emoji: "🎸", art: "/arena/campanha/arena-4.webp", botBoost: 0.09,
    blurb: "Palco, luzes e muito barulho. O solo dele pega todo mundo junto.",
    theme: T({ grass: "#3a3350", grassAlt: "#342d48", shade: "rgba(120,60,200,0.18)", path: "#5a4d78", pathEdge: "#3f3458", water: ["#7b3fe4", "#4c1d95"], waterEdge: "#2e1065", waterLine: "rgba(244,114,182,0.7)", bushDark: "#241f38", bushMid: "#322b4d", bushLight: "#4a3f70", bushShadow: "rgba(0,0,0,0.4)", rock: "#6b6b85", rockChance: 0.4 }),
  },
  {
    n: 5, scenery: "c-aula", boss: "tiaaline", name: "Arena da Tia Aline", setting: "Sala de aula", emoji: "📚", art: "/arena/campanha/arena-5.webp", botBoost: 0.13,
    blurb: "A professora cuida dos alunos e joga livro de longe. Preste atenção!",
    theme: T({ grass: "#c9a36b", grassAlt: "#bf9860", shade: "rgba(90,60,20,0.14)", path: "#9fb6cf", pathEdge: "#7c95b0", water: ["#8ab4d8", "#6b97c0"], waterEdge: "#4f7aa3", bushDark: "#8a5a2b", bushMid: "#a8703a", bushLight: "#c48b4e", bushShadow: "rgba(60,30,10,0.3)", rock: "#a79b8a", rockChance: 0.15 }),
  },
  {
    n: 6, scenery: "c-igreja", boss: "marcelinho", name: "Arena do Marcelinho", setting: "Igreja", emoji: "⛪", art: "/arena/campanha/arena-6.webp", botBoost: 0.17,
    blurb: "Dentro do templo, o Marcelinho chega com a turma e derruba os muros.",
    theme: T({ grass: "#b8a58a", grassAlt: "#ad9a7f", shade: "rgba(60,40,20,0.16)", path: "#a33a3a", pathEdge: "#7a2626", water: ["#9bb8da", "#6d93bc"], waterEdge: "#4b6f98", bushDark: "#5a3d22", bushMid: "#74502d", bushLight: "#93693a", bushShadow: "rgba(40,20,10,0.3)", rock: "#cfc6b8", rockChance: 0.25 }),
  },
  {
    n: 7, scenery: "c-casamento", boss: "natanrebeca", name: "Arena do Natan e da Rebeca", setting: "Festa de casamento", emoji: "💍", art: "/arena/campanha/arena-7.webp", botBoost: 0.21,
    blurb: "Festa linda, mas o casal luta junto e se cuida. Dois contra você!",
    theme: T({ grass: "#9fd07a", grassAlt: "#96c871", path: "#f5ebe0", pathEdge: "#d9c9b4", water: ["#f9a8d4", "#ec6aa8"], waterEdge: "#c04884", waterLine: "rgba(255,255,255,0.7)", bushDark: "#4f9a56", bushMid: "#e879a8", bushLight: "#f9b6d2", bushShadow: "rgba(90,30,60,0.25)", rock: "#e5e7eb", rockChance: 0.05 }),
  },
  {
    n: 8, scenery: "c-gabinete", boss: "zepa", name: "Arena do Pastor Zepa", setting: "Gabinete pastoral", emoji: "📖", art: "/arena/campanha/arena-8.webp", botBoost: 0.26,
    blurb: "O gabinete do pastor. O último desafio: o mais forte de todos.",
    theme: T({ grass: "#6b4a34", grassAlt: "#624430", shade: "rgba(0,0,0,0.22)", path: "#7f1d1d", pathEdge: "#5a1212", water: ["#1e3a5f", "#14284a"], waterEdge: "#0b1a33", waterLine: "rgba(250,204,21,0.45)", bushDark: "#3b2615", bushMid: "#52361d", bushLight: "#70492a", bushShadow: "rgba(0,0,0,0.4)", rock: "#8b7a66", rockChance: 0.2 }),
  },
];

export const CAMPAIGN_STAGE_COUNT = CAMPAIGN_STAGES.length;

/** A etapa `n` (0–7) está liberada, dado quais etapas já foram vencidas? */
export const stageUnlocked = (stage: number, cleared: ReadonlySet<number> | number[]): boolean => {
  const set = cleared instanceof Set ? cleared : new Set(cleared);
  return stage === 0 || set.has(stage - 1);
};
