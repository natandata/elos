"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/clientErrors";

/** Vigia do Vista o Herói: grava (no banco, tabela client_errors) erros de JavaScript e travadas longas da tela, com a página e o aparelho. */
export function DressErrorWatch() {
  useEffect(() => {
    const where = () => ({ path: window.location.pathname });
    const onErr = (e: ErrorEvent) => reportClientError("dress-window", e.error ?? e.message, where());
    const onRej = (e: PromiseRejectionEvent) => reportClientError("dress-promise", e.reason, where());
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((list) => {
        for (const en of list.getEntries()) {
          if (en.duration >= 2000) reportClientError("dress-freeze", `travada de ${Math.round(en.duration)} ms`, { ...where(), ms: Math.round(en.duration) });
        }
      });
      po.observe({ entryTypes: ["longtask"] });
    } catch {
      /* navegador sem suporte (ex.: Safari): só os erros são registrados */
    }
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      po?.disconnect();
    };
  }, []);
  return null;
}
