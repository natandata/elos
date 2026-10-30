"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TRIBES } from "@/lib/event/tribes";
import { useEvent } from "./EventProvider";

const KEY = "elos_tribe_card_login";

/** Card de confirmação da tribo a cada login: brasão, pontos da tribo, posição, integrantes e dias para o evento. */
export function TribeLoginCard({ name }: { name: string }) {
  const { state } = useEvent();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!state.visible || !state.me) return;
    let alive = true;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.auth.getSession();
        // `last_sign_in_at` muda a cada login novo (e não a cada renovação da sessão)
        const login = data.session?.user.last_sign_in_at ?? "sem-data";
        if (localStorage.getItem(KEY) !== login && alive) {
          setOpen(true);
          // o admin vê no painel quem já viu a própria tribo
          void sb.rpc("event_mark_seen").then(() => null, () => null);
        }
      } catch {
        if (alive) setOpen(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [state.visible, state.me]);

  if (!open || !state.visible || !state.me) return null;
  const t = TRIBES[state.me];
  const mine = state.tribes?.find((x) => x.key === state.me);

  const close = async () => {
    setOpen(false);
    try {
      const { data } = await createClient().auth.getSession();
      localStorage.setItem(KEY, data.session?.user.last_sign_in_at ?? "sem-data");
    } catch {
      // sem armazenamento: o card volta no próximo acesso
    }
  };

  const cell = (label: string, value: string) => (
    <div className="rounded-xl px-3 py-2" style={{ background: t.soft, color: t.dark }}>
      <p className="text-[11px] font-semibold">{label}</p>
      <p className="text-xl font-black tabular-nums leading-tight">{value}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Sua tribo: ${t.name}`}>
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-[var(--card)] text-[var(--ink)] shadow-2xl">
        <div className="px-5 pb-5 pt-6 text-center" style={{ background: t.base, color: t.dark }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.img} alt="" width={110} height={110} className="mx-auto" />
          <p className="mt-2 text-sm font-semibold">Você é da tribo</p>
          <p className="text-3xl font-black tracking-tight">{t.name}</p>
          <p className="text-xs font-semibold">
            {t.animal} · {state.name ?? "Acampadentro"}
          </p>
        </div>
        <div className="space-y-3 p-5">
          <p className="truncate text-center text-base font-extrabold">{name}</p>
          <div className="grid grid-cols-2 gap-2">
            {cell("Pontos da tribo", String(mine?.points ?? 0))}
            {cell("Posição", `${mine?.rank ?? 1}º de 3`)}
            {cell("Integrantes", String(mine?.members ?? 0))}
            {cell("Dias para o evento", String(state.days_left ?? 0))}
          </div>
          <button type="button" onClick={close} className="w-full rounded-xl px-4 py-3 text-base font-extrabold" style={{ background: t.base, color: t.dark }}>
            Entrar no app
          </button>
        </div>
      </div>
    </div>
  );
}
