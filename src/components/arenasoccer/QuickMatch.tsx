"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadCup, loadLeague, type Team } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "./ArenaSoccerGame";
import { MatchFlow } from "./ArenaSoccerMatch";
import { CompTabs, PesTitle, TeamGrid, TeamHero, Versus, type CompKey } from "./match/TeamSelect";

/** Amistoso: escolha a competição e o seu time; o adversário é sorteado do mesmo grupo. */
export function QuickMatch({ onRecord, onBack }: { onRecord: (r: MatchResult) => void; onBack: () => void }) {
  const [comp, setComp] = useState<CompKey>("br");
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [mineId, setMineId] = useState<string | null>(null);
  const [oppId, setOppId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

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
      <section className="pes-panel">
        <PesTitle kicker="Amistoso" title="Escolha o seu time" />
        <CompTabs value={comp} onChange={setComp} />
        <div ref={heroRef} className="mt-2 scroll-mt-3 space-y-2">
          {mine ? <TeamHero team={mine} /> : <p className="rounded-xl border border-dashed border-white/20 p-4 text-center text-xs font-bold uppercase tracking-widest text-white/50">Toque num escudo para escolher</p>}
          {mine && opp ? (
            <>
              <Versus mine={mine} opp={opp} />
              <div className="flex gap-2">
                <select value={opp.id} onChange={(e) => setOppId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0a1226] px-2 py-2.5 text-sm font-bold text-white">
                  {rival.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button type="button" aria-label="Sortear outro adversário" className="pes-card rounded-lg bg-white/10 px-4 text-lg" onClick={() => draw(mine)}>
                  🎲
                </button>
              </div>
              <button type="button" className="pes-card pes-cut w-full bg-gradient-to-r from-emerald-400 to-emerald-600 py-3.5 text-lg font-black uppercase italic tracking-wider text-[#04200f] shadow-[0_0_22px_rgba(52,211,153,0.5)]" onClick={() => setPlaying(true)}>
                ▶ Escalar e jogar
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section className="pes-panel !p-3">
        {!teams ? (
          <p className="p-3 text-sm font-bold text-white/60">Carregando…</p>
        ) : (
          <TeamGrid
            teams={teams}
            selectedId={mineId}
            onSelect={(t) => {
              setMineId(t.id);
              draw(t);
              window.setTimeout(() => heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
            }}
          />
        )}
      </section>

      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        ← Voltar
      </button>
    </div>
  );
}
