"use client";

import { useEffect, useState } from "react";
import { MAINTENANCE_NOTICE_AT, MAINTENANCE_START_AT, isNoticeTime } from "@/lib/maintenance";

const KEY = "elos-manutencao-aviso";

/** Aviso para todos a partir de 21/11 às 00h00: o aplicativo entra em manutenção em 27/11. Aparece na hora certa mesmo com o app aberto. */
export function MaintenanceNotice() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let closed = false;
    try {
      closed = sessionStorage.getItem(KEY) === "1";
    } catch {
      /* sem armazenamento: mostra sempre */
    }
    const tick = (): void => setOn(!closed && isNoticeTime());
    tick();
    // reavalia na hora do aviso e na hora da manutenção (sem depender de recarregar)
    const now = Date.now();
    const timers = [MAINTENANCE_NOTICE_AT, MAINTENANCE_START_AT].filter((t) => t > now && t - now < 2 ** 31 - 1).map((t) => window.setTimeout(tick, t - now + 250));
    const poll = window.setInterval(tick, 60_000);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearInterval(poll);
    };
  }, []);
  if (!on) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-[200] flex items-start gap-3 bg-amber-400 px-4 py-3 text-sm font-bold text-black shadow-lg">
      <span aria-hidden className="text-xl leading-none">⚠️</span>
      <p className="min-w-0 flex-1 leading-snug">
        Aviso importante: o ELOS entrará em manutenção a partir do dia 27 de novembro, às 00h00, sem previsão de retorno. A partir desse momento ninguém conseguirá entrar no aplicativo.
      </p>
      <button
        type="button"
        aria-label="Fechar aviso"
        className="shrink-0 rounded-lg bg-black/15 px-2 py-0.5 text-base font-black"
        onClick={() => {
          try {
            sessionStorage.setItem(KEY, "1");
          } catch {
            /* ok */
          }
          setOn(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
