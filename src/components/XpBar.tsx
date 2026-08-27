"use client";

import { useEffect, useState } from "react";
import { levelFromXp, XP_PER_LEVEL } from "@/lib/types";

/**
 * Barra de XP com efeito de "líquido enchendo": começa vazia e anima até o
 * nível de preenchimento real assim que monta na tela. Como a página
 * recarrega/revalida a cada XP ganho, isso faz a barra "encher" de novo toda
 * vez que o usuário volta pra tela de início com XP novo.
 */
export function XpBar({
  xp,
  tone = "card",
}: {
  xp: number;
  /** "card": pra fundo branco/neutro (usa cor de destaque). "onAccent": pra cima de um painel já colorido (usa líquido claro). */
  tone?: "card" | "onAccent";
}) {
  const { level, progress, pct } = levelFromXp(xp);
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    setFilled(0);
    const id = requestAnimationFrame(() => setFilled(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const onAccent = tone === "onAccent";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className={`text-sm font-black ${onAccent ? "" : "text-[var(--accent-strong)]"}`}>
          Nível {level}
        </span>
        <span className={`text-xs font-semibold tabular-nums ${onAccent ? "opacity-80" : "text-[var(--muted)]"}`}>
          {progress}/{XP_PER_LEVEL} XP
        </span>
      </div>
      <div
        className={`xp-bar-track mt-1.5 h-4 overflow-hidden rounded-full ${
          onAccent ? "bg-black/15" : "bg-[var(--bg)]"
        }`}
      >
        <div
          className={`xp-bar-liquid h-full rounded-full ${onAccent ? "xp-bar-liquid--light" : ""}`}
          style={{ width: `${filled}%` }}
        />
      </div>
    </div>
  );
}
