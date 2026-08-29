"use client";

import { useState, type ReactNode } from "react";
import { StoryViewer, type StoryItem } from "./StoryViewer";

/**
 * Anel colorido de story ao redor do avatar. Com story ativo, o toque abre o
 * visualizador (igual Instagram); sem story, o próprio avatar cuida do clique
 * (abre a foto em tela cheia) — por isso não hà botão duplicado aqui.
 */
export function ProfileStoryRing({
  hasStory,
  stories,
  authorName,
  children,
}: {
  hasStory: boolean;
  stories: StoryItem[];
  authorName: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!hasStory) return <>{children}</>;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        className="inline-block cursor-pointer rounded-full p-[3px]"
        style={{ background: "linear-gradient(45deg, var(--accent), var(--accent-strong))" }}
      >
        <div className="pointer-events-none rounded-full bg-[var(--card)] p-[2px]">{children}</div>
      </div>

      {open ? (
        <StoryViewer stories={stories} authorName={authorName} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
