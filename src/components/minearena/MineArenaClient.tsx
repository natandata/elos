"use client";

import dynamic from "next/dynamic";

// O motor 3D só roda no navegador (WebGL), então nada disso é renderizado no servidor.
const Game = dynamic(() => import("./MineArenaGame").then((m) => m.MineArenaGame), {
  ssr: false,
  loading: () => <div className="ma-root" />,
});

export function MineArenaClient({ me }: { me?: { id: string; name: string } }) {
  return <Game me={me} />;
}
