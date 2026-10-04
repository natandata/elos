"use client";

import { useState } from "react";
import { openChest, type ChestResult } from "@/lib/actions/games";
import { CardTile } from "./CardTile";

export function ChestButton({ opened }: { opened: boolean }) {
  const [res, setRes] = useState<ChestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const done = opened || (res !== null && !res.error);

  async function open() {
    if (busy || done) return;
    setBusy(true);
    setShake(true);
    try {
      const [r] = await Promise.all([openChest(), new Promise((ok) => setTimeout(ok, 900))]);
      setRes(r);
    } catch {
      setRes({ error: "Sem conexão. Tente de novo." });
    } finally {
      setBusy(false);
      setShake(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-center">
      {res && !res.error ? (
        <div className="flex flex-col items-center gap-2">
          {res.card ? (
            <>
              <p className="text-base font-black text-amber-900">🎁 Carta nova!</p>
              <CardTile card={res.card} big />
            </>
          ) : (
            <p className="text-lg font-black text-amber-900">Coleção completa! +{res.xp ?? 1} XP</p>
          )}
          <p className="text-sm font-bold text-amber-800">Volte amanhã pra abrir outro baú.</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={busy || done}
          className="flex w-full flex-col items-center gap-1 disabled:opacity-70"
        >
          <span className={`text-6xl ${shake ? "animate-bounce" : ""}`} aria-hidden>
            {done ? "📭" : "🎁"}
          </span>
          <span className="text-lg font-black text-amber-900">{done ? "Baú de hoje já aberto" : "Abrir baú do dia"}</span>
          <span className="text-sm font-bold text-amber-800">
            {done ? "Volte amanhã!" : "Ganhe uma carta de personagem bíblico"}
          </span>
        </button>
      )}
      {res?.error ? <p className="mt-2 text-sm font-semibold text-rose-600">{res.error}</p> : null}
    </div>
  );
}
