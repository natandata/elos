"use client";

import { useEffect, useMemo, useState } from "react";
import { LEAGUES, loadCup, loadLeague, type LeagueKey, type Team } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "./ArenaSoccerGame";
import { MatchFlow } from "./ArenaSoccerMatch";
import { CompBadge } from "./match/CompBadge";
import { KitChip } from "./match/KitChip";

type CompKey = LeagueKey | "cup";
const COMPS: { key: CompKey; label: string }[] = [...LEAGUES.map((l) => ({ key: l.key as CompKey, label: l.short })), { key: "cup", label: "Copa do Mundo 2026" }];

/** Amistoso: escolha a competição e o seu time; o adversário é sorteado do mesmo grupo. */
export function QuickMatch({ onRecord, onBack }: { onRecord: (r: MatchResult) => void; onBack: () => void }) {
  const [comp, setComp] = useState<CompKey>("br");
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [mineId, setMineId] = useState<string | null>(null);
  const [oppId, setOppId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    (comp === "cup" ? loadCup(2026).then((d) => d.teams) : loadLeague(comp).then((d) => d.teams)).then((t) => {
      if (!alive) return;
      setTeams([...t].sort((a, b) => b.str - a.str));
      setMineId(null);
      setOppId(null);
    });
    return () => {
      alive = false;
    };
  }, [comp]);

  const mine = teams?.find((t) => t.id === mineId) ?? null;
  const opp = teams?.find((t) => t.id === oppId) ?? null;
  const rival = useMemo(() => (teams && mine ? teams.filter((t) => t.id !== mine.id) : []), [teams, mine]);

  function draw(t: Team) {
    const pool = teams?.filter((x) => x.id !== t.id) ?? [];
    setOppId(pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null);
  }

  if (playing && mine && opp) {
    return (
      <MatchFlow
        key={round}
        mine={mine}
        opp={opp}
        label="Amistoso"
        onBack={() => setPlaying(false)}
        onDone={(r) => {
          onRecord(r);
          setPlaying(false);
          setRound((n) => n + 1);
          draw(mine);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <section className="card p-4">
        <p className="text-lg font-black">⚽ Amistoso</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Escolha a competição e o seu time. Você monta a equipe, define a tática e joga os lances decisivos com o dedo.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {COMPS.map((c) => (
            <button key={c.key} type="button" onClick={() => setComp(c.key)} className={`rounded-full px-3 py-1.5 text-xs font-black ${comp === c.key ? "bg-emerald-500 text-white" : "bg-[var(--bg)]"}`}>
              <CompBadge kind={c.key === "cup" ? "cup" : "league"} id={c.key} label={c.label} />
            </button>
          ))}
        </div>
      </section>

      {mine && opp ? (
        <section className="card p-4 text-center">
          <p className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">Adversário sorteado</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-black">
              <KitChip t={mine} size={28} />
              {mine.name}
            </span>
            <span className="text-sm font-black text-[var(--muted)]">x</span>
            <span className="flex items-center gap-2 font-black">
              {opp.name}
              <KitChip t={opp} size={28} />
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Força {mine.str} contra {opp.str}
          </p>
          <div className="mt-3 flex gap-2">
            <select value={opp.id} onChange={(e) => setOppId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 py-2 text-sm font-bold">
              {rival.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-ghost !px-3" onClick={() => draw(mine)}>
              🎲
            </button>
          </div>
          <button type="button" className="btn btn-primary mt-3 w-full !py-3 text-lg" onClick={() => setPlaying(true)}>
            ▶ Escalar e jogar
          </button>
        </section>
      ) : null}

      <section className="card p-2">
        <p className="px-2 pb-1 text-sm font-black">Escolha o seu time</p>
        {!teams ? (
          <p className="p-3 text-sm text-[var(--muted)]">Carregando…</p>
        ) : (
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto sb-pitch pr-1">
            {teams.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setMineId(t.id);
                    draw(t);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left ${mineId === t.id ? "bg-emerald-500/20 ring-1 ring-emerald-400" : "bg-[var(--bg)]"}`}
                >
                  <KitChip t={t} size={22} />
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
