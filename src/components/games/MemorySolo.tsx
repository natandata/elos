"use client";

import { useState } from "react";
import { MemoryBoard, type MemoryResult } from "./MemoryBoard";
import { SOLO_SIZES, fmtMs } from "@/lib/games/memory";

const nowMs = () => Date.now();
const randSeed = () => Math.floor(Math.random() * 2_000_000_000) + 1;
const bestKey = (pairs: number) => `elos-memory-best-${pairs}`;

function readBest(pairs: number): number | null {
  try {
    const v = Number(localStorage.getItem(bestKey(pairs)));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Treino solo: sem XP, só pra afiar a memória e bater o próprio recorde (guardado neste aparelho). */
export function MemorySolo() {
  const [run, setRun] = useState<{ seed: number; pairs: number; startedAt: number } | null>(null);
  const [result, setResult] = useState<(MemoryResult & { best: number | null; record: boolean }) | null>(null);

  function start(pairs: number) {
    setResult(null);
    setRun({ seed: randSeed(), pairs, startedAt: nowMs() });
  }

  function finish(r: MemoryResult) {
    if (!run) return;
    const prev = readBest(run.pairs);
    const record = prev === null || r.ms < prev;
    if (record) {
      try {
        localStorage.setItem(bestKey(run.pairs), String(r.ms));
      } catch {}
    }
    setResult({ ...r, best: record ? r.ms : prev, record });
  }

  if (run && !result) return <MemoryBoard key={run.seed} seed={run.seed} pairs={run.pairs} startedAt={run.startedAt} onComplete={finish} />;

  if (run && result) {
    return (
      <div className="card p-6 text-center">
        <p className="text-6xl" aria-hidden>
          {result.record ? "🏆" : "✅"}
        </p>
        <h2 className="mt-2 text-2xl font-black">{fmtMs(result.ms)}</h2>
        <p className="text-sm font-bold text-[var(--muted)]">
          {result.turns.length} jogadas · {run.pairs} pares
        </p>
        {result.record ? <p className="mt-2 font-black text-amber-600">Novo recorde!</p> : result.best ? <p className="mt-2 text-sm text-[var(--muted)]">Seu recorde: {fmtMs(result.best)}</p> : null}
        <button type="button" onClick={() => start(run.pairs)} className="btn btn-primary mt-5 w-full">
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
      {SOLO_SIZES.map((s) => {
        const best = readBest(s.pairs);
        return (
          <button key={s.pairs} type="button" onClick={() => start(s.pairs)} className="card flex items-center justify-between p-4 text-left active:scale-[0.99]">
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
