"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TICKETS_PER_XP } from "@/lib/games/dress/economy";
import { createClient } from "@/lib/supabase/client";

/** Troca de Bilhetes Dourados por XP: 300 🎫 = 1 XP. */
export function DressExchange({ tickets }: { tickets: number }) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [have, setHave] = useState(tickets);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const can = Math.floor(have / TICKETS_PER_XP);

  async function go(xp: number) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb.rpc("dress_exchange_tickets", { p_xp: xp });
    setBusy(false);
    const r = (data ?? {}) as { error?: string; tickets?: number };
    if (error || r.error) return setMsg(r.error ?? "Não foi possível trocar. Tente de novo.");
    setHave(r.tickets ?? have - xp * TICKETS_PER_XP);
    setMsg(`Trocado! +${xp} XP na sua conta ✨`);
    router.refresh();
  }

  return (
    <section className="vh-panel mb-5">
      <h2 className="vh-h2 mb-1">✨ Trocar por XP</h2>
      <p className="text-sm text-purple-100">
        <b className="text-amber-200">{TICKETS_PER_XP} 🎫 = 1 XP.</b> Você tem <b className="tabular-nums text-amber-200">{have}</b> 🎫
        {can > 0 ? ` (dá para ${can} XP)` : ` — faltam ${TICKETS_PER_XP - (have % TICKETS_PER_XP)} 🎫 para o próximo XP`}.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="vh-btn" disabled={busy || can < 1} onClick={() => void go(1)}>
          Trocar por 1 XP
        </button>
        <button type="button" className="vh-btn vh-btn-purple" disabled={busy || can < 1} onClick={() => void go(can)}>
          Trocar tudo{can > 1 ? ` (${can} XP)` : ""}
        </button>
      </div>
      {msg ? (
        <p className="mt-2 rounded-xl bg-purple-900/70 px-3 py-2 text-center text-sm font-bold text-amber-100" role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
