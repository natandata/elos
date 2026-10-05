"use client";

import Link from "next/link";
import { CopyReward } from "./CopyReward";
import { useArenaPresence } from "./arenaPresence";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArenaLoadingScreen } from "@/components/games/ArenaLoadingScreen";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { checkArenaDuo, leaveArenaDuo, reportArenaDuo, respondArenaDuo } from "@/lib/actions/arenaDuo";
import { Lockstep, type Frame } from "@/lib/arena/lockstep";
import { teamOf, type Side } from "@/lib/arena/core";
import type { DuoView } from "@/lib/arena/settleDuo";
import { ARENAS } from "@/lib/arena/arenas";
import { ArenaPlayfield, type PlayDriver } from "./ArenaPlayfield";

type Stage = "invite" | "ready" | "connecting" | "playing" | "finishing" | "result";
type Status = "invited" | "accepted" | "finished" | "declined" | "disputed";

export type DuoRoomProps = {
  id: string;
  /** meu número de jogador (0 = anfitrião, 1 = parceiro, 2 e 3 = adversários) */
  me: number;
  /** nomes dos 4 jogadores, na ordem dos números */
  names: string[];
  arena: number;
  seed: number;
  decks: (string[] | null)[];
  initialStatus: Status;
  initialView: DuoView;
  /** partida de torneio: mostra o caminho de volta e não fala de troféus */
  tournamentId?: string | null;
  /** quem está jogando (pra aparecer como "jogando" no ranking) */
  myId: string;
};

const PEER_SILENT_MS = 10_000;

export function ArenaDuoRoom({ id, me, names, arena, seed, decks, initialStatus, initialView, tournamentId, myId }: DuoRoomProps) {
  const router = useRouter();
  const startedKey = `arena-duo-started:${id}`;
  const mySide = teamOf(4, me) as Side;
  const [stage, setStage] = useState<Stage>(() => {
    if (initialStatus === "invited") return "invite";
    if (initialStatus === "accepted") return initialView.state === "waiting" ? "finishing" : "ready";
    return "result";
  });
  const [status, setStatus] = useState<Status>(initialStatus);
  const [view, setView] = useState<DuoView>(initialView);
  const [deckList, setDeckList] = useState<(string[] | null)[]>(decks);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [intro, setIntro] = useState(false);
  const [driver, setDriver] = useState<PlayDriver | null>(null);
  useArenaPresence(myId, tournamentId ? "tournament" : "duo", driver, stage === "playing");
  const [silent, setSilent] = useState<number[]>([]);
  const [leftNames, setLeftNames] = useState<number[]>([]);

  const lsRef = useRef<Lockstep | null>(null);
  const chRef = useRef<RealtimeChannel | null>(null);
  const lastRecvRef = useRef<number[]>([0, 0, 0, 0]);
  const lastForceRef = useRef(0);
  const seenRef = useRef<Set<number>>(new Set());
  const reportedRef = useRef(false);
  const savedRef = useRef(false);
  const payloadRef = useRef<unknown>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const myTeam = [0, 1, 2, 3].filter((i) => teamOf(4, i) === mySide);
  const partner = myTeam.find((i) => i !== me) ?? 0;
  const enemies = [0, 1, 2, 3].filter((i) => teamOf(4, i) !== mySide);
  const enemyLabel = enemies.map((i) => names[i].split(" ")[0]).join(" + ");
  const accepted = deckList.map((d) => Array.isArray(d));
  const arenaInfo = ARENAS[arena];

  const send = useCallback((event: string, payload: unknown) => {
    void chRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  // ---------------------------------------------------------- convites (espera/aceite)
  useEffect(() => {
    if (stage !== "invite") return;
    const t = setInterval(async () => {
      const r = await checkArenaDuo(id).catch(() => null);
      if (!r || r.error) return;
      if (r.decks) setDeckList(r.decks);
      if (r.status === "accepted") {
        setStatus("accepted");
        setStage("ready");
      } else if (r.status && r.status !== "invited") {
        setStatus(r.status as Status);
        if (r.view) setView(r.view);
        setStage("result");
      }
    }, 3000);
    return () => clearInterval(t);
  }, [stage, id]);

  async function respond(accept: boolean) {
    setBusy(true);
    setError(null);
    const r = await respondArenaDuo(id, accept).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; deck?: string[]; allReady?: boolean });
    setBusy(false);
    if (r.error) return setError(r.error);
    if (!accept) return router.push("/app/jogos/arena/duplas");
    setDeckList((d) => d.map((x, i) => (i === me && r.deck ? r.deck : x)));
    if (r.allReady) {
      const c = await checkArenaDuo(id).catch(() => null);
      if (c?.decks) setDeckList(c.decks);
      setStatus("accepted");
      setStage("ready");
    }
  }

  async function leaveRoom() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await leaveArenaDuo(id).catch(() => ({ error: "Sem conexão. Tente de novo." }));
    setBusy(false);
    if (r.error) return setError(r.error);
    router.push("/app/jogos/arena/duplas");
  }

  // ---------------------------------------------------------- relatório e resultado
  const report = useCallback(
    async (extra: { resigned?: boolean }) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      setStage("finishing");
      const ls = lsRef.current;
      try {
        sessionStorage.removeItem(startedKey);
      } catch {}
      const payload = { mine: ls?.ownInputs ?? [], seen: ls?.seenBy() ?? {}, tick: ls?.game.tick ?? 0, ...extra };
      payloadRef.current = payload;
      const r = await reportArenaDuo(id, payload).catch(() => ({ error: "Sem conexão." }) as { error?: string; view?: DuoView });
      if (!r.error) savedRef.current = true;
      if (r.view) setView(r.view);
      if (r.view && (r.view.state === "finished" || r.view.state === "disputed")) setStage("result");
    },
    [id, startedKey],
  );

  // enquanto espera o fechamento: reenvia os últimos avisos (os outros ainda podem precisar) e consulta o resultado
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
          const again = await reportArenaDuo(id, payloadRef.current as never).catch(() => null);
          if (again && !again.error) savedRef.current = true;
        }
        const r = await checkArenaDuo(id).catch(() => null);
        if (r?.view) {
          setView(r.view);
          if (r.view.state === "finished" || r.view.state === "disputed") setStage("result");
        }
      }
    }, 1000);
    return () => clearInterval(t);
  }, [stage, id, send]);

  // recarregou no meio da partida: conta como saída
  useEffect(() => {
    if (stage !== "ready") return;
    try {
      const t = sessionStorage.getItem(startedKey);
      if (t !== null) {
        sessionStorage.removeItem(startedKey);
        reportedRef.current = true;
        setStage("finishing");
        void reportArenaDuo(id, { mine: [], seen: {}, resigned: true, tick: Number(t) || 0 }).then((r) => {
          if (r.view) setView(r.view);
          setStage("result");
        });
      }
    } catch {}
    // só ao entrar na sala
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------- conexão em tempo real
  function enter() {
    setIntro(false);
    const all = deckList.every((d) => Array.isArray(d));
    if (!all) return;
    setError(null);
    setSilent([]);
    setLeftNames([]);
    seenRef.current = new Set();
    reportedRef.current = false;
    lastRecvRef.current = [Date.now(), Date.now(), Date.now(), Date.now()];
    lsRef.current = new Lockstep(seed, deckList as string[][], me, arena);
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
    const ch = supabase.channel(`arena-duo:${id}`, { config: { broadcast: { self: false } } });
    chRef.current = ch;
    let helloTimer: ReturnType<typeof setInterval> | null = null;
    const others = [0, 1, 2, 3].filter((i) => i !== me);

    const maybeBegin = () => {
      if (stageRef.current !== "connecting") return;
      if (!others.every((o) => seenRef.current.has(o))) return;
      setDriver({
        game: ls.game,
        mySide,
        myPlayer: me,
        arena,
        opponentLabel: enemyLabel,
        inputDelay: ls.delay,
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

    const sawPeer = (p: number, reply: boolean) => {
      lastRecvRef.current[p] = Date.now();
      if (!seenRef.current.has(p)) {
        seenRef.current.add(p);
        if (reply) send("hello", { p: me }); // garante que ele também me viu
        maybeBegin();
      }
    };

    ch.on("broadcast", { event: "hello" }, ({ payload }) => {
      const p = (payload as { p?: number })?.p;
      if (typeof p === "number" && p !== me) sawPeer(p, true);
    });
    ch.on("broadcast", { event: "f" }, ({ payload }) => {
      const f = payload as Frame;
      if (typeof f?.p !== "number" || f.p === me) return;
      lastRecvRef.current[f.p] = Date.now();
      setSilent((s) => (s.includes(f.p as number) ? s.filter((x) => x !== f.p) : s));
      sawPeer(f.p, false);
      ls.receive(f);
    });
    ch.on("broadcast", { event: "bye" }, ({ payload }) => {
      const b = payload as { p?: number; count?: number };
      if (typeof b?.p !== "number" || typeof b.count !== "number") return;
      ls.peerLeft(b.p, b.count);
      setLeftNames((l) => (l.includes(b.p as number) ? l : [...l, b.p as number]));
    });
    ch.subscribe((s) => {
      if (s === "SUBSCRIBED") {
        send("hello", { p: me });
        helloTimer = setInterval(() => {
          if (others.every((o) => seenRef.current.has(o))) return;
          send("hello", { p: me });
        }, 700);
      }
    });

    return () => {
      if (helloTimer) clearInterval(helloTimer);
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

  // vigia: sincronia perdida e colegas sem sinal
  useEffect(() => {
    if (stage !== "playing") return;
    const t = setInterval(() => {
      const ls = lsRef.current;
      if (!ls) return;
      if (ls.desynced && !reportedRef.current) {
        setError("A partida saiu de sincronia. O resultado será conferido pelo servidor.");
        void report({});
        return;
      }
      const now = Date.now();
      const quiet = ls.waitingFor().filter((p) => now - lastRecvRef.current[p] > PEER_SILENT_MS);
      setSilent((s) => (s.length === quiet.length && s.every((x, i) => x === quiet[i]) ? s : quiet));
    }, 1000);
    return () => clearInterval(t);
  }, [stage, report]);

  // ---------------------------------------------------------- telas
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
          if (!window.confirm("Sair da partida? Você perde troféus e sua dupla joga sozinha.")) return;
          send("bye", { p: me, count: lsRef.current?.ownCount ?? 0 });
          void report({ resigned: true });
        }}
        extra={
          <>
            {leftNames.length > 0 ? (
              <div className="pointer-events-none absolute inset-x-3 top-20 rounded-xl bg-black/70 px-3 py-1.5 text-center text-xs font-bold text-white">
                🚪 {leftNames.map((p) => names[p].split(" ")[0]).join(", ")} saiu da partida
              </div>
            ) : null}
            {silent.length > 0 ? (
              <div className="absolute inset-x-3 top-28 rounded-2xl border-2 border-amber-300 bg-black/80 p-3 text-center text-white">
                <p className="text-sm font-black">📡 {silent.map((p) => names[p].split(" ")[0]).join(", ")} sem conexão</p>
                <p className="mt-1 text-xs font-semibold text-white/80">A partida precisa de todos conectados. Se não voltar, você pode sair.</p>
                <button
                  type="button"
                  onClick={() => {
                    send("bye", { p: me, count: lsRef.current?.ownCount ?? 0 });
                    void report({ resigned: true });
                  }}
                  className="mt-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-900"
                >
                  Sair da partida
                </button>
              </div>
            ) : null}
          </>
        }
      />
    );
  }

  const chip = (i: number) => (
    <li key={i} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 ${i === me ? "border-amber-400 bg-amber-400/10" : "border-[var(--line)] bg-[var(--card)]"}`}>
      <span className="text-lg" aria-hidden>
        {accepted[i] ? "✅" : "⏳"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold">
        {names[i]}
        {i === me ? " (você)" : ""}
      </span>
      <span className="text-[11px] font-bold text-[var(--muted)]">{i === 0 ? "anfitrião" : i === partner && teamOf(4, i) === mySide ? "parceiro" : ""}</span>
    </li>
  );

  return (
    <div>
      <div className="card p-5">
        <div className="flex justify-center">
          {arenaInfo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={arenaInfo.art} alt="" className="h-20 w-auto drop-shadow" draggable={false} />
          ) : (
            <span className="text-5xl" aria-hidden>
              👥
            </span>
          )}
        </div>
        <h2 className="mt-1 text-center text-xl font-black">👥 Duplas</h2>
        <p className="text-center text-sm text-[var(--muted)]">{arenaInfo?.name} · todos com cartas no nível 1</p>

        <div className="mt-4 grid gap-3">
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-wide text-sky-500">Sua dupla</p>
            <ul className="space-y-1.5">{myTeam.map(chip)}</ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-wide text-rose-500">Adversários</p>
            <ul className="space-y-1.5">{enemies.map(chip)}</ul>
          </div>
        </div>

        {stage === "invite" ? (
          me === 0 || accepted[me] ? (
            <>
              <p className="mt-4 text-center text-sm font-bold">⏳ Esperando todo mundo aceitar… Esta tela avisa sozinha.</p>
              <button type="button" disabled={busy} onClick={leaveRoom} className="btn btn-ghost mt-3 w-full">
                {me === 0 ? "Cancelar desafio" : "Sair da sala"}
              </button>
            </>
          ) : (
            <div className="mt-4 grid gap-2">
              <button type="button" disabled={busy} onClick={() => respond(true)} className="btn btn-primary !py-3">
                ✅ Aceitar o desafio
              </button>
              <button type="button" disabled={busy} onClick={() => respond(false)} className="btn btn-ghost">
                Recusar
              </button>
            </div>
          )
        ) : null}

        {stage === "ready" ? (
          <>
            <p className="mt-4 text-center font-bold">Tudo pronto! Os quatro precisam entrar ao mesmo tempo.</p>
            <p className="mt-1 text-center text-xs text-[var(--muted)]">Se você sair no meio, conta como derrota.</p>
            <button type="button" onClick={() => setIntro(true)} className="btn btn-primary mt-4 w-full !py-3 !text-lg">
              ⚔️ Entrar na partida
            </button>
            {intro ? <ArenaLoadingScreen label="Entrando na partida…" onComplete={enter} /> : null}
            <button type="button" disabled={busy} onClick={leaveRoom} className="btn btn-ghost mt-2 w-full">
              Sair da sala
            </button>
          </>
        ) : null}

        {stage === "connecting" ? (
          <>
            <p className="mt-4 text-center font-bold">⏳ Esperando os outros entrarem…</p>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(startedKey);
                } catch {}
                setStage("ready");
              }}
              className="btn btn-ghost mt-3 w-full"
            >
              Cancelar
            </button>
          </>
        ) : null}

        {stage === "finishing" ? (
          <>
            <p className="mt-4 text-center font-bold">Conferindo o resultado…</p>
            <p className="mt-1 text-center text-xs text-[var(--muted)]">Se algum colega demorar pra confirmar, o servidor decide em até 1 minuto.</p>
          </>
        ) : null}

        {stage === "result" ? <DuoResult view={view} status={status} tournamentId={tournamentId} /> : null}
        {error ? <p className="mt-3 text-center text-sm font-semibold text-rose-600">{error}</p> : null}
      </div>
      <Link href={tournamentId ? `/app/jogos/arena/torneios/${tournamentId}` : "/app/jogos/arena/duplas"} className="btn btn-ghost mt-3 w-full">
        {tournamentId ? "← Voltar ao torneio" : "← Voltar às duplas"}
      </Link>
    </div>
  );
}

function DuoResult({ view, status, tournamentId }: { view: DuoView; status: string; tournamentId?: string | null }) {
  if (view.state === "declined" || status === "declined") return <p className="mt-4 text-center font-bold">Alguém recusou o desafio.</p>;
  if (view.state === "disputed" || status === "disputed") {
    return (
      <div className="mt-4 text-center">
        <p className="text-4xl" aria-hidden>⚠️</p>
        <p className="mt-1 font-bold">Não deu pra confirmar essa partida.</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Os aparelhos não concordaram com as jogadas. Ninguém ganha nem perde troféu.</p>
      </div>
    );
  }
  if (view.state !== "finished") return <p className="mt-4 text-center font-bold">Aguardando…</p>;
  const r = view.result;
  return (
    <div className="mt-4 text-center">
      <p className="text-6xl" aria-hidden>
        {r === "win" ? "🏆" : r === "draw" ? "🤝" : "😅"}
      </p>
      <h3 className="mt-1 text-2xl font-black">{r === "win" ? "Vitória!" : r === "draw" ? "Empate" : "Derrota"}</h3>
      <p className="text-lg font-bold tabular-nums">
        👑 {view.crownsMe ?? 0} x {view.crownsThem ?? 0} 👑
      </p>
      {view.rewarded ? (
        <>
          {r !== "draw" ? (
            <p className={`mt-2 text-xl font-black tabular-nums ${(view.trophyDelta ?? 0) >= 0 ? "text-amber-500" : "text-rose-500"}`}>
              {(view.trophyDelta ?? 0) >= 0 ? "+" : ""}
              {view.trophyDelta ?? 0} 🏆
              {typeof view.trophies === "number" ? <span className="text-sm font-bold text-[var(--muted)]"> (total {view.trophies})</span> : null}
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
            ? view.result === "draw"
              ? "Empate! Voltem ao torneio e joguem de novo pra desempatar."
              : "Partida de torneio: o resultado vai pro chaveamento. Voltem ao torneio pra ver o que vem a seguir."
            : "Essa partida não valeu prêmio (muito curta ou limite do dia com esse grupo)."}
        </p>
      )}
    </div>
  );
}
