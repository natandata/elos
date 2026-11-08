"use client";

import { useEffect, useRef, useState } from "react";
import { applyOutcome, passOutcome, resolveAuto, shotOutcome, type Chance, type Match, type Outcome, type Player } from "@/lib/arenasoccer/sim";
import { blockersOn, type Scene, type Spot, type StepKind } from "@/lib/arenasoccer/scene";
import type { Kit } from "@/lib/arenasoccer/teams";
import { Cam, GOAL_H, GOAL_HALF, drawBall, drawBanner, drawGoalFrame, drawPlayer, drawStadium, drawStar, type Sprite, type V3 } from "./pitch3d";

const KEEPER_KIT: Kit = { p: "#16a34a", s: "#052e16", k: "solid" };
const STEP_TIP: Record<StepKind, string> = {
  pass: "Desenhe uma linha até um companheiro livre para tocar a bola.",
  cross: "Desenhe a linha até a cabeça do companheiro para um cruzamento no alto.",
  shot: "Arraste da bola até o canto do gol. Mire onde o goleiro não alcança.",
  header: "Cabeceio! Arraste até o canto do gol.",
  freekick: "Falta direta! Faça a bola passar por cima da barreira: mire alto.",
  penalty: "Pênalti! Arraste do jogador até o canto do gol.",
};
const BANNER: Record<string, [string, string]> = {
  goal: ["GOOOL!", "#ffd23c"],
  saved: ["DEFENDEU!", "#7dd3fc"],
  post: ["NA TRAVE!", "#fda4af"],
  bar: ["NO TRAVESSÃO!", "#fda4af"],
  miss: ["PRA FORA!", "#cbd5e1"],
  blocked: ["BLOQUEADO!", "#fdba74"],
  intercepted: ["CORTADO!", "#fdba74"],
};

type Anim = { from: V3; to: V3; arc: number; t0: number; dur: number; onEnd: () => void };

/**
 * Um lance decisivo, no estilo dos jogos de lance a lance: câmera inclinada atrás do jogador, você desenha o passe/cruzamento com o dedo
 * e arrasta para o canto do gol na finalização. O resultado sai do motor (`sim.ts`), então a força do jogador e do goleiro contam.
 */
export function MomentView({ match, chance, scene, kits, names, onDone }: { match: Match; chance: Chance; scene: Scene; kits: [Kit, Kit]; names: [string, string]; onDone: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  const [tip, setTip] = useState(scene.tip);
  const [busy, setBusy] = useState(false);
  const autoRef = useRef<() => void>(() => {});

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const mineKit = kits[chance.side];
    const theirKit = kits[1 - chance.side];
    let W = 360;
    let H = 640;
    let cam = new Cam(W, H, [0, -20], [0, 0]);
    let alive = true;
    let stepIdx = 0;
    let carrier: Spot & { player: Player } = { ...scene.carrier };
    let shooter: Player = chance.shooter;
    let current: Chance = chance;
    let ball: V3 = [carrier.x, carrier.y, 0.2];
    let anim: Anim | null = null;
    let keeper = { x: scene.keeperX, dx: 0, lift: 0, tilt: 0 };
    let result: { out: Outcome; t0: number } | null = null;
    let drag: { x: number; y: number } | null = null;
    let touched = false;
    const started = performance.now();
    let fade = 0;
    let finished = false;
    const mates = scene.mates.map((m) => ({ ...m }));

    const stepKind = (): StepKind => scene.steps[stepIdx];
    const setCamera = () => {
      const passing = stepKind() === "pass" || stepKind() === "cross";
      const focus: [number, number] = passing ? scene.focus : [carrier.x * 0.25, 0];
      cam = new Cam(W, H, [carrier.x, carrier.y], focus, { back: passing ? 10 : 8, zoom: passing ? 1.05 : 1.3 });
    };
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(240, Math.round(r.width));
      H = Math.max(360, Math.round(r.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setCamera();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const finishMoment = (o: Outcome) => {
      if (finished) return;
      finished = true;
      applyOutcome(match, current, o);
    };

    const showResult = (o: Outcome) => {
      result = { out: o, t0: performance.now() };
      setTip(o.text);
      setBusy(true);
      setTimeout(() => {
        if (!alive) return;
        finishMoment(o);
        doneRef.current();
      }, 1900);
    };

    const fly = (from: V3, to: V3, arc: number, dur: number, onEnd: () => void) => {
      anim = { from, to, arc, t0: performance.now(), dur, onEnd };
    };

    const doShot = (aim: { x: number; y: number }) => {
      const kind = stepKind();
      const dist = Math.hypot(carrier.x, carrier.y);
      const out = shotOutcome(match, { ...current, shooter }, aim, { distance: dist, header: kind === "header", wall: kind === "freekick" });
      setBusy(true);
      const land = out.land ?? aim;
      const tx = Math.max(-1.35, Math.min(1.35, land.x)) * GOAL_HALF;
      const tz = Math.max(0, Math.min(1.4, land.y)) * GOAL_H;
      // o goleiro voa em direção ao canto que escolheu
      const kp = out.keeper ?? { x: keeper.x / GOAL_HALF, y: 0 };
      const kdx = out.keeper ? kp.x * GOAL_HALF - keeper.x : 0;
      const start = performance.now();
      const kAnim = () => {
        const t = Math.min(1, (performance.now() - start) / 480);
        keeper = { ...keeper, dx: kdx * t, lift: Math.sin(t * Math.PI) * Math.max(0.2, kp.y * 1.2), tilt: Math.sign(kdx || 1) * 1.2 * Math.min(1, t * 1.4) };
      };
      const kTimer = window.setInterval(() => {
        kAnim();
        if (performance.now() - start > 520) window.clearInterval(kTimer);
      }, 16);
      const blocked = out.kind === "blocked";
      const to: V3 = blocked ? [carrier.x * 0.55, carrier.y * 0.5, 0.6] : [tx, out.goal ? 1.4 : out.kind === "saved" ? 0.2 : 0.2, tz];
      fly(ball, blocked ? to : [tx, 0, tz], blocked ? 0.4 : 0, 0.55, () => {
        if (out.goal) fly([tx, 0, tz], [tx * 0.8, 1.7, Math.max(0.1, tz * 0.4)], 0, 0.3, () => undefined);
        else if (out.kind === "saved") fly([tx, 0, tz], [tx + (tx >= 0 ? 2.5 : -2.5), -4, 0], 1.2, 0.5, () => undefined);
        else if (out.kind === "post" || out.kind === "bar") fly([tx, 0, tz], [tx * 1.3, -6, 0], 1.5, 0.6, () => undefined);
        else if (out.kind === "miss") fly([tx, 0, tz], [tx * 1.6, 4, Math.max(0, tz - 1)], 0, 0.4, () => undefined);
        showResult(out);
      });
    };

    const doPass = (target: (typeof mates)[number], aerial: boolean) => {
      setBusy(true);
      const len = Math.hypot(target.x - carrier.x, target.y - carrier.y);
      const blockers = blockersOn(scene, carrier, target, aerial);
      const out = passOutcome(match, { ...current, shooter: target.player, assister: carrier.player }, { length: len, blockers, aerial });
      const dur = 0.45 + len / 38;
      if (out.kind === "intercepted") {
        const cut: V3 = [(carrier.x + target.x) / 2 + 0.5, (carrier.y + target.y) / 2, 0];
        fly(ball, cut, aerial ? 2.2 : 0.2, dur * 0.55, () => showResult({ ...out, text: out.text }));
        return;
      }
      fly(ball, [target.x, target.y, aerial ? 1.7 : 0.2], aerial ? 3.5 : 0.3, dur, () => {
        shooter = target.player;
        current = { ...current, shooter: target.player, assister: carrier.player };
        carrier = { x: target.x, y: target.y, player: target.player };
        stepIdx++;
        ball = [carrier.x, carrier.y, 0.2];
        fade = 1;
        setCamera();
        setTip(STEP_TIP[scene.steps[stepIdx]]);
        setBusy(false);
      });
    };

    const aimShot = (sx: number, sy: number) => {
      const p = cam.goalPlaneAt(sx, sy);
      if (!p) return false;
      doShot({ x: p[0] / GOAL_HALF, y: p[1] / GOAL_H });
      return true;
    };
    const aimPass = (sx: number, sy: number, aerial: boolean) => {
      let best: (typeof mates)[number] | null = null;
      let bd = Infinity;
      for (const m of mates) {
        if (m.player.name === carrier.player.name) continue;
        const h = cam.project([m.x, m.y, aerial ? 1.7 : 0.9]);
        if (!h) continue;
        const d = Math.hypot(h.x - sx, h.y - sy);
        if (d < bd) {
          bd = d;
          best = m;
        }
      }
      if (!best || bd > W * 0.17) {
        setTip("Termine a linha em cima de um companheiro.");
        return false;
      }
      doPass(best, aerial);
      return true;
    };

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      if (anim || result || finished) return;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* sem captura do ponteiro: segue sem */
      }
      touched = true;
      drag = pos(e);
    };
    const move = (e: PointerEvent) => {
      if (drag) drag = pos(e);
    };
    const up = (e: PointerEvent) => {
      if (!drag) return;
      const p = pos(e);
      drag = null;
      if (anim || result || finished) return;
      const k = stepKind();
      const b = cam.project([carrier.x, carrier.y, 0.9]);
      if (b && Math.hypot(p.x - b.x, p.y - b.y) < 36) {
        setTip("Arraste mais longe: desenhe a linha com o dedo.");
        return;
      }
      if (k === "pass" || k === "cross") aimPass(p.x, p.y, k === "cross");
      else if (!aimShot(p.x, p.y)) setTip("Arraste para dentro do gol.");
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    autoRef.current = () => {
      if (finished || anim || result) return;
      alive = false;
      finished = true;
      resolveAuto(match, chance);
      doneRef.current();
    };

    let raf = 0;
    const frame = () => {
      if (!alive) return;
      const now = performance.now();
      const t = (now - started) / 1000;
      if (anim) {
        const k = Math.min(1, (now - anim.t0) / (anim.dur * 1000));
        const a = anim;
        ball = [a.from[0] + (a.to[0] - a.from[0]) * k, a.from[1] + (a.to[1] - a.from[1]) * k, a.from[2] + (a.to[2] - a.from[2]) * k + Math.sin(k * Math.PI) * a.arc];
        if (k >= 1) {
          anim = null;
          a.onEnd();
        }
      }
      ctx.clearRect(0, 0, W, H);
      drawStadium(ctx, cam, { home: mineKit, away: theirKit, t });
      const sprites: Sprite[] = [];
      sprites.push({ x: keeper.x + keeper.dx, y: -0.6, kit: KEEPER_KIT, name: "goleiro", role: "keeper", tilt: keeper.tilt, lift: keeper.lift, arms: "up" });
      for (const d of scene.defenders) sprites.push({ x: d.x, y: d.y, kit: theirKit, name: `d${d.x.toFixed(1)}${d.y.toFixed(1)}`, run: t * 6 + d.x });
      for (const w of scene.wall) sprites.push({ x: w.x, y: w.y, kit: theirKit, name: `w${w.x.toFixed(1)}`, arms: "down" });
      for (const m of mates) if (m.player.name !== carrier.player.name) sprites.push({ x: m.x, y: m.y, kit: mineKit, name: m.player.name, run: t * 4 + m.x, arms: stepKind() === "cross" ? "up" : "down" });
      sprites.push({ x: carrier.x, y: carrier.y, kit: mineKit, name: carrier.player.name, run: 0, star: !anim && !result });
      sprites.sort((a, b) => b.y - a.y);
      let goalDrawn = false;
      for (const s of sprites) {
        if (!goalDrawn && s.y < 0) {
          drawGoalFrame(ctx, cam);
          goalDrawn = true;
        }
        const head = drawPlayer(ctx, cam, s);
        if (s.star && head) drawStar(ctx, head.x, head.y - head.s * 0.55, Math.max(10, head.s * 0.42), t);
      }
      if (!goalDrawn) drawGoalFrame(ctx, cam);
      drawBall(ctx, cam, ball);
      // marcadores de destino durante o passe
      const k = stepKind();
      if (!anim && !result && (k === "pass" || k === "cross")) {
        for (const m of mates) {
          if (m.player.name === carrier.player.name) continue;
          const h = cam.project([m.x, m.y, k === "cross" ? 2.3 : 2.0]);
          if (!h) continue;
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath();
          ctx.moveTo(h.x - 7, h.y - 12);
          ctx.lineTo(h.x + 7, h.y - 12);
          ctx.lineTo(h.x, h.y - 2);
          ctx.closePath();
          ctx.fill();
        }
      }
      // linha do dedo
      const from = cam.project([carrier.x, carrier.y, 0.3]);
      if (drag && from) {
        ctx.save();
        ctx.setLineDash([10, 8]);
        ctx.lineCap = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#ffe14a";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(drag.x, drag.y);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#ffe14a";
        ctx.beginPath();
        ctx.arc(drag.x, drag.y, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (!touched && !anim && !result && from) {
        // mão que mostra o gesto
        const k2 = (t % 2.2) / 2.2;
        const tgt = scene.steps[stepIdx] === "pass" || scene.steps[stepIdx] === "cross" ? mates.find((m) => m.player.name !== carrier.player.name) : null;
        const end = tgt ? cam.project([tgt.x, tgt.y, 1.2]) : cam.project([GOAL_HALF * 0.7, 0, GOAL_H * 0.8]);
        if (end) {
          const hx = from.x + (end.x - from.x) * k2;
          const hy = from.y + (end.y - from.y) * k2;
          ctx.save();
          ctx.setLineDash([10, 8]);
          ctx.lineWidth = 4;
          ctx.strokeStyle = "rgba(255,225,74,0.8)";
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          ctx.restore();
          ctx.font = "44px system-ui";
          ctx.fillText("👆", hx - 10, hy + 38);
        }
      }
      if (result) {
        const [txt, col] = BANNER[result.out.kind] ?? ["", "#fff"];
        const age = (now - result.t0) / 1000;
        drawBanner(ctx, W, H, txt, result.out.goal ? current.shooter.name.split(" ").slice(-1)[0] : null, col, Math.min(1, 0.6 + age * 3));
      }
      if (fade > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fade})`;
        ctx.fillRect(0, 0, W, H);
        fade = Math.max(0, fade - 0.06);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
    // o lance roda uma vez por montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative mx-auto h-[calc(100dvh-8rem)] max-h-[760px] min-h-[420px] w-full max-w-[460px] overflow-hidden rounded-2xl border-2 border-white/20 bg-[#0b1530] shadow-2xl">
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block touch-none select-none" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-2">
        <span className="flex items-center gap-1.5 rounded-lg bg-black/65 px-2 py-1 text-xs font-black text-white">
          <i className="inline-block h-3 w-3 rounded-full border border-white/60" style={{ background: kits[0].p }} aria-hidden />
          <b className="tabular-nums">{match.score[0]}</b>
          <span className="rounded bg-white/15 px-1 tabular-nums">{chance.min}&apos;</span>
          <b className="tabular-nums">{match.score[1]}</b>
          <i className="inline-block h-3 w-3 rounded-full border border-white/60" style={{ background: kits[1].p }} aria-hidden />
          <span className="max-w-[7rem] truncate text-[10px] font-bold text-white/70">{names[0]} x {names[1]}</span>
        </span>
        <button type="button" disabled={busy} onClick={() => autoRef.current()} className="pointer-events-auto rounded-lg bg-black/60 px-2 py-1 text-xs font-black text-white/90 disabled:opacity-40">
          Deixar o time resolver
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-xl border-2 border-yellow-300/90 bg-black/70 p-2.5 text-white">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-yellow-300 text-xl font-black text-black" aria-hidden>
          !
        </span>
        <p className="text-[15px] font-extrabold leading-snug">{tip}</p>
      </div>
    </div>
  );
}
