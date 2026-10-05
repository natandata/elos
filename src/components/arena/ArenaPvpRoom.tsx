"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { checkArenaPvp, reportArenaPvp, respondArenaPvp } from "@/lib/actions/arenaPvp";
import { Lockstep, type Frame } from "@/lib/arena/lockstep";
import { PVP_INPUT_DELAY } from "@/lib/arena/pvp";
import type { PvpView } from "@/lib/arena/settlePvp";
import type { Side } from "@/lib/arena/core";
import { ARENAS } from "@/lib/arena/arenas";
import { ArenaPlayfield, type PlayDriver } from "./ArenaPlayfield";

type Stage = "invite" | "ready" | "connecting" | "playing" | "finishing" | "result";

export type PvpRoomProps = {
  id: string;
  meSide: Side;
  opponentName: string;
  arena: number;
  seed: number;
  decks: [string[], string[] | null];
  /** convite ainda aberto (aguardando o convidado aceitar) */
  initialStatus: "invited" | "accepted" | "finished" | "declined" | "disputed";
  initialView: PvpView;
};

const PEER_SILENT_MS = 10_000;

export function ArenaPvpRoom({ id, meSide, opponentName, arena, seed, decks, initialStatus, initialView }: PvpRoomProps) {
  const router = useRouter();
  const startedKey = `arena-pvp-started:${id}`;
  const [stage, setStage] = useState<Stage>(() => {
    if (initialStatus === "invited") return "invite";
    if (initialStatus === "accepted") return initialView.state === "waiting" ? "finishing" : "ready";
    return "result";
  });
  const [view, setView] = useState<PvpView>(initialView);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [driver, setDriver] = useState<PlayDriver | null>(null);
  const [peerGone, setPeerGone] = useState(false);
  const [peerLeft, setPeerLeft] = useState(false);
  const [oppDeck, setOppDeck] = useState<string[] | null>(decks[1]);

  const lsRef = useRef<Lockstep | null>(null);
  const chRef = useRef<RealtimeChannel | null>(null);
  const lastRecvRef = useRef(0);
  const lastForceRef = useRef(0);
  const peerSeenRef = useRef(false);
  const reportedRef = useRef(false);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const iAmChallenger = meSide === 0;

  const send = useCallback((event: string, payload: unknown) => {
    void chRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  // ---------------------------------------------------------- convite (espera/aceite)
  useEffect(() => {
    if (stage !== "invite" || !iAmChallenger) return;
    const t = setInterval(async () => {
      const r = await checkArenaPvp(id).catch(() => null);
      if (!r || r.error) return;
      if (r.status && r.status !== "invited") {
        setStatus(r.status as typeof status);
        if (r.status === "accepted") {
          if (r.opponentDeck) setOppDeck(r.opponentDeck);
          setStage("ready");
        }
        else {
          if (r.view) setView(r.view);
          setStage("result");
        }
      }
    }, 3000);
    return () => clearInterval(t);
  }, [stage, iAmChallenger, id]);

  async function respond(accept: boolean) {
    setBusy(true);
    setError(null);
    const r = await respondArenaPvp(id, accept).catch(() => ({ error: "Sem conexão. Tente de novo." }));
    setBusy(false);
    if (r.error) return setError(r.error);
    if (accept) {
      if ("deck" in r && r.deck) setOppDeck(r.deck);
      setStatus("accepted");
      setStage("ready");
    } else {
      router.push("/app/jogos/arena/pvp");
    }
  }

  // ---------------------------------------------------------- relatório e resultado
  const report = useCallback(
    async (extra: { resigned?: boolean; left?: number }) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      setStage("finishing");
      const ls = lsRef.current;
      try {
        sessionStorage.removeItem(startedKey);
      } catch {}
      const payload = { mine: ls?.ownInputs ?? [], theirs: ls?.theirInputs ?? [], tick: ls?.game.tick ?? 0, ...extra };
      const r = await reportArenaPvp(id, payload).catch(() => ({ error: "Sem conexão." } as { error?: string; view?: PvpView }));
      if (r.view) setView(r.view);
      if (r.view && (r.view.state === "finished" || r.view.state === "disputed")) setStage("result");
    },
    [id, startedKey],
  );

  // enquanto espera o fechamento: reenvia os últimos avisos de jogada (caso o colega ainda precise) e consulta o resultado
  useEffect(() => {
    if (stage !== "finishing") return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      if (n <= 30) {
        const f = lsRef.current?.takeFrame(true);
        if (f) send("f", f);
      }
      if (n % 3 === 0) {
        const r = await checkArenaPvp(id).catch(() => null);
        if (r?.view) {
          setView(r.view);
          if (r.view.state === "finished" || r.view.state === "disputed") setStage("result");
        }
      }
    }, 1000);
    return () => clearInterval(t);
  }, [stage, id, send]);

  // recarregou no meio da partida: conta como desistência
  useEffect(() => {
    if (stage !== "ready") return;
    try {
      const t = sessionStorage.getItem(startedKey);
      if (t !== null) {
        sessionStorage.removeItem(startedKey);
        reportedRef.current = true;
        setStage("finishing");
        void reportArenaPvp(id, { mine: [], theirs: [], resigned: true, tick: Number(t) || 0 }).then((r) => {
          if (r.view) setView(r.view);
          setStage("result");
        });
      }
    } catch {}
    // roda só ao entrar na sala
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------- conexão em tempo real
  function enter() {
    if (!oppDeck) return;
    setError(null);
    setPeerGone(false);
    setPeerLeft(false);
    peerSeenRef.current = false;
    reportedRef.current = false;
    lastRecvRef.current = Date.now();
    const ls = new Lockstep(seed, [decks[0], oppDeck], meSide, arena);
    lsRef.current = ls;
    try {
      sessionStorage.setItem(startedKey, "0");
    } catch {}
    setStage("connecting");
  }

  useEffect(() => {
    if (stage !== "connecting" && stage !== "playing") return;
    const ls = lsRef.current;
    if (!ls) return;
    const supabase = createClient();
    const ch = supabase.channel(`arena-pvp:${id}`, { config: { broadcast: { self: false } } });
    chRef.current = ch;
    let helloTimer: ReturnType<typeof setInterval> | null = null;
    let subscribed = false;

    const beginPlay = () => {
      if (stageRef.current !== "connecting") return;
      const mySide = meSide;
      setDriver({
        game: ls.game,
        mySide,
        arena,
        opponentLabel: opponentName,
        inputDelay: PVP_INPUT_DELAY,
        advance: () => {
          const ev = ls.tryStep();
          const f = ls.takeFrame();
          if (f) send("f", f);
          if (ev === null) {
            const now = Date.now();
            if (now - lastForceRef.current > 250) {
              lastForceRef.current = now;
              const ff = ls.takeFrame(true);
              if (ff) send("f", ff);
            }
          } else if (ls.game.tick % 40 === 0) {
            try {
              sessionStorage.setItem(startedKey, String(ls.game.tick));
            } catch {}
          }
          return ev;
        },
        place: (slot, x, y) => ls.schedule(slot, x, y) !== null,
        isPending: (slot) => ls.pendingSlots().has(slot),
      });
      setStage("playing");
    };

    ch.on("broadcast", { event: "hello" }, () => {
      lastRecvRef.current = Date.now();
      if (!peerSeenRef.current) {
        peerSeenRef.current = true;
        send("hello", { side: meSide }); // garante que ele também me viu
        beginPlay();
      }
    });
    ch.on("broadcast", { event: "f" }, ({ payload }) => {
      lastRecvRef.current = Date.now();
      setPeerGone(false);
      if (!peerSeenRef.current) {
        peerSeenRef.current = true;
        beginPlay();
      }
      ls.receive(payload as Frame);
    });
    ch.on("broadcast", { event: "bye" }, () => {
      // o colega desistiu: a partida acaba aqui
      setPeerLeft(true);
      void report({});
    });
    ch.subscribe((s) => {
      if (s === "SUBSCRIBED") {
        subscribed = true;
        send("hello", { side: meSide });
        helloTimer = setInterval(() => {
          if (peerSeenRef.current || !subscribed) return;
          send("hello", { side: meSide });
        }, 700);
      }
    });

    return () => {
      if (helloTimer) clearInterval(helloTimer);
      // mantém o canal vivo enquanto termina (finishing reenvia avisos)
      if (stageRef.current === "finishing" || stageRef.current === "result") return;
      void supabase.removeChannel(ch);
      chRef.current = null;
    };
    // o canal é aberto uma vez por entrada na partida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage === "connecting" || stage === "playing" ? "live" : "idle", id]);

  // limpa o canal ao sair da sala
  useEffect(() => {
    const supabase = createClient();
    return () => {
      if (chRef.current) void supabase.removeChannel(chRef.current);
      chRef.current = null;
    };
  }, []);

  // colega some no meio da partida
  useEffect(() => {
    if (stage !== "playing") return;
    const t = setInterval(() => {
      const ls = lsRef.current;
      if (ls?.desynced && !reportedRef.current) {
        setError("A partida saiu de sincronia. O resultado será conferido pelo servidor.");
        void report({});
        return;
      }
      if (Date.now() - lastRecvRef.current > PEER_SILENT_MS) setPeerGone(true);
    }, 1000);
    return () => clearInterval(t);
  }, [stage, report]);

  // ---------------------------------------------------------- telas
  const arenaInfo = ARENAS[arena];

  if (stage === "playing" && driver) {
    return (
      <ArenaPlayfield
        driver={driver}
        onOver={() => {
          const f = lsRef.current?.takeFrame(true);
          if (f) send("f", f);
          void report({});
        }}
        onLeave={() => {
          if (!window.confirm("Desistir da partida? Você perde troféus.")) return;
          send("bye", {});
          void report({ resigned: true });
        }}
        extra={
          peerGone ? (
            <div className="absolute inset-x-3 top-24 rounded-2xl border-2 border-amber-300 bg-black/80 p-3 text-center text-white">
              <p className="text-sm font-black">📡 {opponentName} está sem conexão</p>
              <p className="mt-1 text-xs font-semibold text-white/80">Se ele não voltar, você pode encerrar e ganhar por abandono.</p>
              <button
                type="button"
                onClick={() => void report({ left: lsRef.current?.game.tick ?? 0 })}
                className="mt-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-900"
              >
                Encerrar e vencer
              </button>
            </div>
          ) : null
        }
      />
    );
  }

  return (
    <div>
      <div className="card p-5 text-center">
        <p className="text-5xl" aria-hidden>
          {arenaInfo?.emoji ?? "⚔️"}
        </p>
        <h2 className="mt-1 text-xl font-black">⚔️ Você x {opponentName}</h2>
        <p className="text-sm text-[var(--muted)]">{arenaInfo?.name} · todos com cartas no nível 1</p>

        {stage === "invite" ? (
          iAmChallenger ? (
            <>
              <p className="mt-4 font-bold">⏳ Esperando {opponentName} aceitar o desafio…</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Pode deixar esta tela aberta: ela avisa quando ele aceitar.</p>
            </>
          ) : (
            <>
              <p className="mt-4 font-bold">{opponentName} te desafiou para uma partida 1x1!</p>
              <div className="mt-4 grid gap-2">
                <button type="button" disabled={busy} onClick={() => respond(true)} className="btn btn-primary !py-3">
                  ✅ Aceitar o desafio
                </button>
                <button type="button" disabled={busy} onClick={() => respond(false)} className="btn btn-ghost">
                  Recusar
                </button>
              </div>
            </>
          )
        ) : null}

        {stage === "ready" ? (
          <>
            <p className="mt-4 font-bold">Tudo pronto! Os dois precisam entrar na partida ao mesmo tempo.</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Se você sair no meio, conta como desistência.</p>
            <button type="button" onClick={enter} className="btn btn-primary mt-4 w-full !py-3 !text-lg">
              ⚔️ Entrar na partida
            </button>
          </>
        ) : null}

        {stage === "connecting" ? (
          <>
            <p className="mt-4 font-bold">⏳ Esperando {opponentName} entrar…</p>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(startedKey);
                } catch {}
                setStage("ready");
              }}
              className="btn btn-ghost mt-4"
            >
              Cancelar
            </button>
          </>
        ) : null}

        {stage === "finishing" ? (
          <>
            <p className="mt-4 font-bold">{peerLeft ? `${opponentName} desistiu. ` : ""}Conferindo o resultado…</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Se {opponentName} demorar pra confirmar, o servidor decide em até 1 minuto.</p>
          </>
        ) : null}

        {stage === "result" ? <Result view={view} status={status} opponentName={opponentName} /> : null}

        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
      </div>
      <Link href="/app/jogos/arena/pvp" className="btn btn-ghost mt-3 w-full">
        ← Voltar aos desafios
      </Link>
    </div>
  );
}

function Result({ view, status, opponentName }: { view: PvpView; status: string; opponentName: string }) {
  if (view.state === "declined" || status === "declined") return <p className="mt-4 font-bold">{opponentName} recusou o desafio.</p>;
  if (view.state === "disputed" || status === "disputed") {
    return (
      <>
        <p className="mt-4 text-4xl" aria-hidden>⚠️</p>
        <p className="mt-1 font-bold">Não deu pra confirmar essa partida.</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Os dois aparelhos não concordaram com as jogadas. Ninguém ganha nem perde troféu.</p>
      </>
    );
  }
  if (view.state !== "finished") return <p className="mt-4 font-bold">Aguardando…</p>;
  const r = view.result;
  return (
    <>
      <p className="mt-4 text-6xl" aria-hidden>
        {r === "win" ? "🏆" : r === "draw" ? "🤝" : "😅"}
      </p>
      <h3 className="mt-1 text-2xl font-black">{r === "win" ? "Vitória!" : r === "draw" ? "Empate" : "Derrota"}</h3>
      {view.why === "resigned" || view.why === "left" ? (
        <p className="text-xs text-[var(--muted)]">{view.why === "left" ? "Por abandono do colega." : r === "win" ? "Seu colega desistiu." : "Você desistiu."}</p>
      ) : (
        <p className="text-lg font-bold tabular-nums">
          👑 {view.crownsMe ?? 0} x {view.crownsThem ?? 0} 👑
        </p>
      )}
      {view.rewarded ? (
        <>
          {r !== "draw" ? (
            <p className={`mt-2 text-xl font-black tabular-nums ${(view.trophyDelta ?? 0) >= 0 ? "text-amber-500" : "text-rose-500"}`}>
              {(view.trophyDelta ?? 0) >= 0 ? "+" : ""}
              {view.trophyDelta ?? 0} 🏆
              {typeof view.trophies === "number" ? <span className="text-sm font-bold text-[var(--muted)]"> (total {view.trophies})</span> : null}
            </p>
          ) : null}
          {(view.scrolls ?? 0) > 0 ? <p className="text-sm font-black text-violet-500">+{view.scrolls} 📜</p> : null}
          {(view.xp ?? 0) > 0 ? (
            <p className="mt-2 inline-block rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-lg font-black text-[var(--accent-strong)]">+{view.xp} XP</p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-xs text-[var(--muted)]">Essa partida não valeu prêmio (muito curta ou limite do dia com esse colega).</p>
      )}
    </>
  );
}
