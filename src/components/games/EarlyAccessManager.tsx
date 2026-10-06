"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setEarlyAccess } from "@/lib/actions/earlyAccess";

export type EAUser = { id: string; name: string; elo: string | null };

/** Admin: dá/retira acesso antecipado de um jogo ainda não lançado a usuários específicos. */
export function EarlyAccessManager({ game, title, users, granted }: { game: string; title: string; users: EAUser[]; granted: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const grantedSet = new Set(granted);
  const byId = new Map(users.map((u) => [u.id, u]));
  const term = q.trim().toLowerCase();
  const results = term ? users.filter((u) => !grantedSet.has(u.id) && `${u.name} ${u.elo ?? ""}`.toLowerCase().includes(term)).slice(0, 8) : [];

  function change(id: string, grant: boolean) {
    setError(null);
    start(async () => {
      const r = await setEarlyAccess(game, id, grant);
      if (r.error) setError(r.error);
      else {
        setQ("");
        router.refresh();
      }
    });
  }

  return (
    <div className="card p-3">
      <p className="text-sm font-black">
        {title} <span className="text-xs font-bold text-[var(--muted)]">· {granted.length} com acesso</span>
      </p>
      {granted.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {granted.map((id) => (
            <li key={id} className="flex items-center gap-1 rounded-full bg-emerald-100 py-1 pl-3 pr-1 text-xs font-bold text-emerald-900">
              {byId.get(id)?.name ?? "Usuário"}
              <button type="button" disabled={pending} onClick={() => change(id, false)} aria-label="Retirar acesso" className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200 text-[11px] font-black">
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar usuário pelo nome ou Elo…" className="input mt-3 w-full" />
      {results.length > 0 ? (
        <ul className="mt-1 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
          {results.map((u) => (
            <li key={u.id}>
              <button type="button" disabled={pending} onClick={() => change(u.id, true)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm">
                <span className="min-w-0 truncate font-bold">{u.name}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{u.elo ?? "sem Elo"} · + liberar</span>
              </button>
            </li>
          ))}
        </ul>
      ) : term ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Ninguém encontrado.</p>
      ) : null}
      {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
