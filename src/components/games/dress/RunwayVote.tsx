"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaperDoll } from "./PaperDoll";
import { voteRunwayLook } from "@/lib/actions/runway";
import { DRESS_CHARACTER_BY_ID } from "@/lib/games/dress/characters";
import type { Look } from "@/lib/games/dress/items";

export type RunwayLookCard = { id: string; name: string; elo: string | null; characterId: string; items: Look; voted: boolean };

/** Galeria de looks de um dia pra votar. Os votos só aparecem no resultado (pra não influenciar). */
export function RunwayVote({ looks, votesLeft }: { looks: RunwayLookCard[]; votesLeft: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState<Set<string>>(() => new Set(looks.filter((l) => l.voted).map((l) => l.id)));
  const [left, setLeft] = useState(votesLeft);

  async function vote(id: string) {
    if (busy || voted.has(id)) return;
    setBusy(id);
    setError(null);
    const r = await voteRunwayLook(id).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string });
    setBusy(null);
    if (r.error) return setError(r.error);
    setVoted((v) => new Set(v).add(id));
    setLeft((n) => Math.max(0, n - 1));
    router.refresh();
  }

  if (looks.length === 0) return <p className="card p-4 text-center text-sm text-[var(--muted)]">Ninguém publicou um look ainda neste dia.</p>;

  return (
    <div>
      <p className="mb-2 text-xs font-bold text-[var(--muted)]">
        Votos que você ainda tem neste dia: <b>{left}</b>
      </p>
      <div className="grid grid-cols-2 gap-3">
        {looks.map((l) => {
          const ch = DRESS_CHARACTER_BY_ID.get(l.characterId);
          const done = voted.has(l.id);
          return (
            <div key={l.id} className="card overflow-hidden p-2 text-center">
              {ch ? <PaperDoll base={ch.base} look={l.items} bg={ch.bg} title={`Look de ${l.name}`} className="mx-auto h-48 w-auto" /> : null}
              <p className="mt-1 truncate text-sm font-black">{l.name}</p>
              {l.elo ? <p className="truncate text-[10px] text-[var(--muted)]">{l.elo}</p> : null}
              <button
                type="button"
                disabled={done || busy !== null || left === 0}
                onClick={() => vote(l.id)}
                className={`btn mt-2 w-full !py-2 !text-sm ${done ? "btn-ghost" : "btn-primary"} disabled:opacity-60`}
              >
                {done ? "✓ Votado" : busy === l.id ? "..." : "💛 Votar"}
              </button>
            </div>
          );
        })}
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
