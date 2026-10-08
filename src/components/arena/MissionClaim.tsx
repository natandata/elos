"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { claimArenaMission } from "@/lib/actions/arena";
import { AT } from "./ArenaText";

/** Botão de resgatar o prêmio de uma missão da Arena. */
export function MissionClaim({ missionKey, reward }: { missionKey: string; reward: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await claimArenaMission(missionKey);
      if (r.error) setError(r.error);
      else router.refresh();
    } catch {
      setError("Sem conexão ou página desatualizada. Atualize a página e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0 text-right">
      <button type="button" onClick={claim} disabled={busy} className="btn btn-primary !px-3 !py-2 !text-sm disabled:opacity-60">
        {busy ? "…" : <AT>{`Resgatar +${reward} 🏆`}</AT>}
      </button>
      {error ? <p className="mt-1 max-w-[150px] text-[11px] font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
