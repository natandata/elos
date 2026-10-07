"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LS = (kind: string) => `arenasoccer:save:${kind}`;

/** Progresso do ArenaSoccer (Copa, Brasileirão, carreira): guardado no banco (por jogador) com cópia rápida neste aparelho. */
export function useSoccerSave<T>(kind: string): { data: T | null; loading: boolean; save: (d: T | null) => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [sb] = useState(() => createClient());
  const timer = useRef<number | null>(null);
  const latest = useRef<T | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      let local: T | null = null;
      try {
        const raw = localStorage.getItem(LS(kind));
        if (raw) local = JSON.parse(raw) as T;
      } catch {
        /* sem cópia local */
      }
      const { data: row } = await sb.from("soccer_saves").select("data, updated_at").eq("kind", kind).maybeSingle();
      if (stop) return;
      const remote = (row?.data as T | undefined) ?? null;
      setData(remote ?? local);
      latest.current = remote ?? local;
      setLoading(false);
    })();
    return () => {
      stop = true;
    };
  }, [kind, sb]);

  const flush = useCallback(
    async (d: T | null) => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return;
      if (d === null) await sb.from("soccer_saves").delete().eq("kind", kind).eq("user_id", user.id);
      else await sb.from("soccer_saves").upsert({ user_id: user.id, kind, data: d, updated_at: new Date().toISOString() }, { onConflict: "user_id,kind" });
    },
    [kind, sb],
  );

  const save = useCallback(
    (d: T | null) => {
      setData(d);
      latest.current = d;
      try {
        if (d === null) localStorage.removeItem(LS(kind));
        else localStorage.setItem(LS(kind), JSON.stringify(d));
      } catch {
        /* sem espaço local */
      }
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(latest.current), 600);
    },
    [kind, flush],
  );

  // grava o que faltar quando a tela fecha
  useEffect(
    () => () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        void flush(latest.current);
      }
    },
    [flush],
  );

  return { data, loading, save };
}
