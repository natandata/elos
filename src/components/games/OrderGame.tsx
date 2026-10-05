"use client";

import Link from "next/link";
import { useState } from "react";
import { submitOrder, type OrderResult } from "@/lib/actions/games";
import { BibleHint } from "./BibleHint";

export function OrderGame({ items, attemptsLeft: initialAttempts, reference }: { items: string[]; attemptsLeft: number; reference: string }) {
  const [seq, setSeq] = useState<number[]>([]);
  const [attemptsLeft, setAttemptsLeft] = useState(initialAttempts);
  const [res, setRes] = useState<OrderResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const final = res?.finished ? res : null;

  async function send() {
    if (busy || seq.length !== items.length) return;
    setBusy(true);
    setError(null);
    try {
      const r = await submitOrder(seq);
      if (r.error) {
        setError(r.error);
        return;
      }
      setRes(r);
      if (!r.finished) {
        setAttemptsLeft(r.attemptsLeft ?? 0);
        setSeq([]);
      }
    } catch {
      setError("Sem conexão ou página desatualizada. Atualize a página e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (final) {
    return (
      <div className="card p-6">
        <p className="text-center text-6xl" aria-hidden>
          {final.correct ? "🎉" : "😅"}
        </p>
        <h2 className="mt-2 text-center text-2xl font-black">
          {final.correct ? "Linha do tempo certa!" : "Essa era a ordem certa"}
        </h2>
        {(final.xp ?? 0) > 0 ? (
          <p className="mt-2 text-center">
            <span className="inline-block rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-lg font-black text-[var(--accent-strong)]">
              +{final.xp} XP
            </span>
          </p>
        ) : null}
        <ol className="mt-4 space-y-2">
          {final.solution?.map((e, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-base font-bold text-emerald-900">
              <span className="text-lg font-black">{i + 1}º</span> {e}
            </li>
          ))}
        </ol>
        <Link href="/app/jogos" className="btn btn-primary mt-6 w-full !py-3 !text-base">
          Voltar aos jogos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-bold text-[var(--muted)]">
        Toque nos fatos na ordem em que aconteceram. Você tem {attemptsLeft} {attemptsLeft === 1 ? "tentativa" : "tentativas"}.
      </p>
      <BibleHint reference={reference} className="mb-3" />

      {res && !res.finished ? (
        <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-base font-bold text-amber-900">
          Quase! {res.rightPositions} de {items.length} no lugar certo. Tente de novo.
        </p>
      ) : null}

      <ol className="mb-4 space-y-2">
        {items.map((_, pos) => {
          const itemIdx = seq[pos];
          return (
            <li key={pos}>
              <button
                type="button"
                disabled={itemIdx === undefined}
                onClick={() => setSeq((s) => s.slice(0, pos))}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base font-bold ${
                  itemIdx === undefined
                    ? "border-dashed border-[var(--line)] text-[var(--muted)]"
                    : "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                }`}
              >
                <span className="text-lg font-black">{pos + 1}º</span>
                {itemIdx === undefined ? "—" : items[itemIdx]}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-2">
        {items.map((it, i) =>
          seq.includes(i) ? null : (
            <button
              key={i}
              type="button"
              onClick={() => setSeq((s) => [...s, i])}
              className="rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-4 py-3 text-left text-base font-bold active:scale-[0.98]"
            >
              {it}
            </button>
          ),
        )}
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setSeq([])} disabled={seq.length === 0 || busy} className="btn btn-ghost">
          Limpar
        </button>
        <button
          type="button"
          onClick={send}
          disabled={seq.length !== items.length || busy}
          className="btn btn-primary flex-1 !py-3 !text-base"
        >
          Conferir
        </button>
      </div>
    </div>
  );
}
