"use client";

import { useEffect, useRef, useState } from "react";

export const ARENA_LOAD_MS = 5000;
const nowMs = () => Date.now();

/**
 * Tela de carregamento da Arena: capa de fundo com zoom lento e barra de 0 a 100% em 5 s.
 * Aparece ao abrir a Arena e na entrada de toda partida. `onComplete` roda uma vez, quando chega a 100%.
 */
export function ArenaLoadingScreen({ onComplete, label = "Carregando a Arena…", durationMs = ARENA_LOAD_MS }: { onComplete?: () => void; label?: string; durationMs?: number }) {
  const [pct, setPct] = useState(0);
  const doneRef = useRef(onComplete);
  useEffect(() => {
    doneRef.current = onComplete;
  });

  useEffect(() => {
    const start = nowMs();
    let fired = false;
    const t = setInterval(() => {
      const p = Math.min(100, Math.round(((nowMs() - start) / durationMs) * 100));
      setPct(p);
      if (p >= 100 && !fired) {
        fired = true;
        clearInterval(t);
        doneRef.current?.();
      }
    }, 50);
    return () => clearInterval(t);
  }, [durationMs]);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-black" role="status" aria-live="polite">
      <picture>
        <source media="(orientation: portrait)" srcSet="/arena/capa-vertical.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/arena/capa.webp" alt="" className="arena-load-zoom absolute inset-0 h-full w-full object-cover" draggable={false} />
      </picture>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-6 pb-10 pt-24">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-end justify-between text-white">
            <span className="text-sm font-black tracking-wide [text-shadow:0_1px_3px_#000]">{label}</span>
            <span className="text-2xl font-black tabular-nums [text-shadow:0_1px_3px_#000]">{pct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-amber-200/70 bg-black/60">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
