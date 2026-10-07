"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import * as realApi from "@/lib/actions/soccerWorld";
import type { WorldPlayerView, WorldView } from "@/lib/arenasoccer/worldServer";
import { effStr, lineup, POSITIONS, seasonLabel, type CareerSave, type Position } from "@/lib/arenasoccer/career";
import { table, type Fixture } from "@/lib/arenasoccer/comp";
import { arrange, cpuLineup, kitOf, levelFor, LEAGUES, loadLeague, resolveKits, type LeagueKey, type Team } from "@/lib/arenasoccer/teams";
import { inLabel, whenLabel } from "@/lib/arenasoccer/worldCalendar";
import { getFootballNews } from "@/lib/actions/soccerNews";
import type { NewsItem } from "@/lib/arenasoccer/news";
import { createClient } from "@/lib/supabase/client";
import { ArenaSoccerGame, type MatchResult, type PlaySpec } from "./ArenaSoccerGame";
import { ArenaSoccerOnline } from "./ArenaSoccerOnline";
import { KitChip } from "./ArenaSoccerPlay";

export type WorldApi = typeof realApi;
type Tab = "jogo" | "treino" | "tabela" | "mundo" | "amigos" | "praca";
type Online = { id: string; name: string; team: string; ovr: number; league: string };
const PRACA = "soccer-world-praca";

function Bar({ value, max, color = "bg-emerald-500" }: { value: number; max: number; color?: string }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
      <i className={`block h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </span>
  );
}

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
};

function Avatar({ p }: { p: WorldPlayerView }) {
  return p.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--line)] text-sm font-black">{p.name.slice(0, 1).toUpperCase()}</span>
  );
}

/** Mundo aberto: a carreira online. Todos jogam os mesmos campeonatos, em dias fixos à noite, e acompanham a carreira dos outros. */
export function WorldMode({ color, myId, myName, onRecord, onBack, api = realApi }: { color: string; myId: string; myName: string; onRecord: (r: MatchResult) => void; onBack: () => void; /** troca as chamadas ao servidor (testes) */ api?: WorldApi }) {
  const { getWorld, worldDecide, worldJoin, worldLeave, worldSubmit } = api;
  const [view, setView] = useState<WorldView | null>(null);
  const [canPlay, setCanPlay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("jogo");
  const [league, setLeague] = useState<LeagueKey | null>(null);
  const [name, setName] = useState(myName);
  const [pos, setPos] = useState<Position>("FW");
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [spec, setSpec] = useState<PlaySpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const offsetRef = useRef(0);
  const [favs, setFavs] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("arenasoccer:world:favs") ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [online, setOnline] = useState<Online[]>([]);
  const [duel, setDuel] = useState<{ mode: "create" | "join"; room?: string; to?: string } | null>(null);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [trainSpec, setTrainSpec] = useState<PlaySpec | null>(null);
  const [trainOpp, setTrainOpp] = useState<string | null>(null);
  const [trainLevel, setTrainLevel] = useState<"easy" | "normal" | "hard">("normal");
  const [invite, setInvite] = useState<{ from: string; room: string } | null>(null);
  const chRef = useRef<RealtimeChannel | null>(null);
  const pending = useRef<MatchResult | null>(null);

  const load = useCallback(async () => {
    const r = await getWorld();
    if (r.error || !r.view) {
      setError(r.error ?? "Não foi possível abrir o mundo.");
      return;
    }
    setError(null);
    setCanPlay(r.canPlay);
    offsetRef.current = r.view.now - Date.now();
    setNow(r.view.now);
    setView(r.view);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- primeira leitura do mundo
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    const s = window.setInterval(() => setNow(Date.now() + offsetRef.current), 1000);
    return () => {
      window.clearInterval(t);
      window.clearInterval(s);
    };
  }, [load]);

  useEffect(() => {
    if (tab !== "mundo" || news) return;
    let stop = false;
    getFootballNews().then((n) => !stop && setNews(n)).catch(() => !stop && setNews([]));
    return () => {
      stop = true;
    };
  }, [tab, news]);

  const lg = view?.league ?? null;
  useEffect(() => {
    if (!lg) return;
    let stop = false;
    loadLeague(lg).then((d) => {
      if (!stop) setTeams(d.teams);
    });
    return () => {
      stop = true;
    };
  }, [lg]);
  const tmap = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t])), [teams]);

  // praça: quem está online agora (presença) e os convites de amistoso
  const me = view?.me ?? null;
  const meName = me?.name;
  const meTeam = me?.teamName;
  const meOvr = me?.ovr;
  const meLeague = me?.league;
  useEffect(() => {
    if (!meName) return;
    const sb = createClient();
    const ch = sb.channel(PRACA, { config: { presence: { key: myId }, broadcast: { self: false } } });
    chRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const st = ch.presenceState() as Record<string, Online[]>;
      setOnline(Object.entries(st).filter(([k]) => k !== myId).map(([k, v]) => ({ ...v[v.length - 1], id: k })));
    });
    ch.on("broadcast", { event: "invite" }, ({ payload }) => {
      const p = payload as { to: string; from: string; room: string };
      if (p.to === myId) setInvite({ from: p.from, room: p.room });
    });
    ch.subscribe((s) => {
      if (s === "SUBSCRIBED") void ch.track({ name: meName, team: meTeam, ovr: meOvr, league: meLeague });
    });
    return () => {
      void sb.removeChannel(ch);
      chRef.current = null;
    };
  }, [meName, meTeam, meOvr, meLeague, myId]);

  if (error) {
    return (
      <div className="space-y-3">
        <p className="card p-4 text-center text-sm font-bold text-rose-600">{error}</p>
        <button type="button" className="btn btn-ghost w-full" onClick={onBack}>← Voltar</button>
      </div>
    );
  }
  if (!view) return <p className="card p-4 text-center text-sm font-bold">Abrindo o mundo aberto…</p>;

  // ------------------------------------------------------------ entrar no mundo
  if (!view.me) {
    return (
      <div className="space-y-3">
        <section className="card p-4">
          <p className="text-lg font-black">🌍 Mundo aberto</p>
          <p className="mt-1 text-xs text-[var(--muted)]">A carreira online: todos os jogadores vivem nos mesmos campeonatos (Brasileiro, Espanhol, Inglês e Francês), com a mesma tabela, a mesma artilharia e a mesma linha do tempo. Os jogos são sempre no domingo, às 15h, a partir de 01/11; quem não jogar tem o jogo simulado. Veja o que os amigos estão fazendo e se encontre com eles na Praça.</p>
          <p className="mt-2 text-xs text-[var(--muted)]">{view.players.length} {view.players.length === 1 ? "jogador já está" : "jogadores já estão"} no mundo.</p>
        </section>
        {!canPlay ? (
          <p className="card p-3 text-center text-sm">O admin acompanha o mundo, mas não joga nele.</p>
        ) : !league ? (
          <ul className="grid grid-cols-2 gap-2">
            {LEAGUES.map((l) => (
              <li key={l.key}>
                <button type="button" onClick={() => setLeague(l.key)} className="card w-full p-4 text-left">
                  <span className="block text-3xl" aria-hidden>{l.flag}</span>
                  <span className="mt-1 block font-black">{l.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <section className="card p-4">
              <p className="font-black">{LEAGUES.find((l) => l.key === league)?.flag} {LEAGUES.find((l) => l.key === league)?.label}</p>
              <label className="mt-3 block text-sm font-black">
                Seu nome no mundo
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 18))} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-bold" />
              </label>
              <p className="mb-1 mt-3 text-sm font-black">Posição</p>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((p) => (
                  <button key={p.v} type="button" onClick={() => setPos(p.v)} className={`rounded-xl py-3 text-sm font-black ${pos === p.v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>{p.label}</button>
                ))}
              </div>
            </section>
            <button
              type="button"
              disabled={busy || name.trim().length < 2}
              onClick={async () => {
                setBusy(true);
                const r = await worldJoin(name.trim(), pos, league);
                setBusy(false);
                if (r.error) setError(r.error);
                else await load();
              }}
              className="btn btn-primary w-full !py-3 text-lg disabled:opacity-50"
            >
              🎲 Sortear meu time e entrar no mundo
            </button>
            <button type="button" className="btn btn-ghost w-full" onClick={() => setLeague(null)}>← Trocar de liga</button>
          </>
        )}
        <button type="button" className="btn btn-ghost w-full" onClick={onBack}>← Voltar</button>
      </div>
    );
  }

  const m = view.me;
  const team = tmap.get(m.team);
  const fx = view.fixtures[view.round]?.find(([h, a]) => h === m.team || a === m.team) ?? null;
  const w = view.window;
  const open = !!w && now >= w.start && now < w.end;
  const before = !!w && now < w.start;
  const iAmHome = fx ? fx[0] === m.team : true;
  const oppId = fx ? (iAmHome ? fx[1] : fx[0]) : null;
  const opp = oppId ? tmap.get(oppId) : null;
  const humansOn = (id: string) => view.players.filter((p) => p.team === id && p.league === m.league && p.userId !== myId);
  const tName = (id: string) => tmap.get(id)?.name ?? id;

  const games: Fixture[] = [];
  view.fixtures.forEach((r, ri) => r.forEach(([h, a], i) => {
    const res = view.results[`${ri}|${i}`];
    if (res) games.push({ h, a, hg: res.hg, ag: res.ag });
  }));
  const rows = teams ? table(teams.map((t) => t.id), games, (id) => tmap.get(id)?.str ?? 0) : [];
  const humanTeams = new Set(view.players.filter((p) => p.league === m.league).map((p) => p.team));

  // ------------------------------------------------------------ partida
  const play = () => {
    if (!team || !opp) return;
    const c = { pos: m.pos, name: m.name, num: m.num, ovr: m.ovr } as CareerSave;
    const { me: meP, mates } = lineup(c, team);
    const [k0, k1] = resolveKits(kitOf(team), kitOf(opp));
    const lvl = levelFor(effStr(c, team), opp.str);
    setSpec({ match: { teams: [arrange([meP, ...mates], 0), cpuLineup(opp, 3)], secs: 120, goalsToWin: 9 }, kits: [k0, k1], names: [team.name, opp.name], level: ["normal", lvl], label: `${LEAGUES.find((l) => l.key === m.league)?.short} · rodada ${view.round + 1}` });
  };

  const startTraining = () => {
    const tOpp = trainOpp ? tmap.get(trainOpp) : null;
    if (!team || !tOpp) return;
    const c = { pos: m.pos, name: m.name, num: m.num, ovr: m.ovr } as CareerSave;
    const { me: meP, mates } = lineup(c, team);
    const [k0, k1] = resolveKits(kitOf(team), kitOf(tOpp));
    setTrainSpec({ match: { teams: [arrange([meP, ...mates], 0), cpuLineup(tOpp, 3)], secs: 120, goalsToWin: 9 }, kits: [k0, k1], names: [team.name, tOpp.name], level: ["normal", trainLevel], label: "Treino · não vale na tabela" });
  };

  if (trainSpec) {
    return <ArenaSoccerGame mode="3v3" level="normal" color={color} spec={trainSpec} onFinish={() => {}} onExit={() => setTrainSpec(null)} />;
  }

  if (spec) {
    return (
      <ArenaSoccerGame
        mode="3v3"
        level="normal"
        color={color}
        spec={spec}
        onFinish={(r) => {
          pending.current = r;
          onRecord(r);
        }}
        onExit={async () => {
          const r = pending.current;
          pending.current = null;
          setSpec(null);
          if (!r) return;
          const line = (r.mine ?? []).find((x) => x.name === m.name);
          const res = await worldSubmit({ goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, goals: (r.scorers ?? []).map((s) => ({ team: s.team, name: s.name, assist: s.assist, at: s.at })), mine: { goals: line?.goals ?? 0, assists: line?.assists ?? 0, own: line?.own ?? 0 } });
          setSummary(res.error ? `Não foi possível registrar: ${res.error}` : `${res.summary!.line} · nota ${res.summary!.rating.toFixed(1).replace(".", ",")} · +${res.summary!.xp} XP${res.summary!.official ? "" : " (o placar oficial da tabela foi o do primeiro jogo registrado)"}${res.summary!.doneMissions.length ? ` · missão: ${res.summary!.doneMissions.join("; ")}` : ""}`);
          await load();
        }}
      />
    );
  }

  if (duel) {
    return (
      <ArenaSoccerOnline
        color={color}
        myName={m.name}
        autoCreate={duel.mode === "create"}
        joinId={duel.mode === "join" ? duel.room : undefined}
        onCreated={(room) => {
          // avisa o amigo desafiado pela Praça
          const to = duel.to;
          if (to) void chRef.current?.send({ type: "broadcast", event: "invite", payload: { to, from: m.name, room } });
        }}
        onFinish={(r) => onRecord(r)}
        onBack={() => setDuel(null)}
      />
    );
  }

  const favSet = new Set(favs);
  const toggleFav = (id: string) => {
    const next = favSet.has(id) ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(next);
    try {
      localStorage.setItem("arenasoccer:world:favs", JSON.stringify(next));
    } catch {
      /* ok */
    }
  };
  const friends = [...view.players].filter((p) => p.userId !== myId).sort((a, b) => Number(favSet.has(b.userId)) - Number(favSet.has(a.userId)) || b.ovr - a.ovr);
  const lgInfo = LEAGUES.find((l) => l.key === m.league)!;

  return (
    <div className="space-y-3">
      {invite ? (
        <section className="card border-2 border-amber-400 p-3 text-center">
          <p className="font-black">⚽ {invite.from} te desafiou para um amistoso 1 contra 1!</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-primary" onClick={() => { setDuel({ mode: "join", room: invite.room }); setInvite(null); }}>Aceitar</button>
            <button type="button" className="btn btn-ghost" onClick={() => setInvite(null)}>Agora não</button>
          </div>
        </section>
      ) : null}

      <section className="card p-3">
        <div className="flex items-center gap-3">
          {team ? <KitChip t={team} size={40} /> : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{m.name} <small className="text-xs font-bold text-[var(--muted)]">#{m.num}</small></p>
            <p className="text-xs text-[var(--muted)]">{POSITIONS.find((p) => p.v === m.pos)?.label} · {m.age} anos · {m.teamName} · {lgInfo.flag} {lgInfo.short}</p>
          </div>
          <div className="text-center"><b className="block text-3xl font-black leading-none tabular-nums text-amber-500">{m.ovr}</b><small className="text-[10px] font-bold uppercase text-[var(--muted)]">força</small></div>
        </div>
        <div className="mt-3 space-y-1.5 text-[11px] font-bold">
          <div><div className="flex justify-between"><span>Experiência</span><span className="tabular-nums">{m.xp}/{m.xpMax}</span></div><Bar value={m.xp} max={m.xpMax} /></div>
          <div><div className="flex justify-between"><span>Reputação</span><span className="tabular-nums">{Math.round(m.rep)}/100</span></div><Bar value={m.rep} max={100} color="bg-sky-500" /></div>
        </div>
      </section>

      {summary ? (
        <section className="card border-2 border-emerald-400 p-3 text-sm">
          <p className="font-black">Partida registrada</p>
          <p className="text-xs">{summary}</p>
          <button type="button" className="mt-1 text-xs font-black text-[var(--muted)]" onClick={() => setSummary(null)}>Fechar</button>
        </section>
      ) : null}

      <div className="grid grid-cols-6 gap-1">
        {([["jogo", "Jogo"], ["treino", "Treino"], ["tabela", "Liga"], ["mundo", "Mundo"], ["amigos", "Amigos"], ["praca", "Praça"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-xl py-2 text-[13px] font-black ${tab === k ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>{l}{k === "praca" && online.length ? ` (${online.length})` : ""}</button>
        ))}
      </div>

      {tab === "jogo" ? (
        <>
          <section className="card p-3">
            <p className="text-[11px] font-black uppercase text-[var(--muted)]">Temporada {seasonLabel(2025 + view.season)} · rodada {Math.min(view.round + 1, view.rounds)} de {view.rounds}</p>
            {fx && opp && w ? (
              <>
                <p className="mt-1 flex items-center justify-between gap-2 font-black">
                  <span className="truncate">{tName(fx[0])}</span>
                  <span className="text-[var(--muted)]">x</span>
                  <span className="truncate">{tName(fx[1])}</span>
                </p>
                {humansOn(oppId!).length > 0 ? <p className="text-xs text-amber-600">🧑 Jogador(es) deste time no mundo: {humansOn(oppId!).map((p) => p.name).join(", ")}</p> : null}
                <p className="mt-1 text-xs text-[var(--muted)]">🗓 {whenLabel(w.start)} · você pode jogar até {whenLabel(w.end).split(" às ")[1]} da madrugada</p>
                {view.playedThis ? (
                  <p className="mt-2 rounded-xl bg-emerald-500/15 p-2 text-center text-sm font-black">✅ Seu jogo desta rodada já foi registrado</p>
                ) : open ? (
                  <button type="button" className="btn btn-primary mt-3 w-full !py-3 text-lg" onClick={play}>⚽ Jogar agora (3 contra 3)</button>
                ) : before ? (
                  <p className="mt-2 rounded-xl bg-[var(--bg)] p-2 text-center text-sm font-black">⏳ A bola rola em {inLabel(w.start, now)}</p>
                ) : (
                  <p className="mt-2 rounded-xl bg-[var(--bg)] p-2 text-center text-sm font-black">A janela fechou: o jogo está sendo fechado pelo mundo…</p>
                )}
              </>
            ) : w ? (
              <p className="mt-2 text-sm">Seu time está de folga nesta rodada. Próximos jogos do mundo: {whenLabel(w.start)}.</p>
            ) : (
              <p className="mt-2 text-sm">A temporada acabou. A próxima começa em breve.</p>
            )}
            <p className="mt-2 text-[11px] text-[var(--muted)]">Os jogos são sempre no domingo, às 15h. Quem não joga na hora tem o jogo simulado, com desempenho menor.</p>
          </section>

          {m.offers.length > 0 ? (
            <section className="card p-3">
              <p className="mb-2 text-sm font-black">📨 Propostas</p>
              {m.offers.map((o) => {
                const chosen = m.moveTo?.team === o.team;
                return (
                  <div key={o.team} className={`mb-1.5 flex items-center gap-2 rounded-xl p-2 ${chosen ? "bg-emerald-500/20 ring-1 ring-emerald-400" : "bg-[var(--bg)]"}`}>
                    <span className="min-w-0 flex-1"><b className="block truncate text-sm">{o.name} {LEAGUES.find((l) => l.key === o.league)?.flag}</b><small className="text-[11px] text-[var(--muted)]">Força {o.str} · {o.reason}</small></span>
                    <button type="button" className="btn btn-primary !px-3 !py-1.5 !text-xs" onClick={async () => { await worldDecide(chosen ? null : o.team); await load(); }}>{chosen ? "Escolhido ✓" : "Aceitar"}</button>
                  </div>
                );
              })}
              <p className="text-[11px] text-[var(--muted)]">{m.moveTo ? `Você vai para o ${m.moveTo.name} no fim da temporada.` : "A troca só vale no fim da temporada. Se não aceitar nenhuma, você fica."}</p>
            </section>
          ) : null}

          <section className="card p-3">
            <p className="mb-2 text-sm font-black">🎯 Missões</p>
            <ul className="space-y-1 text-xs">
              {m.missions.map((x) => (
                <li key={x.id} className="flex justify-between gap-2"><span className={x.done ? "text-emerald-600 line-through" : ""}>{x.kind === "match" ? "🎮" : "📅"} {x.text}</span><b className="shrink-0 text-[var(--muted)]">+{x.xp} XP</b></li>
              ))}
            </ul>
          </section>
          <section className="card p-3">
            <p className="mb-1 text-sm font-black">📊 Sua temporada</p>
            <p className="text-xs">{m.goals} gols · {m.assists} assistências · {m.apps} jogos · nota média {m.avg.toFixed(1).replace(".", ",")}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Carreira: {m.total.goals} gols, {m.total.assists} assistências, {m.total.apps} jogos. Troféus: {m.titles.length}.</p>
            {m.history.length > 0 ? <ul className="mt-2 space-y-0.5 text-[11px] text-[var(--muted)]">{m.history.map((h, i) => <li key={i}>{h.season} · {h.team} · {h.place}º · {h.goals} gols, {h.assists} assist.{h.note ? ` · ${h.note}` : ""}</li>)}</ul> : null}
          </section>
        </>
      ) : null}

      {tab === "treino" ? (
        <section className="card space-y-3 p-4">
          <p className="text-lg font-black">🏋️ Treino</p>
          <p className="text-xs text-[var(--muted)]">Jogue um amistoso contra qualquer time da sua liga, quando quiser. Não vale na tabela, não muda sua experiência nem sua reputação: é só para praticar.</p>
          <div className="grid grid-cols-3 gap-2">
            {([["easy", "Fácil"], ["normal", "Normal"], ["hard", "Difícil"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTrainLevel(k)} className={`rounded-xl py-2 text-sm font-black ${trainLevel === k ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>{l}</button>
            ))}
          </div>
          <ul className="grid max-h-[40vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {(teams ?? []).filter((t) => t.id !== m.team).sort((a, b) => b.str - a.str).map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setTrainOpp(t.id)} className={`flex w-full items-center gap-2 rounded-xl p-2 text-left ${trainOpp === t.id ? "bg-emerald-500/25 ring-2 ring-emerald-400" : "bg-[var(--line)]"}`}>
                  <KitChip t={t} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.name}</span>
                  <small className="text-xs text-[var(--muted)]">{t.str}</small>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" disabled={!trainOpp || !team} onClick={startTraining} className="btn btn-primary w-full !py-3 disabled:opacity-50">▶ Começar o treino</button>
        </section>
      ) : null}

      {tab === "tabela" ? (
        <>
          <section className="card overflow-hidden p-2">
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] uppercase text-[var(--muted)]"><tr><th className="py-1">#</th><th>Time</th><th className="text-right">J</th><th className="text-right">SG</th><th className="text-right">Pts</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={r.id === m.team ? "bg-amber-400/20 font-black" : ""}>
                    <td className="py-1 pl-1">{i + 1}</td>
                    <td>{tName(r.id)} {humanTeams.has(r.id) ? "🧑" : ""}</td>
                    <td className="text-right tabular-nums">{r.p}</td>
                    <td className="text-right tabular-nums">{r.gf - r.ga}</td>
                    <td className="text-right font-black tabular-nums">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 px-1 text-[10px] text-[var(--muted)]">🧑 = tem jogador do mundo aberto no time.</p>
          </section>
          <section className="card p-3 text-xs">
            <p className="mb-1 text-sm font-black">👟 Artilharia</p>
            <ol className="space-y-0.5">{view.scorers.map((t, i) => <li key={t.name + t.team} className={`flex justify-between ${view.players.some((p) => p.name === t.name && p.team === t.team) ? "font-black text-amber-600" : ""}`}><span>{i + 1}. {t.name} <small className="text-[var(--muted)]">{tName(t.team)}</small></span><b>{t.goals}</b></li>)}</ol>
            <p className="mb-1 mt-2 text-sm font-black">🅰️ Assistências</p>
            <ol className="space-y-0.5">{view.assisters.map((t, i) => <li key={t.name + t.team} className="flex justify-between"><span>{i + 1}. {t.name} <small className="text-[var(--muted)]">{tName(t.team)}</small></span><b>{t.assists}</b></li>)}</ol>
          </section>
        </>
      ) : null}

      {tab === "mundo" ? (
        <>
        {news === null || news.length > 0 ? (
          <section className="card border-2 border-amber-400 bg-gradient-to-br from-amber-500/10 to-transparent p-3">
            <p className="mb-2 text-sm font-black">🌍 Mundo da bola · destaques da semana</p>
            {news === null ? <p className="text-xs text-[var(--muted)]">Buscando as notícias…</p> : (
              <ol className="space-y-2">
                {news.map((n, i) => (
                  <li key={n.url}>
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="flex gap-2">
                      <b className="text-lg font-black leading-tight text-amber-500">{i + 1}</b>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black leading-snug">{n.title}</span>
                        <small className="text-[11px] text-[var(--muted)]">{n.source} · {ago(new Date(n.at).toISOString())}</small>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}
        <section className="card p-3">
          <p className="mb-2 text-sm font-black">📰 Linha do tempo do mundo</p>
          {view.feed.length === 0 ? <p className="text-xs text-[var(--muted)]">Nada aconteceu ainda. Os jogos começam no domingo, 01/11, às 15h.</p> : (
            <ul className="space-y-1.5">
              {view.feed.map((f, i) => (
                <li key={i} className="flex gap-2 text-xs"><span aria-hidden>{f.kind === "title" ? "🏆" : f.kind === "transfer" ? "✍️" : f.kind === "offer" ? "📨" : f.kind === "join" ? "👋" : f.kind === "level" ? "⬆️" : f.kind === "season" ? "📅" : "⚽"}</span><span className="min-w-0 flex-1">{f.text}</span><small className="shrink-0 text-[var(--muted)]">{ago(f.at)}</small></li>
              ))}
            </ul>
          )}
        </section>
        </>
      ) : null}

      {tab === "amigos" ? (
        <section className="space-y-1.5">
          <p className="px-1 text-xs text-[var(--muted)]">As carreiras de quem está no mundo aberto. Toque na ⭐ para fixar um amigo no topo.</p>
          {friends.length === 0 ? <p className="card p-3 text-center text-xs text-[var(--muted)]">Você é o primeiro por aqui. Chame os amigos!</p> : null}
          {friends.map((p) => {
            const t = LEAGUES.find((l) => l.key === p.league);
            return (
              <div key={p.userId} className="card flex items-center gap-2 p-2">
                <Avatar p={p} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{p.name} <small className="text-[var(--muted)]">#{p.num}</small></b>
                  <small className="block truncate text-[11px] text-[var(--muted)]">{t?.flag} {p.teamName} · {p.pos} · {p.age} anos</small>
                  <small className="block text-[11px]">{p.goals} gols · {p.assists} assist. · {p.apps} jogos{p.titles.length ? ` · 🏆 ${p.titles.length}` : ""}</small>
                </div>
                <div className="text-center"><b className="block text-xl tabular-nums text-amber-500">{p.ovr}</b><small className="text-[9px] uppercase text-[var(--muted)]">força</small></div>
                <button type="button" onClick={() => toggleFav(p.userId)} aria-label="Fixar" className="text-xl">{favSet.has(p.userId) ? "⭐" : "☆"}</button>
              </div>
            );
          })}
        </section>
      ) : null}

      {tab === "praca" ? (
        <section className="card p-3">
          <p className="mb-1 text-sm font-black">🏟 Praça do mundo</p>
          <p className="mb-2 text-xs text-[var(--muted)]">Quem está com o mundo aberto agora. Desafie alguém para um amistoso 1 contra 1 (não vale para a carreira).</p>
          {online.length === 0 ? <p className="text-xs text-[var(--muted)]">Ninguém mais por aqui agora.</p> : (
            <ul className="space-y-1.5">
              {online.map((o) => (
                <li key={o.id} className="flex items-center gap-2 rounded-xl bg-[var(--bg)] p-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--line)] text-xs font-black">{o.name?.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm">{o.name}</b><small className="text-[11px] text-[var(--muted)]">{o.team} · força {o.ovr}</small></span>
                  <button type="button" className="btn btn-primary !px-3 !py-1.5 !text-xs" onClick={() => setDuel({ mode: "create", to: o.id })}>⚽ Desafiar</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <button type="button" className="btn btn-ghost w-full" onClick={onBack}>← Voltar</button>
      <button type="button" className="text-center text-[11px] text-[var(--muted)] underline" onClick={async () => { if (window.confirm("Sair do mundo aberto e apagar esta carreira?")) { await worldLeave(); setView(null); await load(); } }}>
        Sair do mundo aberto
      </button>
    </div>
  );
}
