"use client";

import dynamic from "next/dynamic";

/** O jogo lê o progresso salvo no aparelho, então só existe no navegador. */
const Game = dynamic(() => import("./BibleRushGame").then((m) => m.BibleRushGame), {
  ssr: false,
  loading: () => <p className="p-6 text-center text-sm font-bold">Carregando…</p>,
});

export function BibleRushClient({ uid }: { uid: string }) {
  return <Game uid={uid} />;
}
