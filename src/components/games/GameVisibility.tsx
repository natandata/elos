"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setGameVisibility } from "@/lib/actions/gameVisibility";
import type { Visibility } from "@/lib/games/catalog";

export type VisRow = { key: string; emoji: string; title: string; visibility: Visibility; note: string };

const OPTIONS: { v: Visibility; label: string }[] = [
  { v: "auto", label: "Automático" },
  { v: "visible", label: "Visível" },
  { v: "hidden", label: "Oculto" },
];

/** Admin: botão por jogo para mostrar ou esconder para todos os jogadores. */
export function GameVisibility({ rows }: { rows: VisRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(game: string, v: Visibility) {
    setError(null);
    start(async () => {
      const r = await setGameVisibility(game, v);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="card p-3">
          <p className="flex items-center gap-2 text-sm font-black leading-tight">
            <span className="text-xl" aria-hidden>
              {r.emoji}
            </span>
            {r.title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{r.note}</p>
          <div role="radiogroup" aria-label={`Visibilidade de ${r.title}`} className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-[var(--line)] p-1">
            {OPTIONS.map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={r.visibility === o.v}
                disabled={pending}
                onClick={() => r.visibility !== o.v && change(r.key, o.v)}
                className={`rounded-lg px-2 py-1.5 text-xs font-black transition ${r.visibility === o.v ? (o.v === "hidden" ? "bg-rose-600 text-white" : o.v === "visible" ? "bg-emerald-600 text-white" : "bg-[var(--accent)] text-[var(--accent-ink)]") : "text-[var(--muted)]"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
