// ArenaSoccer: a torcida ao redor do campo (arquibancadas, torcedores pulando e balançando bandeiras) e o túnel dos jogadores.
import { GOAL_DEPTH, type Game } from "./engine";

/** Folga entre a linha do campo e a arquibancada (placas de publicidade). */
export const EDGE = 16;
/** Profundidade das arquibancadas laterais e das de cima e de baixo. */
export const SIDE = 84;
export const TOP = 84;
export const MARGIN_X = GOAL_DEPTH + EDGE + SIDE;
export const MARGIN_Y = EDGE + TOP;
/** Metade da largura do túnel (no centro da arquibancada de baixo). */
export const TUNNEL_HALF = 62;

export type Fan = {
  x: number;
  y: number;
  team: 0 | 1;
  /** 0 = camisa da cor do time, 1 = branca, 2 = cor do time mais escura */
  shirt: number;
  skin: string;
  hair: string;
  seed: number;
  /** 0 = sem bandeira, 1 = bandeira lisa, 2 = bandeira listrada */
  flag: 0 | 1 | 2;
  /** braços sempre pra cima (os mais animados) */
  arms: boolean;
};

const SKINS = ["#f1c9a0", "#e0a878", "#c68a5a", "#a96f45", "#7a4b2d"];
const HAIRS = ["#2a1a10", "#4a2c14", "#1a1a1a", "#8a5a2a", "#d9b25a", "#6a6a6a"];

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gera os torcedores (sempre os mesmos para o mesmo campo), já ordenados de trás pra frente. */
export function makeCrowd(g: Game): Fan[] {
  const rnd = mulberry(g.w * 7 + g.h);
  const out: Fan[] = [];
  const add = (x: number, y: number, team: 0 | 1) => {
    const r = rnd();
    out.push({
      x: x + (rnd() - 0.5) * 6,
      y: y + (rnd() - 0.5) * 4,
      team,
      shirt: r < 0.62 ? 0 : r < 0.84 ? 1 : 2,
      skin: SKINS[Math.floor(rnd() * SKINS.length)],
      hair: HAIRS[Math.floor(rnd() * HAIRS.length)],
      seed: rnd(),
      flag: rnd() < 0.09 ? 1 : rnd() < 0.07 ? 2 : 0,
      arms: rnd() < 0.4,
    });
  };
  const x0 = -MARGIN_X + 14;
  const x1 = g.w + MARGIN_X - 14;
  const step = 29;
  // em cima e embaixo: duas fileiras (a de trás um pouco deslocada)
  for (const row of [0, 1]) {
    for (let x = x0 + (row ? step / 2 : 0); x <= x1; x += step) {
      const team: 0 | 1 = x < g.w / 2 ? 0 : 1;
      add(x, -EDGE - 4 - row * 34, team);
      if (Math.abs(x - g.w / 2) > TUNNEL_HALF + 14) add(x, g.h + EDGE + 50 + row * 34, team);
    }
  }
  // dos lados: três colunas
  for (let c = 0; c < 3; c++) {
    for (let y = 34 + (c % 2) * 14; y <= g.h + 30; y += 36) {
      add(-GOAL_DEPTH - EDGE - 14 - c * 27, y, 0);
      add(g.w + GOAL_DEPTH + EDGE + 14 + c * 27, y, 1);
    }
  }
  out.sort((a, b) => a.y - b.y);
  return out;
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Fundo das arquibancadas, placas de publicidade e a boca do túnel. */
export function drawStandsBase(ctx: CanvasRenderingContext2D, g: Game, colors: [string, string]): void {
  const { w, h } = g;
  const gx = -MARGIN_X;
  const gy = -MARGIN_Y;
  const gw = w + 2 * MARGIN_X;
  const gh = h + 2 * MARGIN_Y;
  const bg = ctx.createLinearGradient(0, gy, 0, gy + gh);
  bg.addColorStop(0, "#1a2330");
  bg.addColorStop(0.5, "#243142");
  bg.addColorStop(1, "#1a2330");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(gx, gy, gw, gh, 70);
  ctx.fill();
  // degraus: faixas escuras atrás de cada fileira
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (const [y0, y1] of [
    [-EDGE - 38, -EDGE - 4],
    [h + EDGE + 16, h + EDGE + 50],
  ]) {
    ctx.fillRect(gx + 30, y0, gw - 60, y1 - y0);
  }
  // placas de publicidade na beira do campo, uma de cada cor
  const boards = 14;
  for (const top of [true, false]) {
    for (let i = 0; i < boards; i++) {
      const bx = (i * w) / boards;
      ctx.fillStyle = i % 3 === 0 ? colors[0] : i % 3 === 1 ? "#f8fafc" : colors[1];
      ctx.fillRect(bx + 1, top ? -EDGE + 2 : h + 2, w / boards - 2, EDGE - 4);
    }
  }
  for (const left of [true, false]) {
    const rows = 8;
    for (let i = 0; i < rows; i++) {
      const by = (i * h) / rows;
      ctx.fillStyle = i % 2 ? "#f8fafc" : colors[left ? 0 : 1];
      ctx.fillRect(left ? -GOAL_DEPTH - EDGE + 2 : w + GOAL_DEPTH + 2, by + 1, EDGE - 4, h / rows - 2);
    }
  }
  // o túnel dos jogadores, no meio da arquibancada de baixo
  const ty = h + EDGE;
  ctx.fillStyle = "#06090d";
  ctx.beginPath();
  ctx.roundRect(w / 2 - TUNNEL_HALF, ty - 4, TUNNEL_HALF * 2, TOP * 0.95, [18, 18, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#fde68a";
  for (let i = -2; i <= 2; i++) ctx.fillRect(w / 2 + i * 22 - 6, ty + 3, 12, 3);
}

/** Desenha um torcedor com os pés em (0,0), olhando de frente. */
function drawFan(ctx: CanvasRenderingContext2D, f: Fan, colors: [string, string], t: number, exc: number): void {
  const ph = f.seed * Math.PI * 2;
  const e = Math.min(1, exc + (f.arms ? 0.25 : 0));
  const hop = Math.max(0, Math.sin(t * (4 + 6 * e) + ph)) * (1.5 + 11 * e);
  const base = f.shirt === 1 ? "#f8fafc" : f.shirt === 2 ? shade(colors[f.team], 0.7) : colors[f.team];
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 1, 11, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -hop);
  // corpo
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.roundRect(-9, -31, 18, 26, 5);
  ctx.fill();
  ctx.fillStyle = "#334155";
  ctx.fillRect(-8, -7, 7, 7);
  ctx.fillRect(1, -7, 7, 7);
  // braços: pra cima quando animado, balançando quando não
  const up = e > 0.42 || f.arms;
  const sw = Math.sin(t * (up ? 7 : 2.2) + ph);
  ctx.lineCap = "round";
  ctx.lineWidth = 5;
  for (const s of [-1, 1]) {
    const sx = s * 8;
    const hx = up ? s * (13 + sw * 3 * s) : s * (12 + sw * 2);
    const hy = up ? -50 - 4 * Math.sin(t * 8 + ph + (s > 0 ? 1.7 : 0)) : -14;
    if (f.flag && s === 1) continue;
    ctx.strokeStyle = base;
    ctx.beginPath();
    ctx.moveTo(sx, -28);
    ctx.lineTo(sx + (hx - sx) * 0.45, -28 + (hy + 28) * 0.45);
    ctx.stroke();
    ctx.strokeStyle = f.skin;
    ctx.beginPath();
    ctx.lineTo(sx + (hx - sx) * 0.45, -28 + (hy + 28) * 0.45);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }
  // bandeira na mão direita
  if (f.flag) {
    const px = 13;
    const py = -50;
    ctx.strokeStyle = f.skin;
    ctx.beginPath();
    ctx.moveTo(8, -28);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px, py + 4);
    ctx.lineTo(px, py - 26);
    ctx.stroke();
    const top = py - 26;
    const n = 5;
    const wave = (i: number) => Math.sin(t * 6.5 + i * 0.95 + ph) * 3.4 * (i / n);
    for (const stripe of f.flag === 2 ? [0, 1] : [0]) {
      const y0 = stripe === 0 ? 0 : 7;
      const y1 = f.flag === 2 ? (stripe === 0 ? 7 : 14) : 14;
      ctx.fillStyle = stripe === 0 ? colors[f.team] : "#f8fafc";
      ctx.beginPath();
      for (let i = 0; i <= n; i++) ctx.lineTo(px + 1 + i * 5.2, top + y0 + wave(i));
      for (let i = n; i >= 0; i--) ctx.lineTo(px + 1 + i * 5.2, top + y1 + wave(i));
      ctx.closePath();
      ctx.fill();
    }
  }
  // cabeça
  ctx.fillStyle = f.skin;
  ctx.beginPath();
  ctx.arc(0, -39, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = f.hair;
  ctx.beginPath();
  ctx.arc(0, -41, 8.7, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fill();
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(-4, -39, 2, 2.4);
  ctx.fillRect(2, -39, 2, 2.4);
  if (e > 0.5) {
    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.ellipse(0, -34.2, 2.6, 2, 0, 0, Math.PI);
    ctx.fill();
  }
  ctx.translate(0, hop);
}

/** Estado de animação da torcida. */
export type CrowdFx = { fans: Fan[] | null };

/**
 * Desenha todos os torcedores. `cheer[time]`: segundos de festa de cada lado (depois de um gol);
 * `energy`: animação geral (abertura da partida). Com o campo girado, cada torcedor gira de volta pra ficar em pé.
 */
export function drawCrowd(ctx: CanvasRenderingContext2D, g: Game, fans: Fan[], colors: [string, string], t: number, cheer: [number, number], energy: number, rotated: boolean): void {
  const bx = g.ball.x;
  const by = g.ball.y;
  for (const f of fans) {
    const near = Math.max(0, 1 - Math.hypot(bx - f.x, by - f.y) / 420) * 0.3;
    const exc = Math.min(1, 0.12 + near + Math.min(1, cheer[f.team] / 1.2) * 0.9 + energy);
    ctx.save();
    ctx.translate(f.x, f.y);
    if (rotated) ctx.rotate(Math.PI / 2);
    drawFan(ctx, f, colors, t, exc);
    ctx.restore();
  }
}
