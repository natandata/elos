"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bestFormation, createMatch, finish, pickLineup, resultOf, setTactics, simulateAll, stepMinute, substitute, toPlayer, type Chance, type Lineup, type Match } from "@/lib/arenasoccer/sim";
import { buildScene } from "@/lib/arenasoccer/scene";
import { kitOf, resolveKits, type RosterPlayer, type Team } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "./ArenaSoccerGame";
import { TacticsPanel } from "./match/Lineup";
import { KitChip } from "./match/KitChip";
import { MomentView } from "./match/MomentView";

type Phase = "lineup" | "play" | "chance" | "half" | "end";
const speeds = [{ label: "1x", ms: 380 }, { label: "2x", ms: 170 }, { label: "⏩", ms: 45 }];

/**
 * Uma partida no estilo Brasfoot com lances decisivos: escalação e tática, jogo minuto a minuto, intervalo com trocas
 * e, quando o seu time cria uma chance, o lance para você jogar com o dedo. O lado 0 é sempre o seu time.
 */
export function MatchFlow({ mine, opp, label, onDone, onSim, onBack }: { mine: Team; opp: Team; label: string; onDone: (r: MatchResult) => void; onSim?: () => void; onBack: () => void }) {
  const mySquad = useMemo(() => mine.players.map((p) => toPlayer(p as RosterPlayer)), [mine]);
  const oppSquad = useMemo(() => opp.players.map((p) => toPlayer(p as RosterPlayer)), [opp]);
  const [kitMine, kitOpp] = useMemo(() => resolveKits(kitOf(mine), kitOf(opp)), [mine, opp]);
  const [phase, setPhase] = useState<Phase>("lineup");
  const [pre, setPre] = useState(() => pickLineup(mySquad, bestFormation(mySquad)));
  const [match, setMatch] = useState<Match | null>(null);
  const [, bump] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tactics, setTacticsOpen] = useState(false);
  const [pending, setPending] = useState<Chance | null>(null);
  const [momentOn, setMomentOn] = useState(false);
  const startedAt = useRef(0);

  function start() {
    const seed = Math.floor(Math.random() * 1e9);
    const oppLineup = pickLineup(oppSquad, bestFormation(oppSquad));
    const m = createMatch([pre, oppLineup], seed, 0);
    startedAt.current = Date.now();
    setMatch(m);
    setPhase("play");
  }

  function result(m: Match): MatchResult {
    const r = resultOf(m);
    return { mode: "4v4", level: "normal", secs: Math.max(10, Math.min(1800, Math.round((Date.now() - startedAt.current) / 1000))), ...r };
  }

  function endMatch(m: Match) {
    finish(m);
    setPhase("end");
  }

  // relógio da partida: um minuto por tique
  useEffect(() => {
    if (phase !== "play" || !match || paused || tactics) return;
    const id = window.setInterval(() => {
      const r = stepMinute(match);
      if (r.chance) {
        setPending(r.chance);
        setMomentOn(false);
        setPhase("chance");
      } else if (r.ended === "half") setPhase("half");
      else if (match.min >= 90) {
        finish(match);
        setPhase("end");
      }
      bump((n) => n + 1);
    }, speeds[speed].ms);
    return () => window.clearInterval(id);
  }, [phase, match, paused, tactics, speed]);

  // vinheta de "chance" antes de abrir o lance
  useEffect(() => {
    if (phase !== "chance") return;
    const id = window.setTimeout(() => setMomentOn(true), 1100);
    return () => window.clearTimeout(id);
  }, [phase, pending]);

  const scene = useMemo(() => (match && pending ? buildScene(match, pending) : null), [match, pending]);

  function afterChance() {
    if (!match) return;
    setPending(null);
    setMomentOn(false);
    if (match.min >= 90) endMatch(match);
    else setPhase("play");
    bump((n) => n + 1);
  }

  function liveTactics(m: Match) {
    return (
      <TacticsPanel
        lineup={m.lineups[0]}
        subsLeft={m.subsLeft[0]}
        onChange={(l: Lineup) => {
          setTactics(m, 0, { formation: l.formation !== m.lineups[0].formation ? l.formation : undefined, mentality: l.mentality });
          bump((n) => n + 1);
        }}
        onSub={(o, i) => {
          substitute(m, 0, o, i);
          bump((n) => n + 1);
        }}
      />
    );
  }

  const head = (m: Match | null) => (
    <section className="card p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 font-black">
          <KitChip t={kitMine} size={26} />
          <span className="truncate">{mine.name}</span>
        </span>
        <span className="rounded-lg bg-black/70 px-3 py-1 text-xl font-black tabular-nums text-white">{m ? `${m.score[0]} - ${m.score[1]}` : "x"}</span>
        <span className="flex min-w-0 items-center gap-2 font-black">
          <span className="truncate">{opp.name}</span>
          <KitChip t={kitOpp} size={26} />
        </span>
      </div>
      {m ? (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(100, (m.min / 90) * 100)}%` }} />
          </div>
          <p className="mt-1 text-center text-xs font-black tabular-nums text-[var(--muted)]">
            {m.min}&apos; · {m.half === 1 ? "1º tempo" : "2º tempo"}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-center text-xs text-[var(--muted)]">
          Força {mine.str} contra {opp.str}
        </p>
      )}
    </section>
  );

  if (phase === "lineup") {
    return (
      <div className="space-y-3">
        {head(null)}
        <TacticsPanel lineup={pre} onChange={setPre} />
        <button type="button" className="btn btn-primary w-full !py-3 text-lg" onClick={start}>
          ⚽ Começar a partida
        </button>
        {onSim ? (
          <button type="button" className="btn btn-ghost w-full" onClick={onSim}>
            ⏩ Simular esta partida
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost w-full" onClick={onBack}>
          ← Voltar
        </button>
      </div>
    );
  }
  if (!match) return null;

  if (phase === "chance" && pending) {
    if (!momentOn || !scene) {
      return (
        <div className="space-y-3">
          {head(match)}
          <div className="card grid place-items-center p-10 text-center">
            <p className="animate-pulse text-5xl font-black text-amber-400">{pending.side === 0 ? "⚡ CHANCE!" : "⚠️ PERIGO!"}</p>
            <p className="mt-2 text-sm font-bold text-[var(--muted)]">{pending.min}&apos; · prepare o dedo</p>
          </div>
        </div>
      );
    }
    return <MomentView match={match} chance={pending} scene={scene} kits={[kitMine, kitOpp]} names={[mine.name, opp.name]} onDone={afterChance} />;
  }

  if (phase === "half") {
    return (
      <div className="space-y-3">
        {head(match)}
        <p className="text-center text-lg font-black">⏸️ Intervalo</p>
        {liveTactics(match)}
        <button type="button" className="btn btn-primary w-full !py-3 text-lg" onClick={() => setPhase("play")}>
          ▶️ Segundo tempo
        </button>
      </div>
    );
  }

  if (phase === "end") {
    const r = resultOf(match);
    const title = r.result === "win" ? "🏆 Vitória!" : r.result === "loss" ? "😕 Derrota" : "🤝 Empate";
    const goalsMine = match.goals.filter((g) => g.side === 0);
    const goalsOpp = match.goals.filter((g) => g.side === 1);
    return (
      <div className="space-y-3">
        {head(match)}
        <section className="card p-4 text-center">
          <p className="text-2xl font-black">{title}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Fim de jogo: {match.score[0]} x {match.score[1]}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-left text-xs">
            <div>
              <p className="font-black">{mine.name}</p>
              {goalsMine.length ? goalsMine.map((g, i) => <p key={i}>⚽ {g.scorer} {g.min}&apos;</p>) : <p className="text-[var(--muted)]">Sem gols</p>}
            </div>
            <div className="text-right">
              <p className="font-black">{opp.name}</p>
              {goalsOpp.length ? goalsOpp.map((g, i) => <p key={i}>{g.scorer} {g.min}&apos; ⚽</p>) : <p className="text-[var(--muted)]">Sem gols</p>}
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Finalizações: {match.stats.shots[0]} x {match.stats.shots[1]} · No alvo: {match.stats.onTarget[0]} x {match.stats.onTarget[1]}
          </p>
        </section>
        <button type="button" className="btn btn-primary w-full !py-3 text-lg" onClick={() => onDone(result(match))}>
          Continuar
        </button>
      </div>
    );
  }

  // jogo rolando
  return (
    <div className="space-y-3">
      {head(match)}
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost !px-3" onClick={() => setPaused((p) => !p)}>
          {paused ? "▶️" : "⏸️"}
        </button>
        {speeds.map((s, i) => (
          <button key={s.label} type="button" onClick={() => setSpeed(i)} className={`rounded-full px-3 py-1.5 text-xs font-black ${speed === i ? "bg-emerald-500 text-white" : "bg-[var(--bg)]"}`}>
            {s.label}
          </button>
        ))}
        <button type="button" className="btn btn-ghost ml-auto !px-3 text-xs" onClick={() => setTacticsOpen(true)}>
          📋 Tática
        </button>
      </div>
      {tactics ? (
        <div className="space-y-3">
          {liveTactics(match)}
          <button type="button" className="btn btn-primary w-full" onClick={() => setTacticsOpen(false)}>
            ▶️ Voltar ao jogo
          </button>
        </div>
      ) : (
        <section className="card p-2">
          <ul className="max-h-[52vh] space-y-1 overflow-y-auto">
            {[...match.log].reverse().slice(0, 60).map((e, i) => (
              <li key={`${match.log.length - i}`} className={`flex gap-2 rounded-lg px-2 py-1.5 text-sm ${e.big ? "bg-amber-400/20 font-black" : ""}`}>
                <span className="w-8 shrink-0 text-right text-xs font-black tabular-nums text-[var(--muted)]">{e.min}&apos;</span>
                <span aria-hidden>{e.icon}</span>
                <span className={e.side === 1 ? "text-rose-400" : ""}>{e.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button
        type="button"
        className="btn btn-ghost w-full text-xs"
        onClick={() => {
          simulateAll(match);
          endMatch(match);
          bump((n) => n + 1);
        }}
      >
        ⏩ Simular o resto da partida
      </button>
    </div>
  );
}
