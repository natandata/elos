"use client";

import { useMemo } from "react";
import { bestFormation, pickLineup, ratings, toPlayer } from "@/lib/arenasoccer/sim";
import { LEAGUES, type RosterPlayer, type Team } from "@/lib/arenasoccer/teams";
import { CompBadge } from "./CompBadge";
import { KitChip } from "./KitChip";

export type CompKey = "br" | "en" | "es" | "fr" | "cup";
export const COMPS: { key: CompKey; label: string; short: string }[] = [
  ...LEAGUES.map((l) => ({ key: l.key as CompKey, label: l.short, short: l.short })),
  { key: "cup", label: "Copa do Mundo 2026", short: "Copa 2026" },
];

const POS_LABEL: Record<string, string> = { GK: "GOL", DF: "ZAG", MF: "MEI", FW: "ATA" };
const POS_COLOR: Record<string, string> = { GK: "#f59e0b", DF: "#38bdf8", MF: "#34d399", FW: "#fb7185" };

/** Título com cara de menu de videogame. */
export function PesTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-3 flex items-end gap-3">
      <span className="h-10 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">{kicker}</p>
        <p className="pes-title text-2xl leading-tight">{title}</p>
      </div>
    </div>
  );
}

/** Abas das competições, inclinadas, com o logo de cada uma. */
export function CompTabs({ value, onChange }: { value: CompKey; onChange: (k: CompKey) => void }) {
  return (
    <div className="pes-scroll-x -mx-1 flex gap-2 px-1 pb-2 pt-1">
      {COMPS.map((c) => {
        const on = value === c.key;
        return (
          <button key={c.key} type="button" onClick={() => onChange(c.key)} className={`pes-tab shrink-0 rounded-md px-4 py-2 text-xs font-black uppercase tracking-wide ${on ? "bg-gradient-to-r from-emerald-400 to-emerald-600 text-[#04200f] shadow-[0_0_18px_rgba(52,211,153,0.55)]" : "bg-white/10 text-white/85 hover:bg-white/15"}`}>
            <span className="flex items-center gap-2">
              <CompBadge kind={c.key === "cup" ? "cup" : "league"} id={c.key} label="" size={20} />
              {c.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Grade de cartões dos times: escudo grande, nome e força, com a cor do uniforme. */
export function TeamGrid({ teams, selectedId, onSelect }: { teams: Team[]; selectedId: string | null; onSelect: (t: Team) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {teams.map((t) => {
        const on = t.id === selectedId;
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t)}
              className={`pes-card pes-cut relative flex w-full flex-col gap-1.5 px-3 pb-2.5 pt-2 text-left ${on ? "brightness-125" : ""}`}
              style={{ background: `linear-gradient(120deg, ${t.p}${on ? "88" : "44"} 0%, rgba(8,16,36,0.92) 62%)`, borderLeft: `${on ? 7 : 4}px solid ${t.p}`, boxShadow: on ? `inset 0 0 0 1px ${t.p}aa` : undefined }}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center">
                  <KitChip t={t} size={42} />
                </span>
                <span className="text-right leading-none">
                  <b className="pes-title block text-[24px] tabular-nums text-amber-300">{t.str}</b>
                  <small className="text-[9px] font-black uppercase tracking-widest text-white/55">força</small>
                </span>
              </span>
              <span className="line-clamp-2 block min-h-[2.1em] text-[12px] font-black uppercase leading-tight tracking-wide">{t.name}</span>
              <span className="block h-1 overflow-hidden rounded-full bg-white/10">
                <i className="block h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(10, Math.min(100, (t.str - 55) * 3))}%` }} />
              </span>
              {on ? <span className="absolute left-1.5 top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-[11px] font-black text-[#04200f] shadow-[0_0_10px_rgba(52,211,153,0.8)]">✓</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function sectors(team: Team): { att: number; mid: number; def: number; gk: number } {
  const squad = team.players.map((p) => toPlayer(p as RosterPlayer));
  return ratings(pickLineup(squad, bestFormation(squad)));
}

/** Ficha do time escolhido: escudo grande, força, setores e os craques. */
export function TeamHero({ team, label = "seu time" }: { team: Team; label?: string }) {
  const r = useMemo(() => sectors(team), [team]);
  const stars = useMemo(() => [...team.players].sort((a, b) => b[3] - a[3]).slice(0, 3), [team]);
  const bars: [string, number][] = [["ATA", r.att], ["MEI", r.mid], ["DEF", r.def], ["GOL", r.gk]];
  return (
    <div key={team.id} className="pes-in pes-cut-lg relative overflow-hidden" style={{ background: `linear-gradient(110deg, ${team.p} 0 34%, ${team.s} 34% 37%, rgba(7,14,32,0.96) 37%)` }}>
      <div className="flex items-stretch gap-3 p-3">
        <div className="grid w-[30%] shrink-0 place-items-center" style={{ ["--glow" as string]: "rgba(255,255,255,0.55)" }}>
          <span className="pes-glow">
            <KitChip t={team} size={84} />
          </span>
        </div>
        <div className="min-w-0 flex-1 pl-1">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">{label}</p>
          <p className="pes-title truncate text-xl leading-tight">{team.name}</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {bars.map(([l, v]) => (
              <span key={l} className="rounded bg-white/8 px-1 py-1 text-center">
                <b className="pes-title block text-lg leading-none tabular-nums">{Math.round(v)}</b>
                <small className="text-[9px] font-black tracking-widest text-white/60">{l}</small>
              </span>
            ))}
          </div>
          <ul className="mt-2 space-y-0.5">
            {stars.map((p) => (
              <li key={p[0] + p[2]} className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="w-8 rounded-sm px-1 text-center text-[9px] font-black text-[#04120a]" style={{ background: POS_COLOR[p[1]] }}>
                  {POS_LABEL[p[1]]}
                </span>
                <span className="min-w-0 flex-1 truncate">{p[2]}</span>
                <b className="tabular-nums text-amber-300">{p[3]}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0 self-start text-right leading-none">
          <b className="pes-title block text-4xl tabular-nums text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.55)]">{team.str}</b>
          <small className="text-[9px] font-black uppercase tracking-widest text-white/60">força</small>
        </div>
      </div>
    </div>
  );
}

/** Tela de confronto: os dois escudos frente a frente, cada lado com a cor do uniforme. */
export function Versus({ mine, opp }: { mine: Team; opp: Team }) {
  return (
    <div className="pes-in pes-cut-lg relative overflow-hidden" style={{ background: `linear-gradient(100deg, ${mine.p} 0 48%, rgba(5,10,24,0.98) 48% 52%, ${opp.p} 52%)` }}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/55" aria-hidden />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-4">
        <div className="flex flex-col items-center text-center">
          <span className="pes-glow" style={{ ["--glow" as string]: "rgba(255,255,255,0.5)" }}>
            <KitChip t={mine} size={72} />
          </span>
          <p className="pes-title mt-1 max-w-full truncate text-sm">{mine.name}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80">força {mine.str}</p>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-white/80 bg-[#050a18] shadow-[0_0_22px_rgba(255,255,255,0.45)]">
          <b className="pes-title text-xl">VS</b>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="pes-glow" style={{ ["--glow" as string]: "rgba(255,255,255,0.5)" }}>
            <KitChip t={opp} size={72} />
          </span>
          <p className="pes-title mt-1 max-w-full truncate text-sm">{opp.name}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80">força {opp.str}</p>
        </div>
      </div>
    </div>
  );
}
