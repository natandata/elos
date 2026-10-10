"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { StoryViewer } from "@/components/profile/StoryViewer";
import type { StoryTrayEntry } from "@/lib/stories";

const SEEN_KEY = "elos_stories_seen";

function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/** Bolinhas no topo do Explorar com os stories de TODOS (24h) — mesmo
 *  visual/comportamento do Instagram: anel colorido até você ver, cinza depois;
 *  toca e passa pelos stories (foto ou vídeo) daquela pessoa em tela cheia. */
export function FeedStoriesTray({ entries, myUserId }: { entries: StoryTrayEntry[]; myUserId: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // userId -> createdAt do último story daquela pessoa que você já abriu
  const [seen, setSeen] = useState<Record<string, string>>({});

  // lê depois de montar (localStorage não existe no servidor; ler antes quebraria a hidratação)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen(readSeen());
  }, []);

  if (entries.length === 0) return null;

  function markSeen(e: StoryTrayEntry) {
    const latest = e.stories[e.stories.length - 1]?.createdAt;
    if (!latest) return;
    setSeen((cur) => {
      const next = { ...cur, [e.userId]: latest };
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* sem armazenamento: só não lembra */
      }
      return next;
    });
  }

  const active = openIndex !== null ? entries[openIndex] : null;

  return (
    <div className="mb-3 flex gap-3.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
      {entries.map((e, i) => {
        const latest = e.stories[e.stories.length - 1]?.createdAt;
        const isNew = e.userId !== myUserId && (!seen[e.userId] || (latest ?? "") > seen[e.userId]);
        return (
          <button
            key={e.userId}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="flex w-[68px] shrink-0 flex-col items-center gap-1"
          >
            <span
              className="rounded-full p-[2.5px]"
              style={{
                background: isNew
                  ? "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)"
                  : "var(--line)",
              }}
            >
              <Avatar url={e.avatarUrl} name={e.name} size={60} className="block" />
            </span>
            <span className={`w-full truncate text-center text-[11px] ${isNew ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
              {e.userId === myUserId ? "Você" : e.name.split(" ")[0]}
            </span>
          </button>
        );
      })}

      {active ? (
        <StoryViewer
          key={active.userId}
          stories={active.stories}
          authorName={active.name}
          canManage={active.userId === myUserId}
          onClose={() => {
            markSeen(active);
            setOpenIndex(null);
          }}
        />
      ) : null}
    </div>
  );
}
