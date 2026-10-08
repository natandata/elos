"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startCamarim } from "@/lib/actions/runway";

/** Botão JOGAR do hub: entra no camarim (o relógio começa) e abre a tela de vestir. */
export function EnterCamarim({ seconds }: { seconds: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await startCamarim().catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string });
    if (r.error) {
      setBusy(false);
      return setError(r.error);
    }
    router.push("/app/jogos/vestir/camarim");
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={go} className="vh-btn">
        {busy ? "Abrindo o camarim..." : `👗 JOGAR · ${Math.floor(seconds / 60)} min no camarim`}
      </button>
      {error ? <p className="mt-2 rounded-xl bg-rose-900/70 px-3 py-2 text-sm font-bold text-rose-100">{error}</p> : null}
    </div>
  );
}
