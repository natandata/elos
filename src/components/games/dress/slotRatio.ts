import type { Slot } from "@/lib/games/dress/items";

/** Largura / altura da janela de cada espaço (mesmas medidas de SLOT_VIEWBOX no PaperDoll). */
export const SLOT_VIEWBOX_RATIO: Record<Slot, number> = {
  head: 124 / 118,
  tunic: 128 / 236,
  mantle: 156 / 236,
  shoes: 88 / 56,
  hand: 112 / 200,
  ears: 96 / 56,
  neck: 72 / 92,
  wrist: 140 / 52,
};
