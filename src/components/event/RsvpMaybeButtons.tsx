"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Answer = "yes" | "no";

export function RsvpMaybeButtons({ name }: { name: string }) {
  const [done, setDone] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const answer = async (s: Answer) => {
    setBusy(true);
    setError(false);
    const { error: err } = await createClient().rpc("acampadentro_set_rsvp", { p_status: s });
    setBusy(false);
    if (err) setError(true);
    else setDone(s);
  };

  if (done) {
    return (
      <div className="card mb-3 p-4 text-center text-sm font-extrabold">
        {done === "yes" ? "Presença confirmada! 🎉" : "Anotado, sentiremos sua falta."}
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4">
      <p className="text-sm font-black text-amber-700">🤔 Você ainda não confirmou o {name}</p>
      <p className="mt-0.5 text-xs font-semibold text-amber-700">Confirme até terça-feira (10/11). Sem resposta, não será possível confirmar a sua inscrição.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={() => answer("yes")} className="flex-1 rounded-xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2.5 text-sm font-extrabold active:scale-[0.98] disabled:opacity-60">
          ✅ Eu vou!
        </button>
        <button type="button" disabled={busy} onClick={() => answer("no")} className="flex-1 rounded-xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2.5 text-sm font-extrabold active:scale-[0.98] disabled:opacity-60">
          ❌ Não vou
        </button>
      </div>
      {error ? <p className="mt-2 text-xs font-bold text-rose-600">Não deu certo. Tente de novo.</p> : null}
    </div>
  );
}
