"use client";

import { useState } from "react";
import { FORMATIONS, type Formation, type Lineup, type Player } from "@/lib/arenasoccer/sim";
import { shortName, type Kit } from "@/lib/arenasoccer/teams";

export type PitchSlot = { pos: Player["pos"]; label: string; x: number; y: number };

const ROW: Record<number, number[]> = { 1: [50], 2: [34, 66], 3: [22, 50, 78], 4: [13, 38, 62, 87], 5: [10, 30, 50, 70, 90] };
const DF_LABELS: Record<number, string[]> = { 3: ["CB", "CB", "CB"], 4: ["LB", "CB", "CB", "RB"], 5: ["LB", "CB", "CB", "CB", "RB"] };

/** Onde cada posição fica no campo (em %), do goleiro ao ataque, na mesma ordem dos titulares. */
export function slotsFor(f: Formation): PitchSlot[] {
  const { df, mf, fw } = FORMATIONS[f];
  const out: PitchSlot[] = [{ pos: "GK", label: "GK", x: 50, y: 89 }];
  ROW[df].forEach((x, i) => out.push({ pos: "DF", label: DF_LABELS[df][i], x, y: df === 5 ? 71 : 72 }));
  if (f === "4-2-3-1") {
    out.push({ pos: "MF", label: "DMF", x: 36, y: 57 }, { pos: "MF", label: "DMF", x: 64, y: 57 });
    out.push({ pos: "MF", label: "LMF", x: 18, y: 40 }, { pos: "MF", label: "AMF", x: 50, y: 40 }, { pos: "MF", label: "RMF", x: 82, y: 40 });
  } else {
    const labels = mf === 3 ? ["CMF", "DMF", "CMF"] : mf === 4 ? ["LMF", "CMF", "CMF", "RMF"] : ["LMF", "CMF", "AMF", "CMF", "RMF"];
    ROW[mf].forEach((x, i) => out.push({ pos: "MF", label: labels[i], x, y: mf === 3 ? 50 + (i === 1 ? 6 : -2) : 49 }));
  }
  const fwLabels = fw === 1 ? ["CF"] : fw === 2 ? ["CF", "SS"] : ["LWF", "CF", "RWF"];
  ROW[fw].forEach((x, i) => out.push({ pos: "FW", label: fwLabels[i], x, y: fw === 3 && i !== 1 ? 22 : 17 }));
  return out;
}

const TAG: Record<string, string> = { GK: "#f59e0b", DF: "#38bdf8", MF: "#34d399", FW: "#fb7185" };
const SKIN = ["#f1c27d", "#e0a370", "#c68642", "#8d5524", "#5c3a21"];
const HAIR = ["#1b1b1b", "#3b2a1a", "#6b4a2b", "#d8b45a", "#111"];
const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Foto do jogador; sem foto (ou se ela falhar), um busto desenhado com a camisa do time. */
export function Avatar({ name, kit, size = 40, photo }: { name: string; kit: Kit; size?: number; photo?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (photo && failed !== photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fotos pequenas, servidas de /public
      <img src={photo} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(photo)} className="rounded-full border-[1.5px] border-white/60 bg-[#0f2a4a] object-cover object-top" style={{ width: size, height: size }} />
    );
  }
  const h = hash(name);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 4) % HAIR.length];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <clipPath id={`av-${h}`}>
          <circle cx="24" cy="24" r="23" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="23" fill="#0f2a4a" />
      <g clipPath={`url(#av-${h})`}>
        <path d="M2 50c0-11 9-17 22-17s22 6 22 17z" fill={kit.p} />
        <path d="M17 34l7 6 7-6" fill="none" stroke={kit.s} strokeWidth="3" strokeLinejoin="round" />
        <rect x="20.500" y="28" width="7" height="7" rx="2" fill={skin} />
        <ellipse cx="24" cy="20" rx="8" ry="9" fill={skin} />
        <path d="M15.500 19c0-6 3.500-10 8.500-10s8.500 4 8.500 10c-2-3-5-4.500-8.500-4.500S17.500 16 15.500 19z" fill={hair} />
      </g>
      <circle cx="24" cy="24" r="23" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.600" />
    </svg>
  );
}

/**
 * Escalação no campo, no estilo dos jogos de futebol: cada titular no seu lugar da formação, com a posição, o overall e o nome.
 * Toque num jogador para escolher e depois num reserva para trocar.
 */
export function FormationPitch({ lineup, kit, selected, onSelect }: { lineup: Lineup; kit: Kit; selected: number | null; onSelect: (i: number) => void }) {
  const slots = slotsFor(lineup.formation);
  return (
    <div className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.45)]" style={{ aspectRatio: "5 / 6.2", background: "repeating-linear-gradient(180deg, #2c8a43 0 8.33%, #34a04f 8.33% 16.66%)" }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 124" preserveAspectRatio="none" aria-hidden>
        <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.55">
          <rect x="3" y="3" width="94" height="118" rx="1" />
          <path d="M3 62h94" />
          <circle cx="50" cy="62" r="10" />
          <rect x="27" y="3" width="46" height="19" />
          <rect x="39" y="3" width="22" height="7.500" />
          <rect x="27" y="102" width="46" height="19" />
          <rect x="39" y="113.500" width="22" height="7.500" />
          <path d="M40 22a10 10 0 0 0 20 0M40 102a10 10 0 0 1 20 0" />
        </g>
      </svg>
      <p className="pes-title pointer-events-none absolute left-2.5 top-1.5 text-2xl text-white/65 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{lineup.formation}</p>
      {lineup.xi.map((p, i) => {
        const s = slots[i];
        if (!s) return null;
        const on = selected === i;
        return (
          <button key={p.name + i} type="button" onClick={() => onSelect(i)} className={`absolute flex w-[20%] -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-transform ${on ? "z-10 scale-110" : "hover:scale-105"}`} style={{ left: `${s.x}%`, top: `${s.y}%` }}>
            <span className={`rounded-full ${on ? "shadow-[0_0_0_3px_#fbbf24,0_0_16px_rgba(251,191,36,0.9)]" : ""}`}>
              <Avatar name={p.name} kit={kit} size={32} photo={p.photo} />
            </span>
            <span className="mt-0.5 flex overflow-hidden rounded-[4px] text-[10px] font-black leading-none shadow-md">
              <span className="px-1 py-[3px] text-[#04120a]" style={{ background: TAG[p.pos] }}>
                {s.label}
              </span>
              <span className="bg-[#0b1630] px-1 py-[3px] tabular-nums text-white">{p.ovr}</span>
            </span>
            <span className="mt-0.5 max-w-full truncate text-[10px] font-black uppercase leading-tight tracking-wide text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{shortName(p.name)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Lista dos titulares ao lado do campo: posição, nome e overall. */
export function StartersList({ lineup, kit, selected, onSelect }: { lineup: Lineup; kit: Kit; selected: number | null; onSelect: (i: number) => void }) {
  const slots = slotsFor(lineup.formation);
  return (
    <ul className="space-y-1">
      {lineup.xi.map((p, i) => (
        <li key={p.name + i}>
          <button type="button" onClick={() => onSelect(i)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${selected === i ? "bg-amber-400/25 ring-2 ring-amber-400" : "bg-white/[0.07] hover:bg-white/[0.12]"}`}>
            <Avatar name={p.name} kit={kit} size={28} photo={p.photo} />
            <span className="w-10 rounded-[4px] py-[3px] text-center text-[10px] font-black text-[#04120a]" style={{ background: TAG[p.pos] }}>
              {slots[i]?.label ?? p.pos}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-black uppercase tracking-wide">{shortName(p.name)}</span>
            <span className="pes-title text-lg tabular-nums">{p.ovr}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
