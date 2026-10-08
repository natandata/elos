// Personalização da avatar no "Vista o Herói" (client-safe): cabelo, pele e maquiagem, como no camarim do Dress to Impress.
import type { DollBase } from "./characters";

export type HairStyle = "long" | "braids" | "short";
export type LipStyle = "fosco" | "gloss" | "degrade";
export type LinerStyle = "none" | "fino" | "gatinho" | "grosso";
export type LashStyle = "none" | "natural" | "longos" | "dramaticos";
export type BrowStyle = "afiladas" | "grossas" | "arqueadas" | "retas" | "finas";
export type Mark = "sardas" | "pinta" | "brilho" | "pontos";

export type Beauty = {
  hair: HairStyle;
  hairColor: string;
  skin: string;
  lip: string;
  lipStyle: LipStyle;
  shadow: string | null;
  blush: string | null;
  eye: string;
  liner: LinerStyle;
  linerColor: string;
  lashes: LashStyle;
  brows: BrowStyle;
  /** null = da cor do cabelo */
  browColor: string | null;
  marks: Mark[];
};

export const HAIR_STYLES: { key: HairStyle; label: string; emoji: string }[] = [
  { key: "long", label: "Solto", emoji: "💇‍♀️" },
  { key: "braids", label: "Tranças", emoji: "🪢" },
  { key: "short", label: "Curto", emoji: "✂️" },
];

export const HAIR_COLORS = ["#24150c", "#4a2c14", "#7a4a22", "#b07a42", "#d9b25a", "#ecd699", "#a8321f", "#d8d8e0", "#6f6f80", "#7c4dbd", "#2f6bd0", "#d9488f"];
export const SKINS = ["#f6d9bd", "#f1c9a0", "#d9a66f", "#b97b4b", "#8d5a36", "#6a4128"];
export const LIPS = ["#d9606d", "#b83227", "#9b1c3a", "#e8789a", "#c0603a", "#6b2d8c", "#7a3a3a", "#e0907a", "#f2a6b8", "#c9485b", "#8c2f39", "#d98866", "#a8556a", "#5a1f2e", "#e8c2b0", "#c43a6e"];
export const SHADOWS: (string | null)[] = [null, "#a98fd0", "#2f5fb0", "#2aa7a0", "#d9a21a", "#e8789a", "#6b4a2a", "#c9a227", "#8a5a3a", "#3a7d44", "#6b2d8c", "#b84a4a", "#7fa8e0", "#c9ced6", "#2b2b33"];
export const BLUSHES: (string | null)[] = [null, "#ff8a8a", "#f2a6b8", "#e8789a", "#e0907a", "#d9606d", "#c9704a", "#b8553a", "#c08aa8", "#e8b27a"];
export const EYE_COLORS = ["#6a3f1c", "#3a2412", "#2f6bd0", "#3a8a8a", "#3a7d44", "#7a8a3a", "#7a7a85", "#8a5a9a", "#c9a227"];
export const LINER_COLORS = ["#150c07", "#4a2c14", "#27407a", "#6b2d8c", "#2f6f4a", "#c9a227", "#9b1c3a"];
export const BROW_COLORS: (string | null)[] = [null, "#150c07", "#4a2c14", "#7a4a22", "#b07a42", "#8a8f99"];

export const LIP_STYLES: { key: LipStyle; label: string }[] = [
  { key: "fosco", label: "Fosco" },
  { key: "gloss", label: "Gloss" },
  { key: "degrade", label: "Degradê" },
];
export const LINER_STYLES: { key: LinerStyle; label: string }[] = [
  { key: "none", label: "Sem" },
  { key: "fino", label: "Fino" },
  { key: "gatinho", label: "Gatinho" },
  { key: "grosso", label: "Grosso" },
];
export const LASH_STYLES: { key: LashStyle; label: string }[] = [
  { key: "none", label: "Sem" },
  { key: "natural", label: "Naturais" },
  { key: "longos", label: "Longos" },
  { key: "dramaticos", label: "Dramáticos" },
];
export const BROW_STYLES: { key: BrowStyle; label: string }[] = [
  { key: "afiladas", label: "Afiladas" },
  { key: "grossas", label: "Grossas" },
  { key: "arqueadas", label: "Arqueadas" },
  { key: "retas", label: "Retas" },
  { key: "finas", label: "Finas" },
];
export const MARKS: { key: Mark; label: string; icon: string }[] = [
  { key: "sardas", label: "Sardas", icon: "🌼" },
  { key: "pinta", label: "Pinta", icon: "●" },
  { key: "brilho", label: "Brilho", icon: "✨" },
  { key: "pontos", label: "Pontos dourados", icon: "🟡" },
];

export const DEFAULT_BEAUTY: Beauty = {
  hair: "long",
  hairColor: HAIR_COLORS[1],
  skin: SKINS[1],
  lip: LIPS[0],
  lipStyle: "fosco",
  shadow: null,
  blush: BLUSHES[1],
  eye: EYE_COLORS[0],
  liner: "none",
  linerColor: LINER_COLORS[0],
  lashes: "natural",
  brows: "afiladas",
  browColor: null,
  marks: [],
};

/** Valida o que veio do cliente: só vale o que está nas paletas. Campos que faltam (looks antigos) usam o padrão. */
export function cleanBeauty(raw: unknown): Beauty {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T,>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
  const D = DEFAULT_BEAUTY;
  return {
    hair: pick(r.hair, HAIR_STYLES.map((h) => h.key), D.hair),
    hairColor: pick(r.hairColor, HAIR_COLORS, D.hairColor),
    skin: pick(r.skin, SKINS, D.skin),
    lip: pick(r.lip, LIPS, D.lip),
    lipStyle: pick(r.lipStyle, LIP_STYLES.map((x) => x.key), D.lipStyle),
    shadow: pick(r.shadow, SHADOWS, null),
    blush: r.blush === undefined ? D.blush : pick(r.blush, BLUSHES, null),
    eye: pick(r.eye, EYE_COLORS, D.eye),
    liner: pick(r.liner, LINER_STYLES.map((x) => x.key), D.liner),
    linerColor: pick(r.linerColor, LINER_COLORS, D.linerColor),
    lashes: pick(r.lashes, LASH_STYLES.map((x) => x.key), D.lashes),
    brows: pick(r.brows, BROW_STYLES.map((x) => x.key), D.brows),
    browColor: pick(r.browColor, BROW_COLORS, null),
    marks: Array.isArray(r.marks) ? MARKS.map((m) => m.key).filter((k) => (r.marks as unknown[]).includes(k)) : [],
  };
}

/** Base do boneco a partir da personalização (a avatar é sempre a do jogador, não a do tema). */
export function baseFromBeauty(b: Beauty): DollBase {
  return {
    skin: b.skin,
    hair: b.hair,
    hairColor: b.hairColor,
    beard: "none",
    female: true,
    lip: b.lip,
    shadow: b.shadow ?? undefined,
    face: { lipStyle: b.lipStyle, blush: b.blush, eye: b.eye, liner: b.liner, linerColor: b.linerColor, lashes: b.lashes, brows: b.brows, browColor: b.browColor, marks: b.marks },
  };
}
