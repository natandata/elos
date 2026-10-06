"use client";

import { useRef, useState } from "react";
import type { MineArena } from "@/lib/minearena/game";

const RADIUS = 52;

/** Com o jogo girado 90°, o eixo da tela vira o eixo do jogo: (x, y) → (y, -x). */
const mapDelta = (dx: number, dy: number, rotated: boolean): [number, number] => (rotated ? [dy, -dx] : [dx, dy]);

/** Controles de toque: manche virtual, arrastar pra olhar e botões de ação. */
export function TouchControls({ game, rotated, onInventory, onPause }: { game: MineArena; rotated: boolean; onInventory: () => void; onPause: () => void }) {
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);
  const origin = useRef({ x: 0, y: 0, id: -1 });
  const look = useRef({ x: 0, y: 0, id: -1 });

  const hold = (key: "mine" | "use" | "jump") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      game.setHold(key, true);
    },
    onPointerUp: () => {
      game.setHold(key, false);
    },
    onPointerCancel: () => {
      game.setHold(key, false);
    },
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

      <div
        className="ma-stick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId };
          setKnob({ x: 0, y: 0 });
        }}
        onPointerMove={(e) => {
          if (origin.current.id !== e.pointerId) return;
          let [dx, dy] = mapDelta(e.clientX - origin.current.x, e.clientY - origin.current.y, rotated);
          const d = Math.hypot(dx, dy);
          if (d > RADIUS) {
            dx = (dx / d) * RADIUS;
            dy = (dy / d) * RADIUS;
          }
          game.setMove(dx / RADIUS, -dy / RADIUS);
          setKnob({ x: dx, y: dy });
        }}
        onPointerUp={() => {
          origin.current.id = -1;
          game.setMove(0, 0);
          setKnob(null);
        }}
        onPointerCancel={() => {
          origin.current.id = -1;
          game.setMove(0, 0);
          setKnob(null);
        }}
      >
        <i style={{ transform: knob ? `translate(${knob.x}px, ${knob.y}px)` : undefined }} />
      </div>

      <div className="ma-actions">
        <button type="button" className="ma-act ma-act-big" {...hold("mine")} aria-label="Quebrar ou atacar">
          ⛏
        </button>
        <button type="button" className="ma-act" {...hold("use")} aria-label="Usar, colocar ou conversar">
          🖐
        </button>
        <button type="button" className="ma-act" {...hold("jump")} aria-label="Pular">
          ⤒
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
