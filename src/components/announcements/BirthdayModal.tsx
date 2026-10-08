"use client";

import { useState, useTransition } from "react";
import { saveBirthDate } from "@/lib/actions/birthday";

/** Pede a data de nascimento depois do login. Não dá para fechar sem preencher. */
export function BirthdayModal() {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const iso = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    start(async () => {
      const r = await saveBirthDate(iso);
      if (r.error) setError(r.error);
    });
  }

  const field = "input !px-2 text-center";
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="birth-title">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-3 p-5 text-center">
        <p className="text-5xl" aria-hidden>🎂</p>
        <p id="birth-title" className="text-lg font-extrabold">Quando é o seu aniversário?</p>
        <p className="text-sm text-[var(--muted)]">Assim a gente comemora com você na tela inicial, no seu dia!</p>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-left text-xs font-bold">
            Dia
            <input className={field} inputMode="numeric" maxLength={2} placeholder="DD" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ""))} required />
          </label>
          <label className="text-left text-xs font-bold">
            Mês
            <input className={field} inputMode="numeric" maxLength={2} placeholder="MM" value={month} onChange={(e) => setMonth(e.target.value.replace(/\D/g, ""))} required />
          </label>
          <label className="text-left text-xs font-bold">
            Ano
            <input className={field} inputMode="numeric" maxLength={4} placeholder="AAAA" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} required />
          </label>
        </div>
        {error ? (
          <p className="text-sm font-semibold text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary w-full !py-2" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </div>
  );
}
