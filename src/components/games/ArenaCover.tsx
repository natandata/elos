"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArenaLoadingScreen } from "./ArenaLoadingScreen";

const HREF = "/app/jogos/arena";

/** Capa da Arena dos Heróis na sala de jogos; ao tocar, abre a tela de carregamento (5 s) e entra no jogo. */
export function ArenaCover() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loading) router.prefetch(HREF);
  }, [loading, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setLoading(true)}
        className="relative mb-5 block w-full overflow-hidden rounded-2xl border-2 border-amber-400 bg-black text-left shadow-lg transition active:scale-[0.99]"
        aria-label="Abrir a Arena dos Heróis"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/arena/capa.webp" alt="Arena dos Heróis" className="block aspect-[16/9] w-full object-cover" draggable={false} />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-2.5 pt-8">
          <span className="text-xs font-bold text-amber-100">Batalha contra o computador · +1 XP por dia</span>
          <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white">▶ JOGAR</span>
        </span>
      </button>

      {loading ? <ArenaLoadingScreen onComplete={() => router.push(HREF)} /> : null}
    </>
  );
}
