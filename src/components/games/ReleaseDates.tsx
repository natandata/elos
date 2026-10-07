"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setReleaseDate } from "@/lib/actions/gameVisibility";

export type DateRow = { game: string; title: string; /** data em vigor (ISO) */ current: string; /** data padrão do código (ISO) */ fallback: string; custom: boolean; /** sem data: só abre quando o admin liberar */ none: boolean };

/** "2026-11-01T00:00:00-03:00" -> "2026-11-01T00:00" (horário de Brasília, para o campo datetime-local) */
const toInput = (iso: string): string => new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 16);
/** "2026-11-01T00:00" (Brasília) -> ISO */
const fromInput = (v: string): string => `${v}:00-03:00`;

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/** Admin: define a data e a hora de abertura de cada jogo (horário de Brasília). */
export function ReleaseDates({ rows }: { rows: DateRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.game, r.none ? "" : toInput(r.current)])));

  function save(game: string, iso: string | null) {
    setError(null);
    start(async () => {
      const res = await setReleaseDate(game, iso);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.game} className="card p-3">
          <p className="text-sm font-black">{r.title}</p>
          <p className="text-xs text-[var(--muted)]">{r.none ? "Sem data: só abre quando você liberar (Visível ou acesso antecipado)." : `Abre em ${fmt(r.current)}${r.custom ? " (data ajustada por você)" : ""}.`}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input type="datetime-local" value={values[r.game] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [r.game]: e.target.value }))} className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-sm font-bold" aria-label={`Data de abertura: ${r.title}`} />
            <button type="button" disabled={pending || !values[r.game]} onClick={() => save(r.game, fromInput(values[r.game]))} className="btn btn-primary !px-3 !py-1.5 !text-xs disabled:opacity-50">
              Salvar data
            </button>
            {r.custom ? (
              <button type="button" disabled={pending} onClick={() => { setValues((v) => ({ ...v, [r.game]: r.none ? "" : toInput(r.fallback) })); save(r.game, null); }} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
                Voltar ao padrão
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
      <p className="text-[11px] text-[var(--muted)]">Horário de Brasília. Quem tem acesso antecipado, contas de teste e o admin entram antes da data.</p>
    </div>
  );
}
