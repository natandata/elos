"use client";

import { useState, useTransition } from "react";
import { finishLeaderCall, scheduleLeaderCall } from "@/lib/actions/leaderCall";
import { CALL_GEMS, LEADERS, type CallStatus, type LeaderId } from "@/lib/babel/leaders";

export type CallRow = { id: string; name: string; leader: LeaderId; status: CallStatus; note: string | null; scheduledAt: string | null; link: string | null; createdAt: string };

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Um pedido de conversa: marcar data/hora + link, e depois confirmar que aconteceu (paga as gemas). */
export function LeaderCallRow({ c }: { c: CallRow }) {
  const [pending, start] = useTransition();
  const [when, setWhen] = useState("");
  const [link, setLink] = useState(c.link ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const open = c.status === "requested" || c.status === "scheduled";

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: okText });
    });

  return (
    <div className="card space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-extrabold">
          {c.name} <span className="font-semibold text-[var(--muted)]">quer conversar com {LEADERS[c.leader].article}</span>
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.status === "done" ? "bg-emerald-500/15 text-emerald-600" : c.status === "cancelled" ? "bg-rose-500/15 text-rose-600" : c.status === "scheduled" ? "bg-sky-500/15 text-sky-600" : "bg-amber-500/15 text-amber-600"}`}>
          {c.status === "requested" ? "Aguardando horário" : c.status === "scheduled" ? "Marcada" : c.status === "done" ? "Concluída" : "Cancelada"}
        </span>
      </div>
      <p className="text-xs text-[var(--muted)]">Pedido em {fmt(c.createdAt)}{c.note ? ` · preferência: “${c.note}”` : ""}</p>
      {c.status === "scheduled" && c.scheduledAt ? <p className="text-sm font-bold">📅 {fmt(c.scheduledAt)}</p> : null}
      {open ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold">
            Dia e hora (Brasília)
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="input mt-1 block" />
          </label>
          <label className="min-w-[180px] flex-1 text-xs font-semibold">
            Link da chamada (Meet, Zoom, WhatsApp…)
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/…" className="input mt-1 block w-full" />
          </label>
          <button type="button" disabled={pending || !when} onClick={() => run(() => scheduleLeaderCall(c.id, when, link), "Marcada. O cria foi avisado no sino.")} className="btn btn-primary !px-3 !py-1.5 text-xs disabled:opacity-50">
            {c.status === "scheduled" ? "Remarcar" : "Marcar"}
          </button>
        </div>
      ) : null}
      {open ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => confirm(`Confirmar que a conversa aconteceu? O cria recebe ${CALL_GEMS} gemas.`) && run(() => finishLeaderCall(c.id, true), "Concluída. Gemas pagas.")} className="btn btn-ghost !px-3 !py-1.5 text-xs">
            ✅ Aconteceu (pagar {CALL_GEMS} gemas)
          </button>
          <button type="button" disabled={pending} onClick={() => confirm("Cancelar este pedido?") && run(() => finishLeaderCall(c.id, false), "Cancelada.")} className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Cancelar
          </button>
        </div>
      ) : null}
      {msg ? <p className={`text-xs font-bold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p> : null}
    </div>
  );
}
