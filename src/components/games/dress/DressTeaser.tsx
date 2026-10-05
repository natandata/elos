"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { releaseAt, type ReleasedGame } from "@/lib/games/release";

const nowMs = () => Date.now();

function useLeft(game: ReleasedGame) {
  const router = useRouter();
  const [left, setLeft] = useState(() => Math.max(0, releaseAt(game) - nowMs()));
  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, releaseAt(game) - nowMs());
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [game, router]);
  return left;
}

function parts(ms: number) {
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Contagem regressiva grande (página do jogo antes da liberação). */
export function DressCountdown({ game = "dress" }: { game?: ReleasedGame }) {
  const p = parts(useLeft(game));
  return (
    <div className="grid grid-cols-4 gap-2 text-center" aria-live="off">
      {(
        [
          ["dias", p.d],
          ["horas", p.h],
          ["min", p.m],
          ["seg", p.s],
        ] as const
      ).map(([label, n]) => (
        <div key={label} className="vh-digit">
          <b>{String(n).padStart(2, "0")}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

/** Texto curto "abre em 3d 04h" pro cartão da lista de jogos. */
export function DressTeaserText({ game = "dress" }: { game?: ReleasedGame }) {
  const p = parts(useLeft(game));
  return (
    <span className="tabular-nums">
      {p.d > 0 ? `${p.d}d ` : ""}
      {String(p.h).padStart(2, "0")}h {String(p.m).padStart(2, "0")}m {String(p.s).padStart(2, "0")}s
    </span>
  );
}
