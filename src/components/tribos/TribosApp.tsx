"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TState } from "@/lib/tribos/state";
import { TribosChoose } from "./TribosChoose";
import { TribosVillage } from "./TribosVillage";

/** Celular em pé? O jogo só funciona deitado. */
function usePortraitPhone(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse) and (orientation: portrait)");
    const on = () => setPortrait(mq.matches);
    on();
    mq.addEventListener("change", on);
    // onde o navegador permite (app instalado no Android), trava deitado; no iPhone vale a rotação automática
    const lock = () => {
      try {
        const o = screen.orientation as ScreenOrientation & { lock?: (t: string) => Promise<void> };
        void o.lock?.("landscape")?.catch(() => undefined);
      } catch {
        // sem suporte: segue só com o aviso
      }
    };
    window.addEventListener("pointerdown", lock, { once: true });
    return () => {
      mq.removeEventListener("change", on);
      window.removeEventListener("pointerdown", lock);
    };
  }, []);
  return portrait;
}

function RotateNotice() {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-[#0e1a12] p-8 text-center text-white">
      <svg viewBox="0 0 64 64" className="h-24 w-24 animate-[spin_3s_ease-in-out_infinite]" aria-hidden>
        <rect x="20" y="6" width="24" height="46" rx="5" fill="#1d2b22" stroke="#f5b301" strokeWidth="3" />
        <circle cx="32" cy="46" r="2" fill="#f5b301" />
        <path d="M8 38 q-2 -14 12 -18 M20 20 l-6 -1 M20 20 l1 6" fill="none" stroke="#9be7b0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h1 className="text-2xl font-black">Gire o celular</h1>
      <p className="max-w-xs text-sm font-semibold text-white/80">O Clash of Tribos é jogado deitado. Ative a rotação automática da tela e vire o aparelho.</p>
      <Link href="/app/jogos" className="mt-2 rounded-full bg-white/15 px-5 py-2 text-sm font-black">Voltar à Sala de Jogos</Link>
    </div>
  );
}

export function TribosApp({ initial, unavailable, name = "" }: { initial: TState | null; unavailable: boolean; name?: string }) {
  const [state, setState] = useState<TState | null>(initial);
  const portrait = usePortraitPhone();
  if (unavailable) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-5xl" aria-hidden>🏕️</p>
        <h1 className="mt-2 text-xl font-black">Clash of Tribos</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">O jogo está indisponível neste ambiente.</p>
        <Link href="/app/jogos" className="btn btn-ghost mt-4">Voltar</Link>
      </div>
    );
  }
  return (
    <>
      {!state ? <TribosChoose onDone={setState} /> : <TribosVillage initial={state} name={name} />}
      {portrait ? <RotateNotice /> : null}
    </>
  );
}
