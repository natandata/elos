"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INTERVAL_MS = 20_000;

/**
 * Sinal de vida silencioso: grava a própria linha em user_presence a cada
 * ~20s e a cada troca de rota. O admin lê essa tabela e considera "online"
 * quem mandou sinal nos últimos 60s (ver src/lib/screenLabels.ts e a tela de
 * Usuários) — sem depender de Realtime/websocket.
 */
export function PresenceHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function beat() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      await supabase.from("user_presence").upsert({
        user_id: user.id,
        path: pathname,
        last_seen_at: new Date().toISOString(),
      });
    }

    beat();
    const id = setInterval(beat, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname]);

  return null;
}
