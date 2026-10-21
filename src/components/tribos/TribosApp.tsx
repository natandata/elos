"use client";

import Link from "next/link";
import { useState } from "react";
import type { TState } from "@/lib/tribos/state";
import { TribosChoose } from "./TribosChoose";
import { TribosVillage } from "./TribosVillage";

export function TribosApp({ initial, unavailable }: { initial: TState | null; unavailable: boolean }) {
  const [state, setState] = useState<TState | null>(initial);
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
  if (!state) return <TribosChoose onDone={setState} />;
  return <TribosVillage initial={state} />;
}
