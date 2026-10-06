import { BLOCKS } from "@/lib/minearena/blocks/blocks";
import { RARITY_COLOR, itemDef } from "@/lib/minearena/items/items";

export const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

/** Ícone de item: bloco vira um cubinho colorido; o resto, emoji sobre fundo na cor do item. */
export function ItemIcon({ item, count, size = 40 }: { item: string; count?: number; size?: number }) {
  const def = itemDef(item);
  if (!def) return null;
  const block = def.block !== undefined ? BLOCKS[def.block] : null;
  return (
    <span className="ma-icon" style={{ width: size, height: size }} title={def.name}>
      {block ? (
        <span className="ma-cube" style={{ background: `linear-gradient(180deg, ${hex(block.top)} 0 32%, ${hex(block.sideTop !== undefined ? block.side : block.side)} 32% 100%)`, width: size * 0.66, height: size * 0.66 }} />
      ) : (
        <span className="ma-emoji" style={{ fontSize: size * 0.58, filter: `drop-shadow(0 0 4px ${hex(def.color)})` }}>
          {def.icon}
        </span>
      )}
      {count !== undefined && count > 1 ? <b className="ma-count">{count}</b> : null}
      {def.rarity !== "comum" ? <i className="ma-rarity-dot" style={{ background: RARITY_COLOR[def.rarity] }} /> : null}
    </span>
  );
}
