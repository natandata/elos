"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { thinkAll } from "@/lib/arenasoccer/ai";
import { advance, MODES, newGame, type Game, type Level, type Mode } from "@/lib/arenasoccer/engine";
import { burst, confetti, draw, newFx, stepFx } from "@/lib/arenasoccer/render";
import { Sfx } from "@/lib/arenasoccer/sound";

export type MatchResult = { mode: Mode; level: Level; goalsFor: number; goalsAgainst: number; secs: number; result: "win" | "loss" | "draw" };

type Hud = { s0: number; s1: number; time: string; overtime: boolean; phase: Game["phase"] };

const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;

/** Matiz (0–360) de uma cor "#rrggbb"; cinza/branco devolve -1. */
function hueOf(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 0.12) return -1;
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Cor do adversário: a mais distante da sua (para nunca confundir os times). */
export function opponentColor(mine: string): string {
  const h = hueOf(mine);
  const options = ["#ef4444", "#3b82f6", "#f59e0b", "#22c55e"];
  if (h < 0) return "#ef4444";
  let best = options[0];
  let bd = -1;
  for (const o of options) {
    const ho = hueOf(o);
    const d = Math.min(Math.abs(ho - h), 360 - Math.abs(ho - h));
    // vermelho e azul são as cores "clássicas": ficam com a preferência se forem bem distintas da sua
    if (d >= 110) return o;
    if (d > bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

/** Partida de ArenaSoccer contra o computador: tela cheia, teclado ou joystick virtual + botão de chute. */
export function ArenaSoccerGame({ mode, level, color, onFinish, onExit }: { mode: Mode; level: Level; color: string; onFinish: (r: MatchResult) => void; onExit: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const keys = useRef(new Set<string>());
  const joy = useRef({ x: 0, y: 0, id: -1 });
  const kickHeld = useRef(false);
  const pausedRef = useRef(false);
  const rotatedRef = useRef(false);
  const doneRef = useRef(false);
  const phaseRef = useRef<Game["phase"]>("countdown");
  const onFinishRef = useRef(onFinish);
  const [round, setRound] = useState(0);
  const [hud, setHud] = useState<Hud>({ s0: 0, s1: 0, time: fmt(MODES[mode].secs), overtime: false, phase: "countdown" });
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [end, setEnd] = useState<MatchResult | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });

  useEffect(() => {
    onFinishRef.current = onFinish;
  });
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    rotatedRef.current = rotated;
  }, [rotated]);
  useEffect(() => {
    if (sfxRef.current) sfxRef.current.muted = muted;
  }, [muted]);

  // trava a rolagem da página por baixo e pausa quando a aba some
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const vis = () => {
      if (document.hidden && phaseRef.current !== "end") setPaused(true);
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  // toque e orientação
  useEffect(() => {
    const upd = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      setTouch(coarse);
      setRotated(coarse && window.innerHeight > window.innerWidth * 1.05);
    };
    upd();
    window.addEventListener("resize", upd);
    window.addEventListener("orientationchange", upd);
    return () => {
      window.removeEventListener("resize", upd);
      window.removeEventListener("orientationchange", upd);
    };
  }, []);

  // teclado
  useEffect(() => {
    const MINE = ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "k"];
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (MINE.includes(k)) e.preventDefault();
      if ((k === "escape" || k === "p") && !e.repeat) setPaused((p) => !p);
      keys.current.add(k);
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // sem isto, soltar a barra de espaço "clica" no último botão tocado (pausa, som...)
      if (MINE.includes(k)) e.preventDefault();
      keys.current.delete(k);
    };
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const teamColors: [string, string] = [color, opponentColor(color)];

  // laço da partida
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = newGame(mode);
    const fx = newFx();
    doneRef.current = false;
    phaseRef.current = "countdown";
    if (!sfxRef.current) sfxRef.current = new Sfx();
    sfxRef.current.muted = muted;
    const sfx = sfxRef.current;
    const colors: [string, string] = [color, opponentColor(color)];
    let aw = 0;
    let ah = 0;
    let dpr = 1;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      aw = r.width;
      ah = r.height;
      canvas.width = Math.max(1, Math.round(aw * dpr));
      canvas.height = Math.max(1, Math.round(ah * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let last = performance.now();
    let raf = 0;
    let lastHud = "";
    const human = g.players[0];
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        // entrada do jogador: teclado + joystick (na tela, "para cima" é o ataque quando o campo está girado)
        const k = keys.current;
        let sx = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
        let sy = (k.has("s") || k.has("arrowdown") ? 1 : 0) - (k.has("w") || k.has("arrowup") ? 1 : 0);
        if (joy.current.id !== -1) {
          sx = joy.current.x;
          sy = joy.current.y;
        }
        const mx = rotatedRef.current ? -sy : sx;
        const my = rotatedRef.current ? sx : sy;
        human.input = { mx, my, kick: k.has(" ") || k.has("k") || kickHeld.current };
        thinkAll(g, [level, level], dt);
        advance(g, dt);
        stepFx(fx, dt);
        for (const e of g.events) {
          if (e.k === "kick") {
            sfx.kick(e.power);
            burst(fx, e.x, e.y, "#ffffff", 6, 160);
          } else if (e.k === "wall") sfx.wall(e.v);
          else if (e.k === "goal") {
            sfx.goal();
            const gx = e.team === 0 ? g.w + 20 : -20;
            confetti(fx, gx, g.h / 2);
            fx.rings.push({ x: gx, y: g.h / 2, life: 0.5, color: colors[e.team] });
            fx.shake = 9;
            fx.banner = { text: e.team === 0 ? "GOOOL!" : "GOL DO ADVERSÁRIO", color: e.team === 0 ? "#fde047" : "#fca5a5", t: 2.6 };
          } else if (e.k === "tick") sfx.tick();
          else if (e.k === "whistle") sfx.whistle();
          else if (e.k === "end") sfx.end();
        }
        g.events.length = 0;
        phaseRef.current = g.phase;
        if (g.phase === "end" && !doneRef.current) {
          doneRef.current = true;
          const result: MatchResult = {
            mode,
            level,
            goalsFor: g.score[0],
            goalsAgainst: g.score[1],
            secs: Math.max(3, Math.round(g.played)),
            result: g.winner === null ? "draw" : g.winner === 0 ? "win" : "loss",
          };
          setEnd(result);
          onFinishRef.current(result);
        }
      }
      draw(ctx, g, fx, { teamColors: colors, rotated: rotatedRef.current }, aw, ah, dpr, dt);
      const t = g.overtime ? g.overtimeLeft : g.timeLeft;
      const key = `${g.score[0]}-${g.score[1]}-${Math.ceil(t)}-${g.phase}-${g.overtime}`;
      if (key !== lastHud) {
        lastHud = key;
        setHud({ s0: g.score[0], s1: g.score[1], time: fmt(Math.ceil(t)), overtime: g.overtime, phase: g.phase });
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // a partida só recomeça quando muda de rodada, modo, nível ou cor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, mode, level, color]);

  const again = useCallback(() => {
    setEnd(null);
    setPaused(false);
    setHud({ s0: 0, s1: 0, time: fmt(MODES[mode].secs), overtime: false, phase: "countdown" });
    setRound((r) => r + 1);
  }, [mode]);

  // joystick virtual (menor quando o celular está deitado)
  const jsize = rotated ? 140 : 116;
  const reach = Math.round(jsize * 0.37);
  const joyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    joy.current.id = e.pointerId;
    joyMove(e);
  };
  const joyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joy.current.id !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > reach) {
      dx = (dx / len) * reach;
      dy = (dy / len) * reach;
    }
    joy.current.x = dx / reach;
    joy.current.y = dy / reach;
    setThumb({ x: dx, y: dy });
  };
  const joyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joy.current.id !== e.pointerId) return;
    joy.current = { x: 0, y: 0, id: -1 };
    setThumb({ x: 0, y: 0 });
  };
  const kickProps = {
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      kickHeld.current = true;
    },
    onPointerUp: () => (kickHeld.current = false),
    onPointerCancel: () => (kickHeld.current = false),
    onLostPointerCapture: () => (kickHeld.current = false),
  };

  // soltar tudo se os controles sumirem (pausa, fim de jogo)
  useEffect(() => {
    if (paused || end) {
      joy.current = { x: 0, y: 0, id: -1 };
      kickHeld.current = false;
      keys.current.clear();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- volta o joystick ao centro
      setThumb({ x: 0, y: 0 });
    }
  }, [paused, end]);

  const joystick = touch ? (
    <div
      className="relative shrink-0 touch-none select-none rounded-full border-2 border-white/30 bg-white/10"
      style={{ width: jsize, height: jsize }}
      onPointerDown={joyDown}
      onPointerMove={joyMove}
      onPointerUp={joyUp}
      onPointerCancel={joyUp}
      onLostPointerCapture={joyUp}
      aria-label="Joystick"
    >
      <span className="absolute left-1/2 top-1/2 rounded-full bg-white/70 shadow-lg" style={{ width: jsize * 0.4, height: jsize * 0.4, transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))` }} />
    </div>
  ) : null;
  const kickBtn = touch ? (
    <button
      type="button"
      {...kickProps}
      className="shrink-0 touch-none select-none rounded-full border-4 border-amber-300 bg-rose-600/90 font-black text-white shadow-xl active:scale-95"
      style={{ width: rotated ? 104 : 92, height: rotated ? 104 : 92, fontSize: rotated ? 17 : 15 }}
      aria-label="Chutar"
    >
      CHUTAR
    </button>
  ) : null;

  const resultText = end ? (end.result === "win" ? "VITÓRIA! 🏆" : end.result === "loss" ? "Derrota" : "Empate") : "";
  const gutter = touch && !rotated;

  return (
    <div
      className="fixed inset-0 z-[100] flex select-none flex-col bg-[#0d2417] text-white"
      style={{ touchAction: "none", overscrollBehavior: "contain", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      {/* placar */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <button type="button" onClick={(e) => { e.currentTarget.blur(); setPaused(true); }} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-black" aria-label="Pausar">
          ⏸
        </button>
        <div className="flex items-center gap-3 text-center">
          <span className="flex items-center gap-2 text-3xl font-black tabular-nums">
            <i className="inline-block h-4 w-4 rounded-full" style={{ background: teamColors[0] }} />
            {hud.s0}
          </span>
          <span className="min-w-[72px] rounded-lg bg-white/10 px-2 py-1 text-lg font-black tabular-nums">{hud.overtime ? `⚡ ${hud.time}` : hud.time}</span>
          <span className="flex items-center gap-2 text-3xl font-black tabular-nums">
            {hud.s1}
            <i className="inline-block h-4 w-4 rounded-full" style={{ background: teamColors[1] }} />
          </span>
        </div>
        <button type="button" onClick={(e) => { e.currentTarget.blur(); setMuted((m) => !m); }} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-black" aria-label="Som">
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* campo (e, com o celular deitado, os controles ao lado) */}
      <div className="flex min-h-0 flex-1">
        {gutter ? <div className="flex w-[132px] shrink-0 items-end justify-center pb-3">{joystick}</div> : null}
        <div ref={wrapRef} className="relative min-w-0 flex-1">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
          {hud.overtime && hud.phase !== "end" ? <p className="pointer-events-none absolute inset-x-0 top-1 text-center text-[11px] font-black uppercase tracking-wide text-amber-300 [text-shadow:0_1px_3px_#000]">Gol de ouro: o próximo gol vence</p> : null}
        </div>
        {gutter ? <div className="flex w-[132px] shrink-0 items-end justify-center pb-3">{kickBtn}</div> : null}
      </div>
      {touch && rotated ? (
        <div className="flex shrink-0 items-center justify-between px-5 pb-5 pt-2">
          {joystick}
          {kickBtn}
        </div>
      ) : null}
      {!touch ? <p className="shrink-0 px-3 pb-2 text-center text-[11px] text-white/60">WASD ou setas para mover · Espaço para chutar · Esc pausa</p> : null}

      {paused && !end ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 p-6">
          <p className="text-2xl font-black">⏸ Pausado</p>
          <button type="button" onClick={() => setPaused(false)} className="btn btn-primary w-60">
            Continuar
          </button>
          <button type="button" onClick={onExit} className="btn btn-ghost w-60 !text-white">
            Sair da partida
          </button>
        </div>
      ) : null}

      {end ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/75 p-6 text-center">
          <p className="text-4xl font-black">{resultText}</p>
          <p className="text-6xl font-black tabular-nums">
            {end.goalsFor} <span className="text-white/50">x</span> {end.goalsAgainst}
          </p>
          <p className="mb-3 text-sm text-white/70">
            {MODES[end.mode].label} · computador {end.level === "easy" ? "fácil" : end.level === "hard" ? "difícil" : "normal"}
          </p>
          <button type="button" onClick={again} className="btn btn-primary w-60">
            Jogar de novo
          </button>
          <button type="button" onClick={onExit} className="btn btn-ghost w-60 !text-white">
            Voltar ao menu
          </button>
        </div>
      ) : null}
    </div>
  );
}
