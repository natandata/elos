"use client";

import { useSyncExternalStore } from "react";
import type { MineArena } from "@/lib/minearena/game";
import { itemDef } from "@/lib/minearena/items/items";
import { ItemIcon } from "./ItemIcon";

/** Comércio com aldeões: troca de itens (o ouro é a moeda). */
export function TradePanel({ game, villager, onClose }: { game: MineArena; villager: string; onClose: () => void }) {
  const inv = game.inventory;
  useSyncExternalStore(
    (fn) => inv.subscribe(fn),
    () => inv.version,
    () => 0,
  );
  const trades = game.trades(villager);
  return (
    <div className="ma-modal">
      <div className="ma-panel">
        <header>
          <b className="ma-ctitle">🤝 Comerciar</b>
          <button type="button" className="ma-x" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        <p className="ma-info">“Dê, e dar-se-vos-á” (Lc 6.38). Troque o que sobra por ouro, e o ouro por mantimentos e ferramentas.</p>
        <ul className="ma-recipes">
          {trades.map((t, i) => {
            const ok = inv.count(t.give.item) >= t.give.count;
            return (
              <li key={i} data-ready={ok}>
                <ItemIcon item={t.give.item} count={t.give.count} size={42} />
                <span className="ma-cgarrow" aria-hidden>
                  ➜
                </span>
                <ItemIcon item={t.get.item} count={t.get.count} size={42} />
                <span className="ma-r-body">
                  <b>
                    {t.give.count}× {itemDef(t.give.item)?.name} → {t.get.count}× {itemDef(t.get.item)?.name}
                  </b>
                  <span className="ma-r-ing">
                    <i data-ok={ok}>você tem {Math.min(999, inv.count(t.give.item))}</i>
                  </span>
                </span>
                <button type="button" className="ma-btn ma-btn-sm" disabled={!ok} onClick={() => game.doTrade(villager, i)}>
                  Trocar
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
