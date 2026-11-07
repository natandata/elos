"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const KEY = "elos_rsvp_card_login";
// Quem respondeu "Ainda não sei" precisa confirmar até terça 10/11 (fim do dia, horário de Brasília).
const MAYBE_DEADLINE_LABEL = "terça-feira (10/11) às 23h59";
const MAYBE_DEADLINE_END = Date.parse("2026-11-11T02:59:59Z");
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
    if (s !== "maybe") setTimeout(() => setOpen(false), 1400);
  };

  const [y, m, d] = state.event_date.split("-");
  const wasMaybe = state.status === "maybe";
  const expired = Date.now() > MAYBE_DEADLINE_END;
  const all: { s: Rsvp; label: string; emoji: string }[] = [
    { s: "yes", label: "Eu vou!", emoji: "✅" },
    { s: "maybe", label: "Ainda não sei", emoji: "🤔" },
    { s: "no", label: "Não vou", emoji: "❌" },
  ];
  const opts = wasMaybe ? all.filter((o) => o.s !== "maybe") : all;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Confirmar presença no Acampadentro">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--card)] p-6 text-center text-[var(--ink)] shadow-2xl">
        <p className="text-4xl" aria-hidden>
          ⛺
        </p>
        <p className="mt-2 text-2xl font-black leading-tight">{wasMaybe ? `Falta confirmar sua presença no ${state.name}!` : `Você vai no ${state.name}?`}</p>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Dia {d}/{m}/{y}. Confirme sua presença para a gente se organizar.</p>
        {wasMaybe && !done ? (
          <p className="mt-3 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-700">
            {expired
              ? "O prazo acabou. Responda agora, mas sem confirmação não garantimos sua inscrição."
              : `Você respondeu “Ainda não sei”. O prazo para confirmar é até ${MAYBE_DEADLINE_LABEL}. Se não responder, não será possível confirmar a sua inscrição.`}
          </p>
        ) : null}
        {done ? (
          done === "maybe" ? (
            <div className="mt-5">
              <p className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-3 py-3 text-base font-extrabold text-amber-700">
                ⏰ Prazo: até {MAYBE_DEADLINE_LABEL}. Se você não confirmar até lá, não será possível confirmar a sua inscrição.
              </p>
              <button type="button" onClick={() => setOpen(false)} className="mt-4 w-full rounded-xl border-2 border-[var(--line)] px-4 py-3 text-base font-extrabold active:scale-[0.98]">
                Entendi
              </button>
            </div>
          ) : (
            <p className="mt-6 text-lg font-extrabold">{done === "yes" ? "Presença confirmada! 🎉" : "Anotado, sentiremos sua falta."}</p>
          )
        ) : (
          <div className="mt-5 space-y-2.5">
            {opts.map((o) => (
              <button key={o.s} type="button" disabled={busy} onClick={() => answer(o.s)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--line)] px-4 py-3 text-base font-extrabold active:scale-[0.98] disabled:opacity-60">
                <span aria-hidden>{o.emoji}</span> {o.label}
              </button>
            ))}
            {!wasMaybe ? <p className="text-xs font-semibold text-[var(--muted)]">Se escolher “Ainda não sei”, confirme até {MAYBE_DEADLINE_LABEL}. Sem resposta, não é possível confirmar a sua inscrição.</p> : null}
            <button type="button" onClick={close} className="pt-1 text-xs font-semibold text-[var(--muted)] underline">
              {wasMaybe ? `Continuar em talvez (até ${MAYBE_DEADLINE_LABEL})` : "Responder depois"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
