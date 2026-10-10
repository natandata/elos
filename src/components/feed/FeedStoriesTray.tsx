"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { FeedStoryViewer, type FeedStoryItem } from "./FeedStoryViewer";

export type FeedStoryAuthor = {
  authorId: string;
  name: string;
  avatarUrl: string | null;
  posts: FeedStoryItem[];
};

const SEEN_KEY = "elos_explorar_seen";

function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/** Bolinhas no topo do Explorar com quem postou nas últimas 24h — mesmo
 *  visual/comportamento do Instagram: anel colorido até você ver, cinza depois;
 *  toca e passa pelas fotos daquela pessoa em tela cheia. */
export function FeedStoriesTray({ authors, myUserId }: { authors: FeedStoryAuthor[]; myUserId: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // authorId -> createdAt da última foto que a pessoa já viu daquele autor
  const [seen, setSeen] = useState<Record<string, string>>({});

  // lê depois de montar (localStorage não existe no servidor; ler antes quebraria a hidratação)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen(readSeen());
  }, []);

  if (authors.length === 0) return null;

  function markSeen(a: FeedStoryAuthor) {
    const latest = a.posts[a.posts.length - 1]?.createdAt;
    if (!latest) return;
    setSeen((cur) => {
      const next = { ...cur, [a.authorId]: latest };
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* sem armazenamento: só não lembra */
      }
      return next;
    });
  }

  const active = openIndex !== null ? authors[openIndex] : null;

  function closeViewer() {
    if (active) markSeen(active);
    setOpenIndex(null);
  }

  function nextAuthor() {
    if (active) markSeen(active);
    if (openIndex !== null && openIndex < authors.length - 1) setOpenIndex(openIndex + 1);
    else setOpenIndex(null);
  }

  return (
    <div className="mb-3 flex gap-3.5 overflow-x-auto px-3 pb-1 sm:px-0">
      {authors.map((a, i) => {
        const latest = a.posts[a.posts.length - 1]?.createdAt;
        const isNew = a.authorId !== myUserId && (!seen[a.authorId] || (latest ?? "") > seen[a.authorId]);
        return (
          <button
            key={a.authorId}
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
              <Avatar url={a.avatarUrl} name={a.name} size={60} className="block" />
            </span>
            <span className={`w-full truncate text-center text-[11px] ${isNew ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
              {a.authorId === myUserId ? "Você" : a.name.split(" ")[0]}
            </span>
          </button>
        );
      })}

      {active ? (
        <FeedStoryViewer
          key={active.authorId}
          stories={active.posts}
          authorName={active.name}
          authorAvatar={active.avatarUrl}
          onClose={closeViewer}
          onFinish={nextAuthor}
        />
      ) : null}
    </div>
  );
}
