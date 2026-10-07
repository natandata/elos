"use client";

import dynamic from "next/dynamic";

// O motor 3D só roda no navegador (WebGL), então nada disso é renderizado no servidor.
const Game = dynamic(() => import("./MineArenaGame").then((m) => m.MineArenaGame), {
  ssr: false,
  loading: () => <div className="ma-root" />,
});

export function MineArenaClient({ me, free }: { me?: { id: string; name: string }; free?: boolean }) {
  return <Game me={me} free={free} />;
}
