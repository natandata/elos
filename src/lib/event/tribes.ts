// Evento das tribos (Acampadentro): dados fixos das três tribos. Client-safe.

export type TribeKey = "feras" | "bravos" | "reliquias";

export type Tribe = {
  key: TribeKey;
  name: string;
  animal: string;
  /** cor principal, tom claro de fundo e tom escuro de texto sobre elas */
  base: string;
  soft: string;
  dark: string;
  img: string;
  theme: string;
};

export const TRIBES: Record<TribeKey, Tribe> = {
  feras: { key: "feras", name: "Feras", animal: "Tigre", base: "#F2B318", soft: "#FFF4D1", dark: "#5C4000", img: "/evento/brasao-feras.webp", theme: "tribo-feras" },
  bravos: { key: "bravos", name: "Bravos", animal: "Tubarão", base: "#2FA866", soft: "#DFF5E8", dark: "#0F4A2A", img: "/evento/brasao-bravos.webp", theme: "tribo-bravos" },
  reliquias: { key: "reliquias", name: "Relíquias", animal: "Panda", base: "#D93A41", soft: "#FBE1E2", dark: "#7A1418", img: "/evento/brasao-reliquias.webp", theme: "tribo-reliquias" },
};
export const TRIBE_KEYS = Object.keys(TRIBES) as TribeKey[];
export const isTribeKey = (v: unknown): v is TribeKey => typeof v === "string" && v in TRIBES;

export type EventTribeState = { key: TribeKey; name: string; animal: string; color: string; points: number; members: number; rank: number };
export type EventState = {
  visible: boolean;
  name?: string;
  event_date?: string;
  ends_at?: string;
  active?: boolean;
  me?: TribeKey | null;
  days_left?: number;
  tribes?: EventTribeState[];
};
