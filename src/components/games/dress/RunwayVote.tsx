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

  if (looks.length === 0) return <p className="vh-panel text-center text-sm text-purple-100">Ninguém publicou um look ainda neste dia.</p>;

  return (
    <div>
      <p className="mb-2 text-xs font-bold text-amber-200">
        Votos que você ainda tem neste dia: <b className="text-base">{left}</b>
      </p>
      <div className="grid grid-cols-2 gap-3">
        {looks.map((l) => {
          const ch = DRESS_CHARACTER_BY_ID.get(l.characterId);
          const done = voted.has(l.id);
          return (
            <div key={l.id} className="vh-card !cursor-default text-center" data-on={done}>
              {ch ? (
                <div className="relative mx-auto mb-1 rounded-xl py-1" style={{ background: `linear-gradient(180deg, ${ch.bg[0]}, ${ch.bg[1]})` }}>
                  <PaperDoll base={ch.base} look={l.items} title={`Look de ${l.name}`} className="mx-auto h-44 w-auto" />
                </div>
              ) : null}
              <p className="truncate text-sm font-black">{l.name}</p>
              {l.elo ? <p className="truncate text-[10px] font-bold text-amber-900/70">{l.elo}</p> : null}
              <button type="button" disabled={done || busy !== null || left === 0} onClick={() => vote(l.id)} className={`vh-btn vh-btn-sm mt-2 w-full ${done ? "vh-btn-dark" : "vh-btn-purple"}`}>
                {done ? "✓ Votado" : busy === l.id ? "..." : "💛 Votar"}
              </button>
            </div>
          );
        })}
      </div>
      {error ? <p className="mt-3 rounded-xl bg-rose-900/70 px-3 py-2 text-sm font-bold text-rose-100">{error}</p> : null}
    </div>
  );
}
