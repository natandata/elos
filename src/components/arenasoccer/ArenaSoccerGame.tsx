"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { thinkAll } from "@/lib/arenasoccer/ai";
import { advance, MODES, newGame, type Game, type Level, type Mode } from "@/lib/arenasoccer/engine";
import { burst, confetti, draw, newFx, stepFx, type Fx } from "@/lib/arenasoccer/render";
import { Sfx } from "@/lib/arenasoccer/sound";

export type MatchResult = { mode: Mode; level: Level; goalsFor: number; goalsAgainst: number; secs: number; result: "win" | "loss" | "draw" };

type Hud = { s0: number; s1: number; time: string; overtime: boolean; phase: Game["phase"] };

const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;

const THUMB = 52;

/** Partida de ArenaSoccer contra o computador: tela cheia, teclado ou joystick virtual + botão de chute. */
export function ArenaSoccerGame({ mode, level, color, onFinish, onExit }: { mode: Mode; level: Level; color: string; onFinish: (r: MatchResult) => void; onExit: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game>(newGame(mode));
  const fxRef = useRef<Fx>(newFx());
  const sfxRef = useRef<Sfx | null>(null);
  const keys = useRef(new Set<string>());
  const joy = useRef({ x: 0, y: 0, id: -1 });
  const kickHeld = useRef(false);
  const pausedRef = useRef(false);
  const rotatedRef = useRef(false);
  const doneRef = useRef(false);
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
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "k"].includes(k)) e.preventDefault();
      if (k === "escape" || k === "p") setPaused((p) => !p);
      keys.current.add(k);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
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

  const teamColors: [string, string] = [color, color.toLowerCase() === "#ef4444" ? "#3b82f6" : "#ef4444"];

  // laço da partida
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = newGame(mode);
    gameRef.current = g;
    const fx = newFx();
    fxRef.current = fx;
    doneRef.current = false;
    if (!sfxRef.current) sfxRef.current = new Sfx();
    sfxRef.current.muted = muted;
    const sfx = sfxRef.current;
    let aw = 0;
    let ah = 0;
    let dpr = 1;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      aw = r.width;
      ah = r.height;
      canvas.width = Math.round(aw * dpr);
      canvas.height = Math.round(ah * dpr);
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
            fx.rings.push({ x: gx, y: g.h / 2, life: 0.5, color: teamColors[e.team] });
            fx.shake = 9;
            fx.banner = { text: e.team === 0 ? "GOOOL!" : "GOL DO ADVERSÁRIO", color: e.team === 0 ? "#fde047" : "#fca5a5", t: 2.6 };
          } else if (e.k === "tick") sfx.tick();
          else if (e.k === "whistle") sfx.whistle();
          else if (e.k === "end") sfx.end();
        }
        g.events.length = 0;
        if (g.phase === "end" && !doneRef.current) {
          doneRef.current = true;
          const result: MatchResult = {
            mode,
            level,
            goalsFor: g.score[0],
            goalsAgainst: g.score[1],
            secs: Math.round(g.played),
            result: g.winner === null ? "draw" : g.winner === 0 ? "win" : "loss",
          };
          setEnd(result);
          onFinishRef.current(result);
        }
      }
      draw(ctx, g, fx, { teamColors, rotated: rotatedRef.current }, aw, ah, dpr);
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
    // a partida só recomeça quando muda de rodada, modo ou nível
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, mode, level, color]);

  const again = useCallback(() => {
    setEnd(null);
    setPaused(false);
    setHud({ s0: 0, s1: 0, time: fmt(MODES[mode].secs), overtime: false, phase: "countdown" });
    setRound((r) => r + 1);
  }, [mode]);

  // joystick virtual
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
    if (len > THUMB) {
      dx = (dx / len) * THUMB;
      dy = (dy / len) * THUMB;
    }
    joy.current.x = dx / THUMB;
    joy.current.y = dy / THUMB;
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

  const controls = touch ? (
    <>
      <div
        className="pointer-events-auto relative h-[140px] w-[140px] touch-none select-none rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm"
        onPointerDown={joyDown}
        onPointerMove={joyMove}
        onPointerUp={joyUp}
        onPointerCancel={joyUp}
        onLostPointerCapture={joyUp}
        aria-label="Joystick"
      >
        <span className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white/70 shadow-lg" style={{ transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))` }} />
      </div>
      <button type="button" {...kickProps} className="pointer-events-auto h-[104px] w-[104px] touch-none select-none rounded-full border-4 border-amber-300 bg-rose-600/90 text-lg font-black text-white shadow-xl active:scale-95" aria-label="Chutar">
        CHUTAR
      </button>
    </>
  ) : null;

  const resultText = end ? (end.result === "win" ? "VITÓRIA! 🏆" : end.result === "loss" ? "Derrota" : "Empate") : "";

  return (
    <div className="fixed inset-0 z-[100] flex select-none flex-col bg-[#08140d] text-white" style={{ touchAction: "none" }}>
      {/* placar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button type="button" onClick={() => setPaused(true)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-black" aria-label="Pausar">
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
        <button type="button" onClick={() => setMuted((m) => !m)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-black" aria-label="Som">
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
      {hud.overtime ? <p className="text-center text-[11px] font-black uppercase tracking-wide text-amber-300">Gol de ouro: o próximo gol vence</p> : null}

      {/* campo */}
      <div ref={wrapRef} className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
        {touch && !rotated ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between">{controls}</div>
        ) : null}
      </div>
      {touch && rotated ? <div className="flex items-center justify-between px-5 pb-6 pt-2">{controls}</div> : null}
      {!touch ? <p className="px-3 pb-2 text-center text-[11px] text-white/60">WASD ou setas para mover · Espaço para chutar · Esc pausa</p> : null}

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
