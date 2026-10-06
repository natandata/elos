"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { MineArena } from "@/lib/minearena/game";
import type { Stack } from "@/lib/minearena/items/inventory";
import { RARITY_LABEL, type Rarity, itemDef } from "@/lib/minearena/items/items";
import { ItemIcon } from "./ItemIcon";

const RARITY_INK: Record<Rarity, string> = { comum: "#3a2a12", incomum: "#1c7a1c", raro: "#1b5fc0", epico: "#7a2fc0", lendario: "#b36a00", mitico: "#c01840" };
const ARMOR_NAMES = ["Cabeça", "Peito", "Pernas", "Pés"];

/** Mochila (arrastar ou tocar-e-tocar), armadura e fabricação. */
export function InventoryPanel({ game, startTab, onClose }: { game: MineArena; startTab: "bag" | "craft"; onClose: () => void }) {
  const inv = game.inventory;
  useSyncExternalStore(
    (fn) => inv.subscribe(fn),
    () => inv.version,
    () => 0,
  );
  const [tab, setTab] = useState(startTab);
  const [held, setHeld] = useState<{ stack: NonNullable<Stack>; from: number } | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const down = useRef<number | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const place = (i: number, h: { stack: NonNullable<Stack>; from: number }) => {
    if (!inv.accepts(i, h.stack)) return;
    const cur = inv.getSlot(i);
    if (!cur) {
      inv.setSlot(i, h.stack);
      setHeld(null);
    } else if (cur.item === h.stack.item) {
      const max = itemDef(cur.item)?.maxStack ?? 1;
      const n = Math.min(max - cur.count, h.stack.count);
      cur.count += n;
      const rest = h.stack.count - n;
      setHeld(rest > 0 ? { stack: { item: h.stack.item, count: rest }, from: h.from } : null);
    } else if (inv.accepts(h.from, cur) || h.from === i) {
      inv.setSlot(i, h.stack);
      setHeld({ stack: cur, from: i });
    } else return;
    inv.changed();
  };

  const onDown = (i: number) => {
    const cur = inv.getSlot(i);
    if (cur) setInfo(`${itemDef(cur.item)?.name} · ${RARITY_LABEL[itemDef(cur.item)?.rarity ?? "comum"]}`);
    if (!held) {
      if (cur) {
        setHeld({ stack: cur, from: i });
        inv.setSlot(i, null);
        down.current = i;
        inv.changed();
      }
      return;
    }
    place(i, held);
    down.current = null;
  };
  const onUp = (i: number) => {
    if (held && down.current !== null && down.current !== i) place(i, held);
    down.current = null;
  };

  const close = () => {
    if (held) {
      const left = inv.add(held.stack.item, held.stack.count);
      if (left > 0) inv.setSlot(held.from, { item: held.stack.item, count: left });
      setHeld(null);
    }
    onClose();
  };

  const near = game.nearStation();
  const recipes = game
    .recipes()
    .map((r) => {
      const ok = r.ingredients.every((x) => inv.count(x.item) >= x.count);
      const unlocked = r.station !== "bancada" || near;
      return { r, ok, unlocked };
    })
    .sort((a, b) => Number(b.ok && b.unlocked) - Number(a.ok && a.unlocked) || Number(b.ok) - Number(a.ok));

  const slot = (i: number, label?: string) => {
    const s = inv.getSlot(i);
    return (
      <button key={i} type="button" className="ma-slot ma-slot-lg" data-on={i < 9 && i === inv.selected} onPointerDown={() => onDown(i)} onPointerUp={() => onUp(i)} aria-label={label ?? `Slot ${i}`}>
        {s ? <ItemIcon item={s.item} count={s.count} size={40} /> : label ? <small>{label}</small> : null}
      </button>
    );
  };

  return (
    <div className="ma-modal" onPointerMove={(e) => setPointer({ x: e.clientX, y: e.clientY })}>
      <div className="ma-panel">
        <header>
          <div className="ma-tabs">
            <button type="button" data-on={tab === "bag"} onClick={() => setTab("bag")}>
              🎒 Mochila
            </button>
            <button type="button" data-on={tab === "craft"} onClick={() => setTab("craft")}>
              🔨 Fabricar
            </button>
          </div>
          <button type="button" className="ma-x" onClick={close} aria-label="Fechar">
            ✕
          </button>
        </header>

        {tab === "bag" ? (
          <>
            <div className="ma-armor">
              {[0, 1, 2, 3].map((k) => slot(100 + k, ARMOR_NAMES[k]))}
              <span className="ma-def">🛡️ {inv.armorDefense()}</span>
            </div>
            <div className="ma-grid">{Array.from({ length: 27 }, (_, k) => slot(9 + k))}</div>
            <p className="ma-sep">Barra rápida</p>
            <div className="ma-grid">{Array.from({ length: 9 }, (_, k) => slot(k))}</div>
            <p className="ma-info">{info ?? "Toque num item e depois num espaço (ou arraste) pra mover. Armaduras vão nos espaços de cima."}</p>
          </>
        ) : (
          <>
            <p className="ma-info">{near ? "🔨 Bancada por perto: tudo liberado." : "Sem Bancada por perto: só receitas básicas. Coloque uma Bancada no chão."}</p>
            <ul className="ma-recipes">
              {recipes.map(({ r, ok, unlocked }) => {
                const def = itemDef(r.result.item);
                if (!def) return null;
                return (
                  <li key={r.id} data-ready={ok && unlocked}>
                    <ItemIcon item={r.result.item} count={r.result.count} size={42} />
                    <span className="ma-r-body">
                      <b style={{ color: RARITY_INK[def.rarity] }}>{def.name}</b>
                      <span className="ma-r-ing">
                        {r.ingredients.map((x) => {
                          const have = inv.count(x.item);
                          return (
                            <i key={x.item} data-ok={have >= x.count}>
                              {x.count}× {itemDef(x.item)?.name} ({Math.min(have, 99)})
                            </i>
                          );
                        })}
                        {r.station ? <i data-ok={near}>🔨 Bancada</i> : null}
                      </span>
                    </span>
                    <button type="button" className="ma-btn ma-btn-sm" disabled={!ok || !unlocked} onClick={() => game.craft(r)}>
                      Fabricar
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {held ? (
        <div className="ma-ghost" style={{ left: pointer.x - 22, top: pointer.y - 22 }}>
          <ItemIcon item={held.stack.item} count={held.stack.count} size={44} />
        </div>
      ) : null}
    </div>
  );
}
