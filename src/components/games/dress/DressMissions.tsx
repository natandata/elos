"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MISSION_TEXT, PERIOD_LABEL, type Mission } from "@/lib/games/dress/economy";
import { createClient } from "@/lib/supabase/client";

/** Missões que pagam Bilhetes Dourados: do dia, da semana e conquistas. */
export function DressMissions() {
  const sb = useMemo(() => createClient(), []);
  const [list, setList] = useState<Mission[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb.rpc("dress_missions");
    if (Array.isArray(data)) setList(data as Mission[]);
  }, [sb]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function claim(key: string) {
    setBusy(key);
    setMsg(null);
    const { data, error } = await sb.rpc("dress_mission_claim", { p_key: key });
    setBusy(null);
    const r = (data ?? {}) as { error?: string; reward?: number };
    if (error || r.error) return setMsg(r.error ?? "Não foi possível resgatar. Tente de novo.");
    setMsg(`+${r.reward} 🎫 resgatados!`);
    void load();
  }

  return (
    <section className="vh-panel mb-5">
      <h2 className="vh-h2 mb-2">🎯 Missões</h2>
      {list === null ? (
        <p className="text-sm text-purple-200">Carregando…</p>
      ) : (
        <>
          {(["day", "week", "once"] as const).map((p) => (
            <div key={p} className="mb-3 last:mb-0">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">{PERIOD_LABEL[p]}</p>
              <ul className="space-y-1.5">
                {list
                  .filter((m) => m.period === p)
                  .map((m) => {
                    const t = MISSION_TEXT[m.key];
                    if (!t) return null;
                    const done = m.progress >= m.target;
                    return (
                      <li key={m.key} className="vh-row">
                        <span className="grid w-8 place-items-center text-2xl" aria-hidden>
                          {t.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold leading-tight text-amber-50">{t.title}</span>
                          <span className="mt-1 block h-2 overflow-hidden rounded-full bg-white/15" aria-hidden>
                            <span className="block h-full rounded-full bg-amber-300 transition-[width]" style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }} />
                          </span>
                          <span className="mt-0.5 block text-[10px] font-bold text-purple-200">
                            {m.progress}/{m.target} · {t.hint}
                          </span>
                        </span>
                        {m.claimed ? (
                          <span className="text-xs font-black text-emerald-300">✓ resgatada</span>
                        ) : (
                          <button type="button" className="vh-chip !px-3 !py-1 !text-xs" data-on={done} disabled={!done || busy !== null} onClick={() => void claim(m.key)}>
                            {done ? `Resgatar +${m.reward} 🎫` : `+${m.reward} 🎫`}
                          </button>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
          {msg ? (
            <p className="mt-2 rounded-xl bg-purple-900/70 px-3 py-2 text-center text-sm font-bold text-amber-100" role="status">
              {msg}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
