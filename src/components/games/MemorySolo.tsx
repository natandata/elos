"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MemoryBoard, type MemoryResult } from "./MemoryBoard";
import { SOLO_SIZES, fmtMs } from "@/lib/games/memory";
import { finishMemorySolo, startMemorySolo } from "@/lib/actions/memory";

const nowMs = () => Date.now();

type Run = { runId: string; seed: number; pairs: number; startedAt: number };
type Result = { ms: number; moves: number; record: boolean; best: number; error?: string };

/** Treino solo: sem XP, mas o recorde de cada nível vale pro ranking dos Elos. */
export function MemorySolo({ records }: { records: Record<number, number> }) {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(pairs: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const r = await startMemorySolo(pairs).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; runId?: string; seed?: number });
    setBusy(false);
    if (r.error || !r.runId || r.seed === undefined) return setError(r.error ?? "Não foi possível começar.");
    setRun({ runId: r.runId, seed: r.seed, pairs, startedAt: nowMs() });
  }

  async function finish(m: MemoryResult) {
    if (!run) return;
    setBusy(true);
    const r = await finishMemorySolo(run.runId, m.turns).catch(() => ({ error: "Sem conexão." }) as { error?: string; ms?: number; moves?: number; record?: boolean; best?: number });
    setBusy(false);
    if (r.error || r.ms === undefined) {
      setResult({ ms: m.ms, moves: m.turns.length, record: false, best: records[run.pairs] ?? m.ms, error: r.error });
    } else {
      setResult({ ms: r.ms, moves: r.moves ?? m.turns.length, record: !!r.record, best: r.best ?? r.ms });
    }
    router.refresh();
  }

  if (run && !result) return <MemoryBoard key={run.runId} seed={run.seed} pairs={run.pairs} startedAt={run.startedAt} onComplete={(m) => void finish(m)} />;

  if (run && result) {
    return (
      <div className="card p-6 text-center">
        <p className="text-6xl" aria-hidden>
          {result.record ? "🏆" : "✅"}
        </p>
        <h2 className="mt-2 text-2xl font-black">{fmtMs(result.ms)}</h2>
        <p className="text-sm font-bold text-[var(--muted)]">
          {result.moves} jogadas · {run.pairs} pares
        </p>
        {result.error ? <p className="mt-2 text-sm font-semibold text-rose-600">{result.error} Este tempo não entrou no ranking.</p> : null}
        {result.record ? <p className="mt-2 font-black text-amber-600">Novo recorde! Já está no ranking do seu Elo.</p> : <p className="mt-2 text-sm text-[var(--muted)]">Seu recorde: {fmtMs(result.best)}</p>}
        <button type="button" disabled={busy} onClick={() => void start(run.pairs)} className="btn btn-primary mt-5 w-full">
          Jogar de novo
        </button>
        <button type="button" onClick={() => setRun(null)} className="btn btn-ghost mt-2 w-full">
          Trocar o tamanho
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {SOLO_SIZES.map((s) => {
        const best = records[s.pairs];
        return (
          <button key={s.pairs} type="button" disabled={busy} onClick={() => void start(s.pairs)} className="card flex items-center justify-between p-4 text-left active:scale-[0.99]">
            <span>
              <span className="block text-lg font-black">{s.label}</span>
              <span className="text-xs font-bold text-[var(--muted)]">{s.hint}</span>
            </span>
            <span className="text-right text-xs font-bold text-[var(--muted)]">{best ? `Recorde ${fmtMs(best)}` : "Sem recorde"}</span>
          </button>
        );
      })}
    </div>
  );
}
