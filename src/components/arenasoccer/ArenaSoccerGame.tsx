"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { thinkAll } from "@/lib/arenasoccer/ai";
import { advance, MODES, newGame, type Game, type GameEvent, type Level, type MatchSpec, type Mode } from "@/lib/arenasoccer/engine";
import { shortName, type Kit } from "@/lib/arenasoccer/teams";
import { burst, confetti, draw, INTRO_SECS, newFx, stepFx } from "@/lib/arenasoccer/render";
import { applySnap, makeSnap, type InputMsg, type Snap, type SoccerNet } from "@/lib/arenasoccer/net";
import { Sfx } from "@/lib/arenasoccer/sound";

export type Scorer = { team: 0 | 1; name: string; at: number; assist?: string; own?: boolean };
export type PlayerLine = { name: string; goals: number; assists: number; own: number };
export type MatchResult = {
  mode: Mode;
  level: Level | "online";
  goalsFor: number;
  goalsAgainst: number;
  secs: number;
  result: "win" | "loss" | "draw";
  /** só nas partidas com times de verdade: quem marcou e as estatísticas dos meus jogadores */
  scorers?: Scorer[];
  mine?: PlayerLine[];
};

/** Partida com times de verdade (Copa, Brasileirão, Carreira): escalações, uniformes e força do computador. */
export type PlaySpec = { match: MatchSpec; kits: [Kit, Kit]; names: [string, string]; level: Level | [Level, Level]; /** texto sobre o placar (ex.: "Fase de grupos") */ label?: string };

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
export function ArenaSoccerGame({ mode: modeProp, level, color, onFinish, onExit, net, spec }: { mode: Mode; level: Level; color: string; onFinish: (r: MatchResult) => void; onExit: () => void; net?: SoccerNet; spec?: PlaySpec }) {
  const mode: Mode = spec ? (`${Math.max(1, Math.min(4, spec.match.teams[0].length))}v${Math.max(1, Math.min(4, spec.match.teams[0].length))}` as Mode) : modeProp;
  const guest = net?.role === "guest";
  /** lado e disco de quem está jogando (no 1 contra 1 online: o anfitrião é o 0, o convidado é o 1) */
  const me: 0 | 1 = net?.seat ? net.seat.side : guest ? 1 : 0;
  const myDisc = net?.seat ? net.seat.disc : guest ? 1 : 0;
  const remoteDiscs = net?.seat ? net.seat.remote : guest ? [0] : [1];
  const flip = me === 1;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const keys = useRef(new Set<string>());
  const joy = useRef({ x: 0, y: 0, id: -1 });
  const kickHeld = useRef(false);
  const pausedRef = useRef(false);
  const rotatedRef = useRef(false);
  const doneRef = useRef(false);
  /** pediu para pular a abertura */
  const skipRef = useRef(false);
  const phaseRef = useRef<Game["phase"]>("countdown");
  const onFinishRef = useRef(onFinish);
  const [round, setRound] = useState(0);
  const [hud, setHud] = useState<Hud>({ s0: 0, s1: 0, time: fmt(MODES[mode].secs), overtime: false, phase: "countdown" });
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [end, setEnd] = useState<MatchResult | null>(null);
  const [intro, setIntro] = useState(true);
  /** online: esperando o adversário aparecer / o adversário saiu */
  const [waiting, setWaiting] = useState(!!net && !guest);
  const [gone, setGone] = useState(false);
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
      if (!net && document.hidden && phaseRef.current !== "end") setPaused(true);
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
      if ((k === "escape" || k === "p") && !e.repeat && !net) setPaused((p) => !p);
      if ((k === " " || k === "enter") && !e.repeat) skipRef.current = true;
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

  const absColors: [string, string] = spec ? [spec.kits[0].p, spec.kits[1].p] : net ? [net.hostColor, opponentColor(net.hostColor)] : [color, opponentColor(color)];
  /** cores na ordem do placar: a minha primeiro */
  const teamColors: [string, string] = flip ? [absColors[1], absColors[0]] : absColors;

  // laço da partida
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = newGame(mode, spec?.match);
    const fx = newFx(!guest);
    const scorers: Scorer[] = [];
    skipRef.current = false;
    doneRef.current = false;
    phaseRef.current = "countdown";
    if (!sfxRef.current) sfxRef.current = new Sfx();
    sfxRef.current.muted = muted;
    const sfx = sfxRef.current;
    const colors: [string, string] = absColors;
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
    const human = g.players[myDisc];
    // quem é gente (eu e os outros jogadores de verdade) não é conduzido pelo computador
    g.players.forEach((p, i) => (p.human = i === myDisc || (!!net && remoteDiscs.includes(i))));
    let introCheered = false;

    // ---- online ----
    const unsubs: (() => void)[] = [];
    const remoteIns = new Map<number, InputMsg>();
    const seen = new Map<number, number>();
    const heard = new Set<number>();
    let started = !net || guest;
    let lastRecv = performance.now();
    let sendAcc = 0;
    let inpAcc = 0;
    let helloAcc = 1;
    let lastKick = false;
    let lastInp = { mx: 0, my: 0 };
    let gotSnap = false;
    let wentAway = false;
    const evq: GameEvent[] = [];
    const targets = g.players.map((p) => ({ x: p.x, y: p.y }));
    const ballT = { x: g.ball.x, y: g.ball.y };
    if (net) {
      unsubs.push(
        net.on("hello", (m) => {
          lastRecv = performance.now();
          const d = typeof (m as { d?: number }).d === "number" ? (m as { d: number }).d : remoteDiscs[0];
          heard.add(d);
          seen.set(d, performance.now());
          if (!started && remoteDiscs.every((x) => heard.has(x))) {
            started = true;
            setWaiting(false);
          }
        }),
        net.on("inp", (m) => {
          lastRecv = performance.now();
          const i = m as InputMsg;
          const d = typeof i.d === "number" ? i.d : remoteDiscs[0];
          if (!remoteDiscs.includes(d)) return;
          seen.set(d, performance.now());
          remoteIns.set(d, { mx: Math.max(-1, Math.min(1, Number(i.mx) || 0)), my: Math.max(-1, Math.min(1, Number(i.my) || 0)), kick: !!i.kick });
        }),
        net.on("skip", () => {
          skipRef.current = true;
        }),
        net.on("snap", (m) => {
          if (!guest) return;
          lastRecv = performance.now();
          const s = m as Snap;
          if (!gotSnap) {
            gotSnap = true;
            // o convidado ainda não tem os discos no lugar: começa já nas posições recebidas
            applySnap(g, s, targets, ballT);
            g.players.forEach((p, i) => {
              p.x = targets[i].x;
              p.y = targets[i].y;
            });
            g.ball.x = ballT.x;
            g.ball.y = ballT.y;
          } else applySnap(g, s, targets, ballT);
          // a abertura segue o relógio do anfitrião
          if (s.i >= 0) {
            if (!fx.intro) fx.intro = { t: s.i, dur: INTRO_SECS };
            else fx.intro.t = s.i;
          } else if (fx.intro) {
            fx.intro = null;
            setIntro(false);
          }
          for (const e of s.ev ?? []) g.events.push(e);
        }),
      );
    }

    /** Sons e efeitos dos eventos da partida (do motor aqui, ou vindos do anfitrião). */
    const handleEvents = () => {
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
          fx.cheer[e.team] = 3.2;
          sfx.cheer(1.8, 0.09);
          const who = e.scorer !== undefined ? g.players[e.scorer] : undefined;
          const wn = who?.name ? shortName(who.name) : "";
          if (who && e.scorer !== undefined) {
            scorers.push({ team: e.team === me ? 0 : 1, name: who.name, at: e.at ?? Math.round(g.played), assist: e.assist !== undefined ? g.players[e.assist]?.name : undefined, own: e.own });
          }
          fx.banner = {
            text: e.own ? `GOL CONTRA${wn ? ": " + wn : ""}` : e.team === me ? (wn ? `GOL! ${wn}` : "GOOOL!") : net ? "GOL DE " + net.oppName.toUpperCase() : wn ? `GOL: ${wn}` : "GOL DO ADVERSÁRIO",
            color: e.team === me ? "#fde047" : "#fca5a5",
            t: 2.6,
          };
        } else if (e.k === "tick") sfx.tick();
        else if (e.k === "whistle") sfx.whistle();
        else if (e.k === "end") sfx.end();
      }
      g.events.length = 0;
    };
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      const winner = g.winner;
      const result: MatchResult = {
        mode,
        level: net ? "online" : spec ? (typeof spec.level === "string" ? spec.level : spec.level[1]) : level,
        goalsFor: g.score[me],
        goalsAgainst: g.score[1 - me],
        secs: Math.max(10, Math.round(g.played)),
        result: winner === null ? "draw" : winner === me ? "win" : "loss",
        scorers: spec ? scorers : undefined,
        mine: spec ? g.players.map((p, i) => ({ p, i })).filter((x) => x.p.team === me).map((x) => ({ name: x.p.name, ...g.stats[x.i] })) : undefined,
      };
      setEnd(result);
      onFinishRef.current(result);
    };
    const readInput = () => {
      const k = keys.current;
      let sx = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
      let sy = (k.has("s") || k.has("arrowdown") ? 1 : 0) - (k.has("w") || k.has("arrowup") ? 1 : 0);
      if (joy.current.id !== -1) {
        sx = joy.current.x;
        sy = joy.current.y;
      }
      let mx = rotatedRef.current ? -sy : sx;
      let my = rotatedRef.current ? sx : sy;
      // o convidado vê o campo virado de cabeça pra baixo: o que ele vê como "direita" é −x no campo
      if (flip) {
        mx = -mx;
        my = -my;
      }
      return { mx, my, kick: k.has(" ") || k.has("k") || kickHeld.current };
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (net) {
        // sem mensagens por muito tempo: no 1 contra 1 a partida acaba; em equipe quem some vira computador e o jogo segue
        if (net.seat && !guest) {
          for (const d of remoteDiscs) {
            if (g.players[d].human && started && now - (seen.get(d) ?? now) > 9000) {
              g.players[d].human = false;
              fx.banner = { text: `${g.players[d].name ? shortName(g.players[d].name) : "Um jogador"} saiu: o computador assume`, color: "#fde68a", t: 2.6 };
            }
          }
        } else if (started && !wentAway && !doneRef.current && now - lastRecv > 9000) {
          wentAway = true;
          setGone(true);
        }
        if (guest) {
          helloAcc += dt;
          if (!gotSnap && helloAcc >= 0.5) {
            helloAcc = 0;
            net.send("hello", { d: myDisc });
          }
          if (skipRef.current && fx.intro) {
            skipRef.current = false;
            net.send("skip", { n: 1 });
          }
        }
      }
      if (net && !started) {
        // anfitrião esperando o convidado chegar
      } else if (guest) {
        stepFx(fx, dt);
        if (fx.intro) {
          if (!introCheered) {
            introCheered = true;
            sfx.cheer(2.4, 0.08);
          }
        }
        // os discos alcançam as posições recebidas (e seguem a velocidade entre uma mensagem e outra)
        const k = 1 - Math.exp(-16 * dt);
        g.players.forEach((p, i) => {
          const t = targets[i];
          t.x += p.vx * dt;
          t.y += p.vy * dt;
          p.x += (t.x - p.x) * k;
          p.y += (t.y - p.y) * k;
          p.flash += dt;
        });
        ballT.x += g.ball.vx * dt;
        ballT.y += g.ball.vy * dt;
        g.ball.x += (ballT.x - g.ball.x) * k;
        g.ball.y += (ballT.y - g.ball.y) * k;
        handleEvents();
        phaseRef.current = g.phase;
        if (g.phase === "end") finish();
        if (!wentAway && !doneRef.current) {
          inpAcc += dt;
          const inp = readInput();
          // controles só quando mudam (no máximo ~6 por segundo) e um sinal de vida a cada 0,6 s: poupa mensagens do Realtime
          const changed = inp.kick !== lastKick || Math.abs(inp.mx - lastInp.mx) > 0.15 || Math.abs(inp.my - lastInp.my) > 0.15;
          if ((changed && inpAcc >= 0.15) || inpAcc >= 0.6) {
            inpAcc = 0;
            lastKick = inp.kick;
            lastInp = inp;
            net!.send("inp", { ...inp, d: myDisc });
          }
        }
      } else if (!pausedRef.current && fx.intro) {
        // abertura: a torcida vibra e os jogadores entram no campo (dá para pular)
        if (!introCheered) {
          introCheered = true;
          sfx.cheer(2.4, 0.08);
        }
        fx.intro.t += dt;
        stepFx(fx, dt);
        if (skipRef.current || fx.intro.t >= fx.intro.dur) {
          fx.intro = null;
          skipRef.current = false;
          sfx.whistle();
          setIntro(false);
        }
        if (net) {
          sendAcc += dt;
          if (sendAcc >= 0.1) {
            sendAcc = 0;
            net.send("snap", makeSnap(g, fx.intro ? fx.intro.t : -1, []));
          }
        }
      } else if (!pausedRef.current) {
        human.input = readInput();
        if (net) for (const d of remoteDiscs) if (g.players[d].human) g.players[d].input = { ...(remoteIns.get(d) ?? { mx: 0, my: 0, kick: false }) };
        // o computador joga com os discos que não são de ninguém (partida em equipe com vagas vazias)
        if (!net || net.seat) thinkAll(g, spec ? (Array.isArray(spec.level) ? spec.level : [spec.level, spec.level]) : [level, level], dt);
        advance(g, dt);
        stepFx(fx, dt);
        if (net) for (const e of g.events) evq.push(e);
        handleEvents();
        phaseRef.current = g.phase;
        if (net) {
          sendAcc += dt;
          // no jogo ~14 estados por segundo; parado (contagem, gol) bem menos
          if (sendAcc >= (g.phase === "play" ? 0.07 : 0.25) || g.phase === "end") {
            sendAcc = 0;
            net.send("snap", makeSnap(g, -1, evq.splice(0)));
          }
        }
        if (g.phase === "end") finish();
      }
      draw(ctx, g, fx, { teamColors: colors, kits: spec?.kits, rotated: rotatedRef.current, flip, meDisc: net?.seat ? myDisc : undefined }, aw, ah, dpr, dt);
      const t = g.overtime ? g.overtimeLeft : g.timeLeft;
      const key = `${g.score[0]}-${g.score[1]}-${Math.ceil(t)}-${g.phase}-${g.overtime}`;
      if (key !== lastHud) {
        lastHud = key;
        setHud({ s0: g.score[me], s1: g.score[1 - me], time: fmt(Math.ceil(t)), overtime: g.overtime, phase: g.phase });
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsubs.forEach((f) => f());
    };
    // a partida só recomeça quando muda de rodada, modo, nível ou cor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, mode, level, color, spec]);

  const again = useCallback(() => {
    setEnd(null);
    setPaused(false);
    setIntro(true);
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
        {net ? (
          <span className="w-10" />
        ) : (
          <button type="button" onClick={(e) => { e.currentTarget.blur(); setPaused(true); }} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-black" aria-label="Pausar">
            ⏸
          </button>
        )}
        <div className="flex flex-col items-center">
        {spec?.label ? <span className="text-[10px] font-black uppercase tracking-wide text-emerald-200">{spec.label}</span> : null}
        <div className="flex items-center gap-3 text-center">
          <span className="flex items-center gap-2 text-3xl font-black tabular-nums">
            <i className="inline-block h-4 w-4 rounded-full" style={{ background: teamColors[0] }} />
            {net || spec ? <small className="max-w-[88px] truncate text-[11px] font-bold opacity-80">{spec ? spec.names[me] : net!.myName}</small> : null}
            {hud.s0}
          </span>
          <span className="min-w-[72px] rounded-lg bg-white/10 px-2 py-1 text-lg font-black tabular-nums">{hud.overtime ? `⚡ ${hud.time}` : hud.time}</span>
          <span className="flex items-center gap-2 text-3xl font-black tabular-nums">
            {hud.s1}
            {net || spec ? <small className="max-w-[88px] truncate text-[11px] font-bold opacity-80">{spec ? spec.names[1 - me] : net!.oppName}</small> : null}
            <i className="inline-block h-4 w-4 rounded-full" style={{ background: teamColors[1] }} />
          </span>
        </div>
        </div>
        <button type="button" onClick={(e) => { e.currentTarget.blur(); setMuted((m) => !m); }} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-black" aria-label="Som">
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* campo (e, com o celular deitado, os controles ao lado) */}
      <div className="flex min-h-0 flex-1">
        {gutter ? <div className="flex w-[132px] shrink-0 items-end justify-center pb-3">{joystick}</div> : null}
        <div ref={wrapRef} className="relative min-w-0 flex-1">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" onPointerDown={() => { if (intro) skipRef.current = true; }} />
          {waiting ? (
            <div className="absolute inset-0 z-[6] flex flex-col items-center justify-center gap-2 bg-black/60 text-center">
              <p className="text-xl font-black">Conectando com {net?.oppName}…</p>
              <p className="text-sm text-white/70">A partida começa assim que o adversário entrar na sala.</p>
            </div>
          ) : null}
          {intro && !paused && !end && !waiting ? (
            <button type="button" onClick={(e) => { e.currentTarget.blur(); skipRef.current = true; }} className="absolute bottom-3 right-3 z-[5] rounded-full bg-black/60 px-4 py-2 text-sm font-black text-white shadow-lg backdrop-blur active:scale-95">
              Pular abertura ⏭
            </button>
          ) : null}
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

      {gone && !end ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/75 p-6 text-center">
          <p className="text-2xl font-black">O adversário saiu da partida</p>
          <p className="text-sm text-white/70">A conexão com {net?.oppName} caiu. Esta partida não conta.</p>
          <button type="button" onClick={onExit} className="btn btn-primary w-60">
            Voltar
          </button>
        </div>
      ) : null}

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
          {end.scorers && end.scorers.length > 0 ? (
            <ul className="mb-2 max-h-40 w-full max-w-xs space-y-0.5 overflow-y-auto text-left text-sm">
              {end.scorers.map((s, i) => (
                <li key={i} className={`flex justify-between gap-2 ${s.team === 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  <span>⚽ {s.name}{s.own ? " (contra)" : ""}{s.assist ? <small className="text-white/60"> · assist. {s.assist}</small> : null}</span>
                  <span className="tabular-nums text-white/60">{Math.max(1, Math.round(s.at / 60))}&apos;</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mb-3 text-sm text-white/70">
            {MODES[end.mode].label} · {end.level === "online" ? `online contra ${net?.oppName ?? "outro jogador"}` : `computador ${end.level === "easy" ? "fácil" : end.level === "hard" ? "difícil" : "normal"}`}
          </p>
          {net || spec ? null : (
            <button type="button" onClick={again} className="btn btn-primary w-60">
              Jogar de novo
            </button>
          )}
          <button type="button" onClick={onExit} className={spec ? "btn btn-primary w-60" : "btn btn-ghost w-60 !text-white"}>
            {spec ? "Continuar ▶" : "Voltar ao menu"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
