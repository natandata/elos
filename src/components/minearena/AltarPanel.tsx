"use client";

import { useSyncExternalStore } from "react";
import type { MineArena } from "@/lib/minearena/game";
import { ROMAN, describeStack, enchantCost, enchantLevel, enchantsFor, repairMaterial, repairNeeded } from "@/lib/minearena/items/enchant";
import { itemDef } from "@/lib/minearena/items/items";
import { ItemIcon } from "./ItemIcon";

/** Altar do ferreiro: consertar (material do próprio item) e abençoar (safiras + ouro). */
export function AltarPanel({ game, onClose }: { game: MineArena; onClose: () => void }) {
  const inv = game.inventory;
  useSyncExternalStore(
    (fn) => inv.subscribe(fn),
    () => inv.version,
    () => 0,
  );
  const entries = game.altarEntries();

  return (
    <div className="ma-modal">
      <div className="ma-panel">
        <header>
          <b className="ma-ctitle">⚒ Altar do ferreiro</b>
          <button type="button" className="ma-x" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        <p className="ma-info">O ferreiro prepara as armas para o seu trabalho (Is 54.16). Conserte com o material do item e peça bênçãos com safiras e ouro.</p>
        {entries.length === 0 ? (
          <p className="ma-info">Você não tem ferramentas, armas, armaduras ou escudos pra consertar ou abençoar.</p>
        ) : (
          <ul className="ma-recipes ma-altar">
            {entries.map(({ slot, stack }) => {
              const d = itemDef(stack.item);
              if (!d) return null;
              const mat = repairMaterial(stack.item);
              const need = repairNeeded(stack);
              const matName = mat ? (itemDef(mat)?.name ?? mat) : "";
              return (
                <li key={slot} data-ready="true">
                  <ItemIcon item={stack.item} stack={stack} size={42} />
                  <span className="ma-r-body">
                    <b>{describeStack(stack)}</b>
                    <span className="ma-altar-actions">
                      {need > 0 && mat ? (
                        <button type="button" className="ma-btn ma-btn-sm" disabled={inv.count(mat) < 1} onClick={() => game.repairItem(slot)}>
                          🔧 Consertar (1× {matName}, tem {Math.min(99, inv.count(mat))})
                        </button>
                      ) : null}
                      {enchantsFor(stack).map((e) => {
                        const cost = enchantCost(stack, e.key);
                        const ok = cost.every((c) => inv.count(c.item) >= c.count);
                        return (
                          <button key={e.key} type="button" className="ma-btn ma-btn-sm ma-btn-ench" disabled={!ok} title={`${e.effect} (${e.verse})`} onClick={() => game.enchantItem(slot, e.key)}>
                            ✨ {e.name} {ROMAN[enchantLevel(stack, e.key) + 1]} · {cost.map((c) => `${c.count}× ${itemDef(c.item)?.name}`).join(" + ")}
                          </button>
                        );
                      })}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
