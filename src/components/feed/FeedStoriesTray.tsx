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
const COMPOSE_EVENT = "elogram:compose-story";

export function FeedStoriesTray({
  entries,
  myUserId,
  canPost = false,
  myName = "Você",
  myAvatar = null,
}: {
  entries: StoryTrayEntry[];
  myUserId: string;
  /** Pode postar story? Então a primeira bolinha é "Seu story", com o + pra criar. */
  canPost?: boolean;
  myName?: string;
  myAvatar?: string | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // userId -> createdAt do último story daquela pessoa que você já abriu
  const [seen, setSeen] = useState<Record<string, string>>({});

  // lê depois de montar (localStorage não existe no servidor; ler antes quebraria a hidratação)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen(readSeen());
  }, []);

  const hasMine = entries.some((e) => e.userId === myUserId);
  if (entries.length === 0 && !canPost) return null;

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
    <div className="mb-3 flex gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {canPost && !hasMine ? (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(COMPOSE_EVENT))}
          className="flex w-[74px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full p-[2px]" style={{ background: "var(--line)" }}>
            <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--bg)] p-[2px]">
              <Avatar url={myAvatar} name={myName} size={60} />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--bg)] bg-[#0095f6] text-lg font-bold leading-none text-white">
              +
            </span>
          </span>
          <span className="w-full truncate text-center text-xs text-[var(--muted)]">Seu story</span>
        </button>
      ) : null}
      {entries.map((e, i) => {
        const latest = e.stories[e.stories.length - 1]?.createdAt;
        const isNew = !seen[e.userId] || (latest ?? "") > seen[e.userId];
        return (
          <button
            key={e.userId}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="flex w-[74px] shrink-0 flex-col items-center gap-1.5"
          >
            {/* igual ao Instagram: anel de 2px, vão de 2px na cor do fundo e a foto preenchendo o resto (68px no total) */}
            <span
              className="flex h-[68px] w-[68px] items-center justify-center rounded-full p-[2px]"
              style={{
                background: isNew
                  ? "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)"
                  : "var(--line)",
              }}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--bg)] p-[2px]">
                <Avatar url={e.avatarUrl} name={e.name} size={60} />
              </span>
            </span>
            <span className={`w-full truncate text-center text-xs ${isNew ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
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
