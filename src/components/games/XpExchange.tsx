"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { exchangeXp } from "@/lib/actions/store";
import { COIN, fmtCoins, XP_EXCHANGE_OPENS } from "@/lib/games/coins";

function parts(ms: number) {
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Troca de XP por denários. Fica trancada com contagem regressiva até 01/11 (admin e contas de teste podem testar antes). */
export function XpExchange({ availableXp, rate, early }: { availableXp: number; rate: number; early: boolean }) {
  const router = useRouter();
  const target = new Date(XP_EXCHANGE_OPENS).getTime();
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => {
      const l = Math.max(0, target - Date.now());
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [left, target, router]);

  const open = left <= 0 || early;
  const max = Math.min(1000, Math.floor(availableXp / rate));
  const n = Math.max(1, Math.min(qty, Math.max(1, max)));
  const p = parts(left);

  function go() {
    setMsg(null);
    start(async () => {
      const r = await exchangeXp(n);
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: `Troca feita! Você ganhou ${fmtCoins(n)}.` });
        setQty(1);
        router.refresh();
      }
    });
  }

  return (
    <section className="card mb-5 p-3" aria-label="Troca de XP por denários">
      <p className="text-sm font-black leading-tight">
        ⚖️ Trocar XP por {COIN.name.toLowerCase()} {COIN.emoji}
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        {rate} XP = {fmtCoins(1)}. Seu XP total, seu nível e o ranking do Elo <b>não diminuem</b> ao trocar.
      </p>
      {!open ? (
        <div className="mt-2 rounded-xl bg-amber-50 p-3 text-center">
          <p className="text-xs font-black text-amber-900">🔒 A troca abre em 01/11</p>
          <p className="mt-1 text-lg font-black tabular-nums text-amber-900">
            {p.d}d {String(p.h).padStart(2, "0")}h {String(p.m).padStart(2, "0")}m {String(p.s).padStart(2, "0")}s
          </p>
        </div>
      ) : (
        <div className="mt-2">
          {!left ? null : <p className="mb-1 text-[11px] font-bold text-amber-700">Teste antecipado (só admin e contas de teste).</p>}
          <p className="text-xs font-bold">
            XP disponível para troca: <span className="tabular-nums">{availableXp.toLocaleString("pt-BR")}</span>
          </p>
          {max < 1 ? (
            <p className="mt-2 text-xs text-[var(--muted)]">Você precisa de pelo menos {rate} XP para trocar por 1 {COIN.one.toLowerCase()}. Jogue e cumpra missões para juntar XP.</p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {[1, 5, 10].filter((v) => v <= max).map((v) => (
                  <button key={v} type="button" onClick={() => setQty(v)} className={`rounded-full px-3 py-1 text-[11px] font-black ${n === v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
                    {v}
                  </button>
                ))}
                <button type="button" onClick={() => setQty(max)} className={`rounded-full px-3 py-1 text-[11px] font-black ${n === max ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
                  Tudo ({max})
                </button>
                <input type="number" min={1} max={max} className="input !w-20" value={n} onChange={(e) => setQty(Math.floor(Number(e.target.value)) || 1)} aria-label="Quantidade de denários" />
              </div>
              <button type="button" disabled={pending} onClick={go} className="btn btn-primary mt-2 w-full">
                {pending ? "Trocando…" : `Trocar ${(n * rate).toLocaleString("pt-BR")} XP por ${fmtCoins(n)}`}
              </button>
            </>
          )}
          {msg ? <p className={`mt-2 text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p> : null}
        </div>
      )}
    </section>
  );
}
