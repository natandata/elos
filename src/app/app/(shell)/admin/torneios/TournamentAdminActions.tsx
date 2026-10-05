"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelTournament, deleteTournament, startTournament } from "@/lib/actions/tournaments";

/** Iniciar, cancelar e apagar um torneio. */
export function TournamentAdminActions({ id, status, confirmed }: { id: string; status: string; confirmed: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "start" | "cancel" | "delete", ask: string | null) {
    if (busy) return;
    if (ask && !window.confirm(ask)) return;
    setBusy(kind);
    setError(null);
    try {
      const r = kind === "start" ? await startTournament(id) : kind === "cancel" ? await cancelTournament(id) : await deleteTournament(id);
      if (r.error) setError(r.error);
      else router.refresh();
    } catch {
      setError("Sem conexão ou página desatualizada. Atualize a página e tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status === "open" ? (
          <button
            type="button"
            disabled={busy !== null || confirmed < 2}
            onClick={() => run("start", `Fechar as inscrições e sortear o chaveamento com ${confirmed} ${confirmed === 1 ? "inscrito" : "inscritos"}? Não dá pra reabrir depois.`)}
            className="btn btn-primary !py-2 !text-sm disabled:opacity-50"
          >
            {busy === "start" ? "Iniciando…" : "▶ Iniciar torneio"}
          </button>
        ) : null}
        {status === "open" || status === "running" ? (
          <button type="button" disabled={busy !== null} onClick={() => run("cancel", "Cancelar o torneio? Todo mundo será avisado e ninguém recebe prêmio.")} className="btn btn-ghost !py-2 !text-sm">
            Cancelar torneio
          </button>
        ) : null}
        {status === "open" || status === "cancelled" ? (
          <button type="button" disabled={busy !== null} onClick={() => run("delete", "Apagar o torneio de vez, com as inscrições?")} className="btn btn-ghost !py-2 !text-sm text-rose-600">
            Apagar
          </button>
        ) : null}
      </div>
      {status === "open" && confirmed < 2 ? <p className="mt-1 text-xs text-[var(--muted)]">Precisa de pelo menos 2 inscritos confirmados pra iniciar.</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
