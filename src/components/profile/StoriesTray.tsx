"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { StoryViewer } from "./StoryViewer";
import type { StoryTrayEntry } from "@/lib/stories";

/** Barra de bolinhas de story do seu Elo — só aparece quando tem story ativo. */
export function StoriesTray({ entries, myUserId }: { entries: StoryTrayEntry[]; myUserId: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (entries.length === 0) return null;

  const active = openIndex !== null ? entries[openIndex] : null;

  return (
    <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
      {entries.map((e, i) => (
        <button
          key={e.userId}
          type="button"
          onClick={() => setOpenIndex(i)}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <div
            className="rounded-full p-[3px]"
            style={{ background: "linear-gradient(45deg, var(--accent), var(--accent-strong))" }}
          >
            <div className="rounded-full bg-[var(--card)] p-[2px]">
              <Avatar url={e.avatarUrl} name={e.name} size={52} />
            </div>
          </div>
          <span className="w-full truncate text-center text-[11px] text-[var(--muted)]">
            {e.userId === myUserId ? "Você" : e.name.split(" ")[0]}
          </span>
        </button>
      ))}

      {active ? (
        <StoryViewer stories={active.stories} authorName={active.name} onClose={() => setOpenIndex(null)} />
      ) : null}
    </div>
  );
}
