// ArenaSoccer · campo em perspectiva (câmera inclinada, como nos jogos de lance a lance). Tudo desenhado em canvas, sem imagens.
// Medidas em metros: x = lateral, y = para o gol (a linha de fundo é y = 0, o jogador fica em y negativo), z = altura.
import type { Kit } from "@/lib/arenasoccer/teams";

export type V3 = [number, number, number];
export const GOAL_HALF = 3.66;
export const GOAL_H = 2.44;

export class Cam {
  readonly right: [number, number];
  readonly fwd: [number, number];
  readonly cx: number;
  readonly cy: number;
  readonly sinT: number;
  readonly cosT: number;
  readonly F: number;
  readonly yoff: number;
  constructor(public W: number, public H: number, pos: [number, number], focus: [number, number], opts: { back?: number; height?: number; tilt?: number; zoom?: number } = {}) {
    let dx = focus[0] - pos[0];
    let dy = focus[1] - pos[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    this.fwd = [dx, dy];
    this.right = [dy, -dx];
    const back = opts.back ?? 8.5;
    this.cx = pos[0] - dx * back;
    this.cy = pos[1] - dy * back;
    const tilt = ((opts.tilt ?? 27) * Math.PI) / 180;
    this.sinT = Math.sin(tilt);
    this.cosT = Math.cos(tilt);
    this.hc = opts.height ?? 6.5;
    this.F = W * (opts.zoom ?? 1.3);
    this.yoff = H * 0.06;
  }
  readonly hc: number;

  /** Ponto do mundo na câmera: a (lateral), up (vertical) e depth (distância à frente). */
  toCam(p: V3): { a: number; up: number; depth: number } {
    const vx = p[0] - this.cx;
    const vy = p[1] - this.cy;
    const dz = p[2] - this.hc;
    const f = vx * this.fwd[0] + vy * this.fwd[1];
    return { a: vx * this.right[0] + vy * this.right[1], depth: f * this.cosT - dz * this.sinT, up: f * this.sinT + dz * this.cosT };
  }
  private scr(a: number, up: number, depth: number): { x: number; y: number; s: number } {
    const k = this.F / depth;
    return { x: this.W / 2 + a * k, y: this.H / 2 + this.yoff - up * k, s: k };
  }
  project(p: V3): { x: number; y: number; s: number } | null {
    const c = this.toCam(p);
    if (c.depth < 0.6) return null;
    return this.scr(c.a, c.up, c.depth);
  }
  /** Raio do pixel (sx, sy) para o mundo. */
  private ray(sx: number, sy: number): { o: V3; d: V3 } {
    const a = (sx - this.W / 2) / this.F;
    const u = -(sy - this.H / 2 - this.yoff) / this.F;
    const f3: V3 = [this.fwd[0] * this.cosT, this.fwd[1] * this.cosT, -this.sinT];
    const u3: V3 = [this.fwd[0] * this.sinT, this.fwd[1] * this.sinT, this.cosT];
    const r3: V3 = [this.right[0], this.right[1], 0];
    return { o: [this.cx, this.cy, this.hc], d: [f3[0] + a * r3[0] + u * u3[0], f3[1] + a * r3[1] + u * u3[1], f3[2] + a * r3[2] + u * u3[2]] };
  }
  /** Onde o pixel toca o chão (z = 0). */
  groundAt(sx: number, sy: number): [number, number] | null {
    const { o, d } = this.ray(sx, sy);
    if (d[2] >= -1e-4) return null;
    const t = -o[2] / d[2];
    return [o[0] + d[0] * t, o[1] + d[1] * t];
  }
  /** Onde o pixel toca o plano do gol (y = 0): devolve [x, z]. */
  goalPlaneAt(sx: number, sy: number): [number, number] | null {
    const { o, d } = this.ray(sx, sy);
    if (Math.abs(d[1]) < 1e-4) return null;
    const t = -o[1] / d[1];
    if (t <= 0) return null;
    return [o[0] + d[0] * t, o[2] + d[2] * t];
  }
  horizonY(): number {
    return this.H / 2 + this.yoff - this.F * (this.sinT / this.cosT);
  }
}

type CP = { a: number; up: number; depth: number };
function clipPoly(pts: CP[], near = 0.8): CP[] {
  const out: CP[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const pin = p.depth >= near;
    const qin = q.depth >= near;
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = (near - p.depth) / (q.depth - p.depth);
      out.push({ a: p.a + (q.a - p.a) * t, up: p.up + (q.up - p.up) * t, depth: near });
    }
  }
  return out;
}

export function fillPoly(ctx: CanvasRenderingContext2D, cam: Cam, pts: V3[], fill: string): void {
  const c = clipPoly(pts.map((p) => cam.toCam(p)));
  if (c.length < 3) return;
  ctx.beginPath();
  c.forEach((p, i) => {
    const k = cam.F / p.depth;
    const x = cam.W / 2 + p.a * k;
    const y = cam.H / 2 + cam.yoff - p.up * k;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeLine(ctx: CanvasRenderingContext2D, cam: Cam, pts: V3[], color: string, widthM: number): void {
  const cs = pts.map((p) => cam.toCam(p));
  for (let i = 0; i + 1 < cs.length; i++) {
    let p = cs[i];
    let q = cs[i + 1];
    if (p.depth < 0.8 && q.depth < 0.8) continue;
    if (p.depth < 0.8) p = { a: p.a + (q.a - p.a) * ((0.8 - p.depth) / (q.depth - p.depth)), up: p.up + (q.up - p.up) * ((0.8 - p.depth) / (q.depth - p.depth)), depth: 0.8 };
    if (q.depth < 0.8) q = { a: q.a + (p.a - q.a) * ((0.8 - q.depth) / (p.depth - q.depth)), up: q.up + (p.up - q.up) * ((0.8 - q.depth) / (p.depth - q.depth)), depth: 0.8 };
    const k1 = cam.F / p.depth;
    const k2 = cam.F / q.depth;
    ctx.beginPath();
    ctx.moveTo(cam.W / 2 + p.a * k1, cam.H / 2 + cam.yoff - p.up * k1);
    ctx.lineTo(cam.W / 2 + q.a * k2, cam.H / 2 + cam.yoff - q.up * k2);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, widthM * ((k1 + k2) / 2));
    ctx.stroke();
  }
}

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const SKIN = ["#f1c27d", "#e0a370", "#c68642", "#8d5524", "#5c3a21"];
const HAIR = ["#1b1b1b", "#3b2a1a", "#6b4a2b", "#d8b45a", "#111"];

export type Sprite = { x: number; y: number; z?: number; kit: Kit; name: string; role?: "player" | "keeper"; tilt?: number; lift?: number; run?: number; star?: boolean; arms?: "up" | "down"; id?: string };

/** Desenha um jogador em pé (ou voando, no caso do goleiro) com a escala da perspectiva. */
export function drawPlayer(ctx: CanvasRenderingContext2D, cam: Cam, sp: Sprite): { x: number; y: number; s: number } | null {
  const base = cam.project([sp.x, sp.y, sp.z ?? 0]);
  if (!base) return null;
  const s = base.s;
  const h = hash(sp.name);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 4) % HAIR.length];
  const shirt = sp.kit.p;
  const trim = sp.kit.s;
  const run = sp.run ?? 0;
  ctx.save();
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(base.x, base.y, 0.55 * s, 0.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(base.x, base.y - (sp.lift ?? 0) * s);
  ctx.rotate(sp.tilt ?? 0);
  ctx.scale(s, s);
  const swing = Math.sin(run) * 0.16;
  // pernas
  ctx.fillStyle = skin;
  ctx.fillRect(-0.2 + swing, -0.85, 0.15, 0.85);
  ctx.fillRect(0.05 - swing, -0.85, 0.15, 0.85);
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(-0.21 + swing, -0.25, 0.17, 0.25);
  ctx.fillRect(0.04 - swing, -0.25, 0.17, 0.25);
  ctx.fillStyle = "#111";
  ctx.fillRect(-0.22 + swing, -0.07, 0.19, 0.07);
  ctx.fillRect(0.03 - swing, -0.07, 0.19, 0.07);
  // calção
  ctx.fillStyle = trim;
  ctx.fillRect(-0.24, -1.0, 0.48, 0.28);
  // braços
  const up = sp.arms === "up";
  ctx.fillStyle = skin;
  if (up) {
    ctx.fillRect(-0.4, -1.95, 0.12, 0.75);
    ctx.fillRect(0.28, -1.95, 0.12, 0.75);
  } else {
    ctx.save();
    ctx.translate(-0.3, -1.45);
    ctx.rotate(0.15 - swing);
    ctx.fillRect(-0.06, 0, 0.12, 0.65);
    ctx.restore();
    ctx.save();
    ctx.translate(0.3, -1.45);
    ctx.rotate(-0.15 + swing);
    ctx.fillRect(-0.06, 0, 0.12, 0.65);
    ctx.restore();
  }
  // camisa
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.roundRect(-0.3, -1.55, 0.6, 0.62, 0.08);
  ctx.fill();
  if (sp.kit.k === "stripes" || sp.kit.k === "hoops" || sp.kit.k === "halves" || sp.kit.k === "sash") {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-0.3, -1.55, 0.6, 0.62, 0.08);
    ctx.clip();
    ctx.fillStyle = trim;
    if (sp.kit.k === "stripes") for (let i = -2; i < 3; i++) ctx.fillRect(i * 0.24 - 0.06, -1.6, 0.12, 0.7);
    else if (sp.kit.k === "hoops") for (let i = 0; i < 3; i++) ctx.fillRect(-0.32, -1.55 + i * 0.22, 0.64, 0.1);
    else if (sp.kit.k === "halves") ctx.fillRect(0, -1.6, 0.4, 0.7);
    else {
      ctx.rotate(-0.6);
      ctx.fillRect(-0.5, -1.35, 1, 0.14);
    }
    ctx.restore();
  }
  // cabeça e cabelo
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -1.72, 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -1.77, 0.17, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  return { x: base.x, y: base.y - 1.95 * s, s };
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t = 0): void {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 5) * r * 0.12);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = "#ffd23c";
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawBall(ctx: CanvasRenderingContext2D, cam: Cam, p: V3): void {
  const g = cam.project([p[0], p[1], 0]);
  const b = cam.project(p);
  if (!g || !b) return;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(g.x, g.y, 0.22 * g.s, 0.08 * g.s, 0, 0, Math.PI * 2);
  ctx.fill();
  const r = 0.17 * b.s;
  ctx.beginPath();
  ctx.arc(b.x, b.y - r, r, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.2);
  ctx.strokeStyle = "#222";
  ctx.stroke();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(b.x, b.y - r, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

/** Estádio, gramado, linhas e gol. */
export function drawStadium(ctx: CanvasRenderingContext2D, cam: Cam, opts: { home: Kit; away: Kit; t: number }): void {
  const { W, H } = cam;
  const hy = Math.max(0, Math.min(H, cam.horizonY()));
  // céu e arquibancada
  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, "#0b1530");
  sky.addColorStop(1, "#26335a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, hy + 2);
  // torcida (pontinhos coloridos, determinísticos)
  for (let row = 0; row < 7; row++) {
    const y = hy - 8 - row * 11;
    for (let i = 0; i < 70; i++) {
      const hh = hash(`c${row}-${i}`);
      const x = (i / 70) * W + ((hh % 7) - 3);
      const col = hh % 3 === 0 ? opts.home.p : hh % 3 === 1 ? opts.away.p : ["#eee", "#ccd", "#999"][hh % 3];
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.55 + ((hh >> 3) % 4) * 0.1;
      ctx.beginPath();
      ctx.arc(x, y + Math.sin(opts.t * 3 + i) * 0.8, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // chão fora do campo
  ctx.fillStyle = "#14502a";
  ctx.fillRect(0, hy, W, H - hy);
  // placas de publicidade atrás do gol
  for (let i = -9; i < 9; i++) {
    const x0 = i * 4;
    fillPoly(ctx, cam, [[x0, 6, 0], [x0 + 4, 6, 0], [x0 + 4, 6, 1.0], [x0, 6, 1.0]], i % 2 === 0 ? "#1d4ed8" : "#f8fafc");
    if (i % 2 !== 0) fillPoly(ctx, cam, [[x0 + 1.2, 6, 0.3], [x0 + 2.8, 6, 0.3], [x0 + 2.8, 6, 0.7], [x0 + 1.2, 6, 0.7]], "#1d4ed8");
  }
  // gramado em faixas
  for (let k = -24; k < 0; k++) {
    const y0 = k * 4;
    fillPoly(ctx, cam, [[-34, y0, 0], [34, y0, 0], [34, y0 + 4, 0], [-34, y0 + 4, 0]], k % 2 === 0 ? "#2f9a4a" : "#37a652");
  }
  // área atrás da linha de fundo (até as placas)
  fillPoly(ctx, cam, [[-34, 0, 0], [34, 0, 0], [34, 6, 0], [-34, 6, 0]], "#1f6e36");
  const W1 = 0.12;
  const white = "rgba(255,255,255,0.92)";
  strokeLine(ctx, cam, [[-34, 0, 0], [34, 0, 0]], white, W1);
  strokeLine(ctx, cam, [[-34, 0, 0], [-34, -96, 0]], white, W1);
  strokeLine(ctx, cam, [[34, 0, 0], [34, -96, 0]], white, W1);
  strokeLine(ctx, cam, [[-20.16, 0, 0], [-20.16, -16.5, 0], [20.16, -16.5, 0], [20.16, 0, 0]], white, W1);
  strokeLine(ctx, cam, [[-9.16, 0, 0], [-9.16, -5.5, 0], [9.16, -5.5, 0], [9.16, 0, 0]], white, W1);
  const arc: V3[] = [];
  for (let a = -0.93; a <= 0.93; a += 0.08) arc.push([Math.sin(a) * 9.15, -11 - Math.cos(a) * 9.15, 0]);
  strokeLine(ctx, cam, arc, white, W1);
  const spot: V3[] = [];
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) spot.push([Math.cos(a) * 0.22, -11 + Math.sin(a) * 0.22, 0]);
  fillPoly(ctx, cam, spot, "rgba(255,255,255,0.92)");
  // rede
  const netCol = "rgba(255,255,255,0.35)";
  const back = 2.2;
  for (let x = -GOAL_HALF; x <= GOAL_HALF + 0.01; x += 0.61) strokeLine(ctx, cam, [[x, back, 0], [x, back, GOAL_H - 0.5]], netCol, 0.025);
  for (let z = 0; z <= GOAL_H; z += 0.4) strokeLine(ctx, cam, [[-GOAL_HALF, back, Math.min(z, GOAL_H - 0.5)], [GOAL_HALF, back, Math.min(z, GOAL_H - 0.5)]], netCol, 0.025);
  for (const sx of [-GOAL_HALF, GOAL_HALF]) {
    strokeLine(ctx, cam, [[sx, 0, GOAL_H], [sx, back, GOAL_H - 0.5]], netCol, 0.04);
    strokeLine(ctx, cam, [[sx, 0, 0], [sx, back, 0]], netCol, 0.04);
  }
  for (let x = -GOAL_HALF; x <= GOAL_HALF + 0.01; x += 0.61) strokeLine(ctx, cam, [[x, 0, GOAL_H], [x, back, GOAL_H - 0.5]], netCol, 0.025);
}

/** Trave, travessão e barra do gol por cima dos jogadores de trás. */
export function drawGoalFrame(ctx: CanvasRenderingContext2D, cam: Cam): void {
  strokeLine(ctx, cam, [[-GOAL_HALF, 0, 0], [-GOAL_HALF, 0, GOAL_H], [GOAL_HALF, 0, GOAL_H], [GOAL_HALF, 0, 0]], "#f8fafc", 0.13);
}

export function drawBanner(ctx: CanvasRenderingContext2D, W: number, H: number, text: string, sub: string | null, color: string, scale = 1): void {
  ctx.save();
  ctx.translate(W / 2, H * 0.38);
  ctx.scale(scale, scale);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = Math.min(W * 0.16, (W * 0.88) / Math.max(4, text.length * 0.66));
  ctx.font = `900 ${Math.round(size)}px system-ui, sans-serif`;
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  if (sub) {
    ctx.font = `800 ${Math.round(W * 0.05)}px system-ui, sans-serif`;
    ctx.lineWidth = 6;
    ctx.strokeText(sub, 0, size * 0.85);
    ctx.fillStyle = "#fff";
    ctx.fillText(sub, 0, size * 0.85);
  }
  ctx.restore();
}
