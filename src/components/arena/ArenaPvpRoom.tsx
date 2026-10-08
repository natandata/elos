"use client";

import Link from "next/link";
import { CopyReward } from "./CopyReward";
import { useArenaPresence } from "./arenaPresence";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArenaLoadingScreen } from "@/components/games/ArenaLoadingScreen";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { checkArenaPvp, reportArenaPvp, leaveArenaPvp, respondArenaPvp } from "@/lib/actions/arenaPvp";
import { Lockstep, type Frame } from "@/lib/arena/lockstep";
import { PVP_INPUT_DELAY } from "@/lib/arena/pvp";
import type { PvpView } from "@/lib/arena/settlePvp";
import type { Side } from "@/lib/arena/core";
import { ARENAS } from "@/lib/arena/arenas";
import { ArenaPlayfield, type PlayDriver } from "./ArenaPlayfield";
import { AT } from "./ArenaText";
import { MatchResultHero } from "./MatchResultHero";
import { PostMatchChat } from "./PostMatchChat";

type Stage = "invite" | "ready" | "connecting" | "playing" | "finishing" | "result";

export type PvpRoomProps = {
  id: string;
  meSide: Side;
  opponentName: string;
  arena: number;
  seed: number;
  decks: [string[], string[] | null];
  /** nível das cartas de cada lado (torneio); null = nível 1 */
  levels?: unknown;
  /** convite ainda aberto (aguardando o convidado aceitar) */
  initialStatus: "invited" | "accepted" | "finished" | "declined" | "disputed";
  initialView: PvpView;
  /** partida de torneio: mostra o caminho de volta e não fala de troféus */
  tournamentId?: string | null;
  /** quem está jogando (pra aparecer como "jogando" no ranking) */
  myId: string;
};

const PEER_SILENT_MS = 10_000;

export function ArenaPvpRoom({ id, meSide, opponentName, arena, seed, decks, levels, initialStatus, initialView, tournamentId, myId }: PvpRoomProps) {
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
  const [intro, setIntro] = useState(false);
  const [driver, setDriver] = useState<PlayDriver | null>(null);
  useArenaPresence(myId, tournamentId ? "tournament" : "pvp", driver, stage === "playing");
  const [peerGone, setPeerGone] = useState(false);
  const [peerLeft, setPeerLeft] = useState(false);
  const [oppDeck, setOppDeck] = useState<string[] | null>(decks[1]);

  const lsRef = useRef<Lockstep | null>(null);
  const chRef = useRef<RealtimeChannel | null>(null);
  const lastRecvRef = useRef(0);
  const lastForceRef = useRef(0);
  const peerSeenRef = useRef(false);
  const reportedRef = useRef(false);
  const savedRef = useRef(false);
  const payloadRef = useRef<unknown>(null);
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

  async function leaveRoom() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await leaveArenaPvp(id).catch(() => ({ error: "Sem conexão. Tente de novo." }));
    setBusy(false);
    if (r.error) return setError(r.error);
    router.push("/app/jogos/arena/pvp");
  }

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
      payloadRef.current = payload;
      const r = await reportArenaPvp(id, payload).catch(() => ({ error: "Sem conexão." } as { error?: string; view?: PvpView }));
      if (!r.error) savedRef.current = true;
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
        // o relatório pode ter se perdido (internet): reenvia até o servidor confirmar
        if (!savedRef.current && payloadRef.current) {
          const again = await reportArenaPvp(id, payloadRef.current as never).catch(() => null);
          if (again && !again.error) savedRef.current = true;
        }
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
    setIntro(false);
    setError(null);
    setPeerGone(false);
    setPeerLeft(false);
    peerSeenRef.current = false;
    reportedRef.current = false;
    lastRecvRef.current = Date.now();
    const ls = new Lockstep(seed, [decks[0], oppDeck], meSide, arena, levels);
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
              <p className="text-sm font-black"><AT>📡 </AT>{opponentName} está sem conexão</p>
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
        <div className="flex justify-center">
          {arenaInfo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={arenaInfo.art} alt="" className="h-20 w-auto drop-shadow" draggable={false} />
          ) : (
            <span className="text-5xl" aria-hidden><AT>
              ⚔️
            </AT></span>
          )}
        </div>
        <h2 className="mt-1 text-xl font-black"><AT>⚔️ Você x </AT>{opponentName}</h2>
        <p className="text-sm text-[var(--muted)]">{arenaInfo?.name} · {levels ? "cartas nos níveis reais (vizinhos no ranking)" : "todos com cartas no nível 1"}</p>

        {stage === "invite" ? (
          iAmChallenger ? (
            <>
              <p className="mt-4 font-bold"><AT>⏳ Esperando </AT>{opponentName} aceitar o desafio…</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Pode deixar esta tela aberta: ela avisa quando ele aceitar.</p>
              <button type="button" disabled={busy} onClick={leaveRoom} className="btn btn-ghost mt-3 w-full">
                Cancelar desafio
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 font-bold">{opponentName} te desafiou para uma partida 1x1!</p>
              <div className="mt-4 grid gap-2">
                <button type="button" disabled={busy} onClick={() => respond(true)} className="btn btn-primary !py-3"><AT>
                  ✅ Aceitar o desafio
                </AT></button>
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
            <button type="button" onClick={() => setIntro(true)} className="btn btn-primary mt-4 w-full !py-3 !text-lg"><AT>
              ⚔️ Entrar na partida
            </AT></button>
            {intro ? <ArenaLoadingScreen label="Entrando na partida…" onComplete={enter} /> : null}
            <button type="button" disabled={busy} onClick={leaveRoom} className="btn btn-ghost mt-2 w-full">
              Sair da sala
            </button>
          </>
        ) : null}

        {stage === "connecting" ? (
          <>
            <p className="mt-4 font-bold"><AT>⏳ Esperando </AT>{opponentName} entrar…</p>
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

        {stage === "result" ? <Result view={view} status={status} opponentName={opponentName} tournamentId={tournamentId} roomId={id} myId={myId} /> : null}

        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
      </div>
      <Link href={tournamentId ? `/app/jogos/arena/torneios/${tournamentId}` : "/app/jogos/arena"} className="btn btn-ghost mt-3 w-full">
        {tournamentId ? <AT>{"← Voltar ao torneio"}</AT> : <AT>{"← Voltar à Batalha"}</AT>}
      </Link>
    </div>
  );
}

function Result({ view, status, opponentName, tournamentId, roomId, myId }: { view: PvpView; status: string; opponentName: string; tournamentId?: string | null; roomId: string; myId: string }) {
  if (view.state === "declined" || status === "declined") return <p className="mt-4 font-bold">{opponentName} recusou o desafio.</p>;
  if (view.state === "disputed" || status === "disputed") {
    return (
      <>
        <p className="mt-4 text-4xl" aria-hidden><AT>⚠️</AT></p>
        <p className="mt-1 font-bold">Não deu pra confirmar essa partida.</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Os dois aparelhos não concordaram com as jogadas. Ninguém ganha nem perde troféu.</p>
      </>
    );
  }
  if (view.state !== "finished") return <p className="mt-4 font-bold">Aguardando…</p>;
  const r = view.result;
  return (
    <>
      <div className="mt-4">
        <MatchResultHero
          result={r === "win" || r === "draw" ? r : "loss"}
          crownsMe={view.crownsMe ?? 0}
          crownsThem={view.crownsThem ?? 0}
          meName="Você"
          themName={opponentName}
          note={view.why === "resigned" || view.why === "left" ? (view.why === "left" ? "Por abandono do colega." : r === "win" ? "Seu colega desistiu." : "Você desistiu.") : undefined}
        >
          <PostMatchChat room={`pvp:${roomId}`} myId={myId} fallbackName={opponentName} lead={`Conversar com ${opponentName}`} />
        </MatchResultHero>
      </div>
      {view.medal ? (
        <div className="mt-2">
          {view.medal.winner === "me" ? (
            <p className="text-lg font-black text-amber-500"><AT>🏅 +1 medalha de vitória contra </AT>{opponentName}!</p>
          ) : view.medal.winner === "them" ? (
            <p className="text-sm font-bold text-[var(--muted)]"><AT>🏅 </AT>{opponentName} ganhou uma medalha de vitória contra você.</p>
          ) : null}
          <p className="text-sm font-black">
            Medalhas: você {view.medal.mine} x {view.medal.theirs} {opponentName}
          </p>
        </div>
      ) : null}
      {view.rewarded ? (
        <>
          {view.rankDuel ? (
            <div className="mt-2">
              {view.rankMove ? (
                <p className={`text-xl font-black ${view.rankMove.to < view.rankMove.from ? "text-amber-500" : "text-rose-500"}`}>
                  {view.rankMove.to < view.rankMove.from ? <AT>{"⬆️"}</AT> : <AT>{"⬇️"}</AT>} Você foi do {view.rankMove.from}º para o {view.rankMove.to}º lugar!
                  {view.trophyDelta ? <span className="block text-sm font-bold">{view.trophyDelta > 0 ? "+" : ""}{view.trophyDelta}<AT> 🏆 </AT>{typeof view.trophies === "number" ? `(total ${view.trophies})` : ""}</span> : null}
                </p>
              ) : r === "draw" ? (
                <p className="text-sm font-bold text-[var(--muted)]">Empate: ninguém trocou de posição.</p>
              ) : r === "win" ? (
                <p className="text-sm font-bold text-[var(--muted)]">Você defendeu a sua posição!</p>
              ) : (
                <p className="text-sm font-bold text-[var(--muted)]">Ninguém trocou de lugar desta vez.</p>
              )}
            </div>
          ) : r !== "draw" ? (
            <p className={`mt-2 text-xl font-black tabular-nums ${(view.trophyDelta ?? 0) >= 0 ? "text-amber-500" : "text-rose-500"}`}>
              {r === "win" ? <AT>{`Você roubou ${view.trophyDelta ?? 0} 🏆 de ${opponentName}`}</AT> : <AT>{`${opponentName} roubou ${Math.abs(view.trophyDelta ?? 0)} 🏆 de você`}</AT>}
              {typeof view.trophies === "number" ? <span className="block text-sm font-bold text-[var(--muted)]">Total: {view.trophies}<AT> 🏆</AT></span> : null}
            </p>
          ) : null}
          <CopyReward card={view.copyCard} n={view.copies} />
          {(view.xp ?? 0) > 0 ? (
            <p className="mt-2 inline-block rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-lg font-black text-[var(--accent-strong)]">+{view.xp} XP</p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {tournamentId
            ? r === "draw"
              ? "Empate! Volte ao torneio e jogue de novo pra desempatar."
              : "Partida de torneio: o resultado vai pro chaveamento. Volte ao torneio pra ver o que vem a seguir."
            : "Essa partida não valeu prêmio (muito curta ou limite do dia com esse colega)."}
        </p>
      )}
    </>
  );
}
