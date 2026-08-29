"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/types";

export type StoryItem = {
  id: string;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
};

/** Visualizador em tela cheia, estilo Instagram Stories — passa sozinho por cada foto. */
export function StoryViewer({
  stories,
  authorName,
  onClose,
}: {
  stories: StoryItem[];
  authorName: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const current = stories[index];
  if (!current) return null;

  function next() {
    if (index < stories.length - 1) setIndex((i) => i + 1);
    else onClose();
  }

  function prev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full max-w-md flex-col">
        <div className="flex gap-1 p-2 pt-3">
          {stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className={`h-full bg-white ${i < index ? "w-full" : i === index ? "w-full" : "w-0"}`}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-3 pb-2 text-white">
          <p className="text-sm font-bold">{authorName}</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-xl">
            ✕
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden bg-black">
          {current.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.imageUrl} alt="" className="h-full w-full object-contain" />
          ) : null}

          <button
            type="button"
            aria-label="Anterior"
            onClick={prev}
            className="absolute inset-y-0 left-0 w-1/3"
          />
          <button
            type="button"
            aria-label="Próximo"
            onClick={next}
            className="absolute inset-y-0 right-0 w-1/3"
          />
        </div>

        {current.caption || current.createdAt ? (
          <div className="bg-black/80 p-3 text-white">
            {current.caption ? <p className="text-sm">{current.caption}</p> : null}
            <p className="mt-1 text-xs text-white/60">{formatDateTime(current.createdAt)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
