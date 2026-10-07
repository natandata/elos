"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { openTournamentMatch, setMatchWinner } from "@/lib/actions/tournaments";
import { realLevelsApply, roundLabel, type TMatch } from "@/lib/arena/tournament";

export type EntryLabel = { names: string[]; elo: string | null; /** posição no ranking da Arena quando o torneio começou */ pos?: number | null };

/** Chaveamento: rodadas lado a lado; o jogador abre a própria sala e o admin pode decidir uma partida. */
export function TournamentBracket({
  matches,
  labels,
  myEntryId,
  admin = false,
  running,
}: {
  matches: TMatch[];
  labels: Record<string, EntryLabel>;
  myEntryId: string | null;
  admin?: boolean;
  running: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mains = matches.filter((m) => m.bracket === "main");
  if (mains.length === 0) return null;
  const R = Math.max(...mains.map((m) => m.round));
  const columns: { key: string; label: string; list: TMatch[] }[] = [];
  for (let r = 1; r <= R; r++) {
    columns.push({ key: `m${r}`, label: r === R ? `${roundLabel("main", r, R)} · ✨ Nova Jerusalém` : roundLabel("main", r, R), list: mains.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot) });
  }
  const bronze = matches.filter((m) => m.bracket === "bronze");
  if (bronze.length > 0) columns.push({ key: "b", label: roundLabel("bronze", R, R), list: bronze });

  const name = (id: string | null) => (id ? (labels[id]?.names.join(" + ") ?? "?") : null);

  async function play(matchId: string) {
    setBusy(matchId);
    setError(null);
    try {
      const r = await openTournamentMatch(matchId);
      if (r.error || !r.href) setError(r.error ?? "Não foi possível abrir a partida.");
      else router.push(r.href);
    } catch {
      setError("Sem conexão ou página desatualizada. Atualize a página e tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  async function decide(matchId: string, entryId: string, label: string) {
    if (!window.confirm(`Dar a vitória a "${label}"? Isso avança a chave e não dá pra desfazer.`)) return;
    setBusy(matchId + entryId);
    setError(null);
    try {
      const r = await setMatchWinner(matchId, entryId);
      if (r.error) setError(r.error);
      else router.refresh();
    } catch {
      setError("Sem conexão ou página desatualizada. Atualize a página e tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 px-1">
          {columns.map((col) => (
            <div key={col.key} className="w-[210px] shrink-0">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--muted)]">{col.label}</p>
              <ul className="space-y-2">
                {col.list.map((m) => {
                  const mine = !!myEntryId && (m.entryA === myEntryId || m.entryB === myEntryId);
                  const ready = (m.status === "ready" || m.status === "playing") && !!m.entryA && !!m.entryB;
                  const side = (id: string | null) => {
                    const won = m.winner && m.winner === id;
                    const lost = m.winner && id && m.winner !== id;
                    return (
                      <div className={`flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-sm font-bold ${won ? "bg-emerald-500/15 text-emerald-600" : lost ? "opacity-45 line-through" : "bg-[var(--bg)]"}`}>
                        <span className="min-w-0 truncate">
                          {id && labels[id]?.pos ? <span className="mr-1 text-[10px] font-black text-[var(--muted)]">#{labels[id].pos}</span> : null}
                          {name(id) ?? <span className="font-semibold text-[var(--muted)]">{m.status === "pending" ? "A definir" : "Folga"}</span>}
                        </span>
                        {won ? <span aria-hidden>✔</span> : null}
                      </div>
                    );
                  };
                  return (
                    <li key={m.id} className={`card space-y-1 p-2 ${mine ? "!border-amber-400" : ""}`}>
                      {side(m.entryA)}
                      {side(m.entryB)}
                      {m.entryA && m.entryB && m.status !== "done" ? (
                        <p className="text-[10px] font-bold text-[var(--muted)]">{realLevelsApply(labels[m.entryA]?.pos ?? null, labels[m.entryB]?.pos ?? null) ? "⬆️ Níveis reais das cartas" : "Cartas no nível 1"}</p>
                      ) : null}
                      {running && ready && mine && !admin ? (
                        <button type="button" disabled={busy !== null} onClick={() => play(m.id)} className="btn btn-primary mt-1 w-full !py-2 !text-sm disabled:opacity-60">
                          {busy === m.id ? "Abrindo…" : m.status === "playing" ? "▶ Entrar na sala" : "⚔️ Jogar"}
                        </button>
                      ) : null}
                      {running && ready && mine && admin ? (
                        <button type="button" disabled={busy !== null} onClick={() => play(m.id)} className="btn btn-ghost mt-1 w-full !py-1.5 !text-xs">
                          Entrar na sala
                        </button>
                      ) : null}
                      {admin && running && ready ? (
                        <div className="mt-1 grid grid-cols-2 gap-1">
                          {[m.entryA, m.entryB].map((id) =>
                            id ? (
                              <button key={id} type="button" disabled={busy !== null} onClick={() => decide(m.id, id, name(id) ?? "")} className="btn btn-ghost !px-1 !py-1 !text-[11px] disabled:opacity-60">
                                Vence: {(name(id) ?? "").split(" ")[0]}
                              </button>
                            ) : null,
                          )}
                        </div>
                      ) : null}
                      {m.status === "pending" ? <p className="text-[10px] font-bold text-[var(--muted)]">Aguardando a rodada anterior</p> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
