"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PIX_KEY = "34107987000160";
const PIX_LABEL = "34.107.987/0001-60";
const MAX = 10 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

type Props = { status: "pending" | "approved" | "rejected" | null; note: string | null; fileName: string | null };

/** "HOJE" ou "AMANHÃ" conforme o dia em Brasília (prazo: terça 10/11). */
function deadlineWord(): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  if (today === "2026-11-10") return "HOJE";
  if (today === "2026-11-09") return "AMANHÃ";
  return "";
}

export function PaymentCardClient({ status, note, fileName }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [again, setAgain] = useState(false);

  if (status === "approved") {
    return (
      <div className="mb-3 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/10 p-4 text-center">
        <p className="text-base font-black text-emerald-700">✅ Inscrição confirmada!</p>
        <p className="mt-0.5 text-xs font-semibold text-emerald-700">Recebemos e aprovamos o seu comprovante. Nos vemos no Acampadentro!</p>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
    } catch {
      const t = document.createElement("textarea");
      t.value = PIX_KEY;
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand("copy");
      } catch {
        /* sem cópia */
      }
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const upload = async (file: File) => {
    setErr(null);
    const type = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
    if (!OK_TYPES.includes(type)) return setErr("Envie uma imagem (JPG, PNG) ou um PDF.");
    if (file.size > MAX) return setErr("O arquivo passa de 10 MB. Envie um menor.");
    setBusy(true);
    try {
      const sb = createClient();
      const { data: u } = await sb.auth.getUser();
      if (!u.user) throw new Error("login");
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
      const path = `${u.user.id}/${Date.now()}.${ext}`;
      const up = await sb.storage.from("payment_proofs").upload(path, file, { contentType: type });
      if (up.error) throw up.error;
      const { data: ok, error } = await sb.rpc("acampadentro_pay_submit", { p_path: path, p_name: file.name });
      if (error || !ok) throw error ?? new Error("recusado");
      setSent(true);
      setAgain(false);
      router.refresh();
    } catch {
      setErr("Não foi possível enviar. Confira a internet e tente de novo.");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  const pending = (status === "pending" || sent) && !again;
  const word = deadlineWord();

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border-2 border-rose-500/70 bg-[var(--card)] shadow-lg">
      <div className="bg-rose-600 px-4 py-2.5 text-white">
        <p className="text-[11px] font-black uppercase tracking-wider">⏰ Pagamento até terça-feira (10/11){word ? ` · ${word}` : ""}</p>
        <p className="mt-0.5 text-base font-black leading-snug">A sua inscrição no Acampadentro só é confirmada quando você envia o comprovante de pagamento.</p>
      </div>

      <div className="space-y-4 p-4">
        {pending ? (
          <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-3">
            <p className="text-sm font-black text-amber-700">📨 Comprovante enviado! Aguardando aprovação.</p>
            <p className="mt-0.5 text-xs font-semibold text-amber-700">
              {fileName && !sent ? `Arquivo: ${fileName}. ` : ""}Assim que o admin aprovar, a sua inscrição fica confirmada.
            </p>
            <button type="button" onClick={() => setAgain(true)} className="mt-2 text-xs font-bold text-amber-800 underline">
              Enviei o arquivo errado? Enviar outro
            </button>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-rose-500/60 bg-rose-500/5 p-3">
            {status === "rejected" ? (
              <p className="mb-2 rounded-lg bg-rose-600/10 px-3 py-2 text-xs font-bold text-rose-700">
                ⚠️ O último comprovante não foi aprovado{note ? `: ${note}` : "."} Envie um novo.
              </p>
            ) : null}
            <p className="text-sm font-black">1. Envie o comprovante (foto/print ou PDF)</p>
            <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="mt-2 w-full rounded-xl bg-rose-600 px-4 py-3.5 text-base font-black text-white shadow active:scale-[0.98] disabled:opacity-60">
              {busy ? "Enviando…" : "📎 Enviar comprovante de pagamento"}
            </button>
            {err ? <p className="mt-2 text-xs font-bold text-rose-600">{err}</p> : null}
          </div>
        )}

        <div>
          <p className="text-sm font-black">{pending ? "Pagar ou compartilhar o Pix" : "2. Pague via Pix"}</p>
          <div className="mt-2 rounded-xl border-2 border-rose-500/60 bg-rose-500/10 p-3 text-center">
            <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">Valor da inscrição</p>
            <p className="text-4xl font-black tabular-nums text-rose-700">R$ 15,00</p>
          </div>
          <div className="mt-3 flex flex-col items-center gap-3">
            <div className="w-full min-w-0 text-center">
              <p className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">Chave Pix (CNPJ)</p>
              <p className="mt-0.5 select-all text-2xl font-black tabular-nums">{PIX_LABEL}</p>
              <button type="button" onClick={copy} className="mt-2 w-full rounded-xl border-2 border-[var(--line)] px-4 py-3 text-sm font-black active:scale-[0.98]">
                {copied ? "✅ Chave copiada!" : "📋 Copiar chave Pix"}
              </button>
              <p className="mt-1.5 text-[11px] font-semibold text-[var(--muted)]">Cole a chave no app do seu banco e pague R$ 15,00. Dá para enviar a chave a quem vai pagar por você.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
