"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { finishArena, startArena, type ArenaFinish } from "@/lib/actions/arena";
import { ARENA_CARD_BY_KEY, STARTER_DECK } from "@/lib/arena/cards";
import {
  BRIDGES,
  DOUBLE_MANA_TICK,
  H,
  MANA_MAX,
  MATCH_TICKS,
  RIVER_BOT,
  RIVER_TOP,
  TICKS_PER_SEC,
  W,
  inDeployZone,
  inField,
  type GameEvent,
  type GameState,
  type Input,
} from "@/lib/arena/core";
import { createGame, step } from "@/lib/arena/engine";

type Phase = "intro" | "playing" | "finishing" | "result";

type Fx =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; ranged: boolean; side: number; ttl: number }
  | { kind: "spell"; emoji: string; x: number; y: number; r: number; ttl: number; max: number }
  | { kind: "puff"; x: number; y: number; big: boolean; ttl: number };

type Hud = { mana: number; tick: number; crowns: [number, number]; slots: string[]; next: string };

const STEP_MS = 1000 / TICKS_PER_SEC;
const SIDE_COLOR = ["#2563eb", "#dc2626"];

function fmtTime(ticks: number): string {
  const s = Math.max(0, Math.ceil((MATCH_TICKS - ticks) / TICKS_PER_SEC));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ArenaGame({ winsToday, maxWins }: { winsToday: number; maxWins: number }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<ArenaFinish | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const matchRef = useRef<string | null>(null);
  const pendingRef = useRef<Input[]>([]);
  const logRef = useRef<Input[]>([]);
  const fxRef = useRef<Fx[]>([]);
  const selectedRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const surrenderedRef = useRef(false);

  selectedRef.current = selected;

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  useEffect(() => stopLoop, [stopLoop]);

  // ------------------------------------------------------------ desenho
  const draw = useCallback((alpha: number) => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = canvas.clientWidth / W;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(canvas.clientWidth * dpr)) {
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // grama em faixas
    for (let row = 0; row < H; row++) {
      ctx.fillStyle = row % 2 === 0 ? "#5a9a47" : "#52903f";
      ctx.fillRect(0, row * s, W * s, s + 1);
    }
    // rio e pontes
    ctx.fillStyle = "#3b82c4";
    ctx.fillRect(0, RIVER_TOP * s, W * s, (RIVER_BOT - RIVER_TOP) * s);
    ctx.fillStyle = "#a16207";
    for (const b of BRIDGES) ctx.fillRect((b - 1.2) * s, (RIVER_TOP - 0.15) * s, 2.4 * s, (RIVER_BOT - RIVER_TOP + 0.3) * s);

    // zona de colocação quando há uma carta de tropa escolhida
    const sel = selectedRef.current;
    if (sel !== null) {
      const card = ARENA_CARD_BY_KEY.get(game.slots[0][sel]);
      if (card?.kind === "unit") {
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(0, (RIVER_BOT + 0.6) * s, W * s, (H - RIVER_BOT - 0.6) * s);
      }
    }

    const lerp = (a: number, b: number) => a + (b - a) * alpha;
    const emojiSize = (r: number) => Math.max(14, r * 2.1 * s);

    // construções primeiro, tropas por cima
    const ordered = [...game.entities].sort((a, b) => (a.type === b.type ? a.y - b.y : a.type === "tower" ? -1 : 1));
    for (const e of ordered) {
      const x = lerp(e.px, e.x) * s;
      const y = lerp(e.py, e.y) * s - (e.flying ? 0.5 * s : 0);
      const r = e.radius * s;
      if (e.flying) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(x, y + 0.5 * s + r * 0.6, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = e.type === "tower" ? `${SIDE_COLOR[e.side]}55` : `${SIDE_COLOR[e.side]}88`;
      ctx.strokeStyle = SIDE_COLOR[e.side];
      ctx.lineWidth = e.type === "tower" ? 3 : 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${emojiSize(e.radius)}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      const emoji = e.type === "tower" ? (e.card === "santuario" ? "⛪" : "🗼") : (ARENA_CARD_BY_KEY.get(e.card)?.emoji ?? "❔");
      ctx.fillStyle = "#000";
      ctx.fillText(emoji, x, y + 1);

      // barra de vida
      if (e.hp < e.maxHp || e.type === "tower") {
        const bw = Math.max(r * 2, 0.9 * s);
        const by = y - r - 6;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(x - bw / 2, by, bw, 4);
        ctx.fillStyle = e.side === 0 ? "#22c55e" : "#ef4444";
        ctx.fillRect(x - bw / 2, by, Math.max(0, (e.hp / e.maxHp) * bw), 4);
      }
    }

    // efeitos
    for (const f of fxRef.current) {
      if (f.kind === "line") {
        ctx.strokeStyle = f.ranged ? "rgba(255,255,255,0.85)" : "rgba(255,240,150,0.9)";
        ctx.lineWidth = f.ranged ? 2 : 4;
        ctx.beginPath();
        ctx.moveTo(f.x1 * s, f.y1 * s);
        ctx.lineTo(f.x2 * s, f.y2 * s);
        ctx.stroke();
      } else if (f.kind === "spell") {
        const t = 1 - f.ttl / f.max;
        ctx.fillStyle = `rgba(255,200,60,${0.45 * (1 - t)})`;
        ctx.beginPath();
        ctx.arc(f.x * s, f.y * s, f.r * s * (0.6 + 0.4 * t), 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${f.r * s}px system-ui, "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 1 - t;
        ctx.fillText(f.emoji, f.x * s, f.y * s);
        ctx.globalAlpha = 1;
      } else {
        ctx.font = `${(f.big ? 2.2 : 1.2) * s}px system-ui, "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = Math.min(1, f.ttl / 6);
        ctx.fillText("💥", f.x * s, f.y * s);
        ctx.globalAlpha = 1;
      }
    }
  }, []);

  // ------------------------------------------------------------ laço do jogo
  const finish = useCallback(
    async (surrender: boolean) => {
      stopLoop();
      setPhase("finishing");
      try {
        const res = await finishArena({ matchId: matchRef.current!, inputs: logRef.current, surrender });
        setVerdict(res);
      } catch {
        setVerdict({ error: "Sem conexão. Não foi possível confirmar o resultado." });
      }
      setPhase("result");
    },
    [stopLoop],
  );

  const startLoop = useCallback(() => {
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      const game = gameRef.current;
      if (!game) return;
      acc += Math.min(250, now - last);
      last = now;
      let guard = 0;
      while (acc >= STEP_MS && !game.over && guard++ < 10) {
        const inputs = pendingRef.current;
        pendingRef.current = [];
        const ev: GameEvent[] = step(game, inputs, [1]);
        for (const e of ev) {
          if (e.t === "attack") fxRef.current.push({ kind: "line", x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, ranged: e.ranged, side: e.side, ttl: e.ranged ? 3 : 2 });
          else if (e.t === "spell") fxRef.current.push({ kind: "spell", emoji: ARENA_CARD_BY_KEY.get(e.key)?.emoji ?? "✨", x: e.x, y: e.y, r: e.r, ttl: 14, max: 14 });
          else if (e.t === "death") fxRef.current.push({ kind: "puff", x: e.x, y: e.y, big: e.tower, ttl: e.tower ? 20 : 8 });
        }
        fxRef.current = fxRef.current.map((f) => ({ ...f, ttl: f.ttl - 1 })).filter((f) => f.ttl > 0);
        acc -= STEP_MS;
        if (game.tick % 4 === 0 || game.over) {
          setHud({ mana: game.mana[0], tick: game.tick, crowns: [game.crowns[0], game.crowns[1]], slots: [...game.slots[0]], next: game.queue[0][0] });
        }
      }
      draw(Math.min(1, acc / STEP_MS));
      if (game.over) {
        draw(1);
        void finish(false);
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [draw, finish]);

  async function begin() {
    setError(null);
    setVerdict(null);
    const res: { error?: string; matchId?: string; seed?: number } = await startArena().catch(() => ({
      error: "Sem conexão. Tente de novo.",
    }));
    if (res.error || !res.matchId || res.seed === undefined) {
      setError(res.error ?? "Não foi possível começar.");
      return;
    }
    matchRef.current = res.matchId;
    const game = createGame(res.seed, STARTER_DECK);
    gameRef.current = game;
    pendingRef.current = [];
    logRef.current = [];
    fxRef.current = [];
    surrenderedRef.current = false;
    setSelected(null);
    setHud({ mana: game.mana[0], tick: 0, crowns: [0, 0], slots: [...game.slots[0]], next: game.queue[0][0] });
    setPhase("playing");
  }

  // quando entra em "playing" o canvas já existe: dimensiona e liga o laço
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (canvas && wrap) {
      // o campo precisa deixar espaço pra mão de cartas na mesma tela
      const maxH = Math.max(320, window.innerHeight - 300);
      const w = Math.min(wrap.clientWidth, 440, (maxH * W) / H);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${(w * H) / W}px`;
    }
    startLoop();
    return stopLoop;
  }, [phase, startLoop, stopLoop]);

  function onCanvasPointer(ev: React.PointerEvent<HTMLCanvasElement>) {
    const game = gameRef.current;
    const slot = selectedRef.current;
    if (!game || game.over || slot === null) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * W;
    const y = ((ev.clientY - rect.top) / rect.height) * H;
    const card = ARENA_CARD_BY_KEY.get(game.slots[0][slot]);
    if (!card || game.mana[0] + 1e-9 < card.cost) return;
    if (card.kind === "unit" ? !inDeployZone(0, x, y) : !inField(x, y)) return;
    const input: Input = { tick: game.tick, side: 0, slot, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
    pendingRef.current.push(input);
    logRef.current.push(input);
    setSelected(null);
  }

  function surrender() {
    if (phase !== "playing") return;
    surrenderedRef.current = true;
    void finish(true);
  }

  // ------------------------------------------------------------ telas
  const header = <PageHeader title="🏰 Arena dos Heróis" subtitle="Enfrente o computador com heróis e poderes bíblicos." />;

  if (phase === "intro") {
    return (
      <div>
        {header}
        <div className="card mb-4 p-5">
          <p className="text-lg font-black">Como jogar</p>
          <ul className="mt-2 space-y-1.5 text-sm font-semibold text-[var(--muted)]">
            <li>💧 O Maná enche sozinho. Cada carta custa um pouco dele.</li>
            <li>👆 Toque numa carta e depois no campo (na sua metade) pra colocar o herói.</li>
            <li>🗼 Derrube as Atalaias (1 coroa) e o Santuário (3 coroas) do computador.</li>
            <li>⏱️ São 3 minutos. No último minuto o Maná enche em dobro!</li>
          </ul>
        </div>
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Seu baralho</p>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {STARTER_DECK.map((k) => {
            const c = ARENA_CARD_BY_KEY.get(k)!;
            return (
              <div key={k} className="relative rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] p-2 text-center">
                <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">{c.cost}</span>
                <p className="text-3xl" aria-hidden>
                  {c.emoji}
                </p>
                <p className="mt-1 text-[10px] font-bold leading-tight">{c.name}</p>
              </div>
            );
          })}
        </div>
        <p className="mb-3 text-center text-sm font-bold text-[var(--muted)]">
          Vitórias que valem XP hoje: {winsToday}/{maxWins} · cada vitória = +1 XP
        </p>
        {error ? <p className="mb-3 text-center text-sm font-semibold text-rose-600">{error}</p> : null}
        <button type="button" onClick={begin} className="btn btn-primary w-full !py-4 !text-lg">
          ⚔️ Jogar contra o computador
        </button>
        <Link href="/app/jogos" className="btn btn-ghost mt-3 w-full">
          ← Voltar aos jogos
        </Link>
      </div>
    );
  }

  if (phase === "result" || phase === "finishing") {
    const r = verdict;
    const result = r?.result;
    return (
      <>
      {header}
      <div className="card p-6 text-center">
        {phase === "finishing" || !r ? (
          <p className="text-lg font-black">Conferindo o resultado…</p>
        ) : r.error ? (
          <>
            <p className="text-5xl" aria-hidden>
              ⚠️
            </p>
            <p className="mt-2 font-bold text-rose-700">{r.error}</p>
          </>
        ) : (
          <>
            <p className="text-6xl" aria-hidden>
              {result === "win" ? "🏆" : result === "draw" ? "🤝" : "😅"}
            </p>
            <h2 className="mt-2 text-2xl font-black">{result === "win" ? "Vitória!" : result === "draw" ? "Empate" : "Derrota"}</h2>
            <p className="mt-1 text-lg font-bold tabular-nums">
              👑 {r.crownsMe ?? 0} x {r.crownsBot ?? 0} 👑
            </p>
            {(r.xp ?? 0) > 0 ? (
              <p className="mt-3 inline-block rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-lg font-black text-[var(--accent-strong)]">
                +{r.xp} XP
              </p>
            ) : result === "win" ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Você já ganhou o XP máximo de vitórias hoje (ou venceu rápido demais).</p>
            ) : null}
          </>
        )}
        {phase === "result" ? (
          <div className="mt-6 grid gap-3">
            <button type="button" onClick={() => setPhase("intro")} className="btn btn-primary !py-3 !text-base">
              Jogar de novo
            </button>
            <Link href="/app/jogos" className="btn btn-ghost">
              Voltar aos jogos
            </Link>
          </div>
        ) : null}
      </div>
      </>
    );
  }

  // jogando
  const slots = hud?.slots ?? [];
  const mana = hud?.mana ?? 0;
  const doubled = (hud?.tick ?? 0) >= DOUBLE_MANA_TICK;
  return (
    <div ref={wrapRef} className="mx-auto w-full max-w-[440px] select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-black">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">Você 👑 {hud?.crowns[0] ?? 0}</span>
        <span className="tabular-nums">
          ⏱️ {fmtTime(hud?.tick ?? 0)}
          {doubled ? <span className="ml-1 text-violet-600">Maná x2!</span> : null}
        </span>
        <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">Computador 👑 {hud?.crowns[1] ?? 0}</span>
      </div>

      <canvas ref={canvasRef} onPointerDown={onCanvasPointer} className="mx-auto block touch-none rounded-2xl" />

      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            💧
          </span>
          <div className="flex h-5 flex-1 gap-0.5">
            {Array.from({ length: MANA_MAX }).map((_, i) => (
              <div key={i} className="flex-1 overflow-hidden rounded bg-violet-200">
                <div className="h-full bg-violet-600" style={{ width: `${Math.max(0, Math.min(1, mana - i)) * 100}%` }} />
              </div>
            ))}
          </div>
          <span className="w-6 text-right text-sm font-black tabular-nums">{Math.floor(mana)}</span>
        </div>

        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {slots.map((key, i) => {
            const c = ARENA_CARD_BY_KEY.get(key);
            if (!c) return <div key={i} />;
            const can = mana + 1e-9 >= c.cost;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(selected === i ? null : i)}
                className={`relative rounded-xl border-2 px-1 pb-1 pt-3 text-center transition active:scale-95 ${
                  selected === i ? "border-amber-400 bg-amber-50" : "border-[var(--line)] bg-[var(--card)]"
                } ${can ? "" : "opacity-45"}`}
              >
                <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-black text-white">{c.cost}</span>
                <span className="block text-2xl" aria-hidden>
                  {c.emoji}
                </span>
                <span className="block text-[9px] font-bold leading-tight">{c.name}</span>
              </button>
            );
          })}
          <div className="flex flex-col items-center justify-center rounded-xl bg-[var(--bg)] text-center">
            <span className="text-[9px] font-bold text-[var(--muted)]">Próxima</span>
            <span className="text-xl" aria-hidden>
              {ARENA_CARD_BY_KEY.get(hud?.next ?? "")?.emoji ?? ""}
            </span>
          </div>
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-[var(--muted)]">
          {selected !== null ? "Agora toque no campo pra colocar a carta." : "Toque numa carta e depois no campo."}
        </p>
        <button type="button" onClick={surrender} className="btn btn-ghost mt-2 w-full !py-2 !text-xs">
          Desistir da partida
        </button>
      </div>
    </div>
  );
}
