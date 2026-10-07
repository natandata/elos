"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { recordSoccerMatch } from "@/lib/actions/arenasoccer";
import { MODES, type Level, type Mode } from "@/lib/arenasoccer/engine";
import { ArenaSoccerGame, type MatchResult } from "./ArenaSoccerGame";

export type SoccerStats = { matches: number; wins: number; losses: number; draws: number; goals: number; minutes: number };

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#14b8a6", "#ec4899", "#ef4444", "#e5e7eb"];
const LEVELS: { v: Level; label: string; hint: string }[] = [
  { v: "easy", label: "Fácil", hint: "Computador mais lento e errando mais." },
  { v: "normal", label: "Normal", hint: "Um adversário equilibrado." },
  { v: "hard", label: "Difícil", hint: "Rápido, esperto e mira bem." },
];
const KEY = "arenasoccer:prefs:v1";

/** Menu do ArenaSoccer: escolhe o modo, o nível do computador e a cor do seu disco; mostra suas estatísticas. */
export function ArenaSoccerClient({ stats }: { stats: SoccerStats }) {
  const [mode, setMode] = useState<Mode>("1v1");
  const [level, setLevel] = useState<Level>("normal");
  const [color, setColor] = useState(COLORS[0]);
  const [playing, setPlaying] = useState(false);
  const [mine, setMine] = useState(stats);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { mode?: Mode; level?: Level; color?: string };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê as preferências salvas neste aparelho
      if (p.mode && p.mode in MODES) setMode(p.mode);
      if (p.level && LEVELS.some((l) => l.v === p.level)) setLevel(p.level);
      if (p.color && COLORS.includes(p.color)) setColor(p.color);
    } catch {
      /* sem preferências salvas */
    }
  }, []);

  function start() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ mode, level, color }));
    } catch {
      /* ok */
    }
    setSaveError(null);
    setPlaying(true);
  }

  async function finished(r: MatchResult) {
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

  if (playing) return <ArenaSoccerGame mode={mode} level={level} color={color} onFinish={(r) => void finished(r)} onExit={() => setPlaying(false)} />;

  const m = MODES[mode];
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border-[3px] border-emerald-400 bg-gradient-to-br from-[#0d3b22] via-[#146c3a] to-[#0b2a1a] p-5 text-white shadow-lg">
        <span className="absolute -right-3 -top-4 text-8xl opacity-25" aria-hidden>
          ⚽
        </span>
        <p className="text-3xl font-black tracking-wide [text-shadow:0_2px_0_#04180d]">ArenaSoccer</p>
        <p className="mt-1 max-w-xs text-sm font-bold text-emerald-100">Futebol arcade de física: um disco, uma bola e um botão de chute. Posicione-se, mire e marque.</p>
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

      <section className="card p-3">
        <p className="mb-2 text-sm font-black">Modo de jogo</p>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(MODES) as Mode[]).map((k) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-xl py-3 text-lg font-black ${mode === k ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
              {k}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Você{m.per > 1 ? ` e mais ${m.per - 1} do computador` : ""} contra {m.per} do computador. Vence quem chegar a {m.goals} gols ou tiver mais gols em {Math.floor(m.secs / 60)} minutos. Empatou? Gol de ouro.
        </p>
      </section>

      <section className="card p-3">
        <p className="mb-2 text-sm font-black">Nível do computador</p>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => (
            <button key={l.v} type="button" onClick={() => setLevel(l.v)} className={`rounded-xl py-2.5 text-sm font-black ${level === l.v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">{LEVELS.find((l) => l.v === level)?.hint}</p>
      </section>

      <section className="card p-3">
        <p className="mb-2 text-sm font-black">Cor do seu disco</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Cor ${c}`} className={`h-10 w-10 rounded-full border-4 ${color === c ? "border-white ring-2 ring-[var(--accent)]" : "border-transparent"}`} style={{ background: c }} />
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">A cor é só visual: ninguém corre mais ou chuta mais forte por causa dela.</p>
      </section>

      <button type="button" onClick={start} className="btn btn-primary w-full !py-4 text-lg">
        ▶ Jogar {mode}
      </button>
      {saveError ? <p className="text-center text-xs font-semibold text-rose-600">{saveError}</p> : null}

      <section className="card p-3 text-xs text-[var(--muted)]">
        <p className="mb-1 text-sm font-black text-[var(--fg)]">Como jogar</p>
        <p>
          <b>Mover:</b> WASD ou setas (no celular, o joystick). <b>Chutar:</b> Espaço (no celular, o botão CHUTAR). O chute só pega quando a bola está colada em você, e a direção vem da posição da bola em relação ao seu disco: chegue pelo lado certo. Use as paredes para rebater.
        </p>
      </section>

      <Link href="/app/jogos" className="btn btn-ghost w-full">
        ← Voltar aos jogos
      </Link>
    </div>
  );
}
