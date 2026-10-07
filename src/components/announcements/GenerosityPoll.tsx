"use client";

import { useState, useTransition } from "react";
import { answerGenerosity } from "@/lib/actions/surveys";

/** Pesquisa única logo depois do login (Elo Masculino 16–17). */
export function GenerosityPoll({ others }: { /** quantos outros Elos recebem */ others: number }) {
  const [hidden, setHidden] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (hidden) return null;

  function answer(yes: boolean) {
    setError(null);
    start(async () => {
      const r = await answerGenerosity(yes);
      if (r.error) {
        // quem já respondeu (ou a pesquisa indisponível) só fecha
        if (r.error === "Você já respondeu." || r.error === "Pesquisa indisponível.") setHidden(true);
        else setError(r.error);
        return;
      }
      setDone(yes ? `Obrigado pela generosidade! Seu Elo compartilhou ${r.moved ?? others * 3} XP com os outros Elos. 💛` : "Tudo bem! Obrigado por responder.");
    });
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="generosity-title">
      <div className="card w-full max-w-sm space-y-4 p-5 text-center">
        <span className="chip bg-[var(--accent-soft)] text-[var(--accent-strong)]">📋 Pesquisa rápida</span>
        {done ? (
          <>
            <p className="text-5xl" aria-hidden>
              {done.startsWith("Obrigado pela") ? "💛" : "🙂"}
            </p>
            <p className="text-base font-bold">{done}</p>
            <button type="button" className="btn btn-primary w-full !py-2" onClick={() => setHidden(true)}>
              Fechar
            </button>
          </>
        ) : (
          <>
            <p id="generosity-title" className="text-xl font-extrabold">
              Você gostaria de ser mais generoso?
            </p>
            <p className="text-xs text-[var(--muted)]">
              Se responder <b>Sim</b>, o seu Elo compartilha 3 XP com cada um dos outros {others} Elos ({others * 3} XP no total). Se responder <b>Não</b>, nada acontece.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-primary !py-3 !text-base" onClick={() => answer(true)} disabled={pending}>
                Sim
              </button>
              <button type="button" className="btn btn-ghost !py-3 !text-base" onClick={() => answer(false)} disabled={pending}>
                Não
              </button>
            </div>
            {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
