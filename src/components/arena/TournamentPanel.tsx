"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { answerTeamInvite, joinTournament, leaveTournament } from "@/lib/actions/tournaments";
import { AT } from "./ArenaText";

export type Mate = { id: string; name: string };

/** Inscrição do jogador: entrar (1x1) ou formar dupla, responder convite de dupla e sair. */
export function TournamentPanel({
  tournamentId,
  format,
  open,
  full,
  myEntry,
  invites,
  mates,
}: {
  tournamentId: string;
  format: "solo" | "duo";
  open: boolean;
  full: boolean;
  /** minha inscrição (se houver): confirmada ou esperando o parceiro */
  myEntry: { id: string; confirmed: boolean; partnerName: string | null; iAmCaptain: boolean } | null;
  invites: { entryId: string; fromName: string }[];
  /** colegas do meu Elo que ainda estão livres neste torneio */
  mates: Mate[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [partner, setPartner] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error?: string }>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    } catch {
      setError("Sem conexão ou página desatualizada. Atualize a página e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {invites.map((i) => (
        <div key={i.entryId} className="card flex items-center gap-2 p-3">
          <span className="min-w-0 flex-1 text-sm font-bold"><AT>👥 </AT>{i.fromName} te chamou pra formar dupla.</span>
          <button type="button" disabled={busy || !open} onClick={() => run(() => answerTeamInvite(i.entryId, true))} className="btn btn-primary !px-3 !py-2 !text-sm">
            Aceitar
          </button>
          <button type="button" disabled={busy || !open} onClick={() => run(() => answerTeamInvite(i.entryId, false))} className="btn btn-ghost !px-3 !py-2 !text-sm">
            Recusar
          </button>
        </div>
      ))}

      {myEntry ? (
        <div className="card p-3">
          {myEntry.confirmed ? (
            <p className="font-black text-emerald-600"><AT>✅ Você está inscrito</AT>{format === "duo" && myEntry.partnerName ? ` com ${myEntry.partnerName}` : ""}.</p>
          ) : (
            <p className="font-bold text-amber-600"><AT>⏳ Esperando </AT>{myEntry.partnerName ?? "o parceiro"} confirmar a dupla.</p>
          )}
          {open ? (
            <button type="button" disabled={busy} onClick={() => run(() => leaveTournament(tournamentId))} className="btn btn-ghost mt-2 !py-2 !text-sm">
              {format === "duo" ? "Desfazer dupla e sair" : "Sair do torneio"}
            </button>
          ) : null}
        </div>
      ) : open ? (
        full ? (
          <p className="card p-3 text-sm font-bold text-[var(--muted)]">As vagas acabaram.</p>
        ) : format === "solo" ? (
          <button type="button" disabled={busy} onClick={() => run(() => joinTournament(tournamentId))} className="btn btn-primary w-full !py-3">
            {busy ? "Inscrevendo…" : <AT>{"🏆 Inscrever-me"}</AT>}
          </button>
        ) : mates.length === 0 ? (
          <p className="card p-3 text-sm font-bold text-[var(--muted)]">Você precisa de um colega do seu Elo, livre neste torneio, pra formar dupla.</p>
        ) : (
          <div className="card space-y-2 p-3">
            <p className="text-sm font-black">Escolha seu parceiro de dupla (do seu Elo)</p>
            <select value={partner} onChange={(e) => setPartner(e.target.value)} className="w-full rounded-xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2.5 text-sm font-bold">
              <option value="">Selecione…</option>
              {mates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button type="button" disabled={busy || !partner} onClick={() => run(() => joinTournament(tournamentId, partner))} className="btn btn-primary w-full !py-3 disabled:opacity-50">
              {busy ? "Enviando…" : <AT>{"👥 Formar dupla e inscrever"}</AT>}
            </button>
            <p className="text-xs text-[var(--muted)]">O parceiro recebe um aviso e precisa confirmar pra a inscrição valer.</p>
          </div>
        )
      ) : null}

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
