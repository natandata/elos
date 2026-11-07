"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const KEY = "elos_rsvp_card_login";
export type Rsvp = "yes" | "no" | "maybe";
export type RsvpState = { status: Rsvp | null; event_date: string; name: string; open: boolean } | null;

/** Card de confirmação de presença no Acampadentro, logo após o login, até a pessoa responder "vou" ou "não vou". */
export function AttendanceCard({ state }: { state: RsvpState }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Rsvp | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = !!state?.open && state.status !== "yes" && state.status !== "no";

  useEffect(() => {
    if (!pending) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await createClient().auth.getSession();
        const login = data.session?.user.last_sign_in_at ?? "sem-data";
        if (localStorage.getItem(KEY) !== login && alive) setOpen(true);
      } catch {
        if (alive) setOpen(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pending]);

  if (!open || !state) return null;

  const remember = async () => {
    try {
      const { data } = await createClient().auth.getSession();
      localStorage.setItem(KEY, data.session?.user.last_sign_in_at ?? "sem-data");
    } catch {
      // sem armazenamento: o card volta no próximo acesso
    }
  };
  const close = async () => {
    setOpen(false);
    await remember();
  };
  const answer = async (s: Rsvp) => {
    setBusy(true);
    try {
      await createClient().rpc("acampadentro_set_rsvp", { p_status: s });
    } catch {
      // o card volta no próximo login se não gravou
    }
    setBusy(false);
    setDone(s);
    await remember();
    setTimeout(() => setOpen(false), 1400);
  };

  const [y, m, d] = state.event_date.split("-");
  const opts: { s: Rsvp; label: string; emoji: string }[] = [
    { s: "yes", label: "Eu vou!", emoji: "✅" },
    { s: "maybe", label: "Ainda não sei", emoji: "🤔" },
    { s: "no", label: "Não vou", emoji: "❌" },
  ];

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Confirmar presença no Acampadentro">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--card)] p-6 text-center text-[var(--ink)] shadow-2xl">
        <p className="text-4xl" aria-hidden>
          ⛺
        </p>
        <p className="mt-2 text-2xl font-black leading-tight">Você vai no {state.name}?</p>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Dia {d}/{m}/{y}. Confirme sua presença para a gente se organizar.</p>
        {done ? (
          <p className="mt-6 text-lg font-extrabold">{done === "yes" ? "Presença confirmada! 🎉" : done === "no" ? "Anotado, sentiremos sua falta." : "Anotado! Perguntamos de novo no próximo login."}</p>
        ) : (
          <div className="mt-5 space-y-2.5">
            {opts.map((o) => (
              <button key={o.s} type="button" disabled={busy} onClick={() => answer(o.s)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--line)] px-4 py-3 text-base font-extrabold active:scale-[0.98] disabled:opacity-60">
                <span aria-hidden>{o.emoji}</span> {o.label}
              </button>
            ))}
            <button type="button" onClick={close} className="pt-1 text-xs font-semibold text-[var(--muted)] underline">
              Responder depois
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
