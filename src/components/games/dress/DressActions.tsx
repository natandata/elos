"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startDress, startDressPractice } from "@/lib/actions/dress";

/** Botões do hub: jogar o desafio do dia, continuar ou treinar. */
export function DressActions({ state }: { state: "new" | "playing" | "done" | "practicing" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(practice: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await (practice ? startDressPractice() : startDress()).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string });
    setBusy(false);
    if (r.error) return setError(r.error);
    router.push("/app/jogos/vestir/jogar");
  }

  return (
    <div>
      {state === "new" ? (
        <button type="button" disabled={busy} onClick={() => go(false)} className="vh-btn">
          {busy ? "..." : "👗 Jogar o desafio de hoje"}
        </button>
      ) : null}
      {state === "playing" || state === "practicing" ? (
        <button type="button" disabled={busy} onClick={() => router.push("/app/jogos/vestir/jogar")} className="vh-btn">
          ▶️ Continuar {state === "practicing" ? "o treino" : "o desafio de hoje"}
        </button>
      ) : null}
      {state === "done" ? (
        <button type="button" disabled={busy} onClick={() => go(true)} className="vh-btn vh-btn-purple">
          {busy ? "..." : "🏋️ Treinar de novo (sem bilhetes)"}
        </button>
      ) : null}
      {error ? <p className="mt-2 rounded-xl bg-rose-900/70 px-3 py-2 text-sm font-bold text-rose-100">{error}</p> : null}
    </div>
  );
}
