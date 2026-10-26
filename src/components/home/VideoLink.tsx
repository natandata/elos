"use client";

import { useState, type ReactNode } from "react";
import { logContentClick } from "@/lib/actions/contentClick";
import { GatePlayer } from "@/components/video/GatePlayer";

/** Cartão de vídeo do "Conteúdo relevante": toca abre o player dentro do app (conta o que foi assistido e guarda onde parou), sem sair do ELOS. */
export function VideoLink({ videoId, title, label, children }: { videoId: string; title: string; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const play = () => {
    setOpen(true);
    void logContentClick(videoId).catch(() => null);
  };

  return (
    <>
      <button type="button" onClick={play} className="group block w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg)] text-left transition active:scale-[0.99]">
        {children}
      </button>
      {open ? <GatePlayer videoId={videoId} title={title} label={label} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
