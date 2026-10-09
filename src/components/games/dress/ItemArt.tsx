import type { ReactElement } from "react";
import { ITEM_BY_ID } from "@/lib/games/dress/items";
import { BACK_FAMILY, BODY_FAMILY } from "./BodyArt";
import { HAND_ART } from "./HandArt";
import { HEAD_ART } from "./HeadArt";
import { EARS_ART, NECK_ART, WRIST_ART } from "./JewelArt";
import { MORE_BACK, MORE_MANTLE, MORE_SHOES, MORE_TUNIC } from "./MoreBodyArt";
import { MORE_HAND } from "./MoreHandArt";
import { MORE_HEAD } from "./MoreHeadArt";
import { LIMITED_ART, LIMITED_BACK } from "./LimitedArt";
import type { Params } from "@/lib/games/dress/items";

// Junta as famílias de desenho ao catálogo: cada peça (id) sabe desenhar a si mesma com as suas cores e o seu tamanho.

type Draw = (p: Params) => ReactElement;
const MORE_BODY: Record<string, Draw> = {
  ...Object.fromEntries(Object.entries(MORE_TUNIC).map(([k, v]) => [`tunic:${k}`, v])),
  ...Object.fromEntries(Object.entries(MORE_MANTLE).map(([k, v]) => [`mantle:${k}`, v])),
  ...Object.fromEntries(Object.entries(MORE_SHOES).map(([k, v]) => [`shoes:${k}`, v])),
};

const family = (slot: string, fam: string): Draw | undefined => {
  if (LIMITED_ART[`${slot}:${fam}`]) return LIMITED_ART[`${slot}:${fam}`];
  if (slot === "head") return HEAD_ART[fam] ?? MORE_HEAD[fam];
  if (slot === "hand") return HAND_ART[fam] ?? MORE_HAND[fam];
  if (slot === "ears") return EARS_ART[fam];
  if (slot === "neck") return NECK_ART[fam];
  if (slot === "wrist") return WRIST_ART[fam];
  return BODY_FAMILY[`${slot}:${fam}`] ?? MORE_BODY[`${slot}:${fam}`];
};

/** Desenha a peça (ou a parte dela que fica atrás do corpo, para capas e asas). */
export function drawItem(id: string | undefined, back = false): ReactElement | null {
  if (!id) return null;
  const it = ITEM_BY_ID.get(id);
  if (!it) return null;
  if (back) {
    const b = it.slot === "mantle" ? (BACK_FAMILY[it.family] ?? MORE_BACK[it.family] ?? LIMITED_BACK[it.family]) : undefined;
    return b ? b(it.p) : null;
  }
  const draw = family(it.slot, it.family);
  return draw ? draw(it.p) : <g />;
}
