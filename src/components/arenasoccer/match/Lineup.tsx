"use client";

import { useMemo, useState } from "react";
import { FORMATIONS, MENTALITIES, pickLineup, ratings, type Formation, type Lineup, type Mentality, type Player } from "@/lib/arenasoccer/sim";
import { shortName, type Kit } from "@/lib/arenasoccer/teams";
import { FormationPitch, StartersList } from "./FormationPitch";

const NEUTRAL_KIT: Kit = { p: "#2563eb", s: "#ffffff", k: "solid" };

const POS_COLOR: Record<string, string> = { GK: "bg-amber-500", DF: "bg-sky-500", MF: "bg-emerald-500", FW: "bg-rose-500" };
const POS_ROWS: { pos: Player["pos"]; label: string }[] = [
  { pos: "FW", label: "Ataque" },
  { pos: "MF", label: "Meio" },
  { pos: "DF", label: "Defesa" },
  { pos: "GK", label: "Gol" },
];

/** Troca livre entre um titular e um reserva (antes da partida). */
export function swapPlayers(l: Lineup, xiIdx: number, benchIdx: number): Lineup {
  const out = l.xi[xiIdx];
  const inn = l.bench[benchIdx];
  if (!out || !inn) return l;
  const xi = [...l.xi];
  const bench = [...l.bench];
  xi[xiIdx] = { ...inn, pos: out.pos, ovr: out.pos === inn.pos ? inn.ovr : Math.max(40, inn.ovr - 7) };
  bench[benchIdx] = out;
  return { ...l, xi, bench };
}

export function withFormation(l: Lineup, f: Formation, keep?: string): Lineup {
  const all = [...l.xi, ...l.bench];
  return pickLineup(all, f, l.mentality, keep ? all.filter((p) => p.name === keep) : []);
}

export function Chip({ p, on, onClick, dim }: { p: Player; on?: boolean; onClick?: () => void; dim?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left ${on ? "bg-amber-400/25 ring-2 ring-amber-400" : "bg-[var(--bg)]"} ${dim ? "opacity-60" : ""}`}>
      <span className={`rounded px-1 text-[10px] font-black text-white ${POS_COLOR[p.pos]}`}>{p.pos}</span>
      <span className="min-w-0 flex-1 truncate text-xs font-bold">{shortName(p.name)}</span>
      <span className="text-xs font-black tabular-nums text-[var(--muted)]">{p.ovr}</span>
    </button>
  );
}

/**
 * Formação, mentalidade e escalação. Antes do jogo as trocas são livres; durante o jogo (`subsLeft`) valem as 3 substituições.
 */
export function TacticsPanel({ lineup, onChange, subsLeft, onSub, keep, kit = NEUTRAL_KIT }: { lineup: Lineup; onChange: (l: Lineup) => void; subsLeft?: number; onSub?: (xiIdx: number, benchIdx: number) => void; /** jogador que não pode sair do time (o da carreira) */ keep?: string; /** camisa do seu time (para o campo) */ kit?: Kit }) {
  const [sel, setSel] = useState<number | null>(null);
  const r = useMemo(() => ratings(lineup), [lineup]);
  const live = subsLeft !== undefined;
  const bar = (label: string, v: number) => (
    <div className="flex items-center gap-2 text-[11px] font-bold">
      <span className="w-14 text-[var(--muted)]">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(5, Math.min(100, (v - 40) * 2))}%` }} />
      </div>
      <span className="w-7 text-right tabular-nums">{Math.round(v)}</span>
    </div>
  );
  return (
    <div className="space-y-3">
      <section className="card p-3">
        <p className="text-sm font-black">📋 Formação</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(FORMATIONS) as Formation[]).map((f) => (
            <button key={f} type="button" onClick={() => onChange(withFormation(lineup, f, keep))} className={`rounded-full px-3 py-1.5 text-xs font-black ${lineup.formation === f ? "bg-emerald-500 text-white" : "bg-[var(--bg)]"}`}>
              {f}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm font-black">🎯 Mentalidade</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(Object.keys(MENTALITIES) as Mentality[]).map((m) => (
            <button key={m} type="button" onClick={() => onChange({ ...lineup, mentality: m })} className={`rounded-xl px-2 py-2 text-xs font-black ${lineup.mentality === m ? "bg-amber-400 text-black" : "bg-[var(--bg)]"}`}>
              {MENTALITIES[m].label}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {bar("Ataque", r.att)}
          {bar("Meio", r.mid)}
          {bar("Defesa", r.def)}
          {bar("Goleiro", r.gk)}
        </div>
      </section>

      <section className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="pes-title text-base">Escalação</p>
          {live ? <p className="text-xs font-black text-[var(--muted)]">Trocas restantes: {subsLeft}</p> : <p className="text-[11px] font-bold text-[var(--muted)]">Toque num titular e depois num reserva</p>}
        </div>
        <div className="grid gap-3">
          <FormationPitch lineup={lineup} kit={kit} selected={sel} onSelect={(i) => setSel(sel === i ? null : i)} />
          <StartersList lineup={lineup} kit={kit} selected={sel} onSelect={(i) => setSel(sel === i ? null : i)} />
        </div>
      </section>

      <section className="card p-3">
        <p className="text-sm font-black">Reservas</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {lineup.bench.map((p, j) => (
            <Chip
              key={p.name + j}
              p={p}
              dim={sel === null || (live && (subsLeft ?? 0) <= 0)}
              onClick={() => {
                if (sel === null) return;
                if (keep && lineup.xi[sel]?.name === keep) return;
                if (live) {
                  if ((subsLeft ?? 0) <= 0) return;
                  onSub?.(sel, j);
                } else onChange(swapPlayers(lineup, sel, j));
                setSel(null);
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
