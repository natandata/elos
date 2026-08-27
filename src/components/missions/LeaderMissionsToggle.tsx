"use client";

import { useActionState } from "react";
import { toggleLeaderMissionsVisibility } from "@/lib/actions/missions";

export function LeaderMissionsToggle({ show }: { show: boolean }) {
  const [, action] = useActionState(toggleLeaderMissionsVisibility, null);

  return (
    <form action={action}>
      <input type="hidden" name="show" value={(!show).toString()} />
      <button
        type="submit"
        className="flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
        title={show ? "Ocultar missões de outros líderes" : "Mostrar missões de outros líderes"}
      >
        <span
          className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${
            show ? "bg-[var(--accent)]" : "bg-[var(--line)]"
          }`}
        >
          <span
            className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
              show ? "translate-x-3.5" : "translate-x-0.5"
            }`}
          />
        </span>
        {show ? "Visível" : "Oculta"}
      </button>
    </form>
  );
}
