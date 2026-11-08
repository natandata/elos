"use client";

import { useEffect, useMemo, useState } from "react";
import { CUP_YEARS, LEAGUES, loadCup, loadLeague, type LeagueKey, type Team } from "@/lib/arenasoccer/teams";
import { KitChip } from "./match/KitChip";

type Source = { key: string; label: string };
const SOURCES: Source[] = [...LEAGUES.map((l) => ({ key: `league:${l.key}`, label: `${l.flag} ${l.short}` })), ...CUP_YEARS.map((y) => ({ key: `cup:${y}`, label: `🏆 Copa ${y}` }))];
const POS: { pos: string; label: string; color: string }[] = [
  { pos: "GK", label: "Goleiros", color: "bg-amber-500" },
  { pos: "DF", label: "Defensores", color: "bg-sky-500" },
  { pos: "MF", label: "Meias", color: "bg-emerald-500" },
  { pos: "FW", label: "Atacantes", color: "bg-rose-500" },
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
    const xi = [...team.players].sort((a, b) => b[3] - a[3]).slice(0, 14);
    const avg = Math.round(xi.reduce((s, p) => s + p[3], 0) / Math.max(1, xi.length));
    const star = xi[0];
    return (
      <div className="space-y-3">
        <section className="card p-4">
          <div className="flex items-center gap-3">
            <KitChip t={team} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-black">{team.name}</p>
              {team.coach ? <p className="text-xs text-[var(--muted)]">Técnico: {team.coach}</p> : null}
              <p className="text-xs text-[var(--muted)]">{team.players.length} jogadores</p>
            </div>
            <div className="text-center">
              <b className="block text-3xl font-black leading-none tabular-nums text-amber-500">{team.str}</b>
              <small className="text-[10px] font-bold uppercase text-[var(--muted)]">força</small>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <span className="rounded-xl bg-[var(--bg)] p-2">
              <b className="block text-lg font-black tabular-nums">{avg}</b>
              média dos 14 melhores
            </span>
            <span className="rounded-xl bg-[var(--bg)] p-2">
              <b className="block truncate text-lg font-black">{star ? star[2] : "-"}</b>
              craque ({star ? star[3] : "-"})
            </span>
          </div>
        </section>
        {POS.map((g) => {
          const list = team.players.filter((p) => p[1] === g.pos).sort((a, b) => b[3] - a[3]);
          if (!list.length) return null;
          return (
            <section key={g.pos} className="card p-3">
              <p className="mb-2 text-sm font-black">
                {g.label} <span className="text-xs font-bold text-[var(--muted)]">({list.length})</span>
              </p>
              <ul className="space-y-1">
                {list.map((p) => (
                  <li key={`${p[0]}-${p[2]}`} className="flex items-center gap-2 rounded-lg bg-[var(--bg)] px-2 py-1.5">
                    <span className="w-7 text-center text-xs font-black tabular-nums text-[var(--muted)]">{p[0]}</span>
                    <span className={`rounded px-1.5 text-[10px] font-black text-white ${g.color}`}>{p[1]}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{p[2]}</span>
                    <span className="w-16">
                      <i className="block h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                        <b className="block h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(8, Math.min(100, (p[3] - 45) * 2.2))}%` }} />
                      </i>
                    </span>
                    <span className="w-7 text-right text-sm font-black tabular-nums">{p[3]}</span>
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
      <section className="card p-4">
        <p className="text-lg font-black">📋 Times</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Todos os times e elencos do jogo. Toque num time para ver os jogadores e o overall de cada um.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SOURCES.map((s) => (
            <button key={s.key} type="button" onClick={() => { setSrc(s.key); setQ(""); }} className={`rounded-full px-3 py-1.5 text-xs font-black ${src === s.key ? "bg-emerald-500 text-white" : "bg-[var(--bg)]"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar time…" className="mt-3 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-bold" />
      </section>
      <section className="card p-2">
        {!teams ? (
          <p className="p-3 text-sm text-[var(--muted)]">Carregando…</p>
        ) : shown.length === 0 ? (
          <p className="p-3 text-sm text-[var(--muted)]">Nenhum time encontrado.</p>
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2">
            {shown.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setOpen(t.id)} className="flex w-full items-center gap-2 rounded-lg bg-[var(--bg)] px-2 py-2 text-left">
                  <KitChip t={t} size={24} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.name}</span>
                  <span className="text-xs font-black tabular-nums text-[var(--muted)]">{t.str}</span>
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
