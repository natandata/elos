"use client";

import { useRef } from "react";
import type { MineArena } from "@/lib/minearena/game";

/** Com o jogo girado 90°, o eixo da tela vira o eixo do jogo: (x, y) → (y, -x). */
const mapDelta = (dx: number, dy: number, rotated: boolean): [number, number] => (rotated ? [dy, -dx] : [dx, dy]);

type Dir = "up" | "down" | "left" | "right";

/** Controles de toque no estilo do Minecraft mobile: setas à esquerda, pular e ações à direita, arrastar pra olhar. */
export function TouchControls({ game, rotated, onInventory, onPause }: { game: MineArena; rotated: boolean; onInventory: () => void; onPause: () => void }) {
  const look = useRef({ x: 0, y: 0, id: -1 });
  const dirs = useRef<Record<Dir, boolean>>({ up: false, down: false, left: false, right: false });

  const press = (d: Dir, on: boolean) => {
    dirs.current[d] = on;
    const c = dirs.current;
    game.setMove((c.right ? 1 : 0) - (c.left ? 1 : 0), (c.up ? 1 : 0) - (c.down ? 1 : 0));
  };
  const arrow = (d: Dir, label: string, glyph: string) => (
    <button
      type="button"
      className="ma-pad"
      data-dir={d}
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press(d, true);
      }}
      onPointerUp={() => press(d, false)}
      onPointerCancel={() => press(d, false)}
    >
      {glyph}
    </button>
  );
  const hold = (key: "mine" | "use" | "jump" | "sprint") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      game.setHold(key, true);
    },
    onPointerUp: () => game.setHold(key, false),
    onPointerCancel: () => game.setHold(key, false),
  });

  return (
    <div className="ma-touch">
      <div
        className="ma-look"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          look.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        }}
        onPointerMove={(e) => {
          if (look.current.id !== e.pointerId) return;
          const [lx, ly] = mapDelta(e.clientX - look.current.x, e.clientY - look.current.y, rotated);
          game.addLook(lx * 0.0055, ly * 0.0055);
          look.current.x = e.clientX;
          look.current.y = e.clientY;
        }}
        onPointerUp={() => (look.current.id = -1)}
        onPointerCancel={() => (look.current.id = -1)}
      />

      <div className="ma-dpad">
        {arrow("up", "Frente", "▲")}
        {arrow("left", "Esquerda", "◀")}
        <button type="button" className="ma-pad ma-pad-mid" aria-label="Correr" {...hold("sprint")}>
          ◆
        </button>
        {arrow("right", "Direita", "▶")}
        {arrow("down", "Trás", "▼")}
      </div>

      <div className="ma-actions">
        <button type="button" className="ma-act" {...hold("jump")} aria-label="Pular">
          ◇
        </button>
        <button type="button" className="ma-act" {...hold("use")} aria-label="Usar, colocar ou conversar">
          🖐
        </button>
        <button type="button" className="ma-act ma-act-big" {...hold("mine")} aria-label="Quebrar ou atacar">
          ⛏
        </button>
      </div>
      <div className="ma-top-btns">
        <button type="button" className="ma-act ma-act-sm" onClick={onInventory} aria-label="Mochila">
          🎒
        </button>
        <button type="button" className="ma-act ma-act-sm" onClick={onPause} aria-label="Pausar">
          ⏸
        </button>
      </div>
    </div>
  );
}
