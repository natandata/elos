// Salas ao vivo do "Vista o Herói" (client-safe): o que o banco devolve e as regras que a tela precisa conhecer.
// A partida em si (fases, relógio, votos, pontuação) é decidida no banco: supabase/migrations/0178_dress_live_rooms.sql.
import { SLOTS, type Look } from "./items";

export type Phase = "lobby" | "intermission" | "theme" | "dressing" | "prep" | "runway" | "voting" | "calc" | "podium" | "rewards";

export type RoomPlayer = {
  id: string;
  name: string;
  /** está na rodada em andamento (quem entra no meio assiste e joga a próxima) */
  eligible: boolean;
  ready: boolean;
  online: boolean;
  /** só vem a partir do desfile: durante o camarim ninguém vê o look das outras */
  look: Look | null;
  beauty: unknown;
  pose: string | null;
};

export type RoomResult = { id: string; place: number; score: number; votes: number; avg: number | null; tickets: number };

export type RoomState = {
  code: string;
  phase: Phase;
  round: number;
  theme: string | null;
  public: boolean;
  host: string;
  /** quanto falta da fase (o banco manda o que resta, então o relógio do aparelho não importa) */
  left_ms: number | null;
  total_ms: number | null;
  order: string[];
  /** posição (a partir de 1) de quem está na passarela */
  idx: number;
  min_players: number;
  max_players: number;
  /** Mega Desfile (domingo 15h): uma rodada com muito mais jogadoras */
  mega?: boolean;
  event_at?: string | null;
  players: RoomPlayer[];
  results: RoomResult[];
  me: { id: string; eligible: boolean; ready: boolean; look: Look; beauty: unknown; pose: string; tickets: number; voted: string[] };
};

export type RoomAd = { code: string; host: string | null; players: number; max: number; phase: Phase };

/** Limite de itens vestidos. Hoje a boneca tem menos espaços do que isso; o limite já vale quando entrarem mais camadas. */
export const DRESS_ITEM_LIMIT = 18;

/** Peças que contam para o limite: uma por espaço ocupado (a mesma conta em todas as telas). */
export function countItems(look: Look | null | undefined): number {
  if (!look) return 0;
  return SLOTS.filter((s) => {
    const id = look[s.key];
    return !!id && !id.endsWith("_none");
  }).length;
}

/** Poses do fim da passarela (movimento da modelo ao parar; ver .vh-walker[data-pose] no CSS). */
export const POSES = [
  { key: "modelo", label: "Modelo", icon: "💃" },
  { key: "realeza", label: "Realeza", icon: "👑" },
  { key: "celebracao", label: "Celebração", icon: "🎉" },
  { key: "elegante", label: "Elegante", icon: "🕊️" },
  { key: "viajante", label: "Viajante", icon: "🧭" },
  { key: "dramatica", label: "Dramática", icon: "✨" },
] as const;
export type PoseKey = (typeof POSES)[number]["key"];
export const cleanPose = (v: unknown): PoseKey => (POSES.some((p) => p.key === v) ? (v as PoseKey) : "modelo");

export const PHASE_LABEL: Record<Phase, string> = {
  lobby: "Aguardando jogadoras",
  intermission: "A rodada já vai começar",
  theme: "Tema da rodada",
  dressing: "Camarim",
  prep: "Preparando a passarela",
  runway: "Desfile",
  voting: "Últimos votos",
  calc: "Apurando as notas",
  podium: "Pódio",
  rewards: "Recompensas",
};

export const cleanCode = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
export const firstName = (name: string): string => name.trim().split(/\s+/).slice(0, 2).join(" ");
