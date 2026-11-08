"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PesTitle } from "./match/TeamSelect";
import { SLOTS, slotKind, type SaveStatus, type Slot } from "./useSoccerSave";

type Row<T> = { data: T; at: number | null };

const when = (ms: number | null): string => (ms ? new Date(ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

/** Escolha do espaço de salvamento (3 por modo): continuar um jogo salvo, começar um novo ou apagar. */
export function SaveSlots<T>({ base, title, kicker, summarize, onPick, onBack }: { base: string; title: string; kicker: string; summarize: (d: T) => string; onPick: (slot: Slot) => void; onBack: () => void }) {
  const [rows, setRows] = useState<Record<Slot, Row<T> | null> | null>(null);
  const [sb] = useState(() => createClient());

  useEffect(() => {
    let stop = false;
    (async () => {
      const kinds = SLOTS.map((s) => slotKind(base, s));
      const { data } = await sb.from("soccer_saves").select("kind, data, updated_at").in("kind", kinds);
      if (stop) return;
      const out = { 1: null, 2: null, 3: null } as Record<Slot, Row<T> | null>;
      for (const s of SLOTS) {
        const k = slotKind(base, s);
        const remote = data?.find((r) => r.kind === k);
        if (remote) out[s] = { data: remote.data as T, at: new Date(remote.updated_at as string).getTime() };
        else {
          try {
            const raw = localStorage.getItem(`arenasoccer:save:${k}`);
            if (raw) out[s] = { data: JSON.parse(raw) as T, at: null };
          } catch {
            /* sem cópia local */
          }
        }
      }
      setRows(out);
    })();
    return () => {
      stop = true;
    };
  }, [base, sb]);

  async function remove(slot: Slot) {
    if (!window.confirm(`Apagar o espaço ${slot}? Esse progresso não pode ser recuperado.`)) return;
    const k = slotKind(base, slot);
    try {
      localStorage.removeItem(`arenasoccer:save:${k}`);
    } catch {
      /* ok */
    }
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) await sb.from("soccer_saves").delete().eq("kind", k).eq("user_id", user.id);
    setRows((r) => (r ? { ...r, [slot]: null } : r));
  }

  return (
    <div className="space-y-3">
      <section className="pes-panel">
        <PesTitle kicker={kicker} title={title} />
        <p className="mb-3 text-xs font-bold text-white/60">Você tem 3 espaços de salvamento. O progresso é salvo sozinho a cada partida e fica na sua conta: dá para continuar de onde parou, em qualquer aparelho.</p>
        {!rows ? (
          <p className="p-3 text-sm font-bold text-white/60">Carregando os salvamentos…</p>
        ) : (
          <ul className="space-y-2">
            {SLOTS.map((s) => {
              const r = rows[s];
              return (
                <li key={s} className="pes-cut flex items-center gap-3 px-3 py-3" style={{ background: r ? "linear-gradient(120deg, rgba(52,211,153,0.28), rgba(8,16,36,0.94) 62%)" : "rgba(255,255,255,0.06)", borderLeft: `5px solid ${r ? "#34d399" : "rgba(255,255,255,0.25)"}` }}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/10 text-xl">{r ? "💾" : "➕"}</span>
                  <span className="min-w-0 flex-1">
                    <b className="pes-title block text-sm">Espaço {s}</b>
                    {r ? (
                      <>
                        <small className="block truncate text-xs font-bold text-white/85">{summarize(r.data)}</small>
                        {r.at ? <small className="block text-[10px] font-semibold text-white/50">salvo em {when(r.at)}</small> : null}
                      </>
                    ) : (
                      <small className="block text-xs font-bold text-white/55">Vazio · começar um jogo novo</small>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col gap-1.5">
                    <button type="button" onClick={() => onPick(s)} className="btn btn-primary !px-3 !py-1.5 !text-xs">
                      {r ? "Continuar" : "Novo jogo"}
                    </button>
                    {r ? (
                      <button type="button" onClick={() => void remove(s)} className="btn btn-ghost !px-3 !py-1 !text-[10px]">
                        🗑 Apagar
                      </button>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        ← Voltar
      </button>
    </div>
  );
}

/** Faixa no topo de cada modo: espaço atual, estado do salvamento e os botões "Salvar agora" e "Trocar de espaço". */
export function SaveBar({ slot, status, savedAt, onSave, onSwitch }: { slot: Slot; status: SaveStatus; savedAt: number | null; onSave: () => void; onSwitch: () => void }) {
  const label = status === "saving" ? "Salvando…" : status === "error" ? "⚠ Não foi possível salvar (confira a internet)" : savedAt ? `✓ Salvo às ${new Date(savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Salvamento automático ligado";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs">
      <span aria-hidden>💾</span>
      <span className="min-w-0 flex-1 truncate font-black uppercase tracking-wide">
        Espaço {slot} <span className={`ml-1 font-bold normal-case tracking-normal ${status === "error" ? "text-rose-400" : "text-emerald-300"}`}>{label}</span>
      </span>
      <button type="button" onClick={onSave} className="btn btn-ghost !px-2.5 !py-1 !text-[10px]">
        Salvar agora
      </button>
      <button type="button" onClick={onSwitch} className="btn btn-ghost !px-2.5 !py-1 !text-[10px]">
        Trocar
      </button>
    </div>
  );
}
