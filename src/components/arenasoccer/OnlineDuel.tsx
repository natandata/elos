"use client";

import { useEffect, useState } from "react";
import type { SoccerNet } from "@/lib/arenasoccer/net";
import { bestFormation, pickLineup, toPlayer, type Lineup } from "@/lib/arenasoccer/sim";
import { LEAGUES, loadCup, loadLeague, type LeagueKey, type RosterPlayer, type Team } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "./ArenaSoccerGame";
import { KitChip } from "./match/KitChip";
import { TacticsPanel } from "./match/Lineup";
import { OnlineMatch } from "./match/OnlineMatch";

type Ready = { team: Team; lineup: Lineup };
type Go = { teams: [Team, Team]; lineups: [Lineup, Lineup]; seed: number };
type CompKey = LeagueKey | "cup";
const COMPS: { key: CompKey; label: string }[] = [...LEAGUES.map((l) => ({ key: l.key as CompKey, label: `${l.flag} ${l.short}` })), { key: "cup", label: "🏆 Copa 2026" }];

/** 1 contra 1 online: cada um escolhe o seu time e a escalação; quando os dois estão prontos, a partida começa. */
export function OnlineDuel({ net, onFinish, onExit }: { net: SoccerNet; onFinish: (r: MatchResult) => void; onExit: () => void }) {
  const isHost = net.role === "host";
  const [comp, setComp] = useState<CompKey>("br");
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [lineup, setLineup] = useState<Lineup | null>(null);
  const [sent, setSent] = useState(false);
  const [oppReady, setOppReady] = useState<Ready | null>(null);
  const [go, setGo] = useState<Go | null>(null);
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));

  useEffect(() => {
    let alive = true;
    (comp === "cup" ? loadCup(2026).then((d) => d.teams) : loadLeague(comp).then((d) => d.teams)).then((t) => alive && setTeams([...t].sort((a, b) => b.str - a.str)));
    return () => {
      alive = false;
    };
  }, [comp]);

  useEffect(() => {
    const offs = [
      net.on("o:ready", (p) => setOppReady(p as Ready)),
      net.on("o:go", (p) => setGo(p as Go)),
    ];
    return () => offs.forEach((f) => f());
  }, [net]);

  // o anfitrião começa quando os dois estão prontos
  useEffect(() => {
    if (!isHost || !sent || !oppReady || !team || !lineup || go) return;
    const g: Go = { teams: [team, oppReady.team], lineups: [lineup, oppReady.lineup], seed };
    net.send("o:go", g);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- começa a partida quando os dois estão prontos
    setGo(g);
  }, [isHost, sent, oppReady, team, lineup, go, net, seed]);

  if (go) {
    const members = [
      { uid: "host", name: isHost ? net.myName : net.oppName, side: 0 as const },
      { uid: "guest", name: isHost ? net.oppName : net.myName, side: 1 as const },
    ];
    return <OnlineMatch net={net} myUid={isHost ? "host" : "guest"} members={members} teams={go.teams} lineups={go.lineups} seed={go.seed} label={`${net.myName} x ${net.oppName}`} modeLabel="1v1" onFinish={onFinish} onExit={onExit} />;
  }

  if (!team || !lineup) {
    return (
      <div className="space-y-3">
        <section className="card p-4">
          <p className="text-lg font-black">🌐 Online · 1 contra 1</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Você contra {net.oppName}. Escolha o seu time: cada um joga com o time que quiser.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {COMPS.map((c) => (
              <button key={c.key} type="button" onClick={() => setComp(c.key)} className={`rounded-full px-3 py-1.5 text-xs font-black ${comp === c.key ? "bg-emerald-500 text-white" : "bg-[var(--bg)]"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </section>
        <section className="card p-2">
          {!teams ? (
            <p className="p-3 text-sm text-[var(--muted)]">Carregando…</p>
          ) : (
            <ul className="max-h-[55vh] space-y-1 overflow-y-auto">
              {teams.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const sq = t.players.map((p) => toPlayer(p as RosterPlayer));
                      setTeam(t);
                      setLineup(pickLineup(sq, bestFormation(sq)));
                    }}
                    className="flex w-full items-center gap-2 rounded-lg bg-[var(--bg)] px-2 py-2 text-left"
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
        <button type="button" className="btn btn-ghost w-full" onClick={onExit}>
          ← Sair
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="card p-4">
        <div className="flex items-center gap-2 font-black">
          <KitChip t={team} size={28} />
          {team.name}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">Monte a equipe e a tática. Quando os dois estiverem prontos, a partida começa.</p>
      </section>
      <TacticsPanel lineup={lineup} onChange={setLineup} />
      {sent ? (
        <p className="card animate-pulse p-3 text-center text-sm font-black">{oppReady ? "Começando…" : `Aguardando ${net.oppName} ficar pronto…`}</p>
      ) : (
        <button
          type="button"
          className="btn btn-primary w-full !py-3 text-lg"
          onClick={() => {
            net.send("o:ready", { team, lineup } satisfies Ready);
            setSent(true);
          }}
        >
          ✅ Estou pronto
        </button>
      )}
      {!sent ? (
        <button type="button" className="btn btn-ghost w-full" onClick={() => { setTeam(null); setLineup(null); }}>
          ← Trocar de time
        </button>
      ) : null}
    </div>
  );
}
