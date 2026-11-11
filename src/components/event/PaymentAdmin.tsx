"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendPaymentReminderPush } from "@/lib/actions/event";

export type PayRow = {
  userId: string;
  name: string;
  role: string;
  status: "pending" | "approved" | "rejected" | "waived" | "later" | "none";
  later: boolean;
  payDate: string | null;
  fileName: string;
  url: string | null;
  isPdf: boolean;
  at: string | null;
  note: string | null;
};

const LABEL: Record<PayRow["status"], string> = { pending: "Aguardando", approved: "Aprovado", waived: "Isento (admin)", later: "Pagto. futuro", rejected: "Recusado", none: "Sem comprovante" };
const TONE: Record<PayRow["status"], string> = {
  pending: "bg-amber-500/15 text-amber-700",
  approved: "bg-emerald-500/15 text-emerald-700",
  waived: "bg-sky-500/15 text-sky-700",
  later: "bg-violet-500/15 text-violet-700",
  rejected: "bg-rose-500/15 text-rose-700",
  none: "bg-[var(--line)] text-[var(--muted)]",
};

/** Admin: quem marcou "Eu vou", se já mandou o comprovante e a aprovação (aprovado = inscrição confirmada). */
export function PaymentAdmin({ rows }: { rows: PayRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const count = (s: PayRow["status"]) => rows.filter((r) => r.status === s).length;

  const waive = async (r: PayRow, on: boolean) => {
    if (on && !window.confirm(`Confirmar a inscrição de ${r.name} sem pagamento? Ela verá: "Não há necessidade de pagamento."`)) return;
    setBusy(r.userId);
    await createClient().rpc("acampadentro_pay_waive", { p_user: r.userId, p_waive: on });
    setBusy(null);
    router.refresh();
  };

  const offerLater = async (r: PayRow, on: boolean) => {
    if (on && !window.confirm(`Liberar o pagamento futuro para ${r.name}? Ela verá que a inscrição foi confirmada com o pagamento agendado para depois do evento e poderá escolher a data.`)) return;
    setBusy(r.userId);
    await createClient().rpc("acampadentro_pay_later_offer", { p_user: r.userId, p_on: on });
    setBusy(null);
    router.refresh();
  };

  const review = async (r: PayRow, approve: boolean) => {
    let note: string | null = null;
    if (!approve) {
      note = window.prompt("Motivo da recusa (aparece para a pessoa):", "Comprovante ilegível ou errado");
      if (note === null) return;
    }
    setBusy(r.userId);
    await createClient().rpc("acampadentro_pay_review", { p_user: r.userId, p_approve: approve, p_note: note });
    setBusy(null);
    router.refresh();
  };

  return (
    <section className="card mt-4 p-4">
      <h2 className="text-lg font-black">💸 Pagamento das inscrições</h2>
      <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">
        {rows.length} confirmaram presença · {count("approved")} aprovados · {count("waived")} isentos · {count("later")} com pagamento futuro · {count("pending")} aguardando · {count("rejected")} recusados · {count("none")} sem comprovante
      </p>
      <a href="/app/admin/acampadentro/relatorio/pdf" download className="mr-2 mt-3 inline-block rounded-xl bg-[var(--ink)] px-3 py-2 text-sm font-extrabold text-[var(--bg)]">
        📄 Relatório
      </a>
      <a href="/app/admin/acampadentro/relatorio/paginas" download className="mr-2 mt-3 inline-block rounded-xl border-2 border-[var(--line)] px-3 py-2 text-sm font-extrabold" title="PDF com uma pessoa por página: o nome no topo e o comprovante embaixo">
        📑 Por página
      </a>
      <button
        type="button"
        disabled={busy === "push"}
        onClick={async () => {
          if (!window.confirm("Enviar notificação (push) para todos que marcaram Sim e ainda não foram aprovados?")) return;
          setBusy("push");
          const r = await sendPaymentReminderPush();
          setBusy(null);
          setMsg(r.message ?? r.error ?? "");
        }}
        className="mt-3 rounded-xl border-2 border-[var(--line)] px-3 py-2 text-sm font-extrabold disabled:opacity-60"
      >
        🔔 Enviar aviso de pagamento (push)
      </button>
      {msg ? <p className="mt-1 text-xs font-bold text-emerald-700">{msg}</p> : null}
      <ul className="mt-3 divide-y divide-[var(--line)]">
        {rows.map((r) => (
          <li key={r.userId} className="flex flex-wrap items-center gap-2 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">
                {r.name} <span className="text-[10px] font-bold text-[var(--muted)]">{r.role === "leader" ? "líder" : "cria"}</span>
              </p>
              {r.at ? <p className="text-[11px] font-semibold text-[var(--muted)]">enviado em {new Date(r.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p> : null}
              {r.later ? <p className="text-[11px] font-bold text-violet-700">{r.payDate ? `Vai pagar em ${r.payDate.split("-").reverse().join("/")}` : "Pagamento futuro liberado · aguardando a pessoa escolher a data"}</p> : null}
              {r.note ? <p className="text-[11px] font-semibold text-rose-700">Recusa: {r.note}</p> : null}
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${TONE[r.status]}`}>{LABEL[r.status]}</span>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-bold underline">
                {r.isPdf ? "Abrir PDF" : "Ver comprovante"}
              </a>
            ) : null}
            {r.status !== "waived" && r.status !== "approved" ? (
              <button type="button" disabled={busy === r.userId} onClick={() => waive(r, true)} className="rounded-lg border border-sky-500/60 px-2.5 py-1 text-xs font-black text-sky-700 disabled:opacity-60">
                Isentar
              </button>
            ) : null}
            {r.status !== "waived" && r.status !== "approved" ? (
              <button type="button" disabled={busy === r.userId} onClick={() => offerLater(r, !r.later)} className="rounded-lg border border-violet-500/60 px-2.5 py-1 text-xs font-black text-violet-700 disabled:opacity-60">
                {r.later ? "Cancelar pagto. futuro" : "Pagto. futuro"}
              </button>
            ) : null}
            {r.status === "waived" ? (
              <button type="button" disabled={busy === r.userId} onClick={() => waive(r, false)} className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-black disabled:opacity-60">
                Desfazer isenção
              </button>
            ) : null}
            {r.status === "pending" || r.status === "rejected" ? (
              <button type="button" disabled={busy === r.userId} onClick={() => review(r, true)} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black text-white disabled:opacity-60">
                Aprovar
              </button>
            ) : null}
            {r.status === "pending" || r.status === "approved" ? (
              <button type="button" disabled={busy === r.userId} onClick={() => review(r, false)} className="rounded-lg border border-rose-500/60 px-2.5 py-1 text-xs font-black text-rose-700 disabled:opacity-60">
                {r.status === "approved" ? "Desfazer" : "Recusar"}
              </button>
            ) : null}
          </li>
        ))}
        {rows.length === 0 ? <li className="py-3 text-sm font-semibold text-[var(--muted)]">Ninguém confirmou presença ainda.</li> : null}
      </ul>
    </section>
  );
}
