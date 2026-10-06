"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SOLO_SIZES, fmtMs } from "@/lib/games/memory";

export type RankRow = { pairs: number; user_id: string; full_name: string; avatar_url: string | null; elo_id: string | null; elo_name: string | null; best_ms: number; pos: number };
export type EloRankRow = { pairs: number; elo_id: string; elo_name: string; best_ms: number; holder: string; pos: number };

const MEDAL = ["🥇", "🥈", "🥉"];

/** Ranking de recordes por nível: do meu Elo, de todos os jogadores e Elo contra Elo. */
export function MemoryRanking({ rows, elos, myId, myEloId }: { rows: RankRow[]; elos: EloRankRow[]; myId: string; myEloId: string | null }) {
  const [pairs, setPairs] = useState<number>(SOLO_SIZES[0].pairs);
  const [scope, setScope] = useState<"elo" | "all" | "elos">(myEloId ? "elo" : "all");

  const level = rows.filter((r) => r.pairs === pairs);
  const list = scope === "elo" ? level.filter((r) => r.elo_id === myEloId) : level;
  const eloList = elos.filter((e) => e.pairs === pairs);

  return (
    <div className="card p-3">
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {SOLO_SIZES.map((s) => (
          <button
            key={s.pairs}
            type="button"
            onClick={() => setPairs(s.pairs)}
            className={`shrink-0 rounded-full border-2 px-3 py-1 text-xs font-black ${pairs === s.pairs ? "border-amber-500 bg-amber-100 text-amber-900" : "border-[var(--line)] text-[var(--muted)]"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-[var(--accent-soft)] p-1 text-xs font-black">
        {(
          [
            ["elo", "Meu Elo"],
            ["all", "Todos"],
            ["elos", "Elo x Elo"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" disabled={k === "elo" && !myEloId} onClick={() => setScope(k)} className={`rounded-lg py-1.5 ${scope === k ? "bg-white text-[var(--accent-strong)] shadow" : "text-[var(--muted)]"}`}>
            {label}
          </button>
        ))}
      </div>

      {scope === "elos" ? (
        eloList.length === 0 ? (
          <p className="p-2 text-sm text-[var(--muted)]">Nenhum Elo tem recorde neste nível ainda.</p>
        ) : (
          <ol className="space-y-1">
            {eloList.map((e) => (
              <li key={e.elo_id} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${e.elo_id === myEloId ? "bg-[var(--accent-soft)] font-black" : "font-semibold"}`}>
                <span className="w-7 text-center font-black">{MEDAL[e.pos - 1] ?? `${e.pos}º`}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{e.elo_name}</span>
                  <span className="block truncate text-[11px] font-bold text-[var(--muted)]">recorde de {e.holder}</span>
                </span>
                <span className="tabular-nums font-black">{fmtMs(e.best_ms)}</span>
              </li>
            ))}
          </ol>
        )
      ) : list.length === 0 ? (
        <p className="p-2 text-sm text-[var(--muted)]">{scope === "elo" ? "Ninguém do seu Elo tem recorde neste nível ainda. Seja o primeiro!" : "Ninguém tem recorde neste nível ainda. Seja o primeiro!"}</p>
      ) : (
        <ol className="space-y-1">
          {list.slice(0, 20).map((r, i) => (
            <li key={r.user_id} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${r.user_id === myId ? "bg-[var(--accent-soft)] font-black" : "font-semibold"}`}>
              <span className="w-7 text-center font-black">{scope === "elo" ? (MEDAL[i] ?? `${i + 1}º`) : (MEDAL[r.pos - 1] ?? `${r.pos}º`)}</span>
              <Avatar url={r.avatar_url} name={r.full_name || "Sem nome"} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.user_id === myId ? "Você" : r.full_name || "Sem nome"}</span>
                {scope === "all" && r.elo_name ? <span className="block truncate text-[11px] font-bold text-[var(--muted)]">{r.elo_name}</span> : null}
              </span>
              <span className="tabular-nums font-black">{fmtMs(r.best_ms)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
