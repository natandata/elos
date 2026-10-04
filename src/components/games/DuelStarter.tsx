"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDuel } from "@/lib/actions/games";
import { Avatar } from "@/components/Avatar";

export type Mate = { id: string; name: string; avatarUrl: string | null };

export function DuelStarter({ mates }: { mates: Mate[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function challenge(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await createDuel(id);
      if (res.error || !res.id) {
        setError(res.error ?? "Não foi possível criar o duelo.");
        return;
      }
      router.push(`/app/jogos/duelo/${res.id}`);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusyId(null);
    }
  }

  if (mates.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Ninguém mais no seu Elo ainda para desafiar.</p>;
  }

  return (
    <div>
      <ul className="space-y-2">
        {mates.map((m) => (
          <li key={m.id} className="card flex items-center gap-3 p-3">
            <Avatar url={m.avatarUrl} name={m.name} size={40} />
            <span className="min-w-0 flex-1 truncate text-base font-bold">{m.name}</span>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => challenge(m.id)}
              className="btn btn-primary !px-4 !py-2 !text-sm"
            >
              {busyId === m.id ? "..." : "⚔️ Desafiar"}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
