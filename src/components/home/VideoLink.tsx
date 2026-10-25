"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { logContentClick } from "@/lib/actions/contentClick";

/** Cartão de vídeo do "Conteúdo relevante": toca abre o player dentro do app (YouTube embutido), sem sair do ELOS. */
export function VideoLink({ videoId, title, label, children }: { videoId: string; title: string; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const play = () => {
    setOpen(true);
    void logContentClick(videoId).catch(() => null);
  };

  return (
    <>
      <button type="button" onClick={play} className="group block w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg)] text-left transition active:scale-[0.99]">
        {children}
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3" role="dialog" aria-modal="true" aria-label={title} onClick={() => setOpen(false)}>
              <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-2 flex items-start justify-between gap-3 text-white">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/70">{label}</p>
                    <p className="text-sm font-bold leading-snug">{title}</p>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Fechar vídeo" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-lg font-black">
                    ✕
                  </button>
                </div>
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
                    title={title}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                </div>
                <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center text-xs font-semibold text-white/70 underline">
                  O vídeo não carrega? Abrir no YouTube
                </a>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
