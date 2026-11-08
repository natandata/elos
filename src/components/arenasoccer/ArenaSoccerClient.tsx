"use client";

import Link from "next/link";
import { useState } from "react";
import { recordSoccerMatch } from "@/lib/actions/arenasoccer";
import type { MatchResult } from "./ArenaSoccerGame";
import { ArenaSoccerOnline } from "./ArenaSoccerOnline";
import { ArenaSoccerTeamRoom } from "./ArenaSoccerTeamRoom";
import { CareerMode } from "./CareerMode";
import { CupMode } from "./CupMode";
import { WorldMode } from "./WorldMode";
import { LeagueMode } from "./LeagueMode";
import { QuickMatch } from "./QuickMatch";
import { TimesView } from "./TimesView";

export type SoccerStats = { matches: number; wins: number; losses: number; draws: number; goals: number; minutes: number };

/** Cor de identificação nas salas online (a partida em si usa os uniformes dos times). */
const COLOR = "#3b82f6";

/** Menu do ArenaSoccer: amistoso, campeonatos, carreira, online e a lista de times; mostra suas estatísticas. */
export function ArenaSoccerClient({ stats, myName = "Jogador", myId = "" }: { stats: SoccerStats; myName?: string; myId?: string }) {
  const [quick, setQuick] = useState(false);
  const [times, setTimes] = useState(false);
  const [online, setOnline] = useState(false);
  const [teamOnline, setTeamOnline] = useState(false);
  const [comp, setComp] = useState<"cup" | "br" | "career" | null>(null);
  const [careerKind, setCareerKind] = useState<"solo" | "world" | null>(null);
  const [mine, setMine] = useState(stats);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function finished(r: MatchResult) {
    setSaveError(null);
    const res = await recordSoccerMatch(r);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    setMine((s) => ({
      ...s,
      matches: s.matches + 1,
      wins: s.wins + (r.result === "win" ? 1 : 0),
      losses: s.losses + (r.result === "loss" ? 1 : 0),
      draws: s.draws + (r.result === "draw" ? 1 : 0),
      goals: s.goals + r.goalsFor,
      minutes: s.minutes + Math.round(r.secs / 60),
    }));
  }

  if (times) return <TimesView onBack={() => setTimes(false)} />;
  if (quick) return <QuickMatch onRecord={(r) => void finished(r)} onBack={() => setQuick(false)} />;
  if (comp === "cup") return <CupMode color={COLOR} onRecord={(r) => void finished(r)} onBack={() => setComp(null)} />;
  if (comp === "br") return <LeagueMode color={COLOR} onRecord={(r) => void finished(r)} onBack={() => setComp(null)} />;
  if (comp === "career") {
    if (careerKind === "solo") return <CareerMode color={COLOR} myName={myName} onRecord={(r) => void finished(r)} onBack={() => setCareerKind(null)} />;
    if (careerKind === "world") return <WorldMode color={COLOR} myId={myId} myName={myName} onRecord={(r) => void finished(r)} onBack={() => setCareerKind(null)} />;
    return (
      <div className="space-y-3">
        <section className="card p-4">
          <p className="text-lg font-black">⭐ Modo carreira</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Escolha como quer fazer a sua carreira.</p>
        </section>
        <button type="button" onClick={() => setCareerKind("world")} className="card flex w-full items-center gap-3 p-4 text-left ring-2 ring-emerald-400">
          <span className="text-4xl" aria-hidden>🌍</span>
          <span><b className="block text-base">Mundo aberto (online)</b><small className="text-xs text-[var(--muted)]">Todos jogam os mesmos campeonatos, em dias fixos à noite. Acompanhe a carreira dos amigos e encontre-os na Praça.</small></span>
        </button>
        <button type="button" onClick={() => setCareerKind("solo")} className="card flex w-full items-center gap-3 p-4 text-left">
          <span className="text-4xl" aria-hidden>🎮</span>
          <span><b className="block text-base">Carreira solo</b><small className="text-xs text-[var(--muted)]">Só você, no seu ritmo: jogue quando quiser, sem horário.</small></span>
        </button>
        <button type="button" onClick={() => setComp(null)} className="btn btn-ghost w-full">← Voltar</button>
      </div>
    );
  }
  if (teamOnline) return <ArenaSoccerTeamRoom color={COLOR} myId={myId} myName={myName} onFinish={(r) => void finished(r)} onBack={() => setTeamOnline(false)} />;
  if (online) return <ArenaSoccerOnline color={COLOR} myName={myName} onFinish={(r) => void finished(r)} onBack={() => setOnline(false)} />;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border-[3px] border-emerald-400 bg-gradient-to-br from-[#0d3b22] via-[#146c3a] to-[#0b2a1a] p-5 text-white shadow-lg">
        <span className="absolute -right-3 -top-4 text-8xl opacity-25" aria-hidden>
          ⚽
        </span>
        <p className="text-3xl font-black tracking-wide [text-shadow:0_2px_0_#04180d]">ArenaSoccer</p>
        <p className="mt-1 max-w-xs text-sm font-bold text-emerald-100">Escale o seu time, defina a tática e decida os lances de gol com o dedo: desenhe o passe e mire no ângulo.</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            ["Partidas", mine.matches],
            ["Vitórias", mine.wins],
            ["Gols", mine.goals],
            ["Minutos", mine.minutes],
          ].map(([l, v]) => (
            <span key={l as string} className="rounded-xl bg-black/30 px-1 py-2">
              <b className="block text-xl font-black tabular-nums text-amber-300">{v}</b>
              <span className="text-[10px] font-bold uppercase">{l}</span>
            </span>
          ))}
        </div>
      </section>

      <button type="button" onClick={() => setQuick(true)} className="btn btn-primary w-full !py-4 text-lg">
        ⚽ Amistoso: escalar e jogar
      </button>
      <button type="button" onClick={() => setTimes(true)} className="btn w-full !py-3 text-base ring-2 ring-sky-400">
        📋 Times e elencos
      </button>

      <section className="space-y-2">
        <p className="px-1 text-sm font-black">Campeonatos (contra o computador)</p>
        <button type="button" onClick={() => setComp("cup")} className="card flex w-full items-center gap-3 p-3 text-left">
          <span className="text-3xl" aria-hidden>🏆</span>
          <span><b className="block">Copa do Mundo</b><small className="text-xs text-[var(--muted)]">As últimas 7 Copas (2002–2026), com as seleções e elencos de verdade.</small></span>
        </button>
        <button type="button" onClick={() => setComp("br")} className="card flex w-full items-center gap-3 p-3 text-left">
          <span className="text-3xl" aria-hidden>🇧🇷</span>
          <span><b className="block">Campeonato Brasileiro 2026</b><small className="text-xs text-[var(--muted)]">20 times, 38 rodadas e os elencos de hoje.</small></span>
        </button>
        <button type="button" onClick={() => setComp("career")} className="card flex w-full items-center gap-3 p-3 text-left">
          <span className="text-3xl" aria-hidden>⭐</span>
          <span><b className="block">Modo carreira</b><small className="text-xs text-[var(--muted)]">Comece num time de uma liga, jogue temporadas, vire artilheiro e receba propostas.</small></span>
        </button>
      </section>

      <button type="button" onClick={() => setOnline(true)} className="btn w-full !py-4 text-lg ring-2 ring-emerald-400">
        🌐 Jogar online contra outro jogador
      </button>
      <button type="button" onClick={() => setTeamOnline(true)} className="btn w-full !py-4 text-lg ring-2 ring-sky-400">
        🌐 Online em equipe (2×2, 3×3, 4×4) com times de verdade
      </button>
      {saveError ? <p className="text-center text-xs font-semibold text-rose-600">{saveError}</p> : null}

      <section className="card p-3 text-xs text-[var(--muted)]">
        <p className="mb-1 text-sm font-black text-[var(--fg)]">Como jogar</p>
        <p>
          <b>Antes do jogo:</b> escolha a formação, a mentalidade e os titulares. <b>Durante a partida:</b> o jogo corre minuto a minuto; quando o seu time cria uma chance, abre o lance decisivo. <b>No lance:</b> desenhe com o dedo o passe ou o cruzamento até um companheiro livre e, na finalização, arraste da bola até o canto do gol. Quanto melhor o jogador, mais certeira a mira; o goleiro e a zaga podem defender. Se preferir, toque em &ldquo;Deixar o time resolver&rdquo;.
        </p>
      </section>

      <Link href="/app/jogos" className="btn btn-ghost w-full">
        ← Voltar aos jogos
      </Link>
    </div>
  );
}
