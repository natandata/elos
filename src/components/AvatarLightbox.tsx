"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";

/** Avatar clicável — toque abre a foto em tela cheia (dono ou visitante). */
export function AvatarLightbox({
  url,
  name,
  size,
}: {
  url: string | null;
  name: string;
  size: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => url && setOpen(true)}
        aria-label="Ver foto de perfil"
        className={url ? "cursor-zoom-in" : "cursor-default"}
      >
        <Avatar url={url} name={name} size={size} />
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
            alt={name}
            className="max-h-[80vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
