import type { ReactElement } from "react";
import { ITEMS } from "@/lib/games/dress/items";
import { BACK_FAMILY, BODY_FAMILY } from "./BodyArt";
import { HAND_ART } from "./HandArt";
import { HEAD_ART } from "./HeadArt";

// Junta as famílias de desenho ao catálogo: cada peça (id) sabe desenhar a si mesma com as suas cores.

const family = (slot: string, fam: string) => {
  if (slot === "head") return HEAD_ART[fam];
  if (slot === "hand") return HAND_ART[fam];
  return BODY_FAMILY[`${slot}:${fam}`];
};

const front: Record<string, () => ReactElement> = {};
const back: Record<string, () => ReactElement> = {};

for (const it of ITEMS) {
  const draw = family(it.slot, it.family);
  front[it.id] = () => (draw ? draw(it.p) : <g />);
  const b = it.slot === "mantle" ? BACK_FAMILY[it.family] : undefined;
  if (b) back[it.id] = () => b(it.p);
}

/** Todas as peças (frente). */
export const ITEM_ART = front;

/** Capas que ficam atrás do corpo. */
export const ITEM_BACK = back;
