"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { challengeArenaPvp, respondArenaPvp } from "@/lib/actions/arenaPvp";

export type Mate = { id: string; name: string; avatarUrl: string | null };
export type PvpItem = {
  id: string;
  other: string;
  incoming: boolean;
  status: string;
  result: "win" | "loss" | "draw" | null;
  trophyDelta: number | null;
  waiting: boolean;
};

export function ArenaPvpLobby({ mates, items, medals = {} }: { mates: Mate[]; items: PvpItem[]; medals?: Record<string, { mine: number; theirs: number }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function challenge(id: string) {
    if (busy) return;
    setBusy(id);
    setError(null);
    const r = await challengeArenaPvp(id).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; id?: string });
    setBusy(null);
    if (r.error || !r.id) return setError(r.error ?? "Não foi possível desafiar.");
    router.push(`/app/jogos/arena/pvp/${r.id}`);
  }

  async function decline(id: string) {
    setBusy(id);
    await respondArenaPvp(id, false).catch(() => null);
    setBusy(null);
    router.refresh();
  }

  const invites = items.filter((i) => i.status === "invited" && i.incoming);
  const active = items.filter((i) => i.status === "accepted" || (i.status === "invited" && !i.incoming));
  const done = items.filter((i) => i.status === "finished" || i.status === "disputed");

  return (
    <div className="space-y-6">
      {invites.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Desafios pra você</h2>
          <ul className="space-y-2">
            {invites.map((i) => (
              <li key={i.id} className="card flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1 truncate font-bold">⚡ {i.other} te desafiou</span>
                <button type="button" onClick={() => router.push(`/app/jogos/arena/pvp/${i.id}`)} className="btn btn-primary !px-4 !py-2 !text-sm">
                  Ver
                </button>
                <button type="button" disabled={busy === i.id} onClick={() => decline(i.id)} className="btn btn-ghost !px-3 !py-2 !text-sm">
                  Recusar
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {active.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Em andamento</h2>
          <ul className="space-y-2">
            {active.map((i) => (
              <li key={i.id} className="card flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1 truncate font-bold">
                  {i.status === "accepted" ? `🎮 Partida com ${i.other}` : `⏳ Esperando ${i.other} aceitar`}
                </span>
                <button type="button" onClick={() => router.push(`/app/jogos/arena/pvp/${i.id}`)} className="btn btn-primary !px-4 !py-2 !text-sm">
                  {i.status === "accepted" ? "Entrar" : "Abrir"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Desafiar alguém do seu Elo</h2>
        {mates.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Ninguém mais no seu Elo ainda para desafiar.</p>
        ) : (
          <ul className="space-y-2">
            {mates.map((m) => (
              <li key={m.id} className="card flex items-center gap-3 p-3">
                <Avatar url={m.avatarUrl} name={m.name} size={40} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-base font-bold">{m.name}</span>
                  {medals[m.id] ? (
                    <span className="block text-xs font-bold text-amber-600">
                      🏅 você {medals[m.id].mine} x {medals[m.id].theirs} {m.name.split(" ")[0]}
                    </span>
                  ) : null}
                </span>
                <button type="button" disabled={busy !== null} onClick={() => challenge(m.id)} className="btn btn-primary !px-4 !py-2 !text-sm disabled:opacity-50">
                  {busy === m.id ? "..." : "⚔️ Desafiar"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
      </section>

      {done.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Últimas partidas</h2>
          <ul className="space-y-2">
            {done.map((i) => (
              <li key={i.id} className="card flex items-center gap-3 p-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-bold">
                  {i.status === "disputed" ? "⚠️ Não confirmada" : i.result === "win" ? "🏆 Vitória" : i.result === "draw" ? "🤝 Empate" : "😅 Derrota"} · {i.other}
                </span>
                {i.trophyDelta !== null && i.trophyDelta !== 0 ? (
                  <span className={`font-black tabular-nums ${i.trophyDelta > 0 ? "text-amber-500" : "text-rose-500"}`}>
                    {i.trophyDelta > 0 ? "+" : ""}
                    {i.trophyDelta} 🏆
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
