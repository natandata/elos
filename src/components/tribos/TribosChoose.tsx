"use client";

import Link from "next/link";
import { useState } from "react";
import { chooseTribe } from "@/lib/actions/tribos";
import { TRIBES, TRIBE_KEYS, type TribeKey } from "@/lib/tribos/data";
import type { TState } from "@/lib/tribos/state";

// Escolha da tribo: acontece uma vez só e define a cor da vila, o mascote e a bandeira nas guerras.

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
    <div className="mx-auto max-w-lg pb-8">
      <header className="rounded-3xl bg-gradient-to-br from-[#14532d] via-[#a87500] to-[#9b231f] p-5 text-white shadow-lg">
        <p className="text-xs font-black uppercase tracking-widest text-white/80">Novo jogo</p>
        <h1 className="mt-1 text-3xl font-black leading-tight">Clash of Tribos 🏕️</h1>
        <p className="mt-1 text-sm font-semibold text-white/90">Construa sua vila, junte ouro e maná, treine heróis e enfrente as outras tribos. Primeiro, escolha de que lado você luta.</p>
      </header>

      <div className="mt-4 grid gap-3">
        {TRIBE_KEYS.map((k) => {
          const t = TRIBES[k];
          const on = pick === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPick(k)}
              className="flex items-center gap-4 rounded-2xl border-[3px] p-4 text-left transition active:scale-[0.99]"
              style={{ borderColor: on ? t.color : "var(--line)", background: on ? t.tint : "var(--card)", color: on ? "#1d1535" : undefined, boxShadow: on ? `0 0 0 3px ${t.color}55` : undefined }}
            >
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl" style={{ background: t.color }} aria-hidden>
                {t.mascot}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-black">{t.name}</span>
                <span className="block text-xs font-bold opacity-70">{t.animal} · cor {k === "feras" ? "amarela" : k === "bravos" ? "verde" : "vermelha"}</span>
                <span className="mt-1 block text-sm font-semibold">{t.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs font-semibold text-[var(--muted)]">A escolha é definitiva. Todas as tribos têm as mesmas chances: o que decide é a sua estratégia.</p>
      {err ? <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-center text-sm font-bold text-rose-900">{err}</p> : null}
      <button type="button" disabled={!pick || busy} onClick={() => void confirm()} className="btn btn-primary mt-3 w-full !py-3 text-base">
        {busy ? "Montando a vila…" : pick ? `Entrar para os ${TRIBES[pick].name}` : "Escolha uma tribo"}
      </button>
      <Link href="/app/jogos" className="btn btn-ghost mt-2 w-full">Voltar</Link>
    </div>
  );
}
