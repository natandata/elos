import { isEnchanted, maxDurability, wearOf } from "@/lib/minearena/items/enchant";
import type { Stack } from "@/lib/minearena/items/inventory";
import { RARITY_COLOR, itemDef } from "@/lib/minearena/items/items";
import { itemIconUrl } from "@/lib/minearena/textures/sprites";

export const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

/** Ícone de item: cubo texturizado para blocos e pixel art para o resto (mesmas texturas do jogo). Com `stack`, mostra a barra de desgaste e o brilho das bênçãos. */
export function ItemIcon({ item, count, size = 40, stack }: { item: string; count?: number; size?: number; stack?: Stack }) {
  const def = itemDef(item);
  if (!def) return null;
  const url = itemIconUrl(item);
  const max = stack ? maxDurability(stack.item) : 0;
  const worn = stack && max > 0 && wearOf(stack) > 0 ? Math.max(0, 1 - wearOf(stack) / max) : null;
  const ench = isEnchanted(stack);
  return (
    <span className="ma-icon" data-ench={ench} style={{ width: size, height: size }} title={def.name}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ma-pix" src={url} alt={def.name} width={size * 0.82} height={size * 0.82} draggable={false} />
      ) : null}
      {count !== undefined && count > 1 ? <b className="ma-count">{count}</b> : null}
      {def.rarity !== "comum" ? <i className="ma-rarity-dot" style={{ background: RARITY_COLOR[def.rarity] }} /> : null}
      {worn !== null ? (
        <span className="ma-dur" aria-hidden>
          <i style={{ width: `${Math.round(worn * 100)}%`, background: worn > 0.5 ? "#5fd35f" : worn > 0.2 ? "#ffcf5a" : "#ff5a5a" }} />
        </span>
      ) : null}
    </span>
  );
}
