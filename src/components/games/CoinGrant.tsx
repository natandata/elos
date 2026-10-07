"use client";

import { useState, useTransition } from "react";
import { grantCoins } from "@/lib/actions/store";
import { COIN, fmtCoins } from "@/lib/games/coins";

export type CoinUser = { id: string; name: string; elo: string | null; balance: number };

/** Admin: dá ou tira moedas de um jogador (a moeda ainda não é ganha jogando). */
export function CoinGrant({ users }: { users: CoinUser[] }) {
  const [pending, start] = useTransition();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sel = users.find((u) => u.id === userId);
  const current = sel ? (balances[sel.id] ?? sel.balance) : 0;

  function go() {
    const n = Number(amount);
    if (!sel) return setMsg({ ok: false, text: "Escolha o jogador." });
    start(async () => {
      const r = await grantCoins(sel.id, n, reason);
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        setBalances((b) => ({ ...b, [sel.id]: r.balance ?? 0 }));
        setAmount("");
        setMsg({ ok: true, text: `Pronto! ${sel.name} agora tem ${fmtCoins(r.balance ?? 0)}.` });
      }
    });
  }

  return (
    <div className="card space-y-2 p-3">
      <p className="text-sm font-black leading-tight">
        {COIN.emoji} {COIN.name}: dar ou tirar
      </p>
      <p className="text-xs text-[var(--muted)]">Use número negativo para tirar. Fica registrado no extrato do jogador.</p>
      <select
        className="input"
        value={userId}
        onChange={(e) => {
          setUserId(e.target.value);
          setMsg(null);
        }}
        aria-label="Jogador"
      >
        <option value="">Escolha o jogador…</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
            {u.elo ? ` · ${u.elo}` : ""}
          </option>
        ))}
      </select>
      {sel ? <p className="text-xs font-bold text-[var(--muted)]">Saldo atual: {fmtCoins(current)}</p> : null}
      <div className="flex gap-2">
        <input type="number" step={1} className="input !w-28" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex.: 100" aria-label="Quantidade" />
        <input className="input flex-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" maxLength={120} aria-label="Motivo" />
      </div>
      <button type="button" disabled={pending || !amount} onClick={go} className="btn btn-primary w-full">
        {pending ? "Salvando…" : "Aplicar"}
      </button>
      {msg ? <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p> : null}
    </div>
  );
}
