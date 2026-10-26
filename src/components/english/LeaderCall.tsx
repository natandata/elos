"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelLeaderCall, requestLeaderCall } from "@/lib/actions/leaderCall";
import { CALL_GEMS, CALL_MINUTES, LEADERS, safeLink, type LeaderCall as Call, type LeaderId } from "@/lib/babel/leaders";
import { MascotSays } from "./BabelMascot";

// Último nível: escolher o líder, pedir a chamada de 10 min e acompanhar (pedido -> marcada -> concluída).

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function LeaderCall({ unlocked, call }: { unlocked: boolean; call: Call | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [leader, setLeader] = useState<LeaderId | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.error) setErr(r.error);
      else {
        setErr(null);
        router.refresh();
      }
    });

  if (!unlocked && !call) {
    return (
      <div className="mt-4">
        <MascotSays mood="think">O último nível está trancado. Termine todas as lições da trilha para conversar {CALL_MINUTES} minutos com o Natan ou a Rebeca!</MascotSays>
      </div>
    );
  }

  if (call?.status === "done") {
    return (
      <div className="mt-4">
        <MascotSays mood="cheer">Você conversou com {LEADERS[call.leader].article} e completou o último nível! Parabéns, +{CALL_GEMS} gemas de presente.</MascotSays>
      </div>
    );
  }

  if (call) {
    const link = safeLink(call.link);
    return (
      <div className="mt-4 space-y-3">
        <MascotSays mood="proud">{call.status === "scheduled" ? "Sua conversa está marcada!" : "Pedido enviado! Em breve você recebe aqui o dia e o horário."}</MascotSays>
        <div className="bb-card p-4">
          <p className="text-base font-extrabold">
            Conversa de {CALL_MINUTES} min com {LEADERS[call.leader].article}
          </p>
          {call.status === "scheduled" && call.scheduledAt ? (
            <>
              <p className="mt-1 text-lg font-extrabold text-[var(--bb-green-d)]">{fmt(call.scheduledAt)}</p>
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="bb-btn mt-3 block text-center">
                  Entrar na conversa
                </a>
              ) : (
                <p className="bb-sub mt-1">O link chega no sino perto do horário.</p>
              )}
              <p className="bb-sub mt-3 text-xs">Dica: converse só em inglês e não tenha medo de errar. O importante é tentar!</p>
            </>
          ) : (
            <p className="bb-sub mt-1">Aguardando {LEADERS[call.leader].name} marcar o horário.{call.note ? ` Você pediu: “${call.note}”.` : ""}</p>
          )}
          <button type="button" disabled={pending} onClick={() => run(() => cancelLeaderCall(call.id))} className="mt-3 text-sm font-extrabold text-[var(--bb-red)] underline disabled:opacity-50">
            Cancelar conversa
          </button>
          {err ? <p className="mt-2 text-sm font-bold text-[var(--bb-red)]">{err}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <MascotSays mood="cheer">Você chegou ao último nível! Escolha com quem quer conversar em inglês por {CALL_MINUTES} minutos.</MascotSays>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(LEADERS) as LeaderId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setLeader(id)}
            aria-pressed={leader === id}
            className={`bb-card flex flex-col items-center gap-2 p-4 text-center transition active:translate-y-0.5 ${leader === id ? "!border-[var(--bb-green)] !bg-[var(--bb-soft)]" : ""}`}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bb-green)] text-3xl font-black text-white">{LEADERS[id].name.slice(0, 1)}</span>
            <span className="text-lg font-extrabold">{LEADERS[id].name}</span>
            <span className="bb-sub text-xs">{LEADERS[id].blurb}</span>
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-sm font-extrabold">Quais dias e horários ficam bons para você? (opcional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="Ex.: sábado de manhã ou domingo à tarde" className="mt-1 w-full rounded-2xl border-2 border-[var(--bb-line)] bg-[var(--bb-bg)] p-3 text-base font-bold outline-none focus:border-[var(--bb-green)]" />
      </label>
      <button type="button" className="bb-btn" disabled={!leader || pending} onClick={() => leader && run(() => requestLeaderCall(leader, note))}>
        {pending ? "Enviando…" : "Pedir conversa"}
      </button>
      {err ? <p className="text-center text-sm font-bold text-[var(--bb-red)]">{err}</p> : null}
      <p className="bb-sub text-center text-xs">Uma chamada de {CALL_MINUTES} minutos, só em inglês. Ao concluir você ganha {CALL_GEMS} gemas.</p>
    </div>
  );
}
