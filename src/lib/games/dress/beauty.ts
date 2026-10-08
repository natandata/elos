// Personalização da avatar no "Vista o Herói" (client-safe): cabelo, pele e maquiagem, como no camarim do Dress to Impress.
import type { DollBase } from "./characters";

export type HairStyle = "long" | "braids" | "short";
export type Beauty = { hair: HairStyle; hairColor: string; skin: string; lip: string; shadow: string | null };

export const HAIR_STYLES: { key: HairStyle; label: string; emoji: string }[] = [
  { key: "long", label: "Solto", emoji: "💇‍♀️" },
  { key: "braids", label: "Tranças", emoji: "🪢" },
  { key: "short", label: "Curto", emoji: "✂️" },
];

export const HAIR_COLORS = ["#24150c", "#4a2c14", "#7a4a22", "#b07a42", "#d9b25a", "#ecd699", "#a8321f", "#d8d8e0", "#6f6f80", "#7c4dbd", "#2f6bd0", "#d9488f"];
export const SKINS = ["#f6d9bd", "#f1c9a0", "#d9a66f", "#b97b4b", "#8d5a36", "#6a4128"];
export const LIPS = ["#d9606d", "#b83227", "#9b1c3a", "#e8789a", "#c0603a", "#6b2d8c", "#7a3a3a", "#e0907a"];
export const SHADOWS: (string | null)[] = [null, "#a98fd0", "#2f5fb0", "#2aa7a0", "#d9a21a", "#e8789a", "#6b4a2a"];

export const DEFAULT_BEAUTY: Beauty = { hair: "long", hairColor: HAIR_COLORS[1], skin: SKINS[1], lip: LIPS[0], shadow: null };

/** Valida o que veio do cliente: só vale o que está nas paletas. */
export function cleanBeauty(raw: unknown): Beauty {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T,>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
  return {
    hair: pick(r.hair, HAIR_STYLES.map((h) => h.key), DEFAULT_BEAUTY.hair),
    hairColor: pick(r.hairColor, HAIR_COLORS, DEFAULT_BEAUTY.hairColor),
    skin: pick(r.skin, SKINS, DEFAULT_BEAUTY.skin),
    lip: pick(r.lip, LIPS, DEFAULT_BEAUTY.lip),
    shadow: pick(r.shadow, SHADOWS, null),
  };
}

/** Base do boneco a partir da personalização (a avatar é sempre a do jogador, não a do tema). */
export function baseFromBeauty(b: Beauty): DollBase {
  return { skin: b.skin, hair: b.hair, hairColor: b.hairColor, beard: "none", female: true, lip: b.lip, shadow: b.shadow ?? undefined };
}
