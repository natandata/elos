"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { challengeArenaDuo, respondArenaDuo } from "@/lib/actions/arenaDuo";

export type Mate = { id: string; name: string; avatarUrl: string | null };
export type DuoItem = {
  id: string;
  status: string;
  /** convite pra mim, ainda sem resposta */
  incoming: boolean;
  partner: string;
  enemies: string;
  result: "win" | "loss" | "draw" | null;
  trophyDelta: number | null;
  host: boolean;
};

export function ArenaDuoLobby({ mates, items }: { mates: Mate[]; items: DuoItem[] }) {
  const router = useRouter();
  const [partner, setPartner] = useState<string | null>(null);
  const [opps, setOpps] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string | undefined) => mates.find((m) => m.id === id)?.name.split(" ")[0] ?? "";

  function togglePartner(id: string) {
    setPartner((p) => (p === id ? null : id));
    setOpps((o) => o.filter((x) => x !== id));
  }

  function toggleOpp(id: string) {
    if (id === partner) return;
    setOpps((o) => (o.includes(id) ? o.filter((x) => x !== id) : o.length < 2 ? [...o, id] : [o[1], id]));
  }

  async function challenge() {
    if (!partner || opps.length !== 2 || busy) return;
    setBusy("new");
    setError(null);
    const r = await challengeArenaDuo(partner, opps[0], opps[1]).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; id?: string });
    setBusy(null);
    if (r.error || !r.id) return setError(r.error ?? "Não foi possível criar o desafio.");
    router.push(`/app/jogos/arena/duplas/${r.id}`);
  }

  async function decline(id: string) {
    setBusy(id);
    await respondArenaDuo(id, false).catch(() => null);
    setBusy(null);
    router.refresh();
  }

  const invites = items.filter((i) => i.incoming);
  const active = items.filter((i) => !i.incoming && (i.status === "accepted" || i.status === "invited"));
  const done = items.filter((i) => i.status === "finished" || i.status === "disputed");
  const ready = !!partner && opps.length === 2;

  return (
    <div className="space-y-6">
      {invites.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Convites pra você</h2>
          <ul className="space-y-2">
            {invites.map((i) => (
              <li key={i.id} className="card flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1 text-sm font-bold">
                  👥 Dupla com {i.partner} contra {i.enemies}
                </span>
                <button type="button" onClick={() => router.push(`/app/jogos/arena/duplas/${i.id}`)} className="btn btn-primary !px-4 !py-2 !text-sm">
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
                <span className="min-w-0 flex-1 text-sm font-bold">
                  {i.status === "accepted" ? "🎮" : "⏳"} {i.partner} + você x {i.enemies}
                </span>
                <button type="button" onClick={() => router.push(`/app/jogos/arena/duplas/${i.id}`)} className="btn btn-primary !px-4 !py-2 !text-sm">
                  {i.status === "accepted" ? "Entrar" : "Abrir"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Novo desafio de duplas</h2>
        {mates.length < 3 ? (
          <p className="text-sm text-[var(--muted)]">Você precisa de pelo menos 3 colegas no seu Elo (1 parceiro e 2 adversários).</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-[var(--muted)]">
              Toque em <b>💙 Parceiro</b> para escolher quem joga com você e em <b>🆚 Adversário</b> para escolher os dois do outro time.
            </p>
            <ul className="space-y-2">
              {mates.map((m) => {
                const isPartner = partner === m.id;
                const isOpp = opps.includes(m.id);
                return (
                  <li key={m.id} className={`card flex items-center gap-2 p-2.5 ${isPartner ? "!border-sky-400" : isOpp ? "!border-rose-400" : ""}`}>
                    <Avatar url={m.avatarUrl} name={m.name} size={36} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{m.name}</span>
                    <button
                      type="button"
                      onClick={() => togglePartner(m.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${isPartner ? "bg-sky-500 text-white" : "bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]"}`}
                    >
                      💙 Parceiro
                    </button>
                    <button
                      type="button"
                      disabled={isPartner}
                      onClick={() => toggleOpp(m.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-black disabled:opacity-40 ${isOpp ? "bg-rose-500 text-white" : "bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]"}`}
                    >
                      🆚 Adversário
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="card mt-3 p-3 text-center text-sm font-bold">
              <span className="text-sky-500">Você + {partner ? nameOf(partner) : "?"}</span> <span className="text-[var(--muted)]">contra</span>{" "}
              <span className="text-rose-500">
                {opps[0] ? nameOf(opps[0]) : "?"} + {opps[1] ? nameOf(opps[1]) : "?"}
              </span>
            </div>
            <button type="button" disabled={!ready || busy !== null} onClick={challenge} className="btn btn-primary mt-3 w-full !py-3 disabled:opacity-50">
              {busy === "new" ? "Enviando…" : ready ? "⚔️ Desafiar" : "Escolha 1 parceiro e 2 adversários"}
            </button>
          </>
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
                  {i.status === "disputed" ? "⚠️ Não confirmada" : i.result === "win" ? "🏆 Vitória" : i.result === "draw" ? "🤝 Empate" : "😅 Derrota"} · com {i.partner}
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
