"use client";

import { createClient } from "@/lib/supabase/client";

const sent = new Set<string>();

/** Manda para o banco um erro que aconteceu no aparelho (no máximo um de cada tipo por visita); nunca atrapalha o jogo. */
export function reportClientError(area: string, err: unknown, extra?: Record<string, unknown>): void {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err)?.slice(0, 200) ?? "erro");
    const key = `${area}:${e.message}`;
    if (sent.has(key) || sent.size > 8) return;
    sent.add(key);
    const vv = window.visualViewport;
    void createClient()
      .rpc("report_client_error", {
        p_area: area,
        p_message: e.message,
        p_stack: e.stack ?? null,
        p_ua: navigator.userAgent,
        p_extra: { ...extra, dpr: window.devicePixelRatio, screen: `${window.screen.width}x${window.screen.height}`, inner: `${window.innerWidth}x${window.innerHeight}`, vv: vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}` : null, mem: (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null },
      })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* relatório é opcional */
  }
}
