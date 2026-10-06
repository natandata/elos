"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArenaLoadingScreen } from "./ArenaLoadingScreen";

const HREF = "/app/jogos/arena";

/** Capa da Arena dos Heróis na sala de jogos; ao tocar, abre a tela de carregamento (5 s) e entra no jogo. */
export function ArenaCover({ asleep = false }: { asleep?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loading) router.prefetch(HREF);
  }, [loading, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => !asleep && setLoading(true)}
        disabled={asleep}
        className="relative mb-5 block w-full overflow-hidden rounded-2xl border-2 border-amber-400 bg-black text-left shadow-lg transition active:scale-[0.99]"
        aria-label="Abrir a Arena dos Heróis"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/arena/capa.webp" alt="Arena dos Heróis" className="block aspect-[16/9] w-full object-cover" draggable={false} />
        {asleep ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 text-center">
            <span className="text-4xl" aria-hidden>
              😴
            </span>
            <span className="text-sm font-black text-amber-100">Os heróis estão descansando</span>
            <span className="text-xs font-bold text-amber-200">A Arena abre às 06h00</span>
          </span>
        ) : null}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-2.5 pt-8">
          <span className="text-xs font-bold text-amber-100">Batalha contra o computador · +1 XP por dia</span>
          <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white">▶ JOGAR</span>
        </span>
      </button>

      {loading ? <ArenaLoadingScreen onComplete={() => router.push(HREF)} /> : null}
    </>
  );
}
