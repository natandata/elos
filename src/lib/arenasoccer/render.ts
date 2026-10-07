// ArenaSoccer: desenho do campo, dos discos e dos efeitos (canvas 2D).
import { BALL_R, GOAL_DEPTH, type Disc, type Game } from "./engine";

export type Fx = {
  trail: { x: number; y: number }[];
  parts: { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }[];
  rings: { x: number; y: number; life: number; color: string }[];
  shake: number;
  banner: { text: string; color: string; t: number } | null;
  t: number;
};

export const newFx = (): Fx => ({ trail: [], parts: [], rings: [], shake: 0, banner: null, t: 0 });

export type Look = { teamColors: [string, string]; rotated: boolean };

const PAD = 16;

/** Escala que faz o campo (com os gols) caber na área disponível. */
export function fitScale(g: Game, aw: number, ah: number, rotated: boolean): number {
  const lx = g.w + 2 * (GOAL_DEPTH + PAD);
  const ly = g.h + 2 * PAD;
  return rotated ? Math.min(aw / ly, ah / lx) : Math.min(aw / lx, ah / ly);
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function disc(ctx: CanvasRenderingContext2D, d: Disc, color: string, human: boolean, fx: Fx): void {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(d.x + 4, d.y + 6, d.r, d.r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createRadialGradient(d.x - d.r * 0.35, d.y - d.r * 0.4, d.r * 0.1, d.x, d.y, d.r);
  grad.addColorStop(0, shade(color, 1.35));
  grad.addColorStop(1, shade(color, 0.85));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = shade(color, 0.5);
  ctx.stroke();
  if (human) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -fx.t * 22;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (d.flash < 0.2) {
    const k = d.flash / 0.2;
    ctx.lineWidth = 4 * (1 - k);
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + 6 + k * 22, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function pitch(ctx: CanvasRenderingContext2D, g: Game, look: Look): void {
  const { w, h } = g;
  const R = 72;
  // fora do campo
  ctx.fillStyle = "#0d2417";
  ctx.fillRect(-GOAL_DEPTH - PAD - 4, -PAD - 4, w + 2 * (GOAL_DEPTH + PAD) + 8, h + 2 * PAD + 8);
  // gramado em faixas, recortado nos cantos arredondados
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(R, 0);
  ctx.lineTo(w - R, 0);
  ctx.arcTo(w, 0, w, R, R);
  ctx.lineTo(w, h - R);
  ctx.arcTo(w, h, w - R, h, R);
  ctx.lineTo(R, h);
  ctx.arcTo(0, h, 0, h - R, R);
  ctx.lineTo(0, R);
  ctx.arcTo(0, 0, R, 0, R);
  ctx.closePath();
  ctx.clip();
  const n = 12;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? "#2f8a45" : "#339a4b";
    ctx.fillRect((i * w) / n, 0, w / n + 1, h);
  }
  ctx.restore();
  // linhas
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(R, 0);
  ctx.lineTo(w - R, 0);
  ctx.arcTo(w, 0, w, R, R);
  ctx.lineTo(w, h - R);
  ctx.arcTo(w, h, w - R, h, R);
  ctx.lineTo(R, h);
  ctx.arcTo(0, h, 0, h - R, R);
  ctx.lineTo(0, R);
  ctx.arcTo(0, 0, R, 0, R);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, h * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
  ctx.fill();
  // grandes áreas
  const bw = w * 0.12;
  const bh = g.goalH * 1.8;
  ctx.strokeRect(0, (h - bh) / 2, bw, bh);
  ctx.strokeRect(w - bw, (h - bh) / 2, bw, bh);
  // gols (caixas com rede)
  for (const side of [0, 1] as const) {
    const x0 = side === 0 ? -GOAL_DEPTH : w;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(x0, g.gy0, GOAL_DEPTH, g.goalH);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= GOAL_DEPTH; i += 10) {
      ctx.beginPath();
      ctx.moveTo(x0 + i, g.gy0);
      ctx.lineTo(x0 + i, g.gy1);
      ctx.stroke();
    }
    for (let j = 0; j <= g.goalH; j += 10) {
      ctx.beginPath();
      ctx.moveTo(x0, g.gy0 + j);
      ctx.lineTo(x0 + GOAL_DEPTH, g.gy0 + j);
      ctx.stroke();
    }
    ctx.strokeStyle = look.teamColors[side];
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(side === 0 ? 0 : w, g.gy0);
    ctx.lineTo(x0 + (side === 0 ? 0 : GOAL_DEPTH), g.gy0);
    ctx.lineTo(x0 + (side === 0 ? 0 : GOAL_DEPTH), g.gy1);
    ctx.lineTo(side === 0 ? 0 : w, g.gy1);
    ctx.stroke();
    for (const py of [g.gy0, g.gy1]) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(side === 0 ? 0 : w, py, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Atualiza partículas, anéis e tremor. */
export function stepFx(fx: Fx, dt: number): void {
  fx.t += dt;
  fx.shake = Math.max(0, fx.shake - dt * 14);
  for (const p of fx.parts) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 380 * dt;
    p.vx *= Math.exp(-0.8 * dt);
  }
  fx.parts = fx.parts.filter((p) => p.life > 0);
  for (const r of fx.rings) r.life -= dt;
  fx.rings = fx.rings.filter((r) => r.life > 0);
  if (fx.banner) {
    fx.banner.t -= dt;
    if (fx.banner.t <= 0) fx.banner = null;
  }
}

export function burst(fx: Fx, x: number, y: number, color: string, n: number, speed: number): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.65);
    fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.25, life: 0.5 + Math.random() * 0.6, max: 1.1, color, size: 2 + Math.random() * 3 });
  }
}

export function confetti(fx: Fx, x: number, y: number): void {
  const colors = ["#fde047", "#f97316", "#ef4444", "#22d3ee", "#a78bfa", "#ffffff", "#4ade80"];
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 200 + Math.random() * 420;
    fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160, life: 1.2 + Math.random() * 1.2, max: 2.4, color: colors[i % colors.length], size: 3 + Math.random() * 4 });
  }
}

/** Desenha um quadro. `aw`/`ah` em pixels de CSS; `dpr` é a densidade. */
export function draw(ctx: CanvasRenderingContext2D, g: Game, fx: Fx, look: Look, aw: number, ah: number, dpr: number): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, aw, ah);
  const s = fitScale(g, aw, ah, look.rotated);
  const sh = fx.shake > 0 ? (Math.random() - 0.5) * fx.shake * 2 : 0;
  ctx.save();
  ctx.translate(aw / 2 + sh, ah / 2 + (fx.shake > 0 ? (Math.random() - 0.5) * fx.shake * 2 : 0));
  if (look.rotated) ctx.rotate(-Math.PI / 2);
  ctx.scale(s, s);
  ctx.translate(-g.w / 2, -g.h / 2);
  pitch(ctx, g, look);

  // rastro da bola
  const b = g.ball;
  fx.trail.push({ x: b.x, y: b.y });
  if (fx.trail.length > 14) fx.trail.shift();
  if (Math.hypot(b.vx, b.vy) > 380) {
    fx.trail.forEach((p, i) => {
      const k = i / fx.trail.length;
      ctx.fillStyle = `rgba(255,255,255,${0.28 * k})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, BALL_R * (0.4 + 0.6 * k), 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // sombra e bola
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(b.x + 3, b.y + 5, b.r, b.r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  const bg = ctx.createRadialGradient(b.x - 4, b.y - 5, 2, b.x, b.y, b.r);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(1, "#cbd5e1");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#1f2937";
  ctx.stroke();
  const rot = (b.x + b.y) * 0.05;
  ctx.fillStyle = "#1f2937";
  for (let i = 0; i < 3; i++) {
    const a = rot + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(b.x + Math.cos(a) * b.r * 0.5, b.y + Math.sin(a) * b.r * 0.5, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of g.players) disc(ctx, p, look.teamColors[p.team === 1 ? 1 : 0], p.human, fx);

  for (const r of fx.rings) {
    const k = 1 - r.life / 0.5;
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = 1 - k;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 10 + k * 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of fx.parts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // textos grandes (em tela, sem girar)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (g.phase === "countdown") {
    const n = Math.ceil(g.phaseT);
    const k = 1 - (g.phaseT - Math.floor(g.phaseT));
    ctx.font = `900 ${Math.round(Math.min(aw, ah) * 0.28)}px system-ui, sans-serif`;
    ctx.fillStyle = `rgba(255,255,255,${0.95 - k * 0.5})`;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 8;
    ctx.strokeText(String(n), aw / 2, ah / 2);
    ctx.fillText(String(n), aw / 2, ah / 2);
  }
  if (fx.banner) {
    const k = Math.min(1, (2.6 - fx.banner.t) * 5);
    let size = Math.round(Math.min(aw * 0.16, ah * 0.2) * (0.6 + 0.4 * k));
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(fx.banner.text).width;
    if (tw > aw * 0.92) {
      size = Math.floor((size * aw * 0.92) / tw);
      ctx.font = `900 ${size}px system-ui, sans-serif`;
    }
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 10;
    ctx.fillStyle = fx.banner.color;
    ctx.strokeText(fx.banner.text, aw / 2, ah * 0.42);
    ctx.fillText(fx.banner.text, aw / 2, ah * 0.42);
  }
}
