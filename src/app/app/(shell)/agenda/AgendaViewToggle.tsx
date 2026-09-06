"use client";

import { useState } from "react";

/** Alterna entre a lista de eventos e a visão de calendário — só pro admin,
 *  que é quem precisa enxergar a agenda inteira de uma vez pra planejar. */
export function AgendaViewToggle({
  list,
  calendar,
}: {
  list: React.ReactNode;
  calendar: React.ReactNode;
}) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <>
      <div className="mb-4 inline-flex rounded-full border border-[var(--line)] bg-[var(--card)] p-1">
        {(["list", "calendar"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              view === v
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {v === "list" ? "Lista" : "Calendário"}
          </button>
        ))}
      </div>

      {view === "list" ? list : <div className="card p-4">{calendar}</div>}
    </>
  );
}
