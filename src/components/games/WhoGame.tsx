"use client";

import Link from "next/link";
import { useState } from "react";
import { guessWho, type WhoResult } from "@/lib/actions/games";
import { BibleHint } from "./BibleHint";
import { TimerBar, useCountdown } from "./useCountdown";
import { CardTile } from "./CardTile";

export function WhoGame({
  options,
  initialHints,
  initialGuesses,
  reference,
  seconds = null,
}: {
  options: string[];
  initialHints: string[];
  initialGuesses: number[];
  reference: string;
  /** relógio por palpite (treino nas rodadas altas); estourou = palpite errado */
  seconds?: number | null;
}) {
  const [hints, setHints] = useState(initialHints);
  const [guessed, setGuessed] = useState(initialGuesses);
  const [final, setFinal] = useState<WhoResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeLeft = useCountdown(seconds, guessed.length, !!final || busy, () => void guess(-1));

  async function guess(i: number) {
    if (busy || (i !== -1 && guessed.includes(i)) || final) return;
    setBusy(true);
    setError(null);
    try {
      const res = await guessWho(i);
      if (res.error) {
        setError(res.error);
        return;
      }
      setGuessed((g) => [...g, i]);
      if (res.finished) setFinal(res);
      else if (res.nextHint) setHints((h) => [...h, res.nextHint!]);
    } catch {
      setError("Sem conexão ou página desatualizada. Atualize a página e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card mb-4 space-y-3 p-5">
        <p className="text-sm font-black uppercase tracking-wide text-[var(--muted)]">Dicas</p>
        {hints.map((h, i) => (
          <p key={i} className="flex gap-2 text-lg font-bold leading-snug">
            <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 text-sm font-black text-[var(--accent-strong)]">
              {i + 1}
            </span>
            {h}
          </p>
        ))}
      </div>

      <BibleHint reference={reference} className="mb-4" />
      {!final ? <TimerBar left={timeLeft} total={seconds} /> : null}

      {final ? (
        <div className="card p-6 text-center">
          <p className="text-6xl" aria-hidden>
            {final.correct ? "🎉" : "😅"}
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {final.correct ? "Isso mesmo!" : "Era"} {final.reveal}
          </h2>
          {(final.xp ?? 0) > 0 ? (
            <p className="mt-2 inline-block rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-lg font-black text-[var(--accent-strong)]">
              +{final.xp} XP
            </p>
          ) : null}
          {final.card ? (
            <div className="mt-5 flex flex-col items-center gap-2">
              <p className="text-sm font-black">🎁 Carta nova na coleção!</p>
              <CardTile card={final.card} big />
            </div>
          ) : null}
          <Link href="/app/jogos" className="btn btn-primary mt-6 w-full !py-3 !text-base">
            Voltar aos jogos
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm font-bold text-[var(--muted)]">Quem sou eu? Errou, vem dica nova — acertar cedo vale mais!</p>
          <div className="grid gap-3">
            {options.map((opt, i) => {
              const used = guessed.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={busy || used}
                  onClick={() => guess(i)}
                  className={`rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold transition active:scale-[0.98] ${
                    used
                      ? "border-rose-300 bg-rose-50 text-rose-800 line-through opacity-70"
                      : "border-[var(--line)] bg-[var(--card)]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
        </>
      )}
    </div>
  );
}
