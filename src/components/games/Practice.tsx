"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startPractice } from "@/lib/actions/games";
import { practiceNote } from "@/lib/games/difficulty";

type PracticeGame = "quiz" | "verse" | "who" | "order";

/** Faixa no topo de uma partida de treino: o que muda nesta rodada. */
export function PracticeNote({ round, game }: { round: number; game: PracticeGame }) {
  return (
    <p className="mb-3 rounded-2xl border-2 border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-900">
      🏋️ {practiceNote(round, game)} Não dá XP nem carta, mas conta pra destravar a Arena dos Heróis.
    </p>
  );
}

/** Botão pra jogar de novo no mesmo dia (vira treino, sem XP). */
export function ReplayButton({ game }: { game: PracticeGame }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await startPractice(game);
      if (res.error) setError(res.error);
      else router.refresh();
    } catch {
      setError("Sem conexão ou página desatualizada. Atualize a página e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={go} disabled={busy} className="btn btn-ghost w-full !py-3 disabled:opacity-60">
        {busy ? "Abrindo…" : "🔁 Jogar de novo (sem XP)"}
      </button>
      <p className="mt-1.5 text-center text-xs text-[var(--muted)]">Vale como treino e conta pra destravar a Arena.</p>
      {error ? <p className="mt-2 text-center text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
