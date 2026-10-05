"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MemoryBoard, type MemoryResult } from "./MemoryBoard";
import { finishMemoryDuel, startMemoryDuel, type MemoryFinish } from "@/lib/actions/memory";
import { createClient } from "@/lib/supabase/client";
import { fmtMs } from "@/lib/games/memory";

type Props = {
  id: string;
  seed: number;
  pairs: number;
  myId: string;
  otherName: string;
  /** se eu já comecei (relógio do servidor) e ainda não terminei */
  startedAt: string | null;
  myMs: number | null;
  theirMs: number | null;
  status: "open" | "finished" | "expired";
  winnerId: string | null;
};

/** Corrida de memória: mesmo tabuleiro pros dois, vence quem termina primeiro (menor tempo). */
export function MemoryDuelGame(p: Props) {
  const [started, setStarted] = useState<number | null>(p.startedAt && p.myMs === null ? new Date(p.startedAt).getTime() : null);
  const [fin, setFin] = useState<MemoryFinish | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [theirFound, setTheirFound] = useState(0);
  const [myFound, setMyFound] = useState(0);
  const chRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // progresso do colega em tempo real (só aparece se os dois estiverem jogando ao mesmo tempo)
  useEffect(() => {
    if (p.status !== "open") return;
    const sb = createClient();
    const ch = sb.channel(`memory-duel:${p.id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "progress" }, ({ payload }) => {
      if (payload && payload.u !== p.myId && typeof payload.n === "number") setTheirFound(payload.n);
    });
    ch.subscribe();
    chRef.current = ch;
    return () => {
      chRef.current = null;
      void sb.removeChannel(ch);
    };
  }, [p.id, p.myId, p.status]);

  async function begin() {
    setBusy(true);
    setError(null);
    const r = await startMemoryDuel(p.id).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; startedAt?: string });
    setBusy(false);
    if (r.error || !r.startedAt) return setError(r.error ?? "Não foi possível começar.");
    setStarted(new Date(r.startedAt).getTime());
  }

  const progress = useCallback(
    (n: number) => {
      setMyFound(n);
      void chRef.current?.send({ type: "broadcast", event: "progress", payload: { u: p.myId, n } });
    },
    [p.myId],
  );

  async function complete(r: MemoryResult) {
    const res = await finishMemoryDuel(p.id, r.turns).catch(() => ({ error: "Sem conexão. Seu resultado não foi salvo; atualize a página." }) as MemoryFinish);
    setFin(res);
  }

  // ---------------------------------------------------------- telas
  const iWon = (id: string | null) => id === p.myId;

  if (fin) {
    if (fin.error) return <p className="card p-5 text-center font-bold text-rose-600">{fin.error}</p>;
    const finished = fin.status === "finished";
    return (
      <div className="card p-6 text-center">
        <p className="text-6xl" aria-hidden>
          {finished ? (fin.winnerId === null ? "🤝" : iWon(fin.winnerId ?? null) ? "🏆" : "😅") : "⏳"}
        </p>
        <h2 className="mt-2 text-2xl font-black">{fmtMs(fin.ms ?? 0)}</h2>
        <p className="text-sm font-bold text-[var(--muted)]">{fin.moves} jogadas</p>
        {finished ? (
          <p className="mt-3 font-black">
            {fin.winnerId === null ? "Empate!" : iWon(fin.winnerId ?? null) ? `Você venceu ${p.otherName}!` : `${p.otherName} foi mais rápido.`}{" "}
            <span className="font-bold text-[var(--muted)]">(ele: {fmtMs(fin.oppMs ?? 0)})</span>
          </p>
        ) : (
          <p className="mt-3 text-sm font-bold text-[var(--muted)]">Agora é a vez de {p.otherName}. Avisamos você quando ele terminar.</p>
        )}
        <Link href="/app/jogos/memoria" className="btn btn-primary mt-5 w-full">
          Voltar
        </Link>
      </div>
    );
  }

  if (p.status !== "open" || p.myMs !== null) {
    const done = p.status === "finished";
    return (
      <div className="card p-6 text-center">
        <p className="text-6xl" aria-hidden>
          {p.status === "expired" ? "⌛" : done ? (p.winnerId === null ? "🤝" : iWon(p.winnerId) ? "🏆" : "😅") : "⏳"}
        </p>
        {p.myMs !== null ? <h2 className="mt-2 text-2xl font-black">Você: {fmtMs(p.myMs)}</h2> : null}
        {done && p.theirMs !== null ? <p className="font-bold text-[var(--muted)]">{p.otherName}: {fmtMs(p.theirMs)}</p> : null}
        <p className="mt-3 font-black">
          {p.status === "expired"
            ? "Este desafio expirou."
            : done
              ? p.winnerId === null
                ? "Empate!"
                : iWon(p.winnerId)
                  ? "Você venceu!"
                  : `${p.otherName} foi mais rápido.`
              : `Esperando ${p.otherName} jogar.`}
        </p>
        <Link href="/app/jogos/memoria" className="btn btn-primary mt-5 w-full">
          Voltar
        </Link>
      </div>
    );
  }

  if (started === null) {
    return (
      <div className="card p-6 text-center">
        <p className="text-5xl" aria-hidden>
          🃏
        </p>
        <h2 className="mt-2 text-xl font-black">Corrida da memória</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Mesmo tabuleiro de {p.pairs} pares para você e {p.otherName}. Vence quem terminar mais rápido.
          {p.theirMs !== null ? ` ${p.otherName} já jogou: ${fmtMs(p.theirMs)}.` : ""}
        </p>
        <p className="mt-2 text-xs font-bold text-amber-700">O relógio começa quando você tocar em &quot;Começar&quot; e não dá pra reiniciar.</p>
        <button type="button" disabled={busy} onClick={begin} className="btn btn-primary mt-5 w-full !py-3 !text-lg">
          {busy ? "..." : "▶️ Começar"}
        </button>
        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      {theirFound > 0 ? (
        <div className="mb-3 rounded-xl bg-[var(--card)] px-3 py-2 text-xs font-black ring-1 ring-[var(--line)]">
          <div className="flex justify-between">
            <span>Você {myFound}/{p.pairs}</span>
            <span>
              {p.otherName.split(" ")[0]} {theirFound}/{p.pairs}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full rounded-full bg-rose-400 transition-[width] duration-500" style={{ width: `${(theirFound / p.pairs) * 100}%` }} />
          </div>
        </div>
      ) : null}
      <MemoryBoard seed={p.seed} pairs={p.pairs} startedAt={started} onProgress={progress} onComplete={complete} />
    </div>
  );
}
