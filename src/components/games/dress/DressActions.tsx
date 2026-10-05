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
        <button type="button" disabled={busy} onClick={() => go(false)} className="btn btn-primary w-full !py-3 !text-lg">
          {busy ? "..." : "👗 Jogar o desafio de hoje"}
        </button>
      ) : null}
      {state === "playing" || state === "practicing" ? (
        <button type="button" disabled={busy} onClick={() => router.push("/app/jogos/vestir/jogar")} className="btn btn-primary w-full !py-3 !text-lg">
          ▶️ Continuar {state === "practicing" ? "o treino" : "o desafio de hoje"}
        </button>
      ) : null}
      {state === "done" ? (
        <button type="button" disabled={busy} onClick={() => go(true)} className="btn btn-ghost w-full !py-3">
          {busy ? "..." : "🏋️ Treinar de novo (sem bilhetes)"}
        </button>
      ) : null}
      {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
