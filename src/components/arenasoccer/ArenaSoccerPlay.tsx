"use client";

import { useMemo, useState } from "react";
import { cpuLineup, arrange, autoPick, kitOf, levelFor, resolveKits, shortName, type RosterPlayer, type Team } from "@/lib/arenasoccer/teams";
import type { Level } from "@/lib/arenasoccer/engine";
import { ArenaSoccerGame, type MatchResult, type PlaySpec } from "./ArenaSoccerGame";

const POS_LABEL: Record<string, string> = { GK: "Goleiro", DF: "Defensor", MF: "Meia", FW: "Atacante" };
const POS_COLOR: Record<string, string> = { GK: "bg-amber-500/80", DF: "bg-sky-500/80", MF: "bg-emerald-500/80", FW: "bg-rose-500/80" };

export function KitChip({ t, size = 22 }: { t: Pick<Team, "p" | "s" | "k">; size?: number }) {
  const bg =
    t.k === "stripes"
      ? `repeating-linear-gradient(90deg, ${t.p} 0 ${size / 5}px, ${t.s} ${size / 5}px ${(size / 5) * 2}px)`
      : t.k === "hoops"
        ? `repeating-linear-gradient(0deg, ${t.p} 0 ${size / 5}px, ${t.s} ${size / 5}px ${(size / 5) * 2}px)`
        : t.k === "halves"
          ? `linear-gradient(90deg, ${t.p} 50%, ${t.s} 50%)`
          : t.k === "sash"
            ? `linear-gradient(135deg, ${t.p} 35%, ${t.s} 35% 65%, ${t.p} 65%)`
            : t.k === "checker"
              ? `conic-gradient(${t.p} 25%, ${t.s} 0 50%, ${t.p} 0 75%, ${t.s} 0)`
              : t.p;
  return <i className="inline-block shrink-0 rounded-full border-2 border-black/30" style={{ width: size, height: size, background: bg, backgroundSize: t.k === "checker" ? `${size / 2}px ${size / 2}px` : undefined }} aria-hidden />;
}

/** Plano de jogo: escolhe de 1 a 4 jogadores do elenco; o primeiro é o que você controla. */
function LineupPlan({ mine, opp, label, onStart, onSim, onBack }: { mine: Team; opp: Team; label: string; onStart: (picked: RosterPlayer[], ctrl: number) => void; onSim?: () => void; onBack: () => void }) {
  const [picked, setPicked] = useState<RosterPlayer[]>(() => autoPick(mine, 4));
  const [ctrl, setCtrl] = useState(0);
  const squad = useMemo(() => [...mine.players].sort((a, b) => ({ GK: 0, DF: 1, MF: 2, FW: 3 }[a[1]] ?? 9) - ({ GK: 0, DF: 1, MF: 2, FW: 3 }[b[1]] ?? 9) || b[3] - a[3]), [mine]);
  const toggle = (p: RosterPlayer) => {
    setPicked((cur) => {
      const i = cur.indexOf(p);
      if (i >= 0) {
        if (cur.length === 1) return cur;
        const next = cur.filter((x) => x !== p);
        setCtrl((c) => (c >= next.length ? 0 : c === i ? 0 : c > i ? c - 1 : c));
        return next;
      }
      return cur.length >= 4 ? cur : [...cur, p];
    });
  };
  const lineupPreview = arrange(picked, ctrl);
  return (
    <div className="space-y-3">
      <section className="card p-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">{label}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 font-black">
            <KitChip t={mine} size={26} />
            <span className="truncate">{mine.name}</span>
          </span>
          <span className="text-sm font-black text-[var(--muted)]">x</span>
          <span className="flex min-w-0 items-center gap-2 font-black">
            <span className="truncate">{opp.name}</span>
            <KitChip t={opp} size={26} />
          </span>
        </div>
        <p className="mt-1 text-center text-xs text-[var(--muted)]">Força {mine.str} contra {opp.str}</p>
      </section>

      <section className="card p-3">
        <p className="text-sm font-black">📋 Plano de jogo</p>
        <p className="text-xs text-[var(--muted)]">Escolha de 1 a 4 jogadores. O adversário joga com o mesmo número. O primeiro da lista (⭐) é o que você controla.</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }, (_, i) => {
            const s = lineupPreview[i];
            const orig = s ? picked.findIndex((p) => p[2] === s.name) : -1;
            return (
              <button key={i} type="button" disabled={!s} onClick={() => orig >= 0 && setCtrl(orig)} className={`min-h-[64px] rounded-xl border-2 p-1.5 text-center ${s ? (i === 0 ? "border-amber-400 bg-amber-400/15" : "border-[var(--line)] bg-[var(--bg)]") : "border-dashed border-[var(--line)] opacity-50"}`}>
                {s ? (
                  <>
                    <span className="block text-xs font-black">{i === 0 ? "⭐ " : ""}{s.num}</span>
                    <span className="block truncate text-[11px] font-bold">{shortName(s.name)}</span>
                    <span className="block text-[10px] text-[var(--muted)]">{POS_LABEL[s.pos] ?? s.pos} · {s.ovr}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-[var(--muted)]">vazio</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-[var(--muted)]">Toque num escalado para controlá-lo.</p>
      </section>

      <section className="card p-2">
        <div className="flex items-center justify-between px-1 pb-1">
          <p className="text-sm font-black">Elenco ({picked.length}/4)</p>
          <button type="button" className="text-xs font-black text-[var(--accent)]" onClick={() => { setPicked(autoPick(mine, 4)); setCtrl(0); }}>
            Escalação sugerida
          </button>
        </div>
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {squad.map((p) => {
            const on = picked.includes(p);
            return (
              <li key={p[0] + p[2]}>
                <button type="button" onClick={() => toggle(p)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${on ? "bg-emerald-500/20 ring-1 ring-emerald-400" : "bg-[var(--bg)]"}`}>
                  <span className="w-6 text-center text-xs font-black tabular-nums">{p[0]}</span>
                  <span className={`rounded px-1.5 text-[10px] font-black text-white ${POS_COLOR[p[1]] ?? "bg-slate-500"}`}>{p[1]}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{p[2]}</span>
                  <span className="text-xs font-black tabular-nums text-[var(--muted)]">{p[3]}</span>
                  <span aria-hidden>{on ? "✅" : "➕"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <button type="button" className="btn btn-primary w-full !py-3 text-lg" onClick={() => onStart(picked, ctrl)}>
        ⚽ Jogar
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

/**
 * Uma partida de campeonato: plano de jogo, jogo e resultado. `onDone` recebe o resultado (jogado) ou null (simulada).
 * O lado 0 é sempre o seu time.
 */
export function PlayFlow({ mine, opp, label, secs = 120, goalsToWin = 7, color, onDone, onSim, onBack }: { mine: Team; opp: Team; label: string; secs?: number; goalsToWin?: number; color: string; onDone: (r: MatchResult) => void; onSim?: () => void; onBack: () => void }) {
  const [spec, setSpec] = useState<PlaySpec | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  if (spec) {
    return <ArenaSoccerGame mode="1v1" level="normal" color={color} spec={spec} onFinish={(r) => setResult(r)} onExit={() => (result ? onDone(result) : onBack())} />;
  }
  return (
    <LineupPlan
      mine={mine}
      opp={opp}
      label={label}
      onBack={onBack}
      onSim={onSim}
      onStart={(picked, ctrl) => {
        const n = picked.length;
        const [k0, k1] = resolveKits(kitOf(mine), kitOf(opp));
        const level: Level = levelFor(mine.str, opp.str);
        setSpec({ match: { teams: [arrange(picked, ctrl), cpuLineup(opp, n)], secs, goalsToWin }, kits: [k0, k1], names: [mine.name, opp.name], level: ["normal", level], label });
      }}
    />
  );
}
