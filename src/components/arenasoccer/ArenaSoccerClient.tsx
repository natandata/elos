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
export function ArenaSoccerClient(props: { stats: SoccerStats; myName?: string; myId?: string }) {
  return (
    <div className="pes-scope">
      <Menu {...props} />
    </div>
  );
}

type Tile = { icon: React.ReactNode; title: string; sub: string; rgb: string; onClick: () => void };
function MenuTile({ icon, title, sub, rgb, onClick }: Tile) {
  return (
    <button type="button" onClick={onClick} className="pes-tile" style={{ ["--tile" as string]: rgb }}>
      <span className="pes-tile-ico" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <b className="pes-title block truncate text-base leading-tight">{title}</b>
        <small className="mt-0.5 block text-[11px] font-semibold leading-snug text-white/65">{sub}</small>
      </span>
      <span className="text-xl font-black text-white/40" aria-hidden>
        ›
      </span>
    </button>
  );
}

function Menu({ stats, myName = "Jogador", myId = "" }: { stats: SoccerStats; myName?: string; myId?: string }) {
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
    <div className="space-y-3">
      <section className="pes-panel">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">Bem-vindo, {myName} · sua campanha</p>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          {[
            ["Partidas", mine.matches],
            ["Vitórias", mine.wins],
            ["Gols", mine.goals],
            ["Minutos", mine.minutes],
          ].map(([l, v]) => (
            <span key={l as string} className="rounded-lg bg-white/[0.08] px-1 py-2">
              <b className="pes-title block text-2xl leading-none tabular-nums text-amber-300">{v}</b>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{l}</span>
            </span>
          ))}
        </div>
      </section>

      <button type="button" onClick={() => setQuick(true)} className="pes-card pes-cut-lg w-full bg-gradient-to-r from-emerald-400 to-emerald-600 px-4 py-4 text-left shadow-[0_0_26px_rgba(52,211,153,0.45)]">
        <span className="flex items-center gap-3 text-[#04200f]">
          <span className="text-4xl" aria-hidden>
            ⚽
          </span>
          <span className="min-w-0 flex-1">
            <b className="pes-title block text-xl leading-tight">Amistoso</b>
            <small className="block text-[11px] font-bold">Escolha o time, monte a equipe e jogue agora</small>
          </span>
          <b className="pes-title text-2xl">▶</b>
        </span>
      </button>

      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">Campeonatos</p>
      <MenuTile icon="🏆" title="Copa do Mundo" sub="As últimas 7 Copas (2002–2026), com as seleções e elencos de verdade." rgb="251, 191, 36" onClick={() => setComp("cup")} />
      <MenuTile icon={/* eslint-disable-next-line @next/next/no-img-element */ <img src="/arenasoccer/crests/league/br.png" alt="" className="h-9 w-9 rounded-md bg-white object-contain p-0.5" />} title="Campeonato Brasileiro 2026" sub="20 times, 38 rodadas e os elencos de hoje." rgb="52, 211, 153" onClick={() => setComp("br")} />
      <MenuTile icon="⭐" title="Modo carreira" sub="Comece num time, jogue temporadas, vire artilheiro e receba propostas." rgb="167, 139, 250" onClick={() => setComp("career")} />

      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">Online</p>
      <MenuTile icon="🌐" title="1 contra 1" sub="Jogue contra outro jogador, de qualquer Elo." rgb="56, 189, 248" onClick={() => setOnline(true)} />
      <MenuTile icon="👥" title="Online em equipe" sub="2×2, 3×3 e 4×4 com times de verdade." rgb="244, 114, 182" onClick={() => setTeamOnline(true)} />

      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">Consulta</p>
      <MenuTile icon="📋" title="Times e elencos" sub="Todos os times do jogo, com os jogadores e o overall de cada um." rgb="148, 163, 184" onClick={() => setTimes(true)} />
      {saveError ? <p className="text-center text-xs font-semibold text-rose-400">{saveError}</p> : null}

      <section className="card p-3 text-xs text-[var(--muted)]">
        <p className="mb-1 text-sm font-black uppercase italic tracking-wider text-white">Como jogar</p>
        <p>
          <b className="text-white">Antes do jogo:</b> escolha a formação, a mentalidade e os titulares. <b className="text-white">Durante a partida:</b> o jogo corre minuto a minuto; quando o seu time cria uma chance, abre o lance decisivo. <b className="text-white">No lance:</b> desenhe com o dedo o passe ou o cruzamento até um companheiro livre e, na finalização, arraste da bola até o canto do gol. Faça uma curva para contornar a defesa e enganar o goleiro. Se preferir, toque em &ldquo;Deixar o time resolver&rdquo;.
        </p>
      </section>

      <Link href="/app/jogos" className="btn btn-ghost w-full">
        ← Voltar aos jogos
      </Link>
    </div>
  );
}
