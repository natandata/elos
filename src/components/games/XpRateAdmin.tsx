"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setXpRate } from "@/lib/actions/store";
import { COIN, fmtCoins } from "@/lib/games/coins";

/** Admin: quantos XP valem 1 denário na troca (abre em 01/11). */
export function XpRateAdmin({ rate }: { rate: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(String(rate));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    start(async () => {
      const r = await setXpRate(Number(v));
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: "Salvo! As próximas trocas já usam esse valor." });
        router.refresh();
      }
    });
  }

  return (
    <div className="card space-y-2 p-3">
      <p className="text-sm font-black leading-tight">⚖️ Troca de XP por {COIN.name.toLowerCase()}</p>
      <p className="text-xs text-[var(--muted)]">Abre para os jogadores em 01/11/2026 (você e as contas de teste podem testar antes). O XP trocado não diminui o nível nem o ranking do Elo.</p>
      <label className="block text-xs font-bold text-[var(--muted)]">
        Quantos XP valem {fmtCoins(1)}
        <input type="number" min={1} step={1} className="input mt-1" value={v} onChange={(e) => { setV(e.target.value); setMsg(null); }} />
      </label>
      <button type="button" disabled={pending || Number(v) === rate} onClick={save} className="btn btn-primary w-full">
        {pending ? "Salvando…" : "Salvar taxa"}
      </button>
      {msg ? <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p> : null}
    </div>
  );
}
