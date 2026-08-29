"use client";

import { useState, type ReactNode } from "react";

/** Envolve uma miniatura clicável — toque abre a foto em tela cheia (igual à foto de perfil). */
export function ImageLightbox({
  url,
  alt = "",
  children,
}: {
  url: string | null;
  alt?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => url && setOpen(true)}
        aria-label="Ver foto"
        className={`block h-full w-full ${url ? "cursor-zoom-in" : "cursor-default"}`}
      >
        {children}
      </button>

      {open && url ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="max-h-[80vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
