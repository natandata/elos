"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { MiniPlayer } from "./MiniPlayer";
import { PlayerProvider, useSpotPlayer } from "./PlayerProvider";

/**
 * Player do Spot Cria na raiz do app: a música continua tocando ao sair do Spot Cria e ao navegar por todo o ELOS,
 * com um mini player flutuante, e só para quando a pessoa pausa ou fecha o aplicativo.
 */
export function SpotPlayerRoot({ children }: { children: ReactNode }) {
  return (
    <PlayerProvider>
      <RouteWatcher />
      {children}
      <GlobalMini />
    </PlayerProvider>
  );
}

// ao sair do Spot Cria, a tela "Tocando agora" fecha (o mini player continua)
function RouteWatcher() {
  const pathname = usePathname();
  const { setExpanded } = useSpotPlayer();
  useEffect(() => {
    if (!pathname.startsWith("/app/spotcria")) setExpanded(false);
  }, [pathname, setExpanded]);
  return null;
}

function GlobalMini() {
  const pathname = usePathname();
  const { current } = useSpotPlayer();
  if (!current || pathname.startsWith("/app/spotcria")) return null;
  return (
    <>
      <div className="h-24" aria-hidden />
      <MiniPlayer variant="global" />
    </>
  );
}
