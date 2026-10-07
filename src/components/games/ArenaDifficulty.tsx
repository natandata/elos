"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setArenaDifficulty } from "@/lib/actions/arenaDifficulty";
import { ARENA_DIFFICULTY_MAX, ARENA_DIFFICULTY_MIN, DIFFICULTY_PRESETS } from "@/lib/arena/difficulty";

/** Admin: regula a dificuldade geral da Arena dos Heróis contra o computador. */
export function ArenaDifficulty({ current }: { current: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const pct = Math.round((value - 1) * 100);
  const label = pct === 0 ? "normal" : pct > 0 ? `${pct}% mais difícil` : `${-pct}% mais fácil`;

  function save(v: number) {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await setArenaDifficulty(v);
      if (r.error) setError(r.error);
      else {
        setValue(r.value ?? v);
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="card p-3">
      <p className="text-sm font-black leading-tight">Computador da Arena: {label}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        Multiplica a vida e o dano do computador nas batalhas dos jogadores contra ele ({value.toFixed(2)}×). Vale para as próximas partidas de todos; partidas em andamento não mudam.
        O 1x1, as duplas e os torneios não são afetados.
      </p>
      <input
        type="range"
        min={ARENA_DIFFICULTY_MIN}
        max={ARENA_DIFFICULTY_MAX}
        step={0.05}
        value={value}
        disabled={pending}
        onChange={(e) => {
          setSaved(false);
          setValue(Number(e.target.value));
        }}
        aria-label="Dificuldade da Arena contra o computador"
        className="mt-3 w-full"
      />
      <div className="mt-1 flex justify-between text-[10px] font-bold text-[var(--muted)]">
        <span>{ARENA_DIFFICULTY_MIN}× (bem mais fácil)</span>
        <span>{ARENA_DIFFICULTY_MAX}× (bem mais difícil)</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DIFFICULTY_PRESETS.map((p) => (
          <button key={p.value} type="button" disabled={pending} onClick={() => setValue(p.value)} className={`rounded-full px-2.5 py-1 text-[11px] font-black ${Math.abs(value - p.value) < 0.001 ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
            {p.label}
          </button>
        ))}
      </div>
      <button type="button" disabled={pending || Math.abs(value - current) < 0.001} onClick={() => save(value)} className="btn btn-primary mt-3 w-full">
        {pending ? "Salvando…" : "Salvar dificuldade"}
      </button>
      {saved ? <p className="mt-2 text-sm font-semibold text-emerald-600">Salvo! As próximas partidas já usam essa dificuldade.</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
