"use client";

import { useEffect, useMemo, useState } from "react";
import { cupAdvance, cupAlive, cupFinish, cupFinish_label, cupNext, cupStageLabel, groupTable, newCup, penalties, topOf, mulberry, type CupSave, type Result } from "@/lib/arenasoccer/comp";
import { CUP_HOST, CUP_YEARS, loadCup, type CupData } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "./ArenaSoccerGame";
import { KitChip, PlayFlow } from "./ArenaSoccerPlay";
import { useSoccerSave } from "./useSoccerSave";

/** Converte o resultado jogado (o meu time é sempre o lado 0) para o formato da Copa. */
function toResult(r: MatchResult, iAmHome: boolean, tie: "knockout" | "group", penaltiesFn: () => [number, number]): Result {
  const my = r.goalsFor;
  const th = r.goalsAgainst;
  const goals = (r.scorers ?? []).map((s) => ({ team: (iAmHome ? s.team : 1 - s.team) as 0 | 1, name: s.name, assist: s.assist, at: s.at }));
  const res: Result = { hg: iAmHome ? my : th, ag: iAmHome ? th : my, goals };
  if (tie === "knockout" && res.hg === res.ag) {
    const p = penaltiesFn();
    res.pen = iAmHome ? p : [p[1], p[0]];
  }
  return res;
}

/** Copa do Mundo: escolha uma das últimas sete edições, um time e jogue o torneio contra o computador. */
export function CupMode({ color, onRecord, onBack }: { color: string; onRecord: (r: MatchResult) => void; onBack: () => void }) {
  const [year, setYear] = useState<number | null>(null);
  const [data, setData] = useState<CupData | null>(null);
  const [loadingCup, setLoadingCup] = useState(false);
  const kind = year ? `cup:${year}` : "cup:none";
  const { data: save, loading, save: setSave } = useSoccerSave<CupSave>(kind);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<"table" | "bracket" | "scorers">("table");

  useEffect(() => {
    if (!year) return;
    let stop = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega os dados da edição escolhida
    setLoadingCup(true);
    loadCup(year).then((d) => {
      if (stop) return;
      setData(d);
      setLoadingCup(false);
    });
    return () => {
      stop = true;
    };
  }, [year]);

  const teams = useMemo(() => new Map((data?.teams ?? []).map((t) => [t.id, t])), [data]);

  if (!year) {
    return (
      <div className="space-y-3">
        <section className="card p-4">
          <p className="text-lg font-black">🏆 Copa do Mundo</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Escolha uma das últimas sete Copas, um dos times que jogaram nela (com o elenco da época) e jogue o torneio inteiro contra o computador. Cada time entra com até 4 jogadores, escolhidos no plano de jogo.</p>
        </section>
        <ul className="grid grid-cols-2 gap-2">
          {CUP_YEARS.map((y) => (
            <li key={y}>
              <button type="button" onClick={() => setYear(y)} className="card w-full p-3 text-left">
                <span className="block text-2xl font-black tabular-nums">{y}</span>
                <span className="block text-xs text-[var(--muted)]">{CUP_HOST[y]}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onBack} className="btn btn-ghost w-full">
          ← Voltar
        </button>
      </div>
    );
  }
  if (loadingCup || !data || loading) return <p className="card p-4 text-center text-sm font-bold">Carregando a Copa de {year}…</p>;

  // escolher o time
  if (!save) {
    const letters = Object.keys(data.groups).sort();
    return (
      <div className="space-y-3">
        <section className="card p-4">
          <p className="text-lg font-black">🏆 Copa de {year}</p>
          <p className="text-xs text-[var(--muted)]">{CUP_HOST[year]} · escolha o seu time. Os grupos são os da Copa de verdade.</p>
        </section>
        {letters.map((g) => (
          <section key={g} className="card p-2">
            <p className="px-1 text-[11px] font-black uppercase text-[var(--muted)]">Grupo {g}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {data.groups[g].map((id) => {
                const t = teams.get(id)!;
                return (
                  <button key={id} type="button" onClick={() => setSave(newCup(year, data.groups, id, Math.floor(Math.random() * 1e9)))} className="flex items-center gap-2 rounded-lg bg-[var(--bg)] px-2 py-2 text-left">
                    <KitChip t={t} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm">{t.name}</b>
                      <small className="text-[10px] text-[var(--muted)]">Força {t.str}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <button type="button" onClick={() => { setYear(null); setData(null); }} className="btn btn-ghost w-full">
          ← Outras Copas
        </button>
      </div>
    );
  }

  const mine = teams.get(save.mine)!;
  const next = cupNext(save);

  if (playing && next) {
    const oppId = next.home === save.mine ? next.away : next.home;
    const iAmHome = next.home === save.mine;
    return (
      <PlayFlow
        mine={mine}
        opp={teams.get(oppId)!}
        label={`${next.stage} · Copa ${year}`}
        color={color}
        secs={120}
        goalsToWin={next.knockout ? 99 : 7}
        onBack={() => setPlaying(false)}
        onSim={() => {
          setSave(cupAdvance(save, teams, null));
          setPlaying(false);
        }}
        onDone={(r) => {
          onRecord(r);
          const res = toResult(r, iAmHome, next.knockout ? "knockout" : "group", () => penalties(teams.get(next.home)!, teams.get(next.away)!, mulberry(Date.now() % 1e9)));
          setSave(cupAdvance(save, teams, res));
          setPlaying(false);
        }}
      />
    );
  }

  const letters = Object.keys(save.groups).sort();
  const myGroup = letters.find((g) => save.groups[g].includes(save.mine));
  const alive = cupAlive(save);
  const done = !!save.champion;
  const tops = topOf(save.tally, "goals", 8);
  const name = (id: string) => teams.get(id)?.name ?? id;

  return (
    <div className="space-y-3">
      <section className="card p-3">
        <div className="flex items-center gap-3">
          <KitChip t={mine} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{mine.name}</p>
            <p className="text-xs text-[var(--muted)]">Copa {year} · {cupStageLabel(save)}</p>
          </div>
        </div>
        {done ? (
          <div className="mt-3 rounded-xl bg-amber-400/15 p-3 text-center">
            <p className="text-xl font-black">{cupFinish_label(save)}</p>
            <p className="mt-1 text-sm">🏆 Campeão: <b>{name(save.champion!)}</b> · Vice: {name(save.runnerUp!)}</p>
          </div>
        ) : next ? (
          <div className="mt-3 rounded-xl bg-emerald-500/10 p-3">
            <p className="text-[11px] font-black uppercase text-[var(--muted)]">Próximo jogo · {next.stage}</p>
            <p className="mt-1 flex items-center justify-between gap-2 font-black">
              <span className="truncate">{name(next.home)}</span>
              <span className="text-[var(--muted)]">x</span>
              <span className="truncate">{name(next.away)}</span>
            </p>
            <button type="button" className="btn btn-primary mt-3 w-full !py-3" onClick={() => setPlaying(true)}>
              ⚽ Preparar e jogar
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-rose-500/10 p-3 text-center">
            <p className="font-black">{cupFinish_label(save) || "Fim da linha"}</p>
            <button type="button" className="btn btn-primary mt-2 w-full" onClick={() => setSave(cupFinish(save, teams))}>
              Ver o resto da Copa
            </button>
          </div>
        )}
        {!alive && !done ? null : null}
      </section>

      <div className="grid grid-cols-3 gap-1.5">
        {(["table", "bracket", "scorers"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`rounded-xl py-2 text-sm font-black ${view === v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
            {v === "table" ? "Grupos" : v === "bracket" ? "Mata-mata" : "Artilharia"}
          </button>
        ))}
      </div>

      {view === "table"
        ? [myGroup, ...letters.filter((g) => g !== myGroup)].filter(Boolean).map((g) => (
            <section key={g} className="card overflow-hidden p-2">
              <p className="px-1 pb-1 text-[11px] font-black uppercase text-[var(--muted)]">Grupo {g}</p>
              <table className="w-full text-xs">
                <thead className="text-left text-[10px] uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-1">Time</th>
                    <th className="text-right">J</th>
                    <th className="text-right">V</th>
                    <th className="text-right">SG</th>
                    <th className="text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {groupTable(save, g!, teams).map((r, i) => (
                    <tr key={r.id} className={`${r.id === save.mine ? "bg-amber-400/15 font-black" : ""} ${i < 2 ? "" : "opacity-70"}`}>
                      <td className="py-1">
                        <span className="mr-1 inline-block w-3 text-[var(--muted)]">{i + 1}</span>
                        {name(r.id)}
                      </td>
                      <td className="text-right tabular-nums">{r.p}</td>
                      <td className="text-right tabular-nums">{r.w}</td>
                      <td className="text-right tabular-nums">{r.gf - r.ga}</td>
                      <td className="text-right font-black tabular-nums">{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        : null}

      {view === "bracket" ? (
        save.ko.length === 0 ? (
          <p className="card p-3 text-center text-sm text-[var(--muted)]">O mata-mata começa depois da fase de grupos.</p>
        ) : (
          save.ko.map((rd) => (
            <section key={rd.name} className="card p-2">
              <p className="px-1 pb-1 text-[11px] font-black uppercase text-[var(--muted)]">{rd.name}</p>
              <ul className="space-y-1">
                {rd.ties.map((t, i) => (
                  <li key={i} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs ${t.a === save.mine || t.b === save.mine ? "bg-amber-400/15" : "bg-[var(--bg)]"}`}>
                    <span className={`min-w-0 flex-1 truncate ${t.winner === t.a ? "font-black" : t.winner ? "opacity-60" : ""}`}>{name(t.a)}</span>
                    <b className="tabular-nums">{t.res ? `${t.res.hg} x ${t.res.ag}${t.res.pen ? ` (${t.res.pen[0]}-${t.res.pen[1]} pên.)` : ""}` : "x"}</b>
                    <span className={`min-w-0 flex-1 truncate text-right ${t.winner === t.b ? "font-black" : t.winner ? "opacity-60" : ""}`}>{name(t.b)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )
      ) : null}

      {view === "scorers" ? (
        <section className="card p-3">
          <p className="mb-2 text-sm font-black">⚽ Artilheiros da Copa</p>
          {tops.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">Ninguém marcou ainda.</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {tops.map((t, i) => (
                <li key={t.name + t.team} className="flex justify-between gap-2">
                  <span>
                    {i + 1}. <b>{t.name}</b> <small className="text-[var(--muted)]">{name(t.team)}</small>
                  </span>
                  <b className="tabular-nums">{t.goals}</b>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (done || window.confirm("Abandonar esta Copa e escolher outro time?")) setSave(null);
        }}
        className="btn btn-ghost w-full"
      >
        {done ? "🔄 Jogar outra Copa" : "Recomeçar esta Copa"}
      </button>
      <button type="button" onClick={() => { setYear(null); setData(null); }} className="btn btn-ghost w-full">
        ← Outras Copas
      </button>
    </div>
  );
}
