"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { createMemoryDuel } from "@/lib/actions/memory";
import { DUEL_PAIRS, SOLO_SIZES } from "@/lib/games/memory";

export type Mate = { id: string; name: string; avatarUrl: string | null };

export function MemoryChallenge({ mates }: { mates: Mate[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<number>(DUEL_PAIRS);

  async function challenge(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    const r = await createMemoryDuel(id, pairs).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; id?: string });
    setBusyId(null);
    if (r.error || !r.id) return setError(r.error ?? "Não foi possível criar o desafio.");
    router.push(`/app/jogos/memoria/${r.id}`);
  }

  if (mates.length === 0) return <p className="text-sm text-[var(--muted)]">Ninguém mais no seu Elo ainda para desafiar.</p>;

  return (
    <div>
      <p className="mb-1 text-xs font-bold text-[var(--muted)]">Nível do desafio (os dois jogam o mesmo):</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SOLO_SIZES.map((s) => (
          <button
            key={s.pairs}
            type="button"
            onClick={() => setPairs(s.pairs)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${pairs === s.pairs ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]"}`}
          >
            {s.label} · {s.pairs}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {mates.map((m) => (
          <li key={m.id} className="card flex items-center gap-3 p-3">
            <Avatar url={m.avatarUrl} name={m.name} size={40} />
            <span className="min-w-0 flex-1 truncate text-base font-bold">{m.name}</span>
            <button type="button" disabled={busyId !== null} onClick={() => challenge(m.id)} className="btn btn-primary !px-4 !py-2 !text-sm">
              {busyId === m.id ? "..." : "🃏 Desafiar"}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
