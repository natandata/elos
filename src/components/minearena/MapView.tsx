"use client";

import { useEffect, useRef } from "react";
import type { MineArena } from "@/lib/minearena/game";

/** Mapa de pergaminho: terreno em volta, 🏠 ponto de partida, ⭐ monumentos já encontrados, 🪦 pertences. */
export function MapView({ game, onClose }: { game: MineArena; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const m = game.mapImage();
    const c = ref.current;
    if (!c) return;
    c.width = c.height = m.w;
    const ctx = c.getContext("2d")!;
    ctx.putImageData(new ImageData(m.rgba as Uint8ClampedArray<ArrayBuffer>, m.w, m.w), 0, 0);
    const X = (f: number) => f * m.w;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    for (const k of m.marks) ctx.fillText(k.label, X(k.x), X(k.z) + 4);
    ctx.save();
    ctx.translate(X(m.px), X(m.pz));
    ctx.rotate(-m.yaw);
    ctx.fillStyle = "#ff3b3b";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [game]);
  return (
    <div className="ma-modal">
      <div className="ma-panel ma-map-panel">
        <header>
          <b className="ma-ctitle">🗺 Mapa de pergaminho</b>
          <button type="button" className="ma-x" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        <canvas ref={ref} className="ma-map" />
        <p className="ma-info">Norte para cima. Você é a seta vermelha.</p>
      </div>
    </div>
  );
}
