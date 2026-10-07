"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MineArena } from "@/lib/minearena/game";
import type { Stack } from "@/lib/minearena/items/inventory";
import { ITEMS, RARITY_LABEL, type Rarity, itemDef } from "@/lib/minearena/items/items";
import { gridLayout } from "@/lib/minearena/crafting/recipes";
import { describeStack } from "@/lib/minearena/items/enchant";
import { ItemIcon } from "./ItemIcon";

/** Cores de nome por raridade, claras: o painel é azul-escuro. */
const RARITY_INK: Record<Rarity, string> = { comum: "#fbf0cf", incomum: "#8ff08f", raro: "#9cceff", epico: "#dcb4ff", lendario: "#ffcb66", mitico: "#ff94a8" };
const ARMOR_NAMES = ["Cabeça", "Peito", "Pernas", "Pés"];

/** Mochila (arrastar ou tocar-e-tocar), armadura e fabricação. */
export function InventoryPanel({ game, startTab, rotated, onClose }: { game: MineArena; startTab: "bag" | "craft" | "chest" | "furnace"; rotated: boolean; onClose: () => void }) {
  const inv = game.inventory;
  useSyncExternalStore(
    (fn) => inv.subscribe(fn),
    () => inv.version,
    () => 0,
  );
  const container = startTab === "chest" || startTab === "furnace" ? startTab : null;
  const [tab, setTab] = useState<"bag" | "craft" | "creative">(container ? "bag" : startTab === "craft" ? "craft" : "bag");
  const [furnace, setFurnace] = useState<{ burn: number; burnMax: number; cook: number } | null>(null);
  useEffect(() => {
    if (container !== "furnace") return;
    const t = window.setInterval(() => setFurnace(game.furnaceInfo()), 150);
    return () => window.clearInterval(t);
  }, [container, game]);
  const [held, setHeld] = useState<{ stack: NonNullable<Stack>; from: number } | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const down = useRef<number | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const place = (i: number, h: { stack: NonNullable<Stack>; from: number }) => {
    if (!inv.accepts(i, h.stack)) return;
    const cur = inv.getSlot(i);
    if (!cur) {
      inv.setSlot(i, h.stack);
      setHeld(null);
    } else if (cur.item === h.stack.item && (itemDef(cur.item)?.maxStack ?? 1) > 1) {
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

  const range = (a: number, n: number) => Array.from({ length: n }, (_, k) => a + k);
  const BAG_FIRST = [...range(9, 27), ...range(0, 9)];

  /** Shift + clique: manda o item pro outro lado (baú/fornalha <-> mochila, barra <-> mochila). */
  const quickMove = (i: number) => {
    const s = inv.getSlot(i);
    if (!s) return;
    const box = container === "chest" ? range(200, 27) : container === "furnace" ? [200, 201] : [];
    const targets = i >= 200 && i < 300 ? BAG_FIRST : i < 36 ? (box.length > 0 ? box : i < 9 ? range(9, 27) : range(0, 9)) : BAG_FIRST;
    const max = itemDef(s.item)?.maxStack ?? 1;
    const plain = !s.wear && !s.ench;
    let left = s.count;
    for (const t of targets) {
      if (left <= 0) break;
      const c = inv.getSlot(t);
      if (c && plain && c.item === s.item && !c.wear && !c.ench && c.count < max && inv.accepts(t, s)) {
        const n = Math.min(max - c.count, left);
        c.count += n;
        left -= n;
      }
    }
    for (const t of targets) {
      if (left <= 0) break;
      if (!inv.getSlot(t) && inv.accepts(t, s)) {
        const n = Math.min(max, left);
        inv.setSlot(t, { ...s, count: n });
        left -= n;
      }
    }
    if (left <= 0) inv.setSlot(i, null);
    else s.count = left;
    inv.changed();
  };

  const takeAll = () => {
    for (const i of range(200, 27)) quickMove(i);
    setInfo("Tudo que coube foi pra sua mochila.");
  };
  const storeAll = () => {
    for (const i of BAG_FIRST) if (i >= 9) quickMove(i);
    setInfo("Os itens da mochila foram guardados na arca.");
  };

  const onDown = (i: number, e?: { button: number; shiftKey: boolean }) => {
    const cur = inv.getSlot(i);
    if (cur) setInfo(`${describeStack(cur)} · ${RARITY_LABEL[itemDef(cur.item)?.rarity ?? "comum"]}`);
    if (e?.shiftKey && !held && cur && i < 300) {
      quickMove(i);
      down.current = null;
      return;
    }
    if (e?.button === 2) {
      // botão direito: sem item na mão, pega metade; com item na mão, larga só um
      const max = (cur ? itemDef(cur.item)?.maxStack : 1) ?? 1;
      if (!held && cur && cur.count > 1 && max > 1) {
        const take = Math.ceil(cur.count / 2);
        setHeld({ stack: { ...cur, count: take }, from: i });
        cur.count -= take;
        down.current = null;
        inv.changed();
        return;
      }
      if (held && inv.accepts(i, held.stack) && (!cur || (cur.item === held.stack.item && !cur.wear && !cur.ench && cur.count < max))) {
        if (cur) cur.count += 1;
        else inv.setSlot(i, { ...held.stack, count: 1 });
        const rest = held.stack.count - 1;
        setHeld(rest > 0 ? { ...held, stack: { ...held.stack, count: rest } } : null);
        down.current = null;
        inv.changed();
        return;
      }
    }
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
    game.clearGrid();
    if (held) {
      const left = inv.addStack(held.stack);
      if (left > 0) {
        const back = { ...held.stack, count: left };
        // volta pro lugar de onde saiu; se já estiver ocupado, cai no chão (nunca some)
        if (!inv.getSlot(held.from) && inv.accepts(held.from, back)) inv.setSlot(held.from, back);
        else game.dropStack(back);
      }
      inv.changed();
      setHeld(null);
    }
    onClose();
  };

  const near = game.nearStation();
  const size = near ? 3 : 2;
  const gridR = tab === "craft" ? game.gridRecipe(size) : null;
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const nq = norm(query.trim());
  const recipes = game
    .recipes()
    .filter((r) => !nq || norm(itemDef(r.result.item)?.name ?? "").includes(nq))
    .map((r) => {
      const ok = r.ingredients.every((x) => inv.count(x.item) >= x.count);
      const unlocked = r.station !== "bancada" || near;
      return { r, ok, unlocked };
    })
    .sort((a, b) => Number(b.ok && b.unlocked) - Number(a.ok && a.unlocked) || Number(b.ok) - Number(a.ok));

  const slot = (i: number, label?: string) => {
    const s = inv.getSlot(i);
    return (
      <button key={i} type="button" className="ma-slot ma-slot-lg" data-on={i < 9 && i === inv.selected} onPointerDown={(e) => onDown(i, e)} onPointerUp={(e) => (e.button === 2 ? undefined : onUp(i))} aria-label={label ?? `Slot ${i}`}>
        {s ? <ItemIcon item={s.item} count={s.count} stack={s} size={40} /> : label ? <small>{label}</small> : null}
      </button>
    );
  };

  return (
    <div className="ma-modal" onPointerMove={(e) => setPointer(rotated ? { x: e.clientY, y: window.innerWidth - e.clientX } : { x: e.clientX, y: e.clientY })}>
      <div className="ma-panel">
        <header>
          {container ? (
            <b className="ma-ctitle">{container === "chest" ? "🗝 Arca" : "🔥 Fornalha de barro"}</b>
          ) : (
          <div className="ma-tabs">
            <button type="button" data-on={tab === "bag"} onClick={() => setTab("bag")}>
              🎒 Mochila
            </button>
            <button type="button" data-on={tab === "craft"} onClick={() => setTab("craft")}>
              🔨 Fabricar
            </button>
            {game.isCreative() ? (
              <button type="button" data-on={tab === "creative"} onClick={() => setTab("creative")}>
                ✨ Criativo
              </button>
            ) : null}
          </div>
          )}
          <button type="button" className="ma-x" onClick={close} aria-label="Fechar">
            ✕
          </button>
        </header>

        {container ? (
          <>
            {container === "chest" ? (
              <div className="ma-grid">{Array.from({ length: 27 }, (_, k) => slot(200 + k))}</div>
            ) : (
              <div className="ma-furnace">
                <div className="ma-fcol">
                  {slot(200, "Minério")}
                  <span className="ma-flame" data-on={!!furnace && furnace.burn > 0} aria-hidden>
                    🔥
                  </span>
                  {slot(201, "Fuel")}
                </div>
                <div className="ma-farrow" aria-hidden>
                  <i style={{ width: `${Math.round((furnace?.cook ?? 0) * 100)}%` }} />
                </div>
                <div className="ma-fcol">{slot(202, "Pronto")}</div>
              </div>
            )}
            {container === "chest" ? (
              <div className="ma-chest-btns">
                <button type="button" className="ma-btn ma-btn-sm" onClick={takeAll}>
                  ⇧ Pegar tudo
                </button>
                <button type="button" className="ma-btn ma-btn-sm ma-btn-dark" onClick={storeAll}>
                  ⇩ Guardar mochila
                </button>
              </div>
            ) : null}
            <p className="ma-sep">Sua mochila</p>
            <div className="ma-grid">{Array.from({ length: 27 }, (_, k) => slot(9 + k))}</div>
            <p className="ma-sep">Barra rápida</p>
            <div className="ma-grid">{Array.from({ length: 9 }, (_, k) => slot(k))}</div>
            <p className="ma-info">{container === "furnace" ? "Coloque o item em cima e o combustível (carvão, tronco, tábuas) embaixo. Tira o resultado à direita." : (info ?? "Toque num item e depois num espaço pra mover. Shift + clique manda o item pro outro lado; botão direito pega metade ou larga um.")}</p>
          </>
        ) : tab === "bag" ? (
          <>
            <div className="ma-armor">
              {[0, 1, 2, 3].map((k) => slot(100 + k, ARMOR_NAMES[k]))}
              {slot(104, "Escudo")}
              <span className="ma-def">🛡️ {inv.armorDefense()}</span>
            </div>
            <div className="ma-grid">{Array.from({ length: 27 }, (_, k) => slot(9 + k))}</div>
            <p className="ma-sep">Barra rápida</p>
            <div className="ma-grid">{Array.from({ length: 9 }, (_, k) => slot(k))}</div>
            <p className="ma-info">{info ?? "Toque num item e depois num espaço (ou arraste) pra mover. Armaduras vão nos espaços de cima."}</p>
          </>
        ) : tab === "creative" ? (
          <>
            <input className="ma-search" placeholder="🔍 Buscar item…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
            <div className="ma-grid ma-creative">
              {Object.values(ITEMS)
                .filter((d) => !nq || norm(d.name).includes(nq))
                .map((d) => (
                  <button key={d.key} type="button" className="ma-slot ma-slot-lg" title={d.name} onClick={() => game.creativeGive(d.key)}>
                    <ItemIcon item={d.key} size={40} />
                  </button>
                ))}
            </div>
            <div className="ma-grid">{Array.from({ length: 9 }, (_, k) => slot(k))}</div>
            <p className="ma-info">Toque num item para pegar uma pilha. Modo criativo: blocos infinitos, quebra instantânea, voo (toque duas vezes em pular).</p>
          </>
        ) : (
          <>
            <p className="ma-info">{near ? "🔨 Bancada por perto: grade 3×3 e todas as receitas." : "Sem bancada por perto: grade 2×2 e receitas básicas. Coloque uma Bancada no chão."}</p>
            <div className="ma-craftgrid">
              <div className="ma-cg" data-size={size}>
                {Array.from({ length: size * size }, (_, n) => slot(300 + Math.floor(n / size) * 3 + (n % size)))}
              </div>
              <span className="ma-cgarrow" aria-hidden>
                ➜
              </span>
              <button type="button" className="ma-slot ma-slot-lg ma-out" disabled={!gridR} onClick={() => game.craftGrid(size)} aria-label="Resultado da grade">
                {gridR ? <ItemIcon item={gridR.result.item} count={gridR.result.count} size={40} /> : null}
              </button>
            </div>
            <div className="ma-grid">{Array.from({ length: 27 }, (_, k) => slot(9 + k))}</div>
            <div className="ma-grid">{Array.from({ length: 9 }, (_, k) => slot(k))}</div>
            <p className="ma-sep">📖 Livro de receitas</p>
            <input className="ma-search" placeholder="🔍 Buscar receita…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
            <ul className="ma-recipes">
              {recipes.map(({ r, ok, unlocked }) => {
                const def = itemDef(r.result.item);
                if (!def) return null;
                const fits = !!gridLayout(r, size);
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
                    <span className="ma-r-btns">
                      <button type="button" className="ma-btn ma-btn-sm ma-btn-dark" disabled={!ok || !fits} onClick={() => game.fillGrid(r, size)} title="Coloca os itens na grade">
                        Grade
                      </button>
                      <button type="button" className="ma-btn ma-btn-sm" disabled={!ok || !unlocked} onClick={() => game.craft(r)}>
                        Fabricar
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {held ? (
        <button
          type="button"
          className="ma-btn ma-btn-sm ma-drop-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            game.dropStack(held.stack);
            setHeld(null);
          }}
        >
          ⬇ Largar no chão
        </button>
      ) : null}
      {held ? (
        <div className="ma-ghost" style={{ left: pointer.x - 22, top: pointer.y - 22 }}>
          <ItemIcon item={held.stack.item} count={held.stack.count} stack={held.stack} size={44} />
        </div>
      ) : null}
    </div>
  );
}
