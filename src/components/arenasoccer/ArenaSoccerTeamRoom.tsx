"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SoccerNet } from "@/lib/arenasoccer/net";
import { buildMatch, countSide, loadTeam, type RoomState, type TeamRef } from "@/lib/arenasoccer/teamRoom";
import { CUP_YEARS, LEAGUES, loadCup, loadLeague, type LeagueKey, type Team } from "@/lib/arenasoccer/teams";
import { createClient } from "@/lib/supabase/client";
import { ArenaSoccerGame, type MatchResult } from "./ArenaSoccerGame";
import { KitChip } from "./ArenaSoccerPlay";

type OpenRoom = { id: string; host: string; per: number; label: string; humans: number };
type Step = "menu" | "size" | "teamA" | "teamB" | "lobby" | "playing";
type Loaded = [Team, Team];

const SOURCES: { src: string; label: string }[] = [...CUP_YEARS.map((y) => ({ src: `cup:${y}`, label: `Copa ${y}` })), ...LEAGUES.map((l) => ({ src: `league:${l.key}`, label: `${l.flag} ${l.short}` }))];

async function listTeams(src: string): Promise<Team[]> {
  const [kind, key] = src.split(":");
  const teams = kind === "cup" ? (await loadCup(Number(key))).teams : (await loadLeague(key as LeagueKey)).teams;
  return [...teams].sort((a, b) => b.str - a.str);
}

function TeamPicker({ title, onPick, onBack }: { title: string; onPick: (ref: TeamRef, t: Team) => void; onBack: () => void }) {
  const [src, setSrc] = useState(SOURCES[0].src);
  const [loaded, setLoaded] = useState<{ src: string; teams: Team[] } | null>(null);
  useEffect(() => {
    let stop = false;
    void listTeams(src).then((teams) => !stop && setLoaded({ src, teams }));
    return () => {
      stop = true;
    };
  }, [src]);
  const teams = loaded?.src === src ? loaded.teams : null;
  return (
    <section className="card space-y-3 p-4">
      <p className="text-lg font-black">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {SOURCES.map((s) => (
          <button key={s.src} type="button" onClick={() => setSrc(s.src)} className={`rounded-full px-3 py-1 text-xs font-bold ${src === s.src ? "bg-emerald-500 text-white" : "bg-[var(--line)]"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {teams ? (
        <ul className="grid max-h-[50vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
          {teams.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onPick({ src, id: t.id }, t)} className="flex w-full items-center gap-2 rounded-xl bg-[var(--line)] p-2 text-left">
                <KitChip t={t} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.name}</span>
                <small className="text-xs text-[var(--muted)]">{t.str}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--muted)]">Carregando times…</p>
      )}
      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        ← Voltar
      </button>
    </section>
  );
}

/** Online em equipe (2×2, 3×3, 4×4) com times de verdade, de qualquer Elo. A partida roda no aparelho de quem criou a sala. */
export function ArenaSoccerTeamRoom({ color, myId, myName, onFinish, onBack }: { color: string; myId: string; myName: string; onFinish: (r: MatchResult) => void; onBack: () => void }) {
  const [sb] = useState(() => createClient());
  const [step, setStep] = useState<Step>("menu");
  const [rooms, setRooms] = useState<OpenRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [per, setPer] = useState<2 | 3 | 4>(2);
  const [refA, setRefA] = useState<{ ref: TeamRef; team: Team } | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [teams, setTeams] = useState<Loaded | null>(null);
  const [net, setNet] = useState<SoccerNet | null>(null);
  const [isHost, setIsHost] = useState(false);

  const chRef = useRef<RealtimeChannel | null>(null);
  const roomRef = useRef<string | null>(null);
  const isHostRef = useRef(false);
  const stateRef = useRef<RoomState | null>(null);
  const handlersRef = useRef(new Map<string, Set<(p: unknown) => void>>());
  const lastSeen = useRef(new Map<string, number>());
  const lastState = useRef(0);
  const aliveRef = useRef(true);
  const startedRef = useRef(false);

  const publish = useCallback((s: RoomState) => {
    stateRef.current = s;
    setState(s);
    chRef.current?.send({ type: "broadcast", event: "state", payload: s });
    if (isHostRef.current && roomRef.current) void sb.rpc("soccer_team_room_set", { p_room: roomRef.current, p_humans: s.members.length, p_status: null });
  }, [sb]);

  const closeRoom = useCallback(
    (status: "finished" | "cancelled") => {
      const id = roomRef.current;
      roomRef.current = null;
      if (id && isHostRef.current) void sb.rpc("soccer_team_room_set", { p_room: id, p_humans: null, p_status: status });
      if (id && !isHostRef.current && !startedRef.current) chRef.current?.send({ type: "broadcast", event: "leave", payload: { uid: myId } });
      if (chRef.current) void sb.removeChannel(chRef.current);
      chRef.current = null;
      handlersRef.current.clear();
      isHostRef.current = false;
      startedRef.current = false;
    },
    [sb, myId],
  );

  const reset = useCallback(
    (status: "finished" | "cancelled", msg?: string) => {
      closeRoom(status);
      setState(null);
      stateRef.current = null;
      setTeams(null);
      setNet(null);
      setIsHost(false);
      setStep("menu");
      if (msg) setError(msg);
    },
    [closeRoom],
  );

  const openChannel = useCallback(
    async (roomId: string): Promise<boolean> => {
      const ch = sb.channel(`soccer-tr:${roomId}`, { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "*" }, (m: { event: string; payload: unknown }) => handlersRef.current.get(m.event)?.forEach((f) => f(m.payload)));
      const ok = await new Promise<boolean>((resolve) => {
        const timer = window.setTimeout(() => resolve(false), 10_000);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            window.clearTimeout(timer);
            resolve(true);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            window.clearTimeout(timer);
            resolve(false);
          }
        });
      });
      if (!ok) {
        void sb.removeChannel(ch);
        return false;
      }
      chRef.current = ch;
      roomRef.current = roomId;
      return true;
    },
    [sb],
  );

  const on = useCallback((event: string, fn: (p: unknown) => void) => {
    const set = handlersRef.current.get(event) ?? new Set();
    set.add(fn);
    handlersRef.current.set(event, set);
    return () => set.delete(fn);
  }, []);

  /** Todos entram na partida com o mesmo estado: a montagem é igual em cada aparelho. */
  const begin = useCallback(
    async (s: RoomState, loaded: Loaded) => {
      if (startedRef.current) return;
      const { seats } = buildMatch(s, loaded);
      const mine = seats[myId];
      if (!mine) {
        reset("cancelled", "Você ficou de fora dessa partida.");
        return;
      }
      startedRef.current = true;
      const ch = chRef.current;
      const opp = s.members.find((m) => m.side !== mine.side);
      setTeams(loaded);
      setNet({
        role: isHostRef.current ? "host" : "guest",
        seat: mine,
        myName,
        oppName: opp?.name ?? "Adversário",
        hostColor: color,
        send: (event, payload) => void ch?.send({ type: "broadcast", event, payload }),
        on,
      });
      setStep("playing");
    },
    [myId, myName, color, on, reset],
  );

  // sala: o anfitrião cuida do estado; quem entra manda "join" e acompanha o que o anfitrião transmite
  useEffect(() => {
    if (step !== "lobby") return;
    const offs: (() => void)[] = [];
    const hostMode = isHostRef.current;
    const t = window.setInterval(() => {
      const now = Date.now();
      if (hostMode) {
        const s = stateRef.current;
        if (!s) return;
        const keep = s.members.filter((m) => m.uid === s.hostUid || now - (lastSeen.current.get(m.uid) ?? now) < 14_000);
        if (keep.length !== s.members.length) publish({ ...s, members: keep });
        else chRef.current?.send({ type: "broadcast", event: "state", payload: s });
      } else {
        chRef.current?.send({ type: "broadcast", event: "ping", payload: { uid: myId, name: myName } });
        if (lastState.current && now - lastState.current > 12_000) reset("cancelled", "O criador da sala saiu.");
      }
    }, 2000);
    offs.push(() => window.clearInterval(t));

    if (hostMode) {
      const withS = (fn: (s: RoomState) => RoomState | null) => {
        const s = stateRef.current;
        if (!s) return;
        const n = fn(s);
        if (n) publish(n);
      };
      offs.push(
        on("join", (p) => {
          const { uid, name } = p as { uid: string; name: string };
          lastSeen.current.set(uid, Date.now());
          withS((s) => {
            if (s.members.some((m) => m.uid === uid)) return s;
            const side: 0 | 1 = countSide(s, 0) <= countSide(s, 1) ? 0 : 1;
            if (countSide(s, side) >= s.per) return null;
            return { ...s, members: [...s.members, { uid, name: String(name).slice(0, 24), side, pick: -1 }] };
          });
        }),
        on("ping", (p) => {
          const { uid } = p as { uid: string };
          lastSeen.current.set(uid, Date.now());
        }),
        on("leave", (p) => {
          const { uid } = p as { uid: string };
          withS((s) => ({ ...s, members: s.members.filter((m) => m.uid !== uid || m.uid === s.hostUid) }));
        }),
        on("side", (p) => {
          const { uid, side } = p as { uid: string; side: 0 | 1 };
          withS((s) => (side !== 0 && side !== 1 ? null : countSide(s, side) >= s.per ? null : { ...s, members: s.members.map((m) => (m.uid === uid && m.side !== side ? { ...m, side, pick: -1 } : m)) }));
        }),
        on("pick", (p) => {
          const { uid, pick } = p as { uid: string; pick: number };
          withS((s) => {
            const me = s.members.find((m) => m.uid === uid);
            if (!me) return null;
            if (pick >= 0 && s.members.some((m) => m.uid !== uid && m.side === me.side && m.pick === pick)) return null;
            return { ...s, members: s.members.map((m) => (m.uid === uid ? { ...m, pick } : m)) };
          });
        }),
      );
    } else {
      offs.push(
        on("state", (p) => {
          const s = p as RoomState;
          lastState.current = Date.now();
          stateRef.current = s;
          setState(s);
        }),
        on("start", (p) => {
          const s = p as RoomState;
          void (async () => {
            const a = await loadTeam(s.teams[0]);
            const b = await loadTeam(s.teams[1]);
            if (!a || !b || !aliveRef.current) return;
            stateRef.current = s;
            setState(s);
            void begin(s, [a, b]);
          })();
        }),
      );
      const hello = () => chRef.current?.send({ type: "broadcast", event: "join", payload: { uid: myId, name: myName } });
      hello();
      const again = window.setInterval(() => {
        if (!stateRef.current?.members.some((m) => m.uid === myId)) hello();
      }, 1500);
      offs.push(() => window.clearInterval(again));
    }
    return () => offs.forEach((f) => f());
  }, [step, on, publish, reset, begin, myId, myName]);

  // os times da sala (para mostrar escudos e jogadores)
  const [shown, setShown] = useState<Loaded | null>(null);
  const refKey = state ? `${state.teams[0].src}/${state.teams[0].id}|${state.teams[1].src}/${state.teams[1].id}` : "";
  useEffect(() => {
    if (!state) return;
    let stop = false;
    void Promise.all([loadTeam(state.teams[0]), loadTeam(state.teams[1])]).then(([a, b]) => !stop && a && b && setShown([a, b]));
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey]);

  // salas abertas
  useEffect(() => {
    if (step !== "menu") return;
    let stop = false;
    const load = async () => {
      const { data } = await sb.rpc("soccer_team_rooms_open");
      if (!stop) setRooms(Array.isArray(data) ? (data as OpenRoom[]) : []);
    };
    void load();
    const t = window.setInterval(load, 4000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [sb, step]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      closeRoom("cancelled");
    };
  }, [closeRoom]);

  async function createRoom(a: { ref: TeamRef; team: Team }, b: { ref: TeamRef; team: Team }) {
    setBusy(true);
    setError(null);
    const { data } = await sb.rpc("soccer_team_room_create", { p_per: per, p_label: `${a.team.name} × ${b.team.name}` });
    const r = data as { id?: string; error?: string } | null;
    if (!r?.id) {
      setBusy(false);
      setError(r?.error ?? "Não foi possível criar a sala.");
      setStep("menu");
      return;
    }
    isHostRef.current = true;
    setIsHost(true);
    const ok = await openChannel(r.id);
    setBusy(false);
    if (!ok) {
      reset("cancelled", "Não foi possível conectar. Tente de novo.");
      return;
    }
    lastSeen.current.clear();
    const s: RoomState = { per, teams: [a.ref, b.ref], hostUid: myId, members: [{ uid: myId, name: myName, side: 0, pick: -1 }] };
    stateRef.current = s;
    setState(s);
    setShown([a.team, b.team]);
    setStep("lobby");
  }

  async function joinRoom(id: string) {
    setBusy(true);
    setError(null);
    const ok = await openChannel(id);
    if (!ok) {
      setBusy(false);
      reset("cancelled", "Não foi possível conectar. Tente de novo.");
      return;
    }
    isHostRef.current = false;
    setIsHost(false);
    lastState.current = 0;
    stateRef.current = null;
    setState(null);
    setStep("lobby");
    // espera o anfitrião responder
    window.setTimeout(() => {
      setBusy(false);
      if (aliveRef.current && !stateRef.current) reset("cancelled", "Essa sala já não está disponível.");
    }, 9000);
  }

  function moveSide(side: 0 | 1) {
    const s = stateRef.current;
    if (!s) return;
    if (isHostRef.current) {
      if (countSide(s, side) < s.per) publish({ ...s, members: s.members.map((m) => (m.uid === myId ? { ...m, side, pick: -1 } : m)) });
    } else chRef.current?.send({ type: "broadcast", event: "side", payload: { uid: myId, side } });
  }

  function startMatch() {
    const s = stateRef.current;
    if (!s || !shown || s.members.length < 2) return;
    chRef.current?.send({ type: "broadcast", event: "start", payload: s });
    if (roomRef.current) void sb.rpc("soccer_team_room_set", { p_room: roomRef.current, p_humans: s.members.length, p_status: "playing" });
    void begin(s, shown);
  }

  const me = state?.members.find((m) => m.uid === myId);
  const humansLabel = useMemo(() => (state ? `${state.members.length} de ${state.per * 2} vagas com gente` : ""), [state]);

  if (step === "playing" && net && teams && state) {
    const { spec } = buildMatch(state, teams);
    return (
      <ArenaSoccerGame
        mode={`${state.per}v${state.per}` as "2v2" | "3v3" | "4v4"}
        level="normal"
        color={color}
        net={net}
        spec={spec}
        onFinish={onFinish}
        onExit={() => reset("finished")}
      />
    );
  }

  if (step === "size") {
    return (
      <section className="card space-y-3 p-4">
        <p className="text-lg font-black">🌐 Online em equipe · tamanho</p>
        <p className="text-xs text-[var(--muted)]">Vagas que ninguém ocupa são jogadas pelo computador. Qualquer Elo pode entrar.</p>
        <div className="grid grid-cols-3 gap-2">
          {([2, 3, 4] as const).map((n) => (
            <button key={n} type="button" onClick={() => { setPer(n); setStep("teamA"); }} className="btn btn-primary !py-4 text-lg">
              {n} × {n}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setStep("menu")} className="btn btn-ghost w-full">
          ← Voltar
        </button>
      </section>
    );
  }
  if (step === "teamA") return <TeamPicker title="Time da esquerda (o seu)" onPick={(ref, team) => { setRefA({ ref, team }); setStep("teamB"); }} onBack={() => setStep("size")} />;
  if (step === "teamB") return <TeamPicker title="Time adversário" onPick={(ref, team) => refA && void createRoom(refA, { ref, team })} onBack={() => setStep("teamA")} />;

  if (step === "lobby") {
    return (
      <section className="card space-y-3 p-4">
        {!state || !shown ? (
          <p className="text-center text-sm font-bold">Entrando na sala…</p>
        ) : (
          <>
            <p className="text-lg font-black">
              {state.per} × {state.per} · {shown[0].name} × {shown[1].name}
            </p>
            <p className="text-xs text-[var(--muted)]">{humansLabel}. O computador joga as vagas vazias. {isHost ? "Quando todos estiverem prontos, comece." : "Esperando o criador começar."}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([0, 1] as const).map((side) => {
                const t = shown[side];
                const here = state.members.filter((m) => m.side === side);
                return (
                  <div key={side} className="rounded-xl bg-[var(--line)] p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <KitChip t={t} />
                      <b className="min-w-0 flex-1 truncate text-sm">{t.name}</b>
                      {me && me.side !== side ? (
                        <button type="button" disabled={here.length >= state.per} onClick={() => moveSide(side)} className="btn btn-ghost !px-2 !py-1 !text-xs disabled:opacity-40">
                          Ir pra cá
                        </button>
                      ) : null}
                    </div>
                    <ul className="space-y-1.5">
                      {here.map((m) => (
                        <li key={m.uid} className="rounded-lg bg-[var(--surface)] p-2 text-xs">
                          <b>{m.name}</b>
                          {m.uid === myId ? (
                            <select
                              value={m.pick}
                              onChange={(e) => {
                                const pick = Number(e.target.value);
                                if (isHost) {
                                  const s = stateRef.current;
                                  if (s && !(pick >= 0 && s.members.some((o) => o.uid !== myId && o.side === m.side && o.pick === pick))) publish({ ...s, members: s.members.map((o) => (o.uid === myId ? { ...o, pick } : o)) });
                                } else chRef.current?.send({ type: "broadcast", event: "pick", payload: { uid: myId, pick } });
                              }}
                              className="mt-1 w-full rounded-md bg-[var(--line)] p-1"
                            >
                              <option value={-1}>Automático (o melhor)</option>
                              {t.players
                                .map((p, i) => ({ p, i }))
                                .filter((x) => !state.members.some((o) => o.uid !== myId && o.side === m.side && o.pick === x.i))
                                .sort((a, b) => b.p[3] - a.p[3])
                                .map((x) => (
                                  <option key={x.i} value={x.i}>
                                    {x.p[2]} · {x.p[1]} · {x.p[3]}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="ml-1 text-[var(--muted)]">{m.pick >= 0 ? t.players[m.pick]?.[2] : "automático"}</span>
                          )}
                        </li>
                      ))}
                      {Array.from({ length: Math.max(0, state.per - here.length) }, (_, i) => (
                        <li key={`cpu${i}`} className="rounded-lg border border-dashed border-[var(--line)] p-2 text-xs text-[var(--muted)]">
                          🤖 Computador
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            {isHost ? (
              <button type="button" onClick={startMatch} disabled={state.members.length < 2} className="btn btn-primary w-full !py-3 disabled:opacity-50">
                {state.members.length < 2 ? "Esperando mais gente…" : "▶ Começar a partida"}
              </button>
            ) : null}
          </>
        )}
        <button type="button" onClick={() => reset("cancelled")} className="btn btn-ghost w-full">
          {isHost ? "Cancelar sala" : "Sair da sala"}
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <p className="text-lg font-black">🌐 Online em equipe · 2×2, 3×3, 4×4</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Escolha seleções ou clubes de verdade e jogue junto com outros jogadores, de qualquer Elo. Vence quem chegar a 5 gols ou tiver mais gols em 3 min 20 s; empatou, gol de ouro. O computador joga as vagas vazias.</p>
        <button type="button" onClick={() => setStep("size")} disabled={busy} className="btn btn-primary mt-3 w-full !py-3 disabled:opacity-60">
          ➕ Criar sala
        </button>
        {error ? <p className="mt-2 text-center text-xs font-semibold text-rose-600">{error}</p> : null}
      </section>
      <section className="card p-4">
        <p className="mb-2 text-sm font-black">Salas abertas ({rooms.length})</p>
        {rooms.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">Nenhuma sala aberta agora. Crie uma e chame a galera!</p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-[var(--line)] p-2.5">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{r.per} × {r.per} · {r.label}</b>
                  <small className="text-xs text-[var(--muted)]">{r.host} · {r.humans}/{r.per * 2}</small>
                </span>
                <button type="button" onClick={() => void joinRoom(r.id)} disabled={busy} className="btn btn-primary !px-4 !py-1.5 !text-sm disabled:opacity-50">
                  Entrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        ← Voltar
      </button>
    </div>
  );
}
