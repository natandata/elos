"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyMatch, avgRating, careerDone, effStr, endSeason, finishRound, formAvg, leadsTally, lineup, myFixture, myTeam, newCareer, POSITIONS, seasonLabel, seasonPlace, simulateMine, xpFor, type CareerSave, type MatchSummary, type MyGame, type Offer, type Position } from "@/lib/arenasoccer/career";
import { leagueGames, mulberry, table, topOf, type Result } from "@/lib/arenasoccer/comp";
import { arrange, cpuLineup, kitOf, levelFor, LEAGUES, loadLeague, resolveKits, type LeagueKey, type Team } from "@/lib/arenasoccer/teams";
import { ArenaSoccerGame, type MatchResult, type PlaySpec } from "./ArenaSoccerGame";
import { KitChip } from "./ArenaSoccerPlay";
import { useSoccerSave } from "./useSoccerSave";

type All = Record<LeagueKey, Team[]>;

function Bar({ value, max, color = "bg-emerald-500" }: { value: number; max: number; color?: string }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
      <i className={`block h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </span>
  );
}

/** Modo carreira: escolha a liga, entre num time por sorteio e jogue temporadas, missões, artilharia e propostas de outros clubes. */
export function CareerMode({ color, myName, onRecord, onBack }: { color: string; myName: string; onRecord: (r: MatchResult) => void; onBack: () => void }) {
  const { data: save, loading, save: setSave } = useSoccerSave<CareerSave>("career");
  const [all, setAll] = useState<All | null>(null);
  const [step, setStep] = useState<"league" | "create">("league");
  const [league, setLeague] = useState<LeagueKey | null>(null);
  const [name, setName] = useState(myName);
  const [pos, setPos] = useState<Position>("FW");
  const [spec, setSpec] = useState<PlaySpec | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [lastLine, setLastLine] = useState<string>("");
  const [tab, setTab] = useState<"jogo" | "tabela" | "carreira">("jogo");
  const pending = useRef<{ res: Result; g: MyGame; result: "win" | "draw" | "loss"; conceded: number } | null>(null);

  useEffect(() => {
    let stop = false;
    Promise.all(LEAGUES.map((l) => loadLeague(l.key))).then((ds) => {
      if (stop) return;
      const a = {} as All;
      ds.forEach((d) => (a[d.key] = d.teams));
      setAll(a);
    });
    return () => {
      stop = true;
    };
  }, []);

  const teams = save && all ? all[save.league] : null;
  const tmap = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t])), [teams]);

  if (loading || !all) return <p className="card p-4 text-center text-sm font-bold">Carregando o modo carreira…</p>;

  // ------------------------------------------------------------ começar a carreira
  if (!save) {
    if (step === "league" || !league) {
      return (
        <div className="space-y-3">
          <section className="card p-4">
            <p className="text-lg font-black">⭐ Modo carreira</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Você é um jogador novo, de 19 anos. Escolha a liga em que quer começar: o time sai por sorteio, entre os do meio e de baixo da tabela. Jogue as partidas, cumpra missões, dispute a artilharia e as assistências e, jogando bem, receba propostas de outros times, de qualquer uma das quatro ligas.</p>
          </section>
          <ul className="grid grid-cols-2 gap-2">
            {LEAGUES.map((l) => (
              <li key={l.key}>
                <button type="button" onClick={() => { setLeague(l.key); setStep("create"); }} className="card w-full p-4 text-left">
                  <span className="block text-3xl" aria-hidden>{l.flag}</span>
                  <span className="mt-1 block font-black">{l.label}</span>
                  <span className="text-xs text-[var(--muted)]">{all[l.key].length} times</span>
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
    return (
      <div className="space-y-3">
        <section className="card p-4">
          <p className="text-lg font-black">{LEAGUES.find((l) => l.key === league)?.flag} {LEAGUES.find((l) => l.key === league)?.label}</p>
          <label className="mt-3 block text-sm font-black">
            Seu nome
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 18))} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-bold" />
          </label>
          <p className="mb-1 mt-3 text-sm font-black">Posição</p>
          <div className="grid grid-cols-3 gap-2">
            {POSITIONS.map((p) => (
              <button key={p.v} type="button" onClick={() => setPos(p.v)} className={`rounded-xl py-3 text-sm font-black ${pos === p.v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{POSITIONS.find((p) => p.v === pos)?.hint}</p>
        </section>
        <button type="button" disabled={!name.trim()} onClick={() => setSave(newCareer(name.trim(), pos, league, all[league], Math.floor(Math.random() * 1e9)))} className="btn btn-primary w-full !py-3 text-lg disabled:opacity-50">
          🎲 Sortear meu time e começar
        </button>
        <button type="button" onClick={() => setStep("league")} className="btn btn-ghost w-full">
          ← Trocar de liga
        </button>
      </div>
    );
  }

  const c = save;
  const team = myTeam(c, teams!);
  const fx = myFixture(c.lg);
  const done = careerDone(c);
  const rows = table(c.lg.ids, leagueGames(c.lg), (id) => tmap.get(id)?.str ?? 0);
  const place = rows.findIndex((r) => r.id === c.team) + 1;
  const tName = (id: string) => tmap.get(id)?.name ?? id;
  const lg = LEAGUES.find((l) => l.key === c.league)!;

  /** Aplica a partida ao jogador e fecha a rodada. */
  const commit = (res: Result, g: MyGame, result: "win" | "draw" | "loss", conceded: number) => {
    const rng = mulberry(c.seed + c.lg.round * 77 + c.total.apps);
    const { save: after, summary: sm } = applyMatch(c, g, result, conceded, rng);
    const next = finishRound(after, teams!, res, all);
    setSave(next);
    setSummary(sm);
    setLastLine(`${result === "win" ? "Vitória" : result === "draw" ? "Empate" : "Derrota"} · ${g.goals} gol(s), ${g.assists} assistência(s)`);
  };

  const play = () => {
    if (!fx) return;
    const iAmHome = fx.home === c.team;
    const opp = tmap.get(iAmHome ? fx.away : fx.home)!;
    const { me, mates } = lineup(c, team);
    const [k0, k1] = resolveKits(kitOf(team), kitOf(opp));
    const lvl = levelFor(effStr(c, team), opp.str);
    setSpec({ match: { teams: [arrange([me, ...mates], 0), cpuLineup(opp, 3)], secs: 120, goalsToWin: 9 }, kits: [k0, k1], names: [team.name, opp.name], level: ["normal", lvl], label: `${lg.short} · rodada ${fx.round + 1} de ${c.lg.fixtures.length}` });
  };
  const simulate = () => {
    if (!fx) return;
    const iAmHome = fx.home === c.team;
    const opp = tmap.get(iAmHome ? fx.away : fx.home)!;
    const sim = simulateMine(c, team, opp, iAmHome, mulberry(c.seed + c.lg.round * 13 + 5));
    const mineG = iAmHome ? sim.result.hg : sim.result.ag;
    const theirG = iAmHome ? sim.result.ag : sim.result.hg;
    commit(sim.result, sim.me, mineG > theirG ? "win" : mineG < theirG ? "loss" : "draw", theirG);
  };

  if (spec && fx) {
    const iAmHome = fx.home === c.team;
    return (
      <ArenaSoccerGame
        mode="3v3"
        level="normal"
        color={color}
        spec={spec}
        onFinish={(r) => {
          onRecord(r);
          const line = (r.mine ?? []).find((x) => x.name === c.name);
          const goals = (r.scorers ?? []).map((s) => ({ team: (iAmHome ? s.team : 1 - s.team) as 0 | 1, name: s.name, assist: s.assist, at: s.at }));
          const res: Result = { hg: iAmHome ? r.goalsFor : r.goalsAgainst, ag: iAmHome ? r.goalsAgainst : r.goalsFor, goals };
          // guarda para o botão "Continuar"
          pending.current = { res, g: { goals: line?.goals ?? 0, assists: line?.assists ?? 0, own: line?.own ?? 0, minutes: 90 }, result: r.result, conceded: r.goalsAgainst };
        }}
        onExit={() => {
          const p = pending.current;
          pending.current = null;
          setSpec(null);
          if (p) commit(p.res, p.g, p.result, p.conceded);
        }}
      />
    );
  }

  const leads = leadsTally(c);
  const scorers = topOf(c.lg.tally, "goals", 5);
  const assists = topOf(c.lg.tally, "assists", 3);
  const decide = (o: Offer | null) => setSave({ ...c, moveTo: o });

  return (
    <div className="space-y-3">
      {/* cartão do jogador */}
      <section className="card p-3">
        <div className="flex items-center gap-3">
          <KitChip t={team} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{c.name} <small className="text-xs font-bold text-[var(--muted)]">#{c.num}</small></p>
            <p className="text-xs text-[var(--muted)]">{POSITIONS.find((p) => p.v === c.pos)?.label} · {c.age} anos · {team.name} · {lg.flag} {lg.short}</p>
          </div>
          <div className="text-center">
            <b className="block text-3xl font-black leading-none tabular-nums text-amber-500">{c.ovr}</b>
            <small className="text-[10px] font-bold uppercase text-[var(--muted)]">força</small>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-[11px] font-bold">
          <div>
            <div className="flex justify-between"><span>Experiência</span><span className="tabular-nums">{c.xp}/{xpFor(c.ovr)}</span></div>
            <Bar value={c.xp} max={xpFor(c.ovr)} />
          </div>
          <div>
            <div className="flex justify-between"><span>Reputação</span><span className="tabular-nums">{Math.round(c.rep)}/100</span></div>
            <Bar value={c.rep} max={100} color="bg-sky-500" />
          </div>
          <div className="flex justify-between"><span>Fase (últimos jogos)</span><span className="tabular-nums">{c.form.length ? formAvg(c).toFixed(1).replace(".", ",") : "—"}</span></div>
        </div>
      </section>

      {summary ? (
        <section className="card border-2 border-emerald-400 p-3 text-sm">
          <p className="font-black">{lastLine}</p>
          <p className="text-xs">Nota <b>{summary.rating.toFixed(1).replace(".", ",")}</b> · +{summary.xp} XP · reputação {summary.repDelta >= 0 ? "+" : ""}{summary.repDelta.toFixed(1).replace(".", ",")}{summary.levelUps ? ` · ⬆️ evoluiu (força ${c.ovr})` : ""}</p>
          {summary.doneMissions.map((m) => <p key={m} className="text-xs text-emerald-600">✅ Missão cumprida: {m}</p>)}
          <button type="button" className="mt-1 text-xs font-black text-[var(--muted)]" onClick={() => setSummary(null)}>Fechar</button>
        </section>
      ) : null}

      <div className="grid grid-cols-3 gap-1.5">
        {(["jogo", "tabela", "carreira"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setTab(v)} className={`rounded-xl py-2 text-sm font-black ${tab === v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
            {v === "jogo" ? "Jogo" : v === "tabela" ? "Liga" : "Carreira"}
          </button>
        ))}
      </div>

      {tab === "jogo" ? (
        <>
          {done ? (
            <section className="card p-3">
              <p className="text-lg font-black">Fim da temporada {seasonLabel(c.year)}</p>
              <p className="text-sm">Você terminou em <b>{place}º</b> no {lg.short}{place === 1 ? " 🏆 campeão!" : ""}.</p>
              <p className="text-xs text-[var(--muted)]">{c.season.goals} gols · {c.season.assists} assistências · {c.season.apps} jogos · nota média {avgRating(c.season).toFixed(1).replace(".", ",")}{leads.scorer ? " · 👟 artilheiro da liga!" : ""}{leads.assister ? " · 🅰️ líder de assistências!" : ""}</p>
              {c.offers.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-black">📨 Propostas recebidas</p>
                  {c.offers.map((o) => {
                    const chosen = c.moveTo?.team === o.team;
                    return (
                      <div key={o.team} className={`flex items-center gap-2 rounded-xl p-2 ${chosen ? "bg-emerald-500/20 ring-1 ring-emerald-400" : "bg-[var(--bg)]"}`}>
                        <KitChip t={all[o.league].find((t) => t.id === o.team)!} />
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-sm">{o.name} <small className="text-[var(--muted)]">{LEAGUES.find((l) => l.key === o.league)?.flag}</small></b>
                          <small className="text-[11px] text-[var(--muted)]">Força {o.str} · {o.reason}</small>
                        </span>
                        <button type="button" onClick={() => decide(chosen ? null : o)} className="btn btn-primary !px-3 !py-1.5 !text-xs">{chosen ? "Escolhido ✓" : "Aceitar"}</button>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-[var(--muted)]">{c.moveTo ? `Você vai para o ${c.moveTo.name} na próxima temporada.` : `Se não aceitar nenhuma, continua no ${team.name}.`}</p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--muted)]">Nenhum time fez proposta. Jogue melhor para subir a reputação (gols, assistências e boas notas).</p>
              )}
              <button type="button" className="btn btn-primary mt-3 w-full !py-3" onClick={() => { setSave(endSeason(c, all)); setSummary(null); }}>
                ▶ Começar a temporada {seasonLabel(c.year + 1)}
              </button>
            </section>
          ) : fx ? (
            <section className="card p-3">
              <p className="text-[11px] font-black uppercase text-[var(--muted)]">Próximo jogo · rodada {fx.round + 1} de {c.lg.fixtures.length}</p>
              <p className="mt-1 flex items-center justify-between gap-2 font-black">
                <span className="truncate">{tName(fx.home)}</span>
                <span className="text-[var(--muted)]">x</span>
                <span className="truncate">{tName(fx.away)}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">3 contra 3: você e dois companheiros do {team.name}. Você controla o {c.name}.</p>
              <button type="button" className="btn btn-primary mt-3 w-full !py-3 text-lg" onClick={play}>⚽ Jogar a partida</button>
              <button type="button" className="btn btn-ghost mt-2 w-full" onClick={simulate}>⏩ Simular (rende menos)</button>
            </section>
          ) : null}

          {c.offers.length > 0 && !done ? (
            <section className="card p-3">
              <p className="text-sm font-black">📨 Propostas na mesa ({c.offers.length})</p>
              {c.offers.map((o) => (
                <p key={o.team} className="text-xs">{LEAGUES.find((l) => l.key === o.league)?.flag} <b>{o.name}</b> (força {o.str}) · {o.reason}</p>
              ))}
              <p className="mt-1 text-[11px] text-[var(--muted)]">Você decide no fim da temporada, na janela de transferências.</p>
            </section>
          ) : null}

          <section className="card p-3">
            <p className="mb-2 text-sm font-black">🎯 Missões</p>
            <ul className="space-y-1.5">
              {c.missions.map((m) => (
                <li key={m.id} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className={m.done ? "text-emerald-600 line-through" : ""}>{m.kind === "match" ? "🎮" : "📅"} {m.text}</span>
                    <b className="shrink-0 text-[var(--muted)]">+{m.xp} XP</b>
                  </div>
                  {m.kind === "season" ? <Bar value={m.key === "top" ? Math.max(0, m.goal + 1 - Math.min(place || 99, m.goal + 1)) : m.progress} max={m.key === "top" ? m.goal : m.goal} color="bg-amber-400" /> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-3">
            <p className="mb-1 text-sm font-black">📰 Notícias</p>
            <ul className="space-y-1 text-xs text-[var(--muted)]">
              {[...c.news].reverse().slice(0, 5).map((n, i) => <li key={i}>• {n}</li>)}
            </ul>
          </section>
        </>
      ) : null}

      {tab === "tabela" ? (
        <>
          <section className="card overflow-hidden p-2">
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] uppercase text-[var(--muted)]"><tr><th className="py-1">#</th><th>Time</th><th className="text-right">J</th><th className="text-right">SG</th><th className="text-right">Pts</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={r.id === c.team ? "bg-amber-400/20 font-black" : ""}>
                    <td className="py-1 pl-1">{i + 1}</td>
                    <td>{tName(r.id)}</td>
                    <td className="text-right tabular-nums">{r.p}</td>
                    <td className="text-right tabular-nums">{r.gf - r.ga}</td>
                    <td className="text-right font-black tabular-nums">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="card p-3 text-sm">
            <p className="mb-1 font-black">👟 Artilharia</p>
            <ol className="space-y-0.5 text-xs">
              {scorers.map((t, i) => (
                <li key={t.name + t.team} className={`flex justify-between ${t.name === c.name && t.team === c.team ? "font-black text-amber-600" : ""}`}><span>{i + 1}. {t.name} <small className="text-[var(--muted)]">{tName(t.team)}</small></span><b>{t.goals}</b></li>
              ))}
            </ol>
            <p className="mb-1 mt-2 font-black">🅰️ Assistências</p>
            <ol className="space-y-0.5 text-xs">
              {assists.map((t, i) => (
                <li key={t.name + t.team} className={`flex justify-between ${t.name === c.name && t.team === c.team ? "font-black text-amber-600" : ""}`}><span>{i + 1}. {t.name} <small className="text-[var(--muted)]">{tName(t.team)}</small></span><b>{t.assists}</b></li>
              ))}
            </ol>
          </section>
        </>
      ) : null}

      {tab === "carreira" ? (
        <>
          <section className="card p-3">
            <p className="mb-2 text-sm font-black">📊 Números</p>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[["Jogos", c.total.apps], ["Gols", c.total.goals], ["Assist.", c.total.assists], ["Nota", avgRating(c.total).toFixed(1).replace(".", ",")]].map(([l, v]) => (
                <span key={l as string} className="rounded-xl bg-[var(--bg)] py-2"><b className="block text-lg tabular-nums">{v}</b><small className="text-[10px] font-bold uppercase text-[var(--muted)]">{l}</small></span>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">Temporada {seasonLabel(c.year)}: {c.season.goals} gols, {c.season.assists} assistências, {c.season.apps} jogos.</p>
          </section>
          <section className="card p-3">
            <p className="mb-1 text-sm font-black">🏆 Troféus e prêmios ({c.titles.length})</p>
            {c.titles.length === 0 ? <p className="text-xs text-[var(--muted)]">Nenhum ainda.</p> : <ul className="space-y-0.5 text-xs">{c.titles.map((t, i) => <li key={i}>🏅 {t}</li>)}</ul>}
          </section>
          <section className="card p-3">
            <p className="mb-1 text-sm font-black">📜 Histórico</p>
            {c.history.length === 0 ? <p className="text-xs text-[var(--muted)]">A primeira temporada ainda não terminou.</p> : (
              <ul className="space-y-1 text-xs">
                {c.history.map((h, i) => <li key={i}><b>{h.season}</b> · {h.team} ({h.league}) · {h.place}º · {h.goals} gols, {h.assists} assist., {h.apps} jogos · nota {h.avg.toFixed(1).replace(".", ",")}{h.note ? ` · ${h.note}` : ""}</li>)}
              </ul>
            )}
          </section>
          <button type="button" onClick={() => window.confirm("Apagar esta carreira e começar outra? Isso não pode ser desfeito.") && (setSave(null), setLeague(null), setStep("league"))} className="btn btn-ghost w-full">
            🗑 Recomeçar a carreira
          </button>
        </>
      ) : null}

      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        ← Voltar
      </button>
    </div>
  );
}
