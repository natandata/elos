"use client";

import { useEffect, useMemo, useState } from "react";
import { leagueDone, leagueGames, myFixture, newLeague, playRound, table, topOf, type LeagueSave, type Result } from "@/lib/arenasoccer/comp";
import { loadLeague, type LeagueData } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "./ArenaSoccerGame";
import { KitChip, PlayFlow } from "./ArenaSoccerPlay";
import { useSoccerSave } from "./useSoccerSave";

function toResult(r: MatchResult, iAmHome: boolean): Result {
  const goals = (r.scorers ?? []).map((s) => ({ team: (iAmHome ? s.team : 1 - s.team) as 0 | 1, name: s.name, assist: s.assist, at: s.at }));
  return { hg: iAmHome ? r.goalsFor : r.goalsAgainst, ag: iAmHome ? r.goalsAgainst : r.goalsFor, goals };
}

/** Campeonato Brasileiro 2026: 20 times e os elencos de hoje, 38 rodadas, contra o computador. */
export function LeagueMode({ color, onRecord, onBack }: { color: string; onRecord: (r: MatchResult) => void; onBack: () => void }) {
  const [data, setData] = useState<LeagueData | null>(null);
  const { data: save, loading, save: setSave } = useSoccerSave<LeagueSave>("league:br");
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<"table" | "round" | "scorers">("table");

  useEffect(() => {
    let stop = false;
    loadLeague("br").then((d) => {
      if (!stop) setData(d);
    });
    return () => {
      stop = true;
    };
  }, []);
  const teams = useMemo(() => new Map((data?.teams ?? []).map((t) => [t.id, t])), [data]);
  if (!data || loading) return <p className="card p-4 text-center text-sm font-bold">Carregando o Brasileirão…</p>;

  if (!save) {
    return (
      <div className="space-y-3">
        <section className="card p-4">
          <p className="text-lg font-black">🇧🇷 Campeonato Brasileiro 2026</p>
          <p className="mt-1 text-xs text-[var(--muted)]">20 times, 38 rodadas, com os elencos de outubro de 2026. Escolha o seu time: você joga as partidas dele (ou simula) e o computador joga as outras. Cada time entra com até 4 jogadores, escolhidos no plano de jogo.</p>
        </section>
        <div className="grid grid-cols-2 gap-1.5">
          {data.teams.map((t) => (
            <button key={t.id} type="button" onClick={() => setSave(newLeague("br", data.teams.map((x) => x.id), t.id, Math.floor(Math.random() * 1e9)))} className="card flex items-center gap-2 px-2 py-2.5 text-left">
              <KitChip t={t} size={26} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{t.name}</b>
                <small className="text-[10px] text-[var(--muted)]">Força {t.str}</small>
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={onBack} className="btn btn-ghost w-full">
          ← Voltar
        </button>
      </div>
    );
  }

  const mine = teams.get(save.mine)!;
  const fx = myFixture(save);
  const done = leagueDone(save);
  const rows = table(save.ids, leagueGames(save), (id) => teams.get(id)?.str ?? 0);
  const myPos = rows.findIndex((r) => r.id === save.mine) + 1;
  const name = (id: string) => teams.get(id)?.name ?? id;
  const last = Math.max(0, save.round - 1);
  const scorers = topOf(save.tally, "goals", 10);
  const assists = topOf(save.tally, "assists", 5);

  if (playing && fx) {
    const iAmHome = fx.home === save.mine;
    const oppId = iAmHome ? fx.away : fx.home;
    return (
      <PlayFlow
        mine={mine}
        opp={teams.get(oppId)!}
        label={`Rodada ${fx.round + 1} de ${save.fixtures.length} · ${iAmHome ? "em casa" : "fora"}`}
        color={color}
        secs={120}
        goalsToWin={9}
        onBack={() => setPlaying(false)}
        onSim={() => {
          setSave(playRound(save, teams, null));
          setPlaying(false);
        }}
        onDone={(r) => {
          onRecord(r);
          setSave(playRound(save, teams, toResult(r, iAmHome)));
          setPlaying(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <section className="card p-3">
        <div className="flex items-center gap-3">
          <KitChip t={mine} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{mine.name}</p>
            <p className="text-xs text-[var(--muted)]">
              Brasileirão 2026 · {done ? "temporada encerrada" : `rodada ${save.round + 1} de ${save.fixtures.length}`} · {myPos}º lugar
            </p>
          </div>
        </div>
        {done ? (
          <div className="mt-3 rounded-xl bg-amber-400/15 p-3 text-center">
            <p className="text-xl font-black">{myPos === 1 ? "Campeão brasileiro! 🏆" : `Terminou em ${myPos}º lugar`}</p>
            <p className="mt-1 text-xs">Campeão: <b>{name(rows[0].id)}</b>{myPos <= 4 ? " · vaga na Libertadores" : myPos >= 17 ? " · rebaixado" : ""}</p>
            {scorers[0] ? <p className="mt-1 text-xs">Artilheiro: <b>{scorers[0].name}</b> ({scorers[0].goals} gols)</p> : null}
            <button type="button" className="btn btn-primary mt-3 w-full" onClick={() => setSave(null)}>
              🔄 Nova temporada
            </button>
          </div>
        ) : fx ? (
          <div className="mt-3 rounded-xl bg-emerald-500/10 p-3">
            <p className="text-[11px] font-black uppercase text-[var(--muted)]">Próximo jogo · rodada {fx.round + 1}</p>
            <p className="mt-1 flex items-center justify-between gap-2 font-black">
              <span className="truncate">{name(fx.home)}</span>
              <span className="text-[var(--muted)]">x</span>
              <span className="truncate">{name(fx.away)}</span>
            </p>
            <button type="button" className="btn btn-primary mt-3 w-full !py-3" onClick={() => setPlaying(true)}>
              ⚽ Preparar e jogar
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary mt-3 w-full" onClick={() => setSave(playRound(save, teams, null))}>
            Passar a rodada (folga)
          </button>
        )}
      </section>

      <div className="grid grid-cols-3 gap-1.5">
        {(["table", "round", "scorers"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`rounded-xl py-2 text-sm font-black ${view === v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
            {v === "table" ? "Tabela" : v === "round" ? "Rodada" : "Artilharia"}
          </button>
        ))}
      </div>

      {view === "table" ? (
        <section className="card overflow-hidden p-2">
          <table className="w-full text-xs">
            <thead className="text-left text-[10px] uppercase text-[var(--muted)]">
              <tr>
                <th className="py-1">#</th>
                <th>Time</th>
                <th className="text-right">J</th>
                <th className="text-right">V</th>
                <th className="text-right">SG</th>
                <th className="text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`${r.id === save.mine ? "bg-amber-400/20 font-black" : ""}`}>
                  <td className={`py-1 pl-1 ${i < 4 ? "border-l-4 border-emerald-500" : i < 6 ? "border-l-4 border-sky-500" : i >= rows.length - 4 ? "border-l-4 border-rose-500" : "border-l-4 border-transparent"}`}>{i + 1}</td>
                  <td>{name(r.id)}</td>
                  <td className="text-right tabular-nums">{r.p}</td>
                  <td className="text-right tabular-nums">{r.w}</td>
                  <td className="text-right tabular-nums">{r.gf - r.ga}</td>
                  <td className="text-right font-black tabular-nums">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 px-1 text-[10px] text-[var(--muted)]">🟩 Libertadores (1º ao 4º) · 🟦 Sul-Americana (5º e 6º) · 🟥 rebaixamento (últimos 4)</p>
        </section>
      ) : null}

      {view === "round" ? (
        <section className="card p-2">
          <p className="px-1 pb-1 text-[11px] font-black uppercase text-[var(--muted)]">Rodada {last + 1}</p>
          <ul className="space-y-1">
            {save.fixtures[last].map(([h, a], i) => {
              const r = save.results[last][i];
              return (
                <li key={h + a} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs ${h === save.mine || a === save.mine ? "bg-amber-400/15" : "bg-[var(--bg)]"}`}>
                  <span className="min-w-0 flex-1 truncate">{name(h)}</span>
                  <b className="tabular-nums">{r ? `${r.hg} x ${r.ag}` : "x"}</b>
                  <span className="min-w-0 flex-1 truncate text-right">{name(a)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {view === "scorers" ? (
        <section className="card p-3">
          <p className="mb-2 text-sm font-black">⚽ Artilheiros</p>
          {scorers.length === 0 ? <p className="text-xs text-[var(--muted)]">Ninguém marcou ainda.</p> : null}
          <ol className="space-y-1 text-sm">
            {scorers.map((t, i) => (
              <li key={t.name + t.team} className="flex justify-between gap-2">
                <span>{i + 1}. <b>{t.name}</b> <small className="text-[var(--muted)]">{name(t.team)}</small></span>
                <b className="tabular-nums">{t.goals}</b>
              </li>
            ))}
          </ol>
          <p className="mb-1 mt-3 text-sm font-black">🅰️ Assistências</p>
          <ol className="space-y-1 text-sm">
            {assists.map((t, i) => (
              <li key={t.name + t.team} className="flex justify-between gap-2">
                <span>{i + 1}. <b>{t.name}</b> <small className="text-[var(--muted)]">{name(t.team)}</small></span>
                <b className="tabular-nums">{t.assists}</b>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {!done ? (
        <button type="button" onClick={() => window.confirm("Abandonar esta temporada e escolher outro time?") && setSave(null)} className="btn btn-ghost w-full">
          Recomeçar a temporada
        </button>
      ) : null}
      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        ← Voltar
      </button>
    </div>
  );
}
