import { RARITY_COLOR, itemDef } from "@/lib/minearena/items/items";
import { itemIconUrl } from "@/lib/minearena/textures/sprites";

export const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

/** Ícone de item: cubo texturizado para blocos e pixel art para o resto (mesmas texturas do jogo). */
export function ItemIcon({ item, count, size = 40 }: { item: string; count?: number; size?: number }) {
  const def = itemDef(item);
  if (!def) return null;
  const url = itemIconUrl(item);
  return (
    <span className="ma-icon" style={{ width: size, height: size }} title={def.name}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ma-pix" src={url} alt={def.name} width={size * 0.82} height={size * 0.82} draggable={false} />
      ) : null}
      {count !== undefined && count > 1 ? <b className="ma-count">{count}</b> : null}
      {def.rarity !== "comum" ? <i className="ma-rarity-dot" style={{ background: RARITY_COLOR[def.rarity] }} /> : null}
    </span>
  );
}
