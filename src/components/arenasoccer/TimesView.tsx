"use client";

import { useEffect, useMemo, useState } from "react";
import { CUP_YEARS, LEAGUES, loadCup, loadLeague, type LeagueKey, type Team } from "@/lib/arenasoccer/teams";
import { CompBadge } from "./match/CompBadge";
import { PesTitle, TeamGrid, TeamHero } from "./match/TeamSelect";

type Source = { key: string; label: string; kind: "league" | "cup"; id: string };
const SOURCES: Source[] = [...LEAGUES.map((l) => ({ key: `league:${l.key}`, label: l.short, kind: "league" as const, id: l.key })), ...CUP_YEARS.map((y) => ({ key: `cup:${y}`, label: `Copa ${y}`, kind: "cup" as const, id: String(y) }))];
const POS: { pos: string; label: string; color: string }[] = [
  { pos: "GK", label: "Goleiros", color: "#f59e0b" },
  { pos: "DF", label: "Defensores", color: "#38bdf8" },
  { pos: "MF", label: "Meias", color: "#34d399" },
  { pos: "FW", label: "Atacantes", color: "#fb7185" },
];

async function load(key: string): Promise<Team[]> {
  const [kind, id] = key.split(":");
  const teams = kind === "cup" ? (await loadCup(Number(id))).teams : (await loadLeague(id as LeagueKey)).teams;
  return [...teams].sort((a, b) => b.str - a.str);
}

/** Times: todas as competições do jogo, com o elenco de cada time (número, posição e overall) para consultar. */
export function TimesView({ onBack }: { onBack: () => void }) {
  const [src, setSrc] = useState(SOURCES[0].key);
  const [loaded, setLoaded] = useState<{ key: string; teams: Team[] } | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    void load(src).then((teams) => !stop && setLoaded({ key: src, teams }));
    return () => {
      stop = true;
    };
  }, [src]);

  const teams = loaded?.key === src ? loaded.teams : null;
  const shown = useMemo(() => (teams ?? []).filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase())), [teams, q]);
  const team = teams?.find((t) => t.id === open) ?? null;

  if (team) {
    const best = [...team.players].sort((a, b) => b[3] - a[3]).slice(0, 14);
    const avg = Math.round(best.reduce((s, p) => s + p[3], 0) / Math.max(1, best.length));
    return (
      <div className="space-y-3">
        <section className="pes-panel !p-3">
          <TeamHero team={team} label="elenco" />
          <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-widest text-white/60">
            {team.players.length} jogadores · média dos 14 melhores {avg}
            {team.coach ? ` · técnico ${team.coach}` : ""}
          </p>
        </section>
        {POS.map((g) => {
          const list = team.players.filter((p) => p[1] === g.pos).sort((a, b) => b[3] - a[3]);
          if (!list.length) return null;
          return (
            <section key={g.pos} className="pes-panel !p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase italic tracking-wider">
                <i className="h-4 w-1.5 rounded-full" style={{ background: g.color }} aria-hidden />
                {g.label} <span className="text-xs font-bold not-italic text-white/50">({list.length})</span>
              </p>
              <ul className="space-y-1">
                {list.map((p) => (
                  <li key={`${p[0]}-${p[2]}`} className="flex items-center gap-2 rounded-md bg-white/[0.07] px-2 py-1.5">
                    <span className="w-7 text-center text-xs font-black tabular-nums text-white/50">{p[0]}</span>
                    <span className="rounded-sm px-1.5 text-[10px] font-black text-[#04120a]" style={{ background: g.color }}>
                      {p[1]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{p[2]}</span>
                    <span className="w-16">
                      <i className="block h-1.5 overflow-hidden rounded-full bg-white/10">
                        <b className="block h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(8, Math.min(100, (p[3] - 45) * 2.2))}%` }} />
                      </i>
                    </span>
                    <span className="pes-title w-8 text-right text-base tabular-nums text-amber-300">{p[3]}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <button type="button" onClick={() => setOpen(null)} className="btn btn-ghost w-full">
          ← Voltar aos times
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="pes-panel">
        <PesTitle kicker="Banco de dados" title="Times e elencos" />
        <p className="mb-2 text-xs font-bold text-white/60">Toque num time para ver os jogadores e o overall de cada um.</p>
        <div className="pes-scroll-x -mx-1 flex gap-2 px-1 pb-2 pt-1">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSrc(s.key);
                setQ("");
              }}
              className={`pes-tab shrink-0 rounded-md px-4 py-2 text-xs font-black uppercase tracking-wide ${src === s.key ? "bg-gradient-to-r from-emerald-400 to-emerald-600 text-[#04200f] shadow-[0_0_18px_rgba(52,211,153,0.55)]" : "bg-white/10 text-white/85"}`}
            >
              <span>
                <CompBadge kind={s.kind} id={s.id} label={s.label} size={18} />
              </span>
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar time…" className="mt-1 w-full rounded-lg border border-white/15 bg-[#0a1226] px-3 py-2.5 text-sm font-bold text-white placeholder:text-white/40" />
      </section>
      <section className="pes-panel !p-3">
        {!teams ? (
          <p className="p-3 text-sm font-bold text-white/60">Carregando…</p>
        ) : shown.length === 0 ? (
          <p className="p-3 text-sm font-bold text-white/60">Nenhum time encontrado.</p>
        ) : (
          <TeamGrid teams={shown} selectedId={null} onSelect={(t) => setOpen(t.id)} />
        )}
      </section>
      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        ← Voltar
      </button>
    </div>
  );
}
