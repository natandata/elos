"use client";

import { LogAvatar } from "./LogAvatar";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SoccerNet } from "@/lib/arenasoccer/net";
import { buildScene, type Scene } from "@/lib/arenasoccer/scene";
import { applyOutcome, createMatch, finish, passOutcome, resolveAuto, setTactics, shotOutcome, stepMinute, substitute, type Chance, type Formation, type Goal, type Lineup, type LogEntry, type Match, type Mentality, type Outcome, type Side } from "@/lib/arenasoccer/sim";
import { kitOf, resolveKits, teamLabel, type Team } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "../ArenaSoccerGame";
import { localEngine, type MomentEngine } from "./engine";
import { KitChip } from "./KitChip";
import { TacticsPanel } from "./Lineup";
import { MomentView } from "./MomentView";

export type OnlineMember = { uid: string; name: string; side: Side; /** nome do jogador que a pessoa controla (sala em equipe); vazio = o time todo */ pick?: string };
type Phase = "play" | "half" | "end";
type View = { min: number; half: 1 | 2; score: [number, number]; log: LogEntry[]; stats: Match["stats"]; phase: Phase; goals: Goal[]; subsLeft: [number, number]; lineups: [Lineup, Lineup] | null; waiting: string | null };
type StMsg = Omit<View, "log"> & { logDelta: LogEntry[]; logFrom: number };

const TICK_MS = 380;
const WAIT_MS = 35_000;
const HALF_MS = 45_000;

/**
 * Partida online no estilo Brasfoot com lances decisivos. O aparelho de quem criou a sala (anfitrião) roda a partida e tem o sorteio;
 * quem joga um lance manda os passes e chutes e recebe o resultado. Cada pessoa joga os lances do seu time (ou do jogador que escolheu).
 */
export function OnlineMatch({ net, myUid, members, teams, lineups, seed, label, modeLabel, onFinish, onExit }: { net: SoccerNet; myUid: string; members: OnlineMember[]; teams: [Team, Team]; lineups: [Lineup, Lineup]; seed: number; label: string; modeLabel: "1v1" | "2v2" | "3v3" | "4v4"; onFinish: (r: MatchResult) => void; onExit: () => void }) {
  const isHost = net.role === "host";
  const me = members.find((m) => m.uid === myUid);
  const mySide: Side = me?.side ?? 0;
  const [kit0, kit1] = useMemo(() => resolveKits(kitOf(teams[0]), kitOf(teams[1])), [teams]);
  const kits: [typeof kit0, typeof kit1] = [kit0, kit1];
  const [startedAt] = useState(() => Date.now());

  const [match] = useState<Match | null>(() => {
    if (net.role !== "host") return null;
    const sides = new Set(members.map((x) => x.side));
    return createMatch(lineups, seed, sides.size === 2 ? "both" : [...sides][0] ?? null);
  });
  const host = useRef({ phase: "play" as "play" | "moment" | "wait" | "half" | "end", waitChance: null as Chance | null, waitTimer: 0, halfTimer: 0, ready: new Set<string>(), sentLog: 0, waiting: null as string | null });
  const [view, setView] = useState<View>(() => ({ min: 0, half: 1, score: [0, 0], log: [{ min: 0, side: null, icon: "📣", text: "Bola rolando!" }], stats: { shots: [0, 0], onTarget: [0, 0] }, phase: "play", goals: [], subsLeft: [3, 3], lineups: null, waiting: null }));
  const [moment, setMoment] = useState<{ chance: Chance; scene: Scene } | null>(null);
  const [readySent, setReadySent] = useState(false);
  const [lost, setLost] = useState(false);
  const lastMsg = useRef(0);

  // a partida online ocupa a tela inteira: trava a rolagem da página por trás
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const controllerOf = (c: Chance): OnlineMember | null => {
    const side = members.filter((m) => m.side === c.side);
    return side.find((m) => m.pick && (m.pick === c.shooter.name || m.pick === c.assister?.name)) ?? side[0] ?? null;
  };

  // ---------------------------------------------------------------- anfitrião
  useEffect(() => {
    if (!isHost) return;
    if (!match) return;
    const m = match;
    const h = host.current;

    const snapshot = (withLineups: boolean): StMsg => ({ min: m.min, half: m.half, score: [m.score[0], m.score[1]], stats: { shots: [...m.stats.shots] as [number, number], onTarget: [...m.stats.onTarget] as [number, number] }, phase: h.phase === "half" ? "half" : h.phase === "end" ? "end" : "play", goals: [...m.goals], subsLeft: [m.subsLeft[0], m.subsLeft[1]], lineups: withLineups ? [m.lineups[0], m.lineups[1]] : null, waiting: h.waiting, logDelta: m.log.slice(h.sentLog), logFrom: h.sentLog });
    const broadcast = (withLineups = false) => {
      const msg = snapshot(withLineups);
      h.sentLog = m.log.length;
      net.send("o:st", msg);
      setView((v) => ({ ...v, ...msg, log: m.log.slice(), lineups: withLineups ? msg.lineups : v.lineups }));
    };
    const endGame = () => {
      window.clearTimeout(h.waitTimer);
      finish(m);
      h.phase = "end";
      h.waiting = null;
      broadcast(true);
    };
    const resume = () => {
      window.clearTimeout(h.waitTimer);
      h.waitChance = null;
      h.waiting = null;
      h.phase = "play";
      setMoment(null);
      if (m.min >= 90) endGame();
      else broadcast();
    };
    const toHalf = () => {
      h.phase = "half";
      h.ready.clear();
      window.clearTimeout(h.halfTimer);
      h.halfTimer = window.setTimeout(() => startSecond(), HALF_MS);
      broadcast(true);
    };
    const startSecond = () => {
      if (h.phase !== "half") return;
      window.clearTimeout(h.halfTimer);
      h.phase = "play";
      broadcast(true);
    };
    const onChance = (c: Chance) => {
      const owner = controllerOf(c);
      if (!owner) {
        resolveAuto(m, c);
        resume();
        return;
      }
      const scene = buildScene(m, c);
      h.waiting = owner.name;
      if (owner.uid === myUid) {
        h.phase = "moment";
        setMoment({ chance: c, scene });
        broadcast();
      } else {
        h.phase = "wait";
        h.waitChance = c;
        net.send("o:ch", { to: owner.uid, chance: c, scene });
        broadcast();
        h.waitTimer = window.setTimeout(() => {
          if (h.waitChance?.id === c.id) {
            resolveAuto(m, c);
            resume();
          }
        }, WAIT_MS);
      }
    };

    const timer = window.setInterval(() => {
      if (h.phase !== "play") return;
      const r = stepMinute(m);
      if (r.chance) onChance(r.chance);
      else if (r.ended === "half") toHalf();
      else if (m.min >= 90) endGame();
      else broadcast();
    }, TICK_MS);

    const offs: (() => void)[] = [];
    offs.push(
      net.on("o:rq", (p) => {
        const q = p as { rid: number; k: "pass" | "shot"; chance: Chance; line?: { length: number; blockers: number; aerial: boolean }; aim?: { x: number; y: number }; opts?: { distance: number; header?: boolean; wall?: boolean; curve?: number } };
        if (h.waitChance?.id !== q.chance.id) return;
        const outcome: Outcome = q.k === "pass" && q.line ? passOutcome(m, q.chance, q.line) : q.aim && q.opts ? shotOutcome(m, q.chance, q.aim, q.opts) : { kind: "miss", goal: false, text: "Lance inválido." };
        net.send("o:rs", { rid: q.rid, outcome });
      }),
      net.on("o:fin", (p) => {
        const q = p as { chance: Chance; outcome: Outcome };
        if (h.waitChance?.id !== q.chance.id) return;
        applyOutcome(m, q.chance, q.outcome);
        resume();
      }),
      net.on("o:auto", (p) => {
        const q = p as { chance: Chance };
        if (h.waitChance?.id !== q.chance.id) return;
        resolveAuto(m, h.waitChance);
        resume();
      }),
      net.on("o:tac", (p) => {
        const q = p as { uid: string; formation?: Formation; mentality?: Mentality };
        const side = members.find((x) => x.uid === q.uid)?.side;
        if (side === undefined || h.phase !== "half") return;
        setTactics(m, side, { formation: q.formation, mentality: q.mentality });
        broadcast(true);
      }),
      net.on("o:sub", (p) => {
        const q = p as { uid: string; out: number; inn: number };
        const side = members.find((x) => x.uid === q.uid)?.side;
        if (side === undefined || h.phase !== "half") return;
        substitute(m, side, q.out, q.inn);
        broadcast(true);
      }),
      net.on("o:rdy", (p) => {
        h.ready.add((p as { uid: string }).uid);
        if (members.every((x) => h.ready.has(x.uid))) startSecond();
      }),
    );
    broadcast(true);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(h.waitTimer);
      window.clearTimeout(h.halfTimer);
      offs.forEach((f) => f());
    };
    // a partida é criada uma única vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------- convidado
  useEffect(() => {
    if (isHost) return;
    lastMsg.current = Date.now();
    const offs: (() => void)[] = [];
    offs.push(
      net.on("o:st", (p) => {
        lastMsg.current = Date.now();
        const s = p as StMsg;
        setView((v) => {
          const log = s.logFrom === 0 ? s.logDelta : [...v.log.slice(0, s.logFrom), ...s.logDelta];
          return { ...v, ...s, log, lineups: s.lineups ?? v.lineups };
        });
        if (s.phase !== "play") setReadySent(false);
        if (s.waiting === null) setMoment(null);
      }),
      net.on("o:ch", (p) => {
        const q = p as { to: string; chance: Chance; scene: Scene };
        if (q.to === myUid) setMoment({ chance: q.chance, scene: q.scene });
      }),
    );
    const t = window.setInterval(() => {
      if (Date.now() - lastMsg.current > 25_000) setLost(true);
    }, 2000);
    return () => {
      offs.forEach((f) => f());
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remoteEngine = useMemo<MomentEngine>(() => {
    let n = 0;
    const request = (body: Record<string, unknown>, fallback: Outcome) =>
      new Promise<Outcome>((resolve) => {
        const rid = ++n;
        const off = net.on("o:rs", (p) => {
          const q = p as { rid: number; outcome: Outcome };
          if (q.rid !== rid) return;
          off();
          window.clearTimeout(to);
          resolve(q.outcome);
        });
        const to = window.setTimeout(() => {
          off();
          resolve(fallback);
        }, 12_000);
        net.send("o:rq", { rid, uid: myUid, ...body });
      });
    return {
      pass: (c, line) => request({ k: "pass", chance: c, line }, { kind: "saved", goal: false, text: "Passe certo!" }),
      shot: (c, aim, opts) => request({ k: "shot", chance: c, aim, opts }, { kind: "miss", goal: false, text: "A conexão falhou e a bola foi para fora." }),
      finish: (c, o) => net.send("o:fin", { uid: myUid, chance: c, outcome: o }),
      auto: (c) => net.send("o:auto", { uid: myUid, chance: c }),
    };
  }, [net, myUid]);

  const engine: MomentEngine | null = useMemo(() => (isHost && match ? localEngine(match) : isHost ? null : remoteEngine), [isHost, remoteEngine, match]);

  function momentDone() {
    if (isHost) {
      // o anfitrião continua a partida
      const h = host.current;
      window.clearTimeout(h.waitTimer);
      h.waitChance = null;
      h.waiting = null;
      h.phase = "play";
      setMoment(null);
      const m = match;
      if (m && m.min >= 90) {
        finish(m);
        h.phase = "end";
        const msg: StMsg = { min: m.min, half: m.half, score: [m.score[0], m.score[1]], stats: m.stats, phase: "end", goals: [...m.goals], subsLeft: [m.subsLeft[0], m.subsLeft[1]], lineups: null, waiting: null, logDelta: m.log.slice(h.sentLog), logFrom: h.sentLog };
        h.sentLog = m.log.length;
        net.send("o:st", msg);
        setView((v) => ({ ...v, ...msg, log: m.log.slice() }));
      } else if (m) {
        const msg: StMsg = { min: m.min, half: m.half, score: [m.score[0], m.score[1]], stats: m.stats, phase: "play", goals: [...m.goals], subsLeft: [m.subsLeft[0], m.subsLeft[1]], lineups: null, waiting: null, logDelta: m.log.slice(h.sentLog), logFrom: h.sentLog };
        h.sentLog = m.log.length;
        net.send("o:st", msg);
        setView((v) => ({ ...v, ...msg, log: m.log.slice() }));
      }
    } else setMoment(null);
  }

  const names: [string, string] = [teams[0].name, teams[1].name];
  const myLineup = (isHost ? match?.lineups[mySide] : view.lineups?.[mySide]) ?? null;

  function result(): Omit<MatchResult, "secs"> {
    const goalsFor = view.score[mySide];
    const goalsAgainst = view.score[1 - mySide];
    const mine = new Map<string, { name: string; goals: number; assists: number; own: number }>();
    for (const g of view.goals) {
      if (g.side !== mySide) continue;
      const s = mine.get(g.scorer) ?? { name: g.scorer, goals: 0, assists: 0, own: 0 };
      s.goals++;
      mine.set(g.scorer, s);
      if (g.assist) {
        const t = mine.get(g.assist) ?? { name: g.assist, goals: 0, assists: 0, own: 0 };
        t.assists++;
        mine.set(g.assist, t);
      }
    }
    return {
      mode: modeLabel,
      level: "online",
      goalsFor,
      goalsAgainst,
      result: goalsFor > goalsAgainst ? "win" : goalsFor < goalsAgainst ? "loss" : "draw",
      scorers: view.goals.map((g) => ({ team: (g.side === mySide ? 0 : 1) as 0 | 1, name: g.scorer, at: g.min * 60, assist: g.assist })),
      mine: [...mine.values()],
    };
  }

  const head = (
    <section className="card p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 font-black">
          <KitChip t={{ ...teams[0], ...kit0 }} size={26} />
          <span className={`truncate ${mySide === 0 ? "text-emerald-400" : ""}`}>{teamLabel(names[0])}</span>
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-lg bg-black/70 px-2.5 py-1 text-xl font-black tabular-nums text-white">
          {view.score[0]} - {view.score[1]}
        </span>
        <span className="flex min-w-0 items-center gap-2 font-black">
          <span className={`truncate ${mySide === 1 ? "text-emerald-400" : ""}`}>{teamLabel(names[1])}</span>
          <KitChip t={{ ...teams[1], ...kit1 }} size={26} />
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(100, (view.min / 90) * 100)}%` }} />
      </div>
      <p className="mt-1 text-center text-xs font-black tabular-nums text-[var(--muted)]">
        {view.min}&apos; · {view.half === 1 ? "1º tempo" : "2º tempo"}
      </p>
    </section>
  );

  if (lost) {
    return (
      <div className="space-y-3 pes-fs">
        {head}
        <section className="card p-4 text-center">
          <p className="text-lg font-black">Conexão perdida</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Não chegou mais nada da partida. O anfitrião pode ter saído.</p>
        </section>
        <button type="button" className="btn btn-ghost w-full" onClick={onExit}>
          ← Sair
        </button>
      </div>
    );
  }

  if (moment && engine) {
    return <MomentView engine={engine} score={view.score} chance={moment.chance} scene={moment.scene} kits={kits} names={names} onDone={momentDone} />;
  }

  if (view.phase === "end") {
    const r = result();
    const title = r.result === "win" ? "🏆 Vitória!" : r.result === "loss" ? "😕 Derrota" : "🤝 Empate";
    return (
      <div className="space-y-3 pes-fs">
        {head}
        <section className="card p-4 text-center">
          <p className="text-2xl font-black">{title}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Fim de jogo: {view.score[0]} x {view.score[1]}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-left text-xs">
            {([0, 1] as const).map((s) => (
              <div key={s} className={s === 1 ? "text-right" : ""}>
                <p className="font-black">{names[s]}</p>
                {view.goals.filter((g) => g.side === s).length ? view.goals.filter((g) => g.side === s).map((g, i) => <p key={i}>⚽ {g.scorer} {g.min}&apos;</p>) : <p className="text-[var(--muted)]">Sem gols</p>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Finalizações: {view.stats.shots[0]} x {view.stats.shots[1]} · No alvo: {view.stats.onTarget[0]} x {view.stats.onTarget[1]}
          </p>
        </section>
        <button
          type="button"
          className="btn btn-primary w-full !py-3 text-lg"
          onClick={() => {
            onFinish({ ...result(), secs: Math.max(10, Math.min(1800, Math.round((Date.now() - startedAt) / 1000))) });
            onExit();
          }}
        >
          Continuar
        </button>
      </div>
    );
  }

  if (view.phase === "half") {
    return (
      <div className="space-y-3 pes-fs">
        {head}
        <p className="text-center text-lg font-black">⏸️ Intervalo</p>
        {myLineup ? (
          <TacticsPanel
            kit={kits[mySide]}
            lineup={myLineup}
            subsLeft={view.subsLeft[mySide]}
            onChange={(l) => {
              const formation = l.formation !== myLineup.formation ? l.formation : undefined;
              const mentality = l.mentality !== myLineup.mentality ? l.mentality : undefined;
              if (isHost) {
                const m = match;
                if (!m) return;
                setTactics(m, mySide, { formation, mentality });
                const h = host.current;
                const msg: StMsg = { ...view, logDelta: [], logFrom: h.sentLog, lineups: [m.lineups[0], m.lineups[1]], phase: "half" };
                net.send("o:st", { ...msg, logDelta: [], logFrom: h.sentLog });
                setView((v) => ({ ...v, lineups: [m.lineups[0], m.lineups[1]] }));
              } else net.send("o:tac", { uid: myUid, formation, mentality });
            }}
            onSub={(o, i) => {
              if (isHost) {
                const m = match;
                if (!m) return;
                substitute(m, mySide, o, i);
                const h = host.current;
                net.send("o:st", { ...view, logDelta: m.log.slice(h.sentLog), logFrom: h.sentLog, lineups: [m.lineups[0], m.lineups[1]], subsLeft: [m.subsLeft[0], m.subsLeft[1]], phase: "half" });
                h.sentLog = m.log.length;
                setView((v) => ({ ...v, lineups: [m.lineups[0], m.lineups[1]], subsLeft: [m.subsLeft[0], m.subsLeft[1]], log: m.log.slice() }));
              } else net.send("o:sub", { uid: myUid, out: o, inn: i });
            }}
          />
        ) : null}
        <button
          type="button"
          disabled={readySent}
          className="btn btn-primary w-full !py-3 text-lg disabled:opacity-60"
          onClick={() => {
            setReadySent(true);
            if (isHost) {
              const h = host.current;
              h.ready.add(myUid);
              if (members.every((x) => h.ready.has(x.uid))) {
                window.clearTimeout(h.halfTimer);
                h.phase = "play";
                const m = match;
                if (m) {
                  net.send("o:st", { ...view, phase: "play", logDelta: [], logFrom: h.sentLog, lineups: [m.lineups[0], m.lineups[1]] });
                  setView((v) => ({ ...v, phase: "play" }));
                }
              }
            } else net.send("o:rdy", { uid: myUid });
          }}
        >
          {readySent ? "Aguardando os outros jogadores…" : "▶️ Segundo tempo"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pes-fs">
      {head}
      {view.waiting ? (
        <div className="card animate-pulse p-3 text-center text-sm font-black text-amber-400">⚡ {view.waiting} está jogando o lance…</div>
      ) : null}
      <section className="card p-2">
        <ul className="max-h-[56vh] space-y-1 overflow-y-auto sb-pitch pr-1">
          {[...view.log].reverse().slice(0, 60).map((e, i) => (
            <li key={`${view.log.length - i}`} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${e.big ? "bg-amber-400/20 font-black" : ""}`}>
              <span className="w-8 shrink-0 text-right text-xs font-black tabular-nums text-[var(--muted)]">{e.min}&apos;</span>
              <LogAvatar photo={e.photo} big={e.big} />
                <span aria-hidden>{e.icon}</span>
              <span className={e.side === (1 - mySide) ? "text-rose-400" : ""}>{e.text}</span>
            </li>
          ))}
        </ul>
      </section>
      <button type="button" className="btn btn-ghost w-full text-xs" onClick={onExit}>
        Sair da partida
      </button>
    </div>
  );
}
