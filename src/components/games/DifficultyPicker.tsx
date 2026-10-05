"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startGame } from "@/lib/actions/games";
import {
  DIFFICULTIES,
  DIFFICULTY_EMOJI,
  DIFFICULTY_INFO,
  DIFFICULTY_LABEL,
  type Difficulty,
  type GameKey,
} from "@/lib/games/difficulty";

const TONE: Record<Difficulty, string> = {
  facil: "border-emerald-300 bg-emerald-50 text-emerald-900",
  medio: "border-amber-300 bg-amber-50 text-amber-900",
  dificil: "border-rose-300 bg-rose-50 text-rose-900",
};

/** Escolha da dificuldade do dia — depois da primeira resposta fica travada. */
export function DifficultyPicker({ game }: { game: GameKey }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Difficulty | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(d: Difficulty) {
    if (busy) return;
    setBusy(d);
    setError(null);
    try {
      const res = await startGame(game, d);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <p className="mb-3 text-base font-black">Escolha a dificuldade de hoje</p>
      <div className="grid gap-3">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            disabled={busy !== null}
            onClick={() => choose(d)}
            className={`flex items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition active:scale-[0.98] disabled:opacity-60 ${TONE[d]}`}
          >
            <span className="text-4xl" aria-hidden>
              {DIFFICULTY_EMOJI[d]}
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-black">{busy === d ? "Começando..." : DIFFICULTY_LABEL[d]}</span>
              <span className="block text-sm font-bold opacity-80">{DIFFICULTY_INFO[game][d]}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-[var(--muted)]">
        Depois da primeira resposta não dá pra trocar. Amanhã você escolhe de novo.
      </p>
      {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
