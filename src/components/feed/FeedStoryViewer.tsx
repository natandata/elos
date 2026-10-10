"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { relativeTimeShort } from "@/lib/relativeTime";

export type FeedStoryItem = {
  id: string;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
};

const STORY_MS = 5000;

/** Visualizador em tela cheia pras fotos do Explorar, estilo Instagram Stories:
 *  barrinhas que enchem sozinhas, toque nas laterais pra voltar/avançar e
 *  segurar pra pausar — só leitura (reações/comentários ficam no card do feed). */
export function FeedStoryViewer({
  stories,
  authorName,
  authorAvatar,
  onClose,
  onFinish,
}: {
  stories: FeedStoryItem[];
  authorName: string;
  authorAvatar: string | null;
  onClose: () => void;
  /** Acabou a última foto desta pessoa — o pai decide se passa pra próxima. */
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);
  const remaining = useRef(STORY_MS);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const current = stories[index];
  const isLast = index >= stories.length - 1;

  function goNext() {
    if (!isLast) setIndex((i) => i + 1);
    else onFinish();
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  // cada foto começa com os 5s cheios
  useEffect(() => {
    remaining.current = STORY_MS;
  }, [index]);

  // contagem regressiva que respeita a pausa (segurar a tela)
  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(goNext, remaining.current);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full max-w-md flex-col">
        <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/60 to-transparent pb-6">
          <div className="flex gap-1 px-2 pt-3">
            {stories.map((s, i) => (
              <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                {i < index ? (
                  <div className="h-full w-full bg-white" />
                ) : i === index ? (
                  <div
                    key={`${s.id}-${index}`}
                    className="h-full bg-white"
                    style={{
                      animation: `ig-story-progress ${STORY_MS}ms linear forwards`,
                      animationPlayState: paused ? "paused" : "running",
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2.5 px-3 text-white">
            <Avatar url={authorAvatar} name={authorName} size={32} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {authorName}{" "}
              <span className="font-normal text-white/70" suppressHydrationWarning>
                {relativeTimeShort(current.createdAt)}
              </span>
            </p>
            <button type="button" onClick={onClose} aria-label="Fechar" className="px-1 text-2xl leading-none">
              ✕
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 select-none overflow-hidden bg-black"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          onPointerCancel={() => setPaused(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {current.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.imageUrl} alt="" draggable={false} className="h-full w-full object-contain" />
          ) : null}

          <button type="button" aria-label="Anterior" onClick={goPrev} className="absolute inset-y-0 left-0 w-1/3" />
          <button type="button" aria-label="Próximo" onClick={goNext} className="absolute inset-y-0 right-0 w-2/3" />
        </div>

        {current.caption ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-6 text-white">
            <p className="text-sm leading-snug">{current.caption}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
