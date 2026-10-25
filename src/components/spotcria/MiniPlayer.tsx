"use client";

import { useRouter } from "next/navigation";
import { useSlot, useSpotPlayer } from "./PlayerProvider";
import { Icon, likeOptimistic } from "./ui";

/** Mini player: dentro do Spot Cria fica acima da barra de abas; nas outras telas do ELOS fica flutuando embaixo. */
export function MiniPlayer({ variant }: { variant: "frame" | "global" }) {
  const router = useRouter();
  const slot = useSlot("mini");
  const { current, playing, toggle, position, duration, setExpanded, error, patchTrack } = useSpotPlayer();
  if (!current) return null;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const open = () => {
    setExpanded(true);
    if (variant === "global") router.push("/app/spotcria");
  };
  const pos =
    variant === "frame"
      ? "absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+58px+2px)] z-[80]"
      : "fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+8px)] z-[55] mx-auto max-w-xl";
  return (
    <div className={`${pos} overflow-hidden rounded-lg bg-[#5b2a99] text-white shadow-xl`}>
      <div className="flex h-[68px] items-center gap-3 px-2">
        {/* o player de verdade (PlayerHost, na raiz do app) acompanha este espaço */}
        <button ref={slot} type="button" onClick={open} aria-label="Abrir Tocando agora" className="pointer-events-auto h-[54px] w-24 shrink-0" />
        <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-bold">{current.title}</span>
          <span className="block truncate text-xs text-white/70">{error ?? current.channel}</span>
        </button>
        <button type="button" onClick={() => void likeOptimistic(current, patchTrack)} aria-label={current.liked ? "Remover das curtidas" : "Curtir"} className="grid h-9 w-9 shrink-0 place-items-center">
          <Icon name={current.liked ? "check" : "plus-circle"} className={`h-7 w-7 ${current.liked ? "text-[#c58bff]" : "text-white"}`} />
        </button>
        <button type="button" onClick={toggle} aria-label={playing ? "Pausar" : "Tocar"} className="grid h-9 w-9 shrink-0 place-items-center">
          <Icon name={playing ? "pause" : "play"} className="h-8 w-8" />
        </button>
      </div>
      <div className="mx-2 mb-1 h-[3px] rounded-full bg-white/25">
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
