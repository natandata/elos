"use client";

import Link from "next/link";
import { useState } from "react";
import { chooseTribe } from "@/lib/actions/tribos";
import { TRIBES, TRIBE_KEYS, type TribeKey } from "@/lib/tribos/data";
import type { TState } from "@/lib/tribos/state";
import { TribeEmblem } from "./ui";

// Escolha da tribo (deitado): acontece uma vez só e define o emblema, o terreno da vila e a bandeira nas guerras.

export function TribosChoose({ onDone, demo = false }: { onDone: (s: TState) => void; demo?: boolean }) {
  const [pick, setPick] = useState<TribeKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirm() {
    if (!pick || busy) return;
    if (demo) {
      setErr("Modo demonstração: nada é salvo.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await chooseTribe(pick);
      if (r.error) setErr(r.error);
      else if (r.state) onDone(r.state);
    } catch {
      setErr("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-gradient-to-br from-[#10241a] via-[#2b2410] to-[#2b130e] p-3 text-white">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-2 py-2">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black leading-tight">Clash of Tribos</h1>
            <p className="text-xs font-semibold text-white/80">Escolha de que lado você luta. A decisão é definitiva.</p>
          </div>
          <Link href="/app/jogos" className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-black">Voltar</Link>
        </header>

        <div className="grid grid-cols-3 gap-2.5">
          {TRIBE_KEYS.map((k) => {
            const t = TRIBES[k];
            const on = pick === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setPick(k)}
                className="flex flex-col items-center gap-1 overflow-hidden rounded-2xl border-[3px] p-3 text-center transition active:scale-[0.99]"
                style={{ borderColor: on ? t.color : "rgba(255,255,255,0.18)", background: `linear-gradient(180deg, ${t.terrain.a}${on ? "" : "cc"} 0%, ${t.terrain.cliff} 100%)`, boxShadow: on ? `0 0 0 3px ${t.color}88` : undefined }}
              >
                <TribeEmblem tribe={k} className="h-24 w-auto" />
                <span className="text-lg font-black leading-tight text-white [text-shadow:0_2px_0_rgba(0,0,0,0.55)]">{t.name}</span>
                <span className="text-[11px] font-black uppercase tracking-wide text-white/90 [text-shadow:0_1px_0_rgba(0,0,0,0.6)]">{t.animal} · terreno de {t.terrain.name.toLowerCase()}</span>
                <span className="rounded-lg bg-black/45 px-2 py-1 text-[11px] font-semibold leading-snug text-white">{t.blurb}</span>
              </button>
            );
          })}
        </div>

        {err ? <p className="rounded-xl bg-rose-100 px-3 py-1.5 text-center text-xs font-bold text-rose-900">{err}</p> : null}
        <button type="button" disabled={!pick || busy} onClick={() => void confirm()} className="btn btn-primary mx-auto w-full max-w-sm !py-2.5 text-base">
          {busy ? "Montando a vila…" : pick ? `Entrar para os ${TRIBES[pick].name}` : "Escolha uma tribo"}
        </button>
      </div>
    </div>
  );
}
