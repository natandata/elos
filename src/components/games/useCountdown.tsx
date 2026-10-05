"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Contagem regressiva em segundos. Recomeça quando `resetKey` muda e fica parada
 * enquanto `paused`. Chama `onExpire` uma vez quando chega a zero.
 */
export function useCountdown(seconds: number | null, resetKey: unknown, paused: boolean, onExpire: () => void): number | null {
  const [left, setLeft] = useState<number | null>(seconds);
  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire;
  });

  useEffect(() => {
    if (seconds === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia o relógio quando a rodada muda
      setLeft(null);
      return;
    }
    setLeft(seconds);
    if (paused) return;
    const end = Date.now() + seconds * 1000;
    let fired = false;
    const t = setInterval(() => {
      const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(rem);
      if (rem <= 0 && !fired) {
        fired = true;
        clearInterval(t);
        expireRef.current();
      }
    }, 200);
    return () => clearInterval(t);
  }, [seconds, resetKey, paused]);

  return left;
}

/** Barrinha com o tempo que resta. */
export function TimerBar({ left, total }: { left: number | null; total: number | null }) {
  if (left === null || total === null) return null;
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const hot = left <= 5;
  return (
    <div className="mb-3" aria-live="off">
      <div className="mb-1 flex items-center justify-between text-xs font-black">
        <span className={hot ? "text-rose-600" : "text-[var(--muted)]"}>⏱ Tempo</span>
        <span className={`tabular-nums ${hot ? "text-rose-600" : ""}`}>{left}s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
        <div className={`h-full rounded-full transition-[width] duration-200 ease-linear ${hot ? "bg-rose-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
