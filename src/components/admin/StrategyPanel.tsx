"use client";

import { useState, useTransition } from "react";
import { activateStrategy } from "@/lib/actions/comeback";

export type StrategyView = {
  userId: string;
  title: string;
  why: string;
  push: string;
  gift: string;
  xp: number;
  note?: string;
  /** resultado da última ativação */
  status: { label: string; tone: "neutral" | "good" | "warn"; blocked: boolean } | null;
};

/** Estratégia sugerida para uma pessoa + botão que ativa (aviso para abrir o app + presente no próximo acesso). */
export function StrategyPanel({ v }: { v: StrategyView }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const blocked = done || !!v.status?.blocked;

  const go = () =>
    start(async () => {
      const r = await activateStrategy(v.userId);
      if (r.ok) {
        setDone(true);
        setMsg({ ok: true, text: r.message ?? "Estratégia ativada." });
      } else setMsg({ ok: false, text: r.error ?? "Não foi possível ativar." });
    });

  return (
    <div className="border-t border-dashed border-[var(--line)] bg-[var(--accent-soft)]/40 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-[var(--ink)]">🎯 {v.title}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{v.why}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            <b>Para abrir o app:</b> aviso “{v.push}”. <b>No próximo login:</b> cartão “{v.gift}” com +{v.xp} XP.
          </p>
          {v.note ? <p className="mt-1 text-[11px] font-semibold text-amber-600">⚠ {v.note}</p> : null}
          {v.status ? <p className={`mt-1 text-[11px] font-bold ${v.status.tone === "good" ? "text-emerald-600" : "text-amber-600"}`}>{v.status.label}</p> : null}
          {msg ? <p className={`mt-1 text-[11px] font-bold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p> : null}
        </div>
        <button type="button" onClick={go} disabled={pending || blocked} className="btn btn-primary shrink-0 !px-3 !py-1.5 text-xs disabled:opacity-50">
          {pending ? "Ativando…" : blocked ? "Já ativada" : "Ativar estratégia"}
        </button>
      </div>
    </div>
  );
}
