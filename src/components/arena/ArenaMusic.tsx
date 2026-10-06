"use client";

import { useEffect, useSyncExternalStore } from "react";
import { mountMusic, readMusicOff, setMusicOff, subscribeMusic } from "./arenaMusicEngine";

export function ArenaMusic() {
  const off = useSyncExternalStore(subscribeMusic, readMusicOff, () => false);

  useEffect(() => mountMusic(), []);

  return (
    <button
      type="button"
      aria-label={off ? "Ligar a música" : "Desligar a música"}
      title={off ? "Ligar a música" : "Desligar a música"}
      onClick={() => setMusicOff(!off)}
      className="fixed right-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-lg shadow-lg backdrop-blur"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
    >
      {off ? "🔇" : "🎵"}
    </button>
  );
}
