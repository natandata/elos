// ArenaSoccer: desenho do campo, dos discos e dos efeitos (canvas 2D).
import { type Fan, MARGIN_X, MARGIN_Y, TOP, EDGE, drawCrowd, drawStandsBase, makeCrowd } from "./crowd";
import { BALL_R, GOAL_DEPTH, PLAYER_R, type Disc, type Game } from "./engine";
import { shortName, type Kit } from "./teams";

export type Fx = {
  trail: { x: number; y: number }[];
  parts: { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }[];
  rings: { x: number; y: number; life: number; color: string }[];
  shake: number;
  banner: { text: string; color: string; t: number } | null;
  t: number;
  /** câmera (centro em coordenadas do campo) */
  cam: { x: number; y: number; z: number; init: boolean };
  /** torcida (criada no primeiro quadro) e segundos de festa de cada lado depois de um gol */
  crowd: Fan[] | null;
  cheer: [number, number];
  /** abertura: jogadores entrando no campo (null = acabou ou foi pulada) */
  intro: { t: number; dur: number } | null;
};

/** Duração da abertura (s). */
export const INTRO_SECS = 4;

export const newFx = (intro = true): Fx => ({ trail: [], parts: [], rings: [], shake: 0, banner: null, t: 0, cam: { x: 0, y: 0, z: 1, init: false }, crowd: null, cheer: [0, 0], intro: intro ? { t: 0, dur: INTRO_SECS } : null });

export type Look = { teamColors: [string, string]; /** uniformes de verdade (padrão, número e nome em campo) */ kits?: [Kit, Kit]; rotated: boolean; /** convidado online: o campo é visto de cabeça pra baixo, para ele atacar para a direita */ flip?: boolean };

/** Escala que faz o campo (com os gols e as arquibancadas) caber na área disponível. */
export function fitScale(g: Game, aw: number, ah: number, rotated: boolean): number {
  const lx = g.w + 2 * MARGIN_X;
  const ly = g.h + 2 * MARGIN_Y;
  return rotated ? Math.min(aw / ly, ah / lx) : Math.min(aw / lx, ah / ly);
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function disc(ctx: CanvasRenderingContext2D, d: Disc, color: string, human: boolean, fx: Fx, kit?: Kit, angle = 0): void {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(d.x + 4, d.y + 6, d.r, d.r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kit) {
    // camisa de verdade: cor principal + padrão da cor secundária, recortado no disco
    ctx.save();
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = kit.p;
    ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
    ctx.fillStyle = kit.s;
    const r = d.r;
    if (kit.k === "stripes") {
      for (let i = -3; i <= 3; i += 2) ctx.fillRect(d.x + (i - 0.5) * (r / 3.2), d.y - r, r / 3.2, r * 2);
    } else if (kit.k === "hoops") {
      for (let i = -3; i <= 3; i += 2) ctx.fillRect(d.x - r, d.y + (i - 0.5) * (r / 3.2), r * 2, r / 3.2);
    } else if (kit.k === "sash") {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(-r, -r * 0.2, r * 2, r * 0.4);
      ctx.restore();
    } else if (kit.k === "halves") {
      ctx.fillRect(d.x, d.y - r, r, r * 2);
    } else if (kit.k === "checker") {
      const c = r / 2.2;
      for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if ((x + y) % 2 === 0) ctx.fillRect(d.x + x * c - c / 2, d.y + y * c - c / 2, c, c);
    }
    const shine = ctx.createRadialGradient(d.x - d.r * 0.35, d.y - d.r * 0.4, d.r * 0.1, d.x, d.y, d.r);
    shine.addColorStop(0, "rgba(255,255,255,0.35)");
    shine.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = shine;
    ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
    ctx.restore();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = shade(kit.p.length === 7 ? kit.p : color, 0.45);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.stroke();
  } else {
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
  }
  if (d.num > 0) {
    // número na camisa (gira de volta para ficar em pé quando o campo está virado) e sobrenome embaixo
    ctx.save();
    ctx.translate(d.x, d.y);
    if (angle) ctx.rotate(angle);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 17px system-ui, sans-serif";
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.fillStyle = "#ffffff";
    ctx.strokeText(String(d.num), 0, 1);
    ctx.fillText(String(d.num), 0, 1);
    if (d.name) {
      ctx.font = "800 12px system-ui, sans-serif";
      ctx.lineWidth = 3;
      const n = shortName(d.name);
      ctx.strokeText(n, 0, d.r + 13);
      ctx.fillText(n, 0, d.r + 13);
    }
    ctx.restore();
  }
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

const MIN_DISC_PX = 30;

/** Câmera: nos campos grandes em telas pequenas os discos ficariam minúsculos, então aproxima e acompanha a bola. */
function updateCamera(fx: Fx, g: Game, s: number, aw: number, ah: number, rotated: boolean, dt: number): number {
  const need = MIN_DISC_PX / (PLAYER_R * 2 * s);
  // na abertura mostra o estádio inteiro
  const z = need <= 1.06 || fx.intro ? 1 : Math.min(2.3, need);
  const cam = fx.cam;
  const xmin = -MARGIN_X;
  const xmax = g.w + MARGIN_X;
  const ymin = -MARGIN_Y;
  const ymax = g.h + MARGIN_Y;
  let tx = (xmin + xmax) / 2;
  let ty = (ymin + ymax) / 2;
  if (z > 1 && !fx.intro) {
    const me = g.players[0];
    tx = g.ball.x * 0.65 + me.x * 0.35;
    ty = g.ball.y * 0.65 + me.y * 0.35;
    const halfX = (rotated ? ah : aw) / (2 * s * z);
    const halfY = (rotated ? aw : ah) / (2 * s * z);
    tx = xmax - xmin <= 2 * halfX ? (xmin + xmax) / 2 : Math.max(xmin + halfX, Math.min(xmax - halfX, tx));
    ty = ymax - ymin <= 2 * halfY ? (ymin + ymax) / 2 : Math.max(ymin + halfY, Math.min(ymax - halfY, ty));
  }
  if (!cam.init) {
    cam.x = tx;
    cam.y = ty;
    cam.z = z;
    cam.init = true;
  } else {
    const k = 1 - Math.exp(-7 * dt);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    cam.z += (z - cam.z) * k;
  }
  return cam.z;
}

/** Atualiza partículas, anéis e tremor. */
export function stepFx(fx: Fx, dt: number): void {
  fx.t += dt;
  fx.cheer[0] = Math.max(0, fx.cheer[0] - dt);
  fx.cheer[1] = Math.max(0, fx.cheer[1] - dt);
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
export function draw(ctx: CanvasRenderingContext2D, g: Game, fx: Fx, look: Look, aw: number, ah: number, dpr: number, dt = 0.016): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, aw, ah);
  const s = fitScale(g, aw, ah, look.rotated);
  const sh = fx.shake > 0 ? (Math.random() - 0.5) * fx.shake * 2 : 0;
  ctx.save();
  ctx.translate(aw / 2 + sh, ah / 2 + (fx.shake > 0 ? (Math.random() - 0.5) * fx.shake * 2 : 0));
  if (look.rotated) ctx.rotate(-Math.PI / 2);
  if (look.flip) ctx.rotate(Math.PI);
  const z = updateCamera(fx, g, s, aw, ah, look.rotated, dt);
  ctx.scale(s * z, s * z);
  ctx.translate(-fx.cam.x, -fx.cam.y);
  if (!fx.crowd) fx.crowd = makeCrowd(g);
  drawStandsBase(ctx, g, look.teamColors);
  pitch(ctx, g, look);
  // a torcida: pula e balança bandeira (mais animada na abertura e depois de um gol)
  const introK = fx.intro ? Math.min(1, fx.intro.t / 0.8) * 0.7 : 0;
  drawCrowd(ctx, g, fx.crowd, look.teamColors, fx.t, fx.cheer, introK, (look.rotated ? Math.PI / 2 : 0) + (look.flip ? Math.PI : 0));

  // abertura: os jogadores saem do túnel (embaixo) e correm até a posição; a bola cai no centro
  const it = fx.intro?.t ?? -1;
  const ease = (k: number) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
  const ballIn = it < 0 ? 1 : ease((it - 2.5) / 1.1);
  const b = it >= 0 && ballIn < 1 ? { ...g.ball } : g.ball;
  let ballScale = 1;
  if (it >= 0) {
    if (it < 2.5) b.r = 0;
    else {
      const k = Math.max(0, Math.min(1, (it - 2.5) / 1.1));
      // cai de cima, quica uma vez e assenta
      const drop = k < 0.6 ? (1 - k / 0.6) ** 2 : Math.abs(Math.sin(((k - 0.6) / 0.4) * Math.PI)) * 0.18 * (1 - (k - 0.6) / 0.4);
      ballScale = 1 + drop * 2.2;
      b.y = g.ball.y - drop * 150;
    }
  }
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
  if (b.r > 0 || it < 0) {
    const br = (it >= 0 ? BALL_R : b.r) * ballScale;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(g.ball.x + 3, g.ball.y + 5, BALL_R * (it >= 0 ? 0.6 + 0.4 * ballIn : 1), BALL_R * 0.9 * (it >= 0 ? 0.6 + 0.4 * ballIn : 1), 0, 0, Math.PI * 2);
    ctx.fill();
    const bg = ctx.createRadialGradient(b.x - 4, b.y - 5, 2, b.x, b.y, br);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#cbd5e1");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(b.x, b.y, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1f2937";
    ctx.stroke();
    const rot = (b.x + b.y) * 0.05;
    ctx.fillStyle = "#1f2937";
    for (let i = 0; i < 3; i++) {
      const a = rot + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * br * 0.5, b.y + Math.sin(a) * br * 0.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const perTeam = [0, 0];
  for (const p of g.players) {
    const idx = perTeam[p.team === 1 ? 1 : 0]++;
    if (it < 0) {
      disc(ctx, p, look.teamColors[p.team === 1 ? 1 : 0], p.human, fx, look.kits?.[p.team === 1 ? 1 : 0], (look.rotated ? Math.PI / 2 : 0) + (look.flip ? Math.PI : 0));
      continue;
    }
    // abertura: sai do túnel, faz uma curva e chega na posição de saída
    const delay = (p.team === 1 ? 0.25 : 0) + idx * 0.3;
    const k = (it - delay) / 1.6;
    if (k <= 0) continue;
    const e = ease(k);
    const sx = g.w / 2 + (p.team === 1 ? 26 : -26);
    const sy = g.h + EDGE + TOP * 0.55;
    const ax = g.w / 2 + (p.team === 1 ? 70 : -70);
    const ay = g.h - 20;
    const hx = p.home.x * g.w;
    const hy = p.home.y * g.h;
    const u = 1 - e;
    const pos = { ...p, x: u * u * sx + 2 * u * e * ax + e * e * hx, y: u * u * sy + 2 * u * e * ay + e * e * hy, flash: 9 };
    disc(ctx, pos, look.teamColors[p.team === 1 ? 1 : 0], p.human && e >= 1, fx, look.kits?.[p.team === 1 ? 1 : 0], (look.rotated ? Math.PI / 2 : 0) + (look.flip ? Math.PI : 0));
  }

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
  if (g.phase === "countdown" && !fx.intro) {
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
