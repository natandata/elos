"use client";

import { useEffect, useState } from "react";
import type { SoccerNet } from "@/lib/arenasoccer/net";
import { bestFormation, pickLineup, toPlayer, type Lineup } from "@/lib/arenasoccer/sim";
import { loadCup, loadLeague, type RosterPlayer, type Team } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "./ArenaSoccerGame";
import { KitChip } from "./match/KitChip";
import { TacticsPanel } from "./match/Lineup";
import { OnlineMatch } from "./match/OnlineMatch";
import { CompTabs, PesTitle, TeamGrid, type CompKey } from "./match/TeamSelect";

type Ready = { team: Team; lineup: Lineup };
type Go = { teams: [Team, Team]; lineups: [Lineup, Lineup]; seed: number };

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
        <section className="pes-panel">
          <PesTitle kicker={`Online · você x ${net.oppName}`} title="Escolha o seu time" />
          <p className="mb-2 text-xs font-bold text-white/60">Cada um joga com o time que quiser. Depois vocês montam a equipe e a partida começa.</p>
          <CompTabs value={comp} onChange={setComp} />
        </section>
        <section className="pes-panel !p-3">
          {!teams ? (
            <p className="p-3 text-sm font-bold text-white/60">Carregando…</p>
          ) : (
            <TeamGrid
              teams={teams}
              selectedId={null}
              onSelect={(t) => {
                const sq = t.players.map((p) => toPlayer(p as RosterPlayer));
                setTeam(t);
                setLineup(pickLineup(sq, bestFormation(sq)));
              }}
            />
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
      <TacticsPanel lineup={lineup} onChange={setLineup} kit={{ p: team.p, s: team.s, k: team.k }} />
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
