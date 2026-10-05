"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const HREF = "/app/jogos/arena";
const LOAD_MS = 5000;
const nowMs = () => Date.now();

/** Capa da Arena dos Heróis na sala de jogos; ao tocar, abre a tela de carregamento (5 s) e entra no jogo. */
export function ArenaCover() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!loading) return;
    router.prefetch(HREF);
    const start = nowMs();
    const t = setInterval(() => {
      const p = Math.min(100, Math.round(((nowMs() - start) / LOAD_MS) * 100));
      setPct(p);
      if (p >= 100) {
        clearInterval(t);
        router.push(HREF);
      }
    }, 50);
    return () => clearInterval(t);
  }, [loading, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPct(0);
          setLoading(true);
        }}
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

      {loading ? (
        <div className="fixed inset-0 z-[200] overflow-hidden bg-black" role="status" aria-live="polite">
          <picture>
            <source media="(orientation: portrait)" srcSet="/arena/capa-vertical.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arena/capa.webp" alt="" className="arena-load-zoom absolute inset-0 h-full w-full object-cover" draggable={false} />
          </picture>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-6 pb-10 pt-24">
            <div className="mx-auto max-w-md">
              <div className="mb-2 flex items-end justify-between text-white">
                <span className="text-sm font-black tracking-wide [text-shadow:0_1px_3px_#000]">Carregando a Arena…</span>
                <span className="text-2xl font-black tabular-nums [text-shadow:0_1px_3px_#000]">{pct}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full border border-amber-200/70 bg-black/60">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
