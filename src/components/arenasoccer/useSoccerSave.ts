"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LS = (kind: string) => `arenasoccer:save:${kind}`;

export type Slot = 1 | 2 | 3;
export const SLOTS: Slot[] = [1, 2, 3];
/** O espaço 1 usa o nome antigo (para não perder o progresso de quem já jogava); os outros levam "#2" e "#3". */
export const slotKind = (base: string, slot: Slot): string => (slot === 1 ? base : `${base}#${slot}`);

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Progresso do ArenaSoccer (Copa, Brasileirão, carreira): guardado no banco (por jogador) com cópia rápida neste aparelho. */
export function useSoccerSave<T>(kind: string): { data: T | null; loading: boolean; save: (d: T | null) => void; status: SaveStatus; savedAt: number | null; flushNow: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
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
      if (row?.updated_at) setSavedAt(new Date(row.updated_at as string).getTime());
      setLoading(false);
    })();
    return () => {
      stop = true;
    };
  }, [kind, sb]);

  const flush = useCallback(
    async (d: T | null) => {
      setStatus("saving");
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        setStatus("error");
        return;
      }
      const res = d === null ? await sb.from("soccer_saves").delete().eq("kind", kind).eq("user_id", user.id) : await sb.from("soccer_saves").upsert({ user_id: user.id, kind, data: d, updated_at: new Date().toISOString() }, { onConflict: "user_id,kind" });
      if (res.error) setStatus("error");
      else {
        setStatus("saved");
        setSavedAt(Date.now());
      }
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
      setStatus("saving");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(latest.current), 600);
    },
    [kind, flush],
  );

  /** Grava agora, sem esperar (botão "Salvar agora"). */
  const flushNow = useCallback(async () => {
    if (timer.current) window.clearTimeout(timer.current);
    await flush(latest.current);
  }, [flush]);

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

  return { data, loading, save, status, savedAt, flushNow };
}
