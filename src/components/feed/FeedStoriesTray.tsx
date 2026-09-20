"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { FeedStoryViewer, type FeedStoryItem } from "./FeedStoryViewer";

export type FeedStoryAuthor = {
  authorId: string;
  name: string;
  avatarUrl: string | null;
  posts: FeedStoryItem[];
};

/** Bolinhas no topo do Explorar com quem postou nas últimas 24h — mesmo
 *  visual/comportamento do Instagram: toca e passa pelas fotos daquela
 *  pessoa em tela cheia. */
export function FeedStoriesTray({ authors, myUserId }: { authors: FeedStoryAuthor[]; myUserId: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (authors.length === 0) return null;

  const active = openIndex !== null ? authors[openIndex] : null;

  return (
    <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
      {authors.map((a, i) => (
        <button
          key={a.authorId}
          type="button"
          onClick={() => setOpenIndex(i)}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <div
            className="rounded-full p-[3px]"
            style={{ background: "linear-gradient(45deg, var(--accent), var(--accent-strong))" }}
          >
            <div className="rounded-full bg-[var(--card)] p-[2px]">
              <Avatar url={a.avatarUrl} name={a.name} size={52} />
            </div>
          </div>
          <span className="w-full truncate text-center text-[11px] text-[var(--muted)]">
            {a.authorId === myUserId ? "Você" : a.name.split(" ")[0]}
          </span>
        </button>
      ))}

      {active ? (
        <FeedStoryViewer stories={active.posts} authorName={active.name} onClose={() => setOpenIndex(null)} />
      ) : null}
    </div>
  );
}
