// Cenários das arenas: cada lugar bíblico tem os seus próprios elementos
// (Éden com a árvore da vida e a serpente, Ararate com a arca e os animais etc.).
// Tudo desenhado em canvas, uma vez por tamanho de tela, nas laterais do campo
// (que quase ninguém usa) e em detalhes rasteiros no chão.
// Coordenadas em tiles do campo (W=16, H=26); y de cada objeto = onde ele pisa.

import { campo, tinted, type CampoName } from "./arenaAssets";

export type Env = {
  g: CanvasRenderingContext2D;
  s: number;
  X: (x: number) => number;
  Y: (y: number) => number;
  left: number;
  right: number;
  /** sorteio fixo (o cenário é sempre o mesmo) */
  r: () => number;
};

const TAU = Math.PI * 2;
/** Aumento geral dos objetos do cenário (as laterais são largas e quase vazias). */
const K = 1.35;

// ------------------------------------------------------------ pincéis

function ell(e: Env, cx: number, cy: number, rx: number, ry: number, fill: string, stroke?: string, lw = 0.05, rot = 0) {
  const { g, s } = e;
  g.beginPath();
  g.ellipse(e.X(cx), e.Y(cy), rx * s, ry * s, rot, 0, TAU);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = Math.max(1, lw * s);
    g.stroke();
  }
}
const circ = (e: Env, cx: number, cy: number, r: number, fill: string, stroke?: string, lw = 0.05) => ell(e, cx, cy, r, r, fill, stroke, lw);

function poly(e: Env, pts: [number, number][], fill: string, stroke?: string, lw = 0.05) {
  const { g, s } = e;
  g.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(e.X(x), e.Y(y)) : g.lineTo(e.X(x), e.Y(y))));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = Math.max(1, lw * s);
    g.lineJoin = "round";
    g.stroke();
  }
}

function rect(e: Env, x: number, y: number, w: number, h: number, fill: string, stroke?: string, lw = 0.05, rad = 0.06) {
  const { g, s } = e;
  const px = e.X(x);
  const py = e.Y(y);
  const pw = w * s;
  const ph = h * s;
  const r = Math.min(rad * s, pw / 2, ph / 2);
  g.beginPath();
  g.moveTo(px + r, py);
  g.arcTo(px + pw, py, px + pw, py + ph, r);
  g.arcTo(px + pw, py + ph, px, py + ph, r);
  g.arcTo(px, py + ph, px, py, r);
  g.arcTo(px, py, px + pw, py, r);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = Math.max(1, lw * s);
    g.stroke();
  }
}

function line(e: Env, x1: number, y1: number, x2: number, y2: number, color: string, w = 0.08, cap: CanvasLineCap = "round") {
  const { g, s } = e;
  g.strokeStyle = color;
  g.lineWidth = Math.max(1, w * s);
  g.lineCap = cap;
  g.beginPath();
  g.moveTo(e.X(x1), e.Y(y1));
  g.lineTo(e.X(x2), e.Y(y2));
  g.stroke();
}

function curve(e: Env, pts: [number, number][], color: string, w = 0.1) {
  const { g, s } = e;
  g.strokeStyle = color;
  g.lineWidth = Math.max(1, w * s);
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(e.X(x), e.Y(y)) : g.lineTo(e.X(x), e.Y(y))));
  g.stroke();
}

function glow(e: Env, cx: number, cy: number, r: number, color: string) {
  const { g, s } = e;
  const gr = g.createRadialGradient(e.X(cx), e.Y(cy), 0, e.X(cx), e.Y(cy), r * s);
  gr.addColorStop(0, color);
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(e.X(cx), e.Y(cy), r * s, 0, TAU);
  g.fill();
}

const shadow = (e: Env, x: number, y: number, rx: number) => ell(e, x, y + 0.05, rx, rx * 0.32, "rgba(0,0,0,0.22)");

// ------------------------------------------------------------ plantas

/** Desenha um sprite 3D (base no ponto, altura em tiles). Devolve false se ainda não carregou (cai no desenho de reserva). */
function spr(e: Env, name: CampoName, x: number, y: number, h: number, tint?: string, amount = 0): boolean {
  const base = campo(name);
  const img = tint ? tinted(name, tint, amount) : base;
  if (!base || !img) return false;
  const H = h * e.s;
  const W = (H * base.naturalWidth) / base.naturalHeight;
  const px = e.X(x);
  const py = e.Y(y);
  e.g.fillStyle = "rgba(10,30,5,0.2)";
  e.g.beginPath();
  e.g.ellipse(px + W * 0.05, py - H * 0.03, W * 0.38, H * 0.09, 0, 0, TAU);
  e.g.fill();
  e.g.drawImage(img, px - W / 2, py - H, W, H);
  return true;
}

type TreeOpts = { trunk?: string; dark: string; mid: string; light: string; fruit?: string; fruitGlow?: boolean; fruits?: number };

function tree(e: Env, x: number, y: number, sc: number, o: TreeOpts) {
  sc *= K;
  if (o.fruit && o.fruitGlow ? spr(e, "arvore-moedas", x, y, 3.2 * sc) : o.fruit ? spr(e, "macieira", x, y, 3.2 * sc) : spr(e, x * 7 % 2 > 1 ? "carvalho" : "arvore", x, y, 3.2 * sc, o.mid, 0.22)) return;
  shadow(e, x, y, 1.0 * sc);
  rect(e, x - 0.2 * sc, y - 1.5 * sc, 0.4 * sc, 1.5 * sc, o.trunk ?? "#6b4423", "#4a2f16", 0.03, 0.05);
  circ(e, x, y - 2.1 * sc, 1.15 * sc, o.dark);
  circ(e, x - 0.55 * sc, y - 1.75 * sc, 0.8 * sc, o.dark);
  circ(e, x + 0.6 * sc, y - 1.8 * sc, 0.85 * sc, o.dark);
  circ(e, x - 0.1 * sc, y - 2.25 * sc, 0.95 * sc, o.mid);
  circ(e, x + 0.45 * sc, y - 1.95 * sc, 0.6 * sc, o.mid);
  circ(e, x - 0.4 * sc, y - 2.5 * sc, 0.5 * sc, o.light);
  if (o.fruit) {
    const n = o.fruits ?? 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.5;
      const rr = (0.35 + ((i * 37) % 10) / 10 * 0.75) * sc;
      const fx = x + Math.cos(a) * rr * 0.95;
      const fy = y - 2.1 * sc + Math.sin(a) * rr * 0.75;
      if (o.fruitGlow) glow(e, fx, fy, 0.34 * sc, "rgba(255,230,120,0.7)");
      circ(e, fx, fy, 0.13 * sc, o.fruit, "rgba(90,50,0,0.7)", 0.02);
    }
  }
}

function palm(e: Env, x: number, y: number, sc: number, lean = 0.3) {
  sc *= K;
  if (spr(e, "palmeira", x, y, 3.0 * sc)) return;
  shadow(e, x, y, 0.7 * sc);
  curve(e, [[x, y], [x + lean * 0.4 * sc, y - 1.0 * sc], [x + lean * sc, y - 2.0 * sc]], "#8a5a2b", 0.3 * sc);
  curve(e, [[x, y], [x + lean * 0.4 * sc, y - 1.0 * sc], [x + lean * sc, y - 2.0 * sc]], "#a4713a", 0.15 * sc);
  const cx = x + lean * sc;
  const cy = y - 2.05 * sc;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
    const lx = cx + Math.cos(a) * 1.2 * sc;
    const ly = cy + Math.sin(a) * 0.55 * sc + 0.45 * sc;
    curve(e, [[cx, cy], [(cx + lx) / 2, cy + Math.sin(a) * 0.7 * sc - 0.1 * sc], [lx, ly]], i % 2 ? "#2f8f3a" : "#3fae4a", 0.2 * sc);
  }
  circ(e, cx, cy + 0.05 * sc, 0.14 * sc, "#7a4a1d");
}

function olive(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  if (spr(e, "oliveira", x, y, 2.9 * sc)) return;
  shadow(e, x, y, 1.0 * sc);
  curve(e, [[x, y], [x - 0.15 * sc, y - 0.8 * sc], [x + 0.2 * sc, y - 1.4 * sc]], "#6b5a45", 0.38 * sc);
  circ(e, x - 0.5 * sc, y - 1.7 * sc, 0.7 * sc, "#6f8456");
  circ(e, x + 0.5 * sc, y - 1.75 * sc, 0.75 * sc, "#7d9462");
  circ(e, x, y - 2.05 * sc, 0.8 * sc, "#8fa771");
  circ(e, x - 0.25 * sc, y - 2.25 * sc, 0.4 * sc, "#a9bf8a");
  for (let i = 0; i < 5; i++) circ(e, x - 0.7 * sc + i * 0.35 * sc, y - 1.5 * sc - (i % 2) * 0.5 * sc, 0.05 * sc, "#3b3a2a");
}

function bush(e: Env, x: number, y: number, r: number, d: string, m: string, l: string) {
  if (spr(e, "arbusto", x, y + r * 0.7, r * 2.4, m, 0.3)) return;
  ell(e, x, y + r * 0.7, r * 1.1, r * 0.35, "rgba(0,0,0,0.2)");
  circ(e, x, y, r, d);
  circ(e, x - r * 0.2, y - r * 0.2, r * 0.75, m);
  circ(e, x - r * 0.35, y - r * 0.4, r * 0.4, l);
}

function flower(e: Env, x: number, y: number, r: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    circ(e, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, r * 0.7, color);
  }
  circ(e, x, y, r * 0.55, "#fde047");
}

function tuft(e: Env, x: number, y: number, c: string) {
  for (let i = -1; i <= 1; i++) line(e, x + i * 0.08, y, x + i * 0.14, y - 0.22 - (i === 0 ? 0.08 : 0), c, 0.04);
}

// ------------------------------------------------------------ gente

type PersonOpts = { robe: string; trim?: string; skin?: string; hair?: string; hood?: string; staff?: boolean; halo?: boolean; leaf?: boolean; arms?: "up" | "down"; long?: boolean };

function person(e: Env, x: number, y: number, sc: number, o: PersonOpts) {
  sc *= K;
  // Adão e Eva: sprites no mesmo estilo das torres e árvores (o desenho abaixo só aparece se a imagem não carregou)
  if (o.leaf && spr(e, o.long ? "eva" : "adao", x, y + 0.1, 2.15 * sc)) return;
  const skin = o.skin ?? "#e0ac7e";
  shadow(e, x, y, 0.4 * sc);
  if (o.halo) glow(e, x, y - 1.35 * sc, 0.9 * sc, "rgba(255,245,170,0.85)");
  if (o.staff) line(e, x + 0.38 * sc, y, x + 0.42 * sc, y - 1.6 * sc, "#7a4a1d", 0.07 * sc);
  if (o.leaf) {
    // pernas e folhas de figueira
    rect(e, x - 0.17 * sc, y - 0.5 * sc, 0.12 * sc, 0.5 * sc, skin);
    rect(e, x + 0.05 * sc, y - 0.5 * sc, 0.12 * sc, 0.5 * sc, skin);
    rect(e, x - 0.22 * sc, y - 0.95 * sc, 0.44 * sc, 0.5 * sc, skin);
    poly(e, [[x - 0.22 * sc, y - 0.6 * sc], [x + 0.22 * sc, y - 0.6 * sc], [x + 0.12 * sc, y - 0.3 * sc], [x - 0.12 * sc, y - 0.3 * sc]], "#3f9b3f", "#256b2a", 0.02);
  } else {
    poly(e, [[x - 0.2 * sc, y - 1.0 * sc], [x + 0.2 * sc, y - 1.0 * sc], [x + 0.3 * sc, y], [x - 0.3 * sc, y]], o.robe, "rgba(0,0,0,0.35)", 0.025);
    if (o.trim) rect(e, x - 0.04 * sc, y - 1.0 * sc, 0.08 * sc, 1.0 * sc, o.trim);
  }
  if (o.arms === "up") {
    line(e, x - 0.2 * sc, y - 0.9 * sc, x - 0.4 * sc, y - 1.35 * sc, skin, 0.1 * sc);
    line(e, x + 0.2 * sc, y - 0.9 * sc, x + 0.4 * sc, y - 1.35 * sc, skin, 0.1 * sc);
  } else {
    line(e, x - 0.2 * sc, y - 0.9 * sc, x - 0.28 * sc, y - 0.5 * sc, skin, 0.1 * sc);
    line(e, x + 0.2 * sc, y - 0.9 * sc, x + 0.28 * sc, y - 0.5 * sc, skin, 0.1 * sc);
  }
  if (o.long && o.hair) ell(e, x, y - 1.05 * sc, 0.3 * sc, 0.45 * sc, o.hair);
  circ(e, x, y - 1.22 * sc, 0.22 * sc, skin, "rgba(0,0,0,0.3)", 0.02);
  if (o.hood) {
    ell(e, x, y - 1.28 * sc, 0.26 * sc, 0.2 * sc, o.hood);
    rect(e, x - 0.17 * sc, y - 1.22 * sc, 0.34 * sc, 0.15 * sc, skin);
  } else if (o.hair) {
    ell(e, x, y - 1.33 * sc, 0.23 * sc, 0.14 * sc, o.hair);
  }
  circ(e, x - 0.07 * sc, y - 1.2 * sc, 0.025 * sc, "#222");
  circ(e, x + 0.07 * sc, y - 1.2 * sc, 0.025 * sc, "#222");
}

// ------------------------------------------------------------ bichos

function lion(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  if (spr(e, "leao", x, y + 0.15, 1.7 * sc)) return;
  shadow(e, x, y, 0.8 * sc);
  curve(e, [[x - 0.7 * sc, y - 0.4 * sc], [x - 1.0 * sc, y - 0.5 * sc], [x - 1.05 * sc, y - 0.8 * sc]], "#c9913d", 0.07 * sc);
  circ(e, x - 1.05 * sc, y - 0.85 * sc, 0.1 * sc, "#8a4b14");
  ell(e, x - 0.1 * sc, y - 0.45 * sc, 0.7 * sc, 0.38 * sc, "#e0a94b", "#a8711f", 0.03);
  for (const lx of [-0.45, -0.15, 0.2, 0.45]) rect(e, x + lx * sc, y - 0.2 * sc, 0.14 * sc, 0.22 * sc, "#d19a3f");
  circ(e, x + 0.65 * sc, y - 0.6 * sc, 0.4 * sc, "#8a4b14");
  circ(e, x + 0.7 * sc, y - 0.58 * sc, 0.26 * sc, "#e8b255", "#a8711f", 0.02);
  circ(e, x + 0.78 * sc, y - 0.62 * sc, 0.03 * sc, "#222");
  ell(e, x + 0.88 * sc, y - 0.52 * sc, 0.06 * sc, 0.04 * sc, "#5a2a14");
}

function lamb(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  if (spr(e, "cordeiro", x, y + 0.1, 1.15 * sc)) return;
  shadow(e, x, y, 0.5 * sc);
  for (const lx of [-0.2, 0.15]) rect(e, x + lx * sc, y - 0.2 * sc, 0.07 * sc, 0.22 * sc, "#4a3a30");
  circ(e, x - 0.2 * sc, y - 0.4 * sc, 0.27 * sc, "#fff");
  circ(e, x + 0.05 * sc, y - 0.45 * sc, 0.3 * sc, "#fff");
  circ(e, x + 0.28 * sc, y - 0.38 * sc, 0.22 * sc, "#fafafa", "#d4d4d4", 0.02);
  circ(e, x + 0.45 * sc, y - 0.44 * sc, 0.14 * sc, "#4a3a30");
}

function sheep(e: Env, x: number, y: number, sc: number) {
  lamb(e, x, y, sc * 1.1);
}

function elephant(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  shadow(e, x, y, 0.95 * sc);
  for (const lx of [-0.5, -0.15, 0.25, 0.55]) rect(e, x + lx * sc, y - 0.4 * sc, 0.24 * sc, 0.42 * sc, "#8993a1");
  ell(e, x, y - 0.75 * sc, 0.85 * sc, 0.55 * sc, "#a2acb9", "#6c7684", 0.03);
  circ(e, x + 0.75 * sc, y - 0.95 * sc, 0.38 * sc, "#a2acb9", "#6c7684", 0.03);
  ell(e, x + 0.55 * sc, y - 0.9 * sc, 0.25 * sc, 0.33 * sc, "#8993a1");
  curve(e, [[x + 1.0 * sc, y - 0.9 * sc], [x + 1.15 * sc, y - 0.55 * sc], [x + 1.05 * sc, y - 0.25 * sc]], "#a2acb9", 0.2 * sc);
  curve(e, [[x + 0.95 * sc, y - 0.8 * sc], [x + 1.12 * sc, y - 0.7 * sc]], "#f5f0e2", 0.07 * sc);
  circ(e, x + 0.85 * sc, y - 1.02 * sc, 0.035 * sc, "#222");
}

function giraffe(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  shadow(e, x, y, 0.7 * sc);
  for (const lx of [-0.4, -0.15, 0.2, 0.42]) rect(e, x + lx * sc, y - 0.8 * sc, 0.1 * sc, 0.82 * sc, "#dba84f");
  ell(e, x, y - 1.0 * sc, 0.6 * sc, 0.32 * sc, "#e8b95a", "#a77a2a", 0.03);
  curve(e, [[x + 0.45 * sc, y - 1.15 * sc], [x + 0.65 * sc, y - 1.9 * sc], [x + 0.72 * sc, y - 2.3 * sc]], "#e8b95a", 0.22 * sc);
  ell(e, x + 0.82 * sc, y - 2.35 * sc, 0.2 * sc, 0.13 * sc, "#e8b95a", "#a77a2a", 0.02);
  line(e, x + 0.75 * sc, y - 2.5 * sc, x + 0.75 * sc, y - 2.65 * sc, "#8a5a2b", 0.04 * sc);
  line(e, x + 0.85 * sc, y - 2.5 * sc, x + 0.87 * sc, y - 2.65 * sc, "#8a5a2b", 0.04 * sc);
  for (const [px, py] of [[-0.3, -1.0], [0.0, -1.1], [0.25, -0.95], [0.6, -1.5], [0.68, -1.85]]) circ(e, x + px * sc, y + py * sc, 0.07 * sc, "#a8611f");
}

function dove(e: Env, x: number, y: number, sc: number, olive = false) {
  sc *= K;
  ell(e, x, y, 0.22 * sc, 0.13 * sc, "#fff", "#c8d0d8", 0.02);
  circ(e, x + 0.2 * sc, y - 0.08 * sc, 0.09 * sc, "#fff", "#c8d0d8", 0.02);
  poly(e, [[x + 0.28 * sc, y - 0.08 * sc], [x + 0.36 * sc, y - 0.05 * sc], [x + 0.28 * sc, y - 0.03 * sc]], "#f59e0b");
  ell(e, x - 0.02 * sc, y - 0.12 * sc, 0.17 * sc, 0.09 * sc, "#eef2f7", "#c8d0d8", 0.02, -0.5);
  poly(e, [[x - 0.2 * sc, y], [x - 0.38 * sc, y + 0.06 * sc], [x - 0.2 * sc, y + 0.08 * sc]], "#fff", "#c8d0d8", 0.02);
  if (olive) {
    curve(e, [[x + 0.3 * sc, y - 0.05 * sc], [x + 0.55 * sc, y + 0.05 * sc]], "#4d7c2a", 0.03 * sc);
    for (const d of [0.38, 0.46, 0.54]) ell(e, x + d * sc, y + (d - 0.3) * 0.2 * sc - 0.04 * sc, 0.05 * sc, 0.025 * sc, "#6aa84f", undefined, 0, -0.5);
  }
}

function snake(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  if (spr(e, "cobra", x, y + 0.25, 1.5 * sc)) return;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    pts.push([x + Math.sin(t * Math.PI * 2.4) * 0.28 * sc, y - t * 1.5 * sc]);
  }
  curve(e, pts, "#0f3d17", 0.26 * sc);
  curve(e, pts, "#4cc25a", 0.16 * sc);
  for (let i = 1; i < pts.length - 1; i += 2) circ(e, pts[i][0], pts[i][1], 0.04 * sc, "#e8d44d");
  const [hx, hy] = pts[pts.length - 1];
  ell(e, hx, hy - 0.05 * sc, 0.17 * sc, 0.12 * sc, "#3fa24a", "#1f6b2a", 0.02);
  circ(e, hx - 0.05 * sc, hy - 0.08 * sc, 0.03 * sc, "#fde047");
  curve(e, [[hx, hy + 0.04 * sc], [hx + 0.02 * sc, hy + 0.2 * sc], [hx - 0.03 * sc, hy + 0.27 * sc]], "#e11d48", 0.025 * sc);
}

function camel(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  shadow(e, x, y, 0.8 * sc);
  for (const lx of [-0.45, -0.2, 0.2, 0.45]) rect(e, x + lx * sc, y - 0.7 * sc, 0.1 * sc, 0.72 * sc, "#c79a55");
  ell(e, x, y - 0.95 * sc, 0.6 * sc, 0.3 * sc, "#d9ae68", "#9b7433", 0.03);
  circ(e, x - 0.2 * sc, y - 1.28 * sc, 0.2 * sc, "#d9ae68", "#9b7433", 0.025);
  circ(e, x + 0.15 * sc, y - 1.25 * sc, 0.18 * sc, "#d9ae68", "#9b7433", 0.025);
  curve(e, [[x + 0.5 * sc, y - 1.05 * sc], [x + 0.72 * sc, y - 1.5 * sc], [x + 0.85 * sc, y - 1.65 * sc]], "#d9ae68", 0.17 * sc);
  ell(e, x + 0.95 * sc, y - 1.68 * sc, 0.15 * sc, 0.1 * sc, "#d9ae68", "#9b7433", 0.02);
  curve(e, [[x - 0.58 * sc, y - 0.95 * sc], [x - 0.68 * sc, y - 0.6 * sc]], "#9b7433", 0.04 * sc);
}

function deer(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  if (spr(e, "cervo", x, y + 0.1, 1.9 * sc)) return;
  shadow(e, x, y, 0.6 * sc);
  for (const lx of [-0.3, -0.1, 0.18, 0.34]) rect(e, x + lx * sc, y - 0.6 * sc, 0.07 * sc, 0.62 * sc, "#9b6a3a");
  ell(e, x, y - 0.75 * sc, 0.45 * sc, 0.24 * sc, "#b87c46", "#7e4f26", 0.03);
  curve(e, [[x + 0.35 * sc, y - 0.85 * sc], [x + 0.5 * sc, y - 1.1 * sc]], "#b87c46", 0.14 * sc);
  ell(e, x + 0.58 * sc, y - 1.15 * sc, 0.13 * sc, 0.09 * sc, "#b87c46", "#7e4f26", 0.02);
  curve(e, [[x + 0.55 * sc, y - 1.25 * sc], [x + 0.5 * sc, y - 1.5 * sc], [x + 0.6 * sc, y - 1.65 * sc]], "#6b4423", 0.03 * sc);
  curve(e, [[x + 0.6 * sc, y - 1.25 * sc], [x + 0.68 * sc, y - 1.5 * sc], [x + 0.78 * sc, y - 1.6 * sc]], "#6b4423", 0.03 * sc);
}

function fish(e: Env, x: number, y: number, sc: number, color = "#9fb7c9") {
  sc *= K;
  ell(e, x, y, 0.3 * sc, 0.13 * sc, color, "rgba(0,0,0,0.3)", 0.02);
  poly(e, [[x - 0.26 * sc, y], [x - 0.5 * sc, y - 0.14 * sc], [x - 0.5 * sc, y + 0.14 * sc]], color, "rgba(0,0,0,0.3)", 0.02);
  circ(e, x + 0.16 * sc, y - 0.03 * sc, 0.03 * sc, "#222");
}

function bird(e: Env, x: number, y: number, sc: number, color = "#e5e7eb") {
  sc *= K;
  curve(e, [[x - 0.25 * sc, y + 0.04 * sc], [x - 0.12 * sc, y - 0.1 * sc], [x, y]], color, 0.05 * sc);
  curve(e, [[x, y], [x + 0.12 * sc, y - 0.1 * sc], [x + 0.25 * sc, y + 0.04 * sc]], color, 0.05 * sc);
}

function butterfly(e: Env, x: number, y: number, sc: number, c: string) {
  sc *= K;
  ell(e, x - 0.1 * sc, y - 0.04 * sc, 0.1 * sc, 0.07 * sc, c, undefined, 0, -0.5);
  ell(e, x + 0.1 * sc, y - 0.04 * sc, 0.1 * sc, 0.07 * sc, c, undefined, 0, 0.5);
  line(e, x, y - 0.08 * sc, x, y + 0.06 * sc, "#3a2a1a", 0.03 * sc);
}

// ------------------------------------------------------------ construções e objetos

function mountain(e: Env, x: number, y: number, w: number, h: number, rock: string, rock2: string, snow?: string) {
  poly(e, [[x - w / 2, y], [x - w * 0.12, y - h], [x + w * 0.08, y - h * 0.85], [x + w * 0.25, y - h * 0.95], [x + w / 2, y]], rock, "rgba(0,0,0,0.35)", 0.03);
  poly(e, [[x + w * 0.05, y], [x + w * 0.08, y - h * 0.85], [x + w * 0.25, y - h * 0.95], [x + w / 2, y]], rock2);
  if (snow) {
    poly(e, [[x - w * 0.22, y - h * 0.68], [x - w * 0.12, y - h], [x + w * 0.08, y - h * 0.85], [x + w * 0.02, y - h * 0.72], [x - w * 0.06, y - h * 0.78], [x - w * 0.14, y - h * 0.66]], snow);
    poly(e, [[x + w * 0.16, y - h * 0.8], [x + w * 0.25, y - h * 0.95], [x + w * 0.34, y - h * 0.7], [x + w * 0.27, y - h * 0.76], [x + w * 0.22, y - h * 0.7]], snow);
  }
}

function flame(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  glow(e, x, y - 0.5 * sc, 1.0 * sc, "rgba(255,160,40,0.45)");
  poly(e, [[x - 0.32 * sc, y], [x - 0.35 * sc, y - 0.45 * sc], [x - 0.12 * sc, y - 0.7 * sc], [x - 0.1 * sc, y - 1.05 * sc], [x + 0.1 * sc, y - 0.7 * sc], [x + 0.3 * sc, y - 0.55 * sc], [x + 0.32 * sc, y - 0.2 * sc], [x + 0.2 * sc, y]], "#f97316");
  poly(e, [[x - 0.2 * sc, y], [x - 0.2 * sc, y - 0.35 * sc], [x, y - 0.75 * sc], [x + 0.18 * sc, y - 0.35 * sc], [x + 0.12 * sc, y]], "#fbbf24");
  poly(e, [[x - 0.09 * sc, y], [x - 0.07 * sc, y - 0.25 * sc], [x + 0.02 * sc, y - 0.42 * sc], [x + 0.09 * sc, y - 0.2 * sc], [x + 0.06 * sc, y]], "#fef9c3");
}

function tent(e: Env, x: number, y: number, sc: number, body: string, stripe: string, flag?: string) {
  sc *= K;
  shadow(e, x, y, 0.95 * sc);
  poly(e, [[x - 0.9 * sc, y], [x, y - 1.3 * sc], [x + 0.9 * sc, y]], body, "rgba(0,0,0,0.4)", 0.03);
  poly(e, [[x - 0.3 * sc, y], [x, y - 1.3 * sc], [x + 0.3 * sc, y]], stripe);
  poly(e, [[x - 0.2 * sc, y], [x, y - 0.55 * sc], [x + 0.2 * sc, y]], "#2b1a0e");
  if (flag) {
    line(e, x, y - 1.3 * sc, x, y - 1.75 * sc, "#5a3a1a", 0.04 * sc);
    poly(e, [[x, y - 1.75 * sc], [x + 0.4 * sc, y - 1.62 * sc], [x, y - 1.5 * sc]], flag);
  }
}

function ark(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  shadow(e, x, y, 1.5 * sc);
  // casco
  poly(e, [[x - 1.5 * sc, y - 0.75 * sc], [x + 1.5 * sc, y - 0.75 * sc], [x + 1.1 * sc, y], [x - 1.1 * sc, y]], "#8a5a2b", "#4a2f16", 0.04);
  for (let i = 0; i < 5; i++) line(e, x - 1.2 * sc + i * 0.6 * sc, y - 0.72 * sc, x - 1.0 * sc + i * 0.55 * sc + 0.05, y - 0.04 * sc, "#6b4423", 0.03 * sc);
  rect(e, x - 1.55 * sc, y - 0.85 * sc, 3.1 * sc, 0.18 * sc, "#a8713a", "#4a2f16", 0.03, 0.04);
  // cabine
  rect(e, x - 1.0 * sc, y - 1.55 * sc, 2.0 * sc, 0.8 * sc, "#b27a40", "#4a2f16", 0.035, 0.05);
  poly(e, [[x - 1.2 * sc, y - 1.5 * sc], [x, y - 2.2 * sc], [x + 1.2 * sc, y - 1.5 * sc]], "#7a4a1d", "#3a2210", 0.04);
  for (let i = 0; i < 4; i++) line(e, x - 1.0 * sc + i * 0.5 * sc, y - 1.5 * sc, x - 0.3 * sc + i * 0.2 * sc, y - 2.0 * sc + Math.abs(i - 1.5) * 0.12 * sc, "#5a3a1a", 0.025 * sc);
  rect(e, x - 0.7 * sc, y - 1.35 * sc, 0.3 * sc, 0.3 * sc, "#2d1b0d");
  rect(e, x + 0.4 * sc, y - 1.35 * sc, 0.3 * sc, 0.3 * sc, "#2d1b0d");
  rect(e, x - 0.12 * sc, y - 1.25 * sc, 0.24 * sc, 0.5 * sc, "#4a2f16");
  // rampa
  poly(e, [[x - 0.2 * sc, y - 0.75 * sc], [x + 0.2 * sc, y - 0.75 * sc], [x + 0.75 * sc, y + 0.1 * sc], [x + 0.3 * sc, y + 0.1 * sc]], "#c58a4c", "#4a2f16", 0.025);
}

function tablets(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  shadow(e, x, y, 0.9 * sc);
  rect(e, x - 0.8 * sc, y - 0.2 * sc, 1.6 * sc, 0.25 * sc, "#9b8f7c", "#5e5547", 0.03);
  for (const tx of [-0.55, 0.05]) {
    ell(e, x + (tx + 0.25) * sc, y - 1.25 * sc, 0.28 * sc, 0.22 * sc, "#d8d1c0", "#8d8573", 0.03);
    rect(e, x + tx * sc, y - 1.25 * sc, 0.5 * sc, 1.05 * sc, "#d8d1c0", "#8d8573", 0.03, 0.02);
    for (let i = 0; i < 5; i++) line(e, x + (tx + 0.1) * sc, y - 1.2 * sc + i * 0.17 * sc, x + (tx + 0.4) * sc, y - 1.2 * sc + i * 0.17 * sc, "#6b6454", 0.03 * sc);
  }
  glow(e, x, y - 0.8 * sc, 1.2 * sc, "rgba(255,240,170,0.35)");
}

function altar(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  shadow(e, x, y, 0.8 * sc);
  rect(e, x - 0.55 * sc, y - 0.55 * sc, 1.1 * sc, 0.55 * sc, "#bdb4a0", "#6e6552", 0.03);
  rect(e, x - 0.65 * sc, y - 0.7 * sc, 1.3 * sc, 0.2 * sc, "#d3cab5", "#6e6552", 0.03);
  flame(e, x, y - 0.7 * sc, 0.6 * sc);
}

function menorah(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  const gold = "#f2c230";
  glow(e, x, y - 1.2 * sc, 1.1 * sc, "rgba(255,225,120,0.35)");
  rect(e, x - 0.3 * sc, y - 0.12 * sc, 0.6 * sc, 0.12 * sc, gold, "#9a7414", 0.02);
  line(e, x, y - 0.1 * sc, x, y - 1.5 * sc, gold, 0.07 * sc);
  for (const k of [1, 2, 3]) {
    const dx = k * 0.22 * sc;
    for (const sg of [-1, 1]) curve(e, [[x, y - 0.35 * sc], [x + sg * dx, y - 0.35 * sc], [x + sg * dx, y - 1.2 * sc - (k === 3 ? 0.1 * sc : 0)]], gold, 0.06 * sc);
  }
  for (const k of [-3, -2, -1, 0, 1, 2, 3]) {
    const fx = x + k * 0.22 * sc;
    const fy = y - (Math.abs(k) === 0 ? 1.5 : 1.2 + (Math.abs(k) === 3 ? -0.0 : 0)) * sc;
    flame(e, fx, fy + 0.0, 0.17 * sc);
  }
}

function brickWall(e: Env, x: number, y: number, w: number, h: number, o: { stone: string; dark: string; crack?: boolean; towerTop?: boolean }) {
  const { g, s } = e;
  rect(e, x, y - h, w, h, o.stone, o.dark, 0.04, 0.05);
  const rows = Math.max(2, Math.round(h / 0.45));
  g.strokeStyle = o.dark;
  g.lineWidth = Math.max(1, s * 0.03);
  for (let i = 1; i < rows; i++) {
    const yy = y - h + (i * h) / rows;
    g.beginPath();
    g.moveTo(e.X(x), e.Y(yy));
    g.lineTo(e.X(x + w), e.Y(yy));
    g.stroke();
    const off = i % 2 ? 0.3 : 0;
    for (let bx = x + off + 0.6; bx < x + w - 0.1; bx += 0.6) {
      g.beginPath();
      g.moveTo(e.X(bx), e.Y(yy));
      g.lineTo(e.X(bx), e.Y(yy - h / rows));
      g.stroke();
    }
  }
  // ameias
  const n = Math.max(2, Math.floor(w / 0.5));
  for (let i = 0; i < n; i += 2) rect(e, x + (i * w) / n, y - h - 0.2, w / n, 0.22, o.stone, o.dark, 0.03, 0.02);
  if (o.crack) {
    curve(e, [[x + w * 0.5, y - h - 0.1], [x + w * 0.45, y - h * 0.7], [x + w * 0.56, y - h * 0.45], [x + w * 0.48, y - h * 0.2], [x + w * 0.52, y]], "#2b2418", 0.08);
  }
}

function crystal(e: Env, x: number, y: number, sc: number, a: string, b: string) {
  sc *= K;
  glow(e, x, y - 0.5 * sc, 0.9 * sc, "rgba(255,255,255,0.45)");
  poly(e, [[x - 0.25 * sc, y], [x - 0.3 * sc, y - 0.7 * sc], [x - 0.1 * sc, y - 1.2 * sc], [x + 0.1 * sc, y - 0.7 * sc], [x + 0.1 * sc, y]], a, "rgba(255,255,255,0.8)", 0.02);
  poly(e, [[x, y], [x + 0.05 * sc, y - 0.55 * sc], [x + 0.25 * sc, y - 0.95 * sc], [x + 0.4 * sc, y - 0.5 * sc], [x + 0.35 * sc, y]], b, "rgba(255,255,255,0.8)", 0.02);
}

function boat(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  ell(e, x, y + 0.08 * sc, 1.2 * sc, 0.3 * sc, "rgba(255,255,255,0.35)");
  poly(e, [[x - 1.0 * sc, y - 0.45 * sc], [x + 1.0 * sc, y - 0.45 * sc], [x + 0.65 * sc, y], [x - 0.65 * sc, y]], "#8a5a2b", "#4a2f16", 0.035);
  rect(e, x - 1.05 * sc, y - 0.52 * sc, 2.1 * sc, 0.12 * sc, "#b27a40", "#4a2f16", 0.02, 0.03);
  line(e, x, y - 0.5 * sc, x, y - 2.2 * sc, "#5a3a1a", 0.07 * sc);
  poly(e, [[x + 0.05 * sc, y - 2.1 * sc], [x + 0.95 * sc, y - 0.7 * sc], [x + 0.05 * sc, y - 0.7 * sc]], "#fdf6e3", "#b8a98a", 0.03);
  poly(e, [[x - 0.05 * sc, y - 1.9 * sc], [x - 0.7 * sc, y - 0.75 * sc], [x - 0.05 * sc, y - 0.75 * sc]], "#f1e4c4", "#b8a98a", 0.03);
}

function basket(e: Env, x: number, y: number, sc: number, content: "bread" | "fish") {
  sc *= K;
  rect(e, x - 0.35 * sc, y - 0.3 * sc, 0.7 * sc, 0.32 * sc, "#a8713a", "#6b4423", 0.025, 0.06);
  for (let i = 0; i < 3; i++) line(e, x - 0.3 * sc, y - 0.22 * sc + i * 0.08 * sc, x + 0.3 * sc, y - 0.22 * sc + i * 0.08 * sc, "#7a4f22", 0.02 * sc);
  if (content === "bread") {
    for (const [dx, dy] of [[-0.18, -0.38], [0.02, -0.42], [0.2, -0.37]]) ell(e, x + dx * sc, y + dy * sc, 0.15 * sc, 0.1 * sc, "#e0a35a", "#9a6a2a", 0.02);
  } else {
    fish(e, x - 0.1 * sc, y - 0.4 * sc, 0.5 * sc, "#9fb7c9");
    fish(e, x + 0.15 * sc, y - 0.36 * sc, 0.45 * sc, "#b7c9d6");
  }
}

function templeBuilding(e: Env, x: number, y: number, sc: number) {
  sc *= K;
  shadow(e, x, y, 1.6 * sc);
  rect(e, x - 1.5 * sc, y - 0.25 * sc, 3.0 * sc, 0.25 * sc, "#e7dfc9", "#9b9071", 0.03);
  rect(e, x - 1.3 * sc, y - 0.5 * sc, 2.6 * sc, 0.25 * sc, "#efe8d4", "#9b9071", 0.03);
  rect(e, x - 1.1 * sc, y - 1.7 * sc, 2.2 * sc, 1.2 * sc, "#f3ecd8", "#9b9071", 0.035);
  for (let i = 0; i < 5; i++) rect(e, x - 1.0 * sc + i * 0.5 * sc, y - 1.65 * sc, 0.14 * sc, 1.15 * sc, "#dcd2b6", "#9b9071", 0.02, 0.03);
  poly(e, [[x - 1.3 * sc, y - 1.7 * sc], [x, y - 2.45 * sc], [x + 1.3 * sc, y - 1.7 * sc]], "#f2c230", "#9a7414", 0.04);
  poly(e, [[x - 0.8 * sc, y - 1.75 * sc], [x, y - 2.25 * sc], [x + 0.8 * sc, y - 1.75 * sc]], "#fbdc6b");
  rect(e, x - 0.22 * sc, y - 1.0 * sc, 0.44 * sc, 0.5 * sc, "#4a3a22", "#2b2013", 0.02, 0.15);
  glow(e, x, y - 2.0 * sc, 1.6 * sc, "rgba(255,230,130,0.28)");
  // colunas de bronze (Jaquim e Boaz)
  for (const dx of [-1.75, 1.75]) {
    rect(e, x + dx * sc - 0.14 * sc, y - 2.0 * sc, 0.28 * sc, 2.0 * sc, "#c98a2b", "#7a4f10", 0.03, 0.06);
    ell(e, x + dx * sc, y - 2.0 * sc, 0.26 * sc, 0.13 * sc, "#e9b04a", "#7a4f10", 0.03);
    for (const k of [0.3, 0.7, 1.1, 1.5]) line(e, x + dx * sc - 0.12 * sc, y - k * sc, x + dx * sc + 0.12 * sc, y - k * sc, "#8a5a14", 0.025 * sc);
  }
}

function sparkle(e: Env, x: number, y: number, r: number, color: string) {
  const { g } = e;
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.28;
    const px = e.X(x) + Math.cos(a) * rr * e.s;
    const py = e.Y(y) + Math.sin(a) * rr * e.s;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
}

// ------------------------------------------------------------ cenários da campanha

/** Um detalhe de assinatura por arena (no rio ou nas bordas), discreto, para dar identidade sem poluir. */
function campaignAccent(e: Env, key: string) {
  const r = e.r;
  switch (key) {
    case "c-selva": {
      // vitórias-régias no rio e cipós pendurados no alto
      for (const [x, y] of [[2.2, 12.2], [6.4, 13.6], [9.6, 12.3], [13.8, 13.5], [8.2, 12.9]] as const) {
        ell(e, x, y, 0.5, 0.2, "#3a9a48", "#1f6a2b", 0.03);
        flower(e, x + 0.1, y - 0.1, 0.12, "#f472b6");
      }
      for (const x of [3.4, 7.0, 12.2]) {
        line(e, x, 0, x + 0.2, 1.6 + r() * 0.8, "#2e7d32", 0.07);
        ell(e, x + 0.2, 1.9, 0.18, 0.1, "#43a047");
      }
      break;
    }
    case "c-paris": {
      // barquinho no Sena
      poly(e, [[6.9, 13.0], [9.1, 13.0], [8.7, 13.6], [7.3, 13.6]], "#f8fafc", "#1d4ed8", 0.04);
      rect(e, 7.6, 12.45, 0.9, 0.55, "#93c5fd", "#1d4ed8", 0.03, 0.06);
      line(e, 8.05, 12.45, 8.05, 11.9, "#1d4ed8", 0.04);
      poly(e, [[8.05, 11.9], [8.5, 12.05], [8.05, 12.2]], "#dc2626");
      break;
    }
    case "c-quartel": {
      // cerca de arame farpado junto ao rio
      for (const y of [11.25, 14.75]) {
        for (let x = 0.4; x < 15.6; x += 1.4) {
          line(e, x, y, x, y - 0.35, "#4a3f20", 0.05);
          line(e, x - 0.1, y - 0.25, x + 0.2, y - 0.1, "#6b7280", 0.025);
        }
      }
      break;
    }
    case "c-rock": {
      // feixes de luz caindo do alto do palco
      for (const [x, c] of [[4, "rgba(244,114,182,0.22)"], [8, "rgba(96,165,250,0.22)"], [12, "rgba(250,204,21,0.2)"]] as const) {
        poly(e, [[x - 0.2, 0], [x + 0.2, 0], [x + 1.6, 7], [x - 1.6, 7]], c);
      }
      break;
    }
    case "c-aula": {
      // régua e lápis atravessando o corredor
      rect(e, 5.2, 12.6, 5.6, 0.5, "#fde68a", "#a16207", 0.03, 0.05);
      for (let x = 5.5; x < 10.6; x += 0.5) line(e, x, 12.6, x, 12.85, "#a16207", 0.02);
      break;
    }
    case "c-igreja": {
      // estandartes vermelhos no alto e velas no corredor
      for (const x of [2.2, 13.8]) {
        poly(e, [[x - 0.35, 0.2], [x + 0.35, 0.2], [x + 0.35, 2.2], [x, 1.8], [x - 0.35, 2.2]], "#b91c1c", "#facc15", 0.03);
      }
      break;
    }
    case "c-casamento": {
      // pétalas boiando e lacinho de fita
      for (let i = 0; i < 16; i++) ell(e, 0.5 + r() * 15, 11.9 + r() * 2.2, 0.12, 0.06, ["#f9a8d4", "#fff", "#fda4af"][i % 3], undefined, 0.02, r() * 3);
      break;
    }
    case "c-gabinete": {
      // quadros dourados na parede do fundo
      for (const [x, w] of [[2.6, 1.6], [13.4, 1.6], [8, 2.2]] as const) {
        rect(e, x - w / 2, 0.2, w, 1.5, "#facc15", "#a16207", 0.04, 0.04);
        rect(e, x - w / 2 + 0.12, 0.32, w - 0.24, 1.26, "#1e3a5f", undefined, 0.02, 0.03);
      }
      break;
    }
  }
}

function campaignScenery(e: Env, key: string) {
  campaignAccent(e, key);
  const L = 1.3;
  const R = 14.7;
  const r = e.r;
  const edge = (): [number, number] => {
    const x = r() < 0.5 ? -0.8 + r() * 3.1 : 12.9 + r() * 3.1;
    let y = 0.6 + r() * 24.8;
    if (y > 11.2 && y < 14.8) y += 4;
    return [x, Math.min(25.2, y)];
  };
  switch (key) {
    case "c-selva": {
      for (let i = 0; i < 44; i++) {
        const [x, y] = edge();
        flower(e, x, y, 0.1 + r() * 0.07, ["#fb7185", "#fde047", "#c084fc", "#fff"][Math.floor(r() * 4)]);
      }
      for (let i = 0; i < 30; i++) {
        const [x, y] = edge();
        tuft(e, x, y, "#1f6a2b");
      }
      for (const [x, y, sc] of [[L - 0.2, 4.6, 1.5], [R + 0.1, 5.4, 1.4], [L + 0.3, 9.4, 1.3], [R - 0.2, 9.0, 1.5], [L, 18.2, 1.4], [R, 19.0, 1.5], [L + 0.1, 23.2, 1.3], [R - 0.1, 23.6, 1.4]] as const) {
        tree(e, x, y, sc, { trunk: "#5a3a1a", dark: "#1f6a2b", mid: "#2e8b3a", light: "#5cba55" });
      }
      for (const [n, x, y, h] of [["selva-totem", L + 0.2, 10.4, 2.4], ["selva-folhas", R - 0.2, 10.6, 1.6], ["selva-tronco", L + 0.5, 16.4, 1.0], ["selva-folhas", L, 6.9, 1.5], ["selva-totem", R - 0.2, 20.8, 2.2], ["selva-arvore", L + 0.1, 20.4, 3.4], ["selva-tronco", R - 0.4, 16.6, 1.0], ["selva-folhas", L + 0.3, 24.4, 1.4]] as const) spr(e, n, x, y, h);
      for (let i = 0; i < 14; i++) {
        const [x, y] = edge();
        glow(e, x, y, 0.35, "rgba(253,224,71,0.55)");
      }
      break;
    }
    case "c-paris": {
      // Torre Eiffel
      const ex = R - 0.2;
      const ey = 9.6;
      if (!spr(e, "paris-torre", ex, ey + 0.4, 6.8)) {
        poly(e, [[ex - 1.5, ey], [ex - 0.12, ey - 5.6], [ex + 0.12, ey - 5.6], [ex + 1.5, ey]], "#6b5b4b", "#3d3228", 0.04);
        poly(e, [[ex - 0.9, ey - 1.4], [ex + 0.9, ey - 1.4], [ex + 0.55, ey - 2.6], [ex - 0.55, ey - 2.6]], "#8a7864", "#3d3228", 0.03);
        line(e, ex, ey - 5.6, ex, ey - 6.6, "#3d3228", 0.06);
        glow(e, ex, ey - 6.6, 0.9, "rgba(255,240,170,0.7)");
      }
      // postes de luz, árvores aparadas e mesinhas de café
      for (const [x, y] of [[L + 1.2, 5.2], [L + 1.2, 9.4], [R - 1.8, 17.2], [L + 1.2, 18.4], [R - 1.8, 22.6], [L + 1.2, 22.8]] as const) {
        if (!spr(e, "paris-poste", x, y, 1.9)) line(e, x, y, x, y - 1.5, "#2d2d38", 0.08);
        glow(e, x, y - 1.6, 0.7, "rgba(255,230,150,0.75)");
      }
      for (const [x, y] of [[L - 0.3, 4.6], [R, 4.2], [L - 0.2, 23.4], [R + 0.2, 20.4]] as const) {
        tree(e, x, y, 1.0, { trunk: "#6b4a2b", dark: "#3f7d3a", mid: "#5a9a4c", light: "#86c06e" });
      }
      for (const [x, y] of [[L + 0.2, 14.9], [R - 0.3, 6.4]] as const) {
        if (!spr(e, "paris-mesa", x, y + 0.5, 1.7)) {
          ell(e, x, y, 0.55, 0.25, "#fff", "#c9bda3", 0.03);
          circ(e, x - 0.9, y + 0.1, 0.18, "#b91c1c");
          circ(e, x + 0.9, y + 0.1, 0.18, "#1d4ed8");
        }
      }
      for (const [x, y] of [[L + 0.4, 10.6], [R - 0.5, 20.8], [L + 0.5, 25.0]] as const) spr(e, "paris-jardineira", x, y, 0.9);
      for (let i = 0; i < 24; i++) {
        const [x, y] = edge();
        flower(e, x, y, 0.1, ["#f472b6", "#fff", "#fde047"][i % 3]);
      }
      break;
    }
    case "c-quartel": {
      // sacos de areia, barracas, bandeira e pneus de treino
      for (const [x, y] of [[L - 0.3, 5.8], [R - 0.2, 6.0], [L, 17.6], [R - 0.3, 18.2]] as const) {
        if (spr(e, "quartel-sacos", x, y + 0.3, 1.2)) continue;
        for (let i = 0; i < 4; i++) rect(e, x - 0.9 + i * 0.5, y, 0.5, 0.3, "#c9b27a", "#8f7a4f", 0.02, 0.1);
        for (let i = 0; i < 3; i++) rect(e, x - 0.65 + i * 0.5, y - 0.28, 0.5, 0.3, "#d6c28a", "#8f7a4f", 0.02, 0.1);
      }
      for (const [x, y] of [[L + 0.1, 8.8], [R - 0.2, 22.4]] as const) {
        if (spr(e, "quartel-barraca", x, y + 0.2, 2.2)) continue;
        poly(e, [[x - 1.3, y], [x, y - 1.8], [x + 1.3, y]], "#5a6b34", "#33401b", 0.04);
        rect(e, x - 0.3, y - 0.8, 0.6, 0.8, "#2b3416", undefined, 0.02, 0.05);
      }
      if (!spr(e, "quartel-bandeira", L + 0.2, 23.4, 3.2)) {
        line(e, L, 22.6, L, 19.6, "#3d2f1c", 0.08);
        poly(e, [[L, 19.6], [L + 1.1, 19.9], [L, 20.4]], "#b91c1c", "#7f1d1d", 0.02);
      }
      for (const [x, y] of [[R, 21.9], [L + 1.5, 4.0]] as const) {
        if (spr(e, "quartel-jipe", x, y + 0.5, 1.5)) continue;
        circ(e, x, y, 0.4, "#1f1f24", "#000", 0.03);
        circ(e, x, y, 0.16, "#7a6a4a");
      }
      for (let i = 0; i < 16; i++) {
        const [x, y] = edge();
        tuft(e, x, y, "#4b5a2b");
      }
      break;
    }
    case "c-rock": {
      // caixas de som, luzes de palco e pontos de luz
      for (const [x, y] of [[L, 5.2], [R - 0.2, 5.0], [L + 0.1, 20.8], [R - 0.3, 21.2]] as const) {
        if (spr(e, "rock-caixas", x, y + 0.2, 2.2)) continue;
        rect(e, x - 0.7, y - 1.7, 1.4, 1.7, "#15131f", "#000", 0.04, 0.1);
        circ(e, x, y - 1.15, 0.38, "#2a2740", "#6b6b85", 0.03);
        circ(e, x, y - 0.5, 0.2, "#2a2740", "#6b6b85", 0.03);
      }
      for (const [n, x, y, h] of [["rock-bateria", L + 0.3, 10.6, 1.7], ["rock-trelica", R - 0.3, 10.8, 2.4], ["rock-guitarra", R - 0.2, 16.8, 1.7], ["rock-bateria", L + 0.2, 25.0, 1.6]] as const) spr(e, n, x, y, h);
      const beams: [number, number, string][] = [[L + 0.3, 8.8, "rgba(244,114,182,0.5)"], [R - 0.3, 9.2, "rgba(96,165,250,0.5)"], [L, 17.8, "rgba(250,204,21,0.5)"], [R - 0.2, 17.2, "rgba(74,222,128,0.5)"]];
      for (const [x, y, c] of beams) {
        glow(e, x, y, 1.9, c);
        circ(e, x, y, 0.2, "#e5e7eb");
      }
      for (let i = 0; i < 26; i++) {
        const [x, y] = edge();
        sparkle(e, x, y, 0.12 + r() * 0.1, ["#f472b6", "#60a5fa", "#fde047", "#a78bfa"][i % 4]);
      }
      break;
    }
    case "c-aula": {
      // carteiras, lousa, globo e cadernos
      if (!spr(e, "aula-lousa", 8, 2.3, 2.6)) {
        rect(e, 3.2, 0.3, 9.6, 1.0, "#1f4a3a", "#7a5a2b", 0.07, 0.08);
        line(e, 4.2, 0.8, 6.8, 0.8, "rgba(255,255,255,0.8)", 0.06);
        line(e, 8.0, 0.65, 10.8, 0.9, "rgba(255,255,255,0.7)", 0.05);
      }
      for (const [x, y] of [[L - 0.2, 5.6], [R - 0.2, 5.8], [L, 8.8], [R - 0.3, 9.2], [L, 17.4], [R - 0.2, 17.8], [L + 0.1, 21.6], [R - 0.3, 22.0]] as const) {
        if (spr(e, "aula-carteira", x, y + 0.5, 1.3)) continue;
        rect(e, x - 0.7, y - 0.55, 1.4, 0.55, "#b98b4e", "#7a5a2b", 0.03, 0.05);
        rect(e, x - 0.55, y, 0.1, 0.55, "#7a5a2b");
        rect(e, x + 0.45, y, 0.1, 0.55, "#7a5a2b");
        rect(e, x - 0.3, y - 0.8, 0.6, 0.25, "#93c5fd", "#1d4ed8", 0.02, 0.04);
      }
      if (!spr(e, "aula-globo", L + 0.7, 16.0, 1.6)) {
        circ(e, L + 0.6, 14.9, 0.55, "#3b82f6", "#1e3a8a", 0.04);
        rect(e, L + 0.45, 15.4, 0.3, 0.4, "#7a5a2b");
      }
      for (const [x, y] of [[R - 0.6, 12.0 - 0.9], [L + 0.4, 24.8]] as const) spr(e, "aula-livros", x, y, 1.1);
      for (let i = 0; i < 18; i++) {
        const [x, y] = edge();
        rect(e, x, y, 0.32, 0.4, ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"][i % 4], "#00000055", 0.02, 0.04);
      }
      break;
    }
    case "c-igreja": {
      // bancos, vitrais, cruz e velas
      for (const [x, y] of [[L, 5.8], [R - 0.2, 6.0], [L + 0.1, 9.2], [R - 0.3, 9.4], [L, 17.6], [R - 0.2, 17.8], [L + 0.1, 21.8], [R - 0.3, 22.0]] as const) {
        if (spr(e, "igreja-banco", x, y + 0.2, 1.3)) continue;
        rect(e, x - 0.9, y - 0.35, 1.8, 0.35, "#8a5a2b", "#4a2f16", 0.03, 0.06);
        rect(e, x - 0.9, y - 0.9, 1.8, 0.2, "#74502d", "#4a2f16", 0.03, 0.05);
      }
      for (const [x, y, c] of [[3.6, 0.9, "rgba(96,165,250,0.6)"], [8.0, 0.8, "rgba(250,204,21,0.6)"], [12.4, 0.9, "rgba(244,114,182,0.6)"]] as const) {
        if (!spr(e, "igreja-vitral", x, y + 1.6, 2.0)) rect(e, x - 0.6, y - 0.8, 1.2, 1.8, "#2a2a3a", "#d6d3d1", 0.05, 0.5);
        glow(e, x, y, 1.6, c);
      }
      if (!spr(e, "igreja-cruz", 8, 4.2, 2.3)) {
        rect(e, 7.88, 1.6, 0.24, 1.3, "#f5d97a", "#8a6a1a", 0.03, 0.04);
        rect(e, 7.5, 1.95, 1.0, 0.24, "#f5d97a", "#8a6a1a", 0.03, 0.04);
      }
      for (const [x, y] of [[L + 1.4, 13.2], [R - 1.4, 13.0], [L + 1.5, 4.0], [R - 1.5, 21.0]] as const) {
        if (!spr(e, "igreja-candelabro", x, y, 1.3)) rect(e, x - 0.1, y - 0.5, 0.2, 0.5, "#fef3c7", "#a16207", 0.02, 0.04);
        glow(e, x, y - 0.7, 0.55, "rgba(253,224,71,0.8)");
      }
      break;
    }
    case "c-casamento": {
      // arco de flores, balões, mesinhas e luzinhas
      for (const [x, y] of [[L, 6.2], [R - 0.2, 6.0]] as const) {
        if (spr(e, "casamento-arco", x + (x < 8 ? 0.4 : -0.4), y + 0.4, 2.9)) continue;
        rect(e, x - 0.12, y - 2.2, 0.24, 2.2, "#f5ebe0", "#c9b9a0", 0.03, 0.05);
        for (let i = 0; i < 7; i++) circ(e, x + Math.sin(i) * 0.45, y - 2.4 + i * 0.1, 0.26, ["#f472b6", "#fb7185", "#fff", "#fda4af"][i % 4]);
      }
      for (const [x, y, c] of [[L + 0.3, 9.4, "#f472b6"], [L + 1.0, 8.9, "#fde047"], [R - 0.4, 17.0, "#60a5fa"], [R - 1.1, 16.6, "#f472b6"], [R - 0.2, 9.6, "#fff"], [L, 17.6, "#a78bfa"]] as const) {
        if (spr(e, "casamento-baloes", x, y + 1.5, 1.9)) continue;
        line(e, x, y, x, y + 1.4, "#d1d5db", 0.03);
        ell(e, x, y, 0.38, 0.5, c, "#00000033", 0.02);
      }
      for (const [x, y] of [[L + 0.1, 21.8], [R - 0.2, 22.2]] as const) {
        if (spr(e, "casamento-bolo", x, y + 0.4, 1.4)) continue;
        ell(e, x, y, 0.8, 0.32, "#fff", "#e5d9c8", 0.03);
        circ(e, x, y - 0.25, 0.2, "#f472b6");
        circ(e, x - 0.35, y - 0.18, 0.14, "#fda4af");
      }
      for (const [x, y] of [[L + 0.5, 15.9], [R - 0.5, 14.9 + 1.4]] as const) spr(e, "casamento-cadeira", x, y, 1.2);
      for (let i = 0; i < 28; i++) {
        const [x, y] = edge();
        glow(e, x, y, 0.3, "rgba(255,240,170,0.7)");
        flower(e, x, y, 0.1, ["#f472b6", "#fff", "#fda4af"][i % 3]);
      }
      break;
    }
    case "c-gabinete": {
      // estantes de livros, mesa do pastor, luminárias e tapete
      for (const [x, y] of [[L - 0.1, 5.6], [R - 0.1, 5.4], [L - 0.1, 9.2], [R - 0.1, 21.2], [L - 0.1, 21.4]] as const) {
        if (spr(e, "gabinete-estante", x, y + 0.2, 2.5)) continue;
        rect(e, x - 0.8, y - 2.0, 1.6, 2.0, "#3b2615", "#1e1208", 0.04, 0.06);
        for (let row = 0; row < 3; row++) {
          for (let i = 0; i < 5; i++) rect(e, x - 0.7 + i * 0.28, y - 1.85 + row * 0.62, 0.22, 0.5, ["#7f1d1d", "#1e3a5f", "#14532d", "#78350f", "#4c1d95"][(i + row) % 5], undefined, 0.02, 0.02);
        }
      }
      if (!spr(e, "gabinete-mesa", R - 0.6, 18.4, 1.9)) {
        rect(e, R - 1.9, 17.0, 2.6, 0.9, "#52361d", "#2a1a0b", 0.04, 0.08);
        rect(e, R - 1.6, 16.5, 0.7, 0.5, "#fef3c7", "#a16207", 0.02, 0.04);
      }
      spr(e, "gabinete-poltrona", L + 0.8, 17.2, 1.5);
      for (const [x, y] of [[L + 1.5, 14.9], [R - 1.2, 13.0]] as const) {
        if (!spr(e, "gabinete-abajur", x, y, 1.9)) {
          line(e, x, y, x, y - 1.2, "#2a1a0b", 0.07);
          poly(e, [[x - 0.35, y - 1.2], [x + 0.35, y - 1.2], [x + 0.2, y - 1.7], [x - 0.2, y - 1.7]], "#facc15", "#a16207", 0.02);
        }
        glow(e, x, y - 1.6, 0.9, "rgba(253,224,71,0.5)");
      }
      for (let i = 0; i < 14; i++) {
        const [x, y] = edge();
        rect(e, x, y, 0.4, 0.5, ["#7f1d1d", "#1e3a5f", "#14532d"][i % 3], "#00000066", 0.02, 0.03);
      }
      break;
    }
  }
}

// ------------------------------------------------------------ cenários

/** Ponto de chegada: desenha o cenário da arena por cima do chão, rio e caminhos. */
export function drawScenery(e: Env, key: string) {
  if (key.startsWith("c-")) return campaignScenery(e, key);
  const L = 1.3; // centro da faixa esquerda
  const R = 14.7; // centro da faixa direita
  const r = e.r;
  switch (key) {
    case "eden": {
      // flores e borboletas pelo gramado
      const cols = ["#f472b6", "#fb7185", "#fde047", "#fff", "#c084fc", "#fb923c"];
      for (let i = 0; i < 46; i++) {
        const fx = r() < 0.5 ? -0.8 + r() * 3.2 : 12.8 + r() * 3.2;
        const fy = 0.5 + r() * 25;
        if (fy > 11.4 && fy < 14.6) continue;
        flower(e, fx, fy, 0.11 + r() * 0.07, cols[Math.floor(r() * cols.length)]);
      }
      for (let i = 0; i < 20; i++) {
        const fx = 5.3 + r() * 5.4;
        const fy = r() < 0.5 ? 4 + r() * 6.5 : 15.5 + r() * 6.5;
        flower(e, fx, fy, 0.09 + r() * 0.05, cols[Math.floor(r() * cols.length)]);
      }
      for (let i = 0; i < 14; i++) tuft(e, -0.8 + r() * 17.6, 1 + r() * 24, "#2f7d32");
      // Árvore do Conhecimento do Bem e do Mal, com a serpente enrolada
      tree(e, L + 0.3, 9.3, 1.25, { dark: "#2f7d32", mid: "#43a047", light: "#7ccf6e", fruit: "#e53935", fruits: 9 });
      snake(e, L + 0.1, 9.3, 1.25);
      // Árvore da Vida, com frutos dourados brilhando
      tree(e, R - 0.3, 8.6, 1.5, { trunk: "#7a4a1d", dark: "#2f8f3a", mid: "#4cb050", light: "#93e08a", fruit: "#ffd23f", fruitGlow: true, fruits: 11 });
      // Adão e Eva
      person(e, L - 0.35, 22.3, 1.15, { robe: "#e0ac7e", leaf: true, hair: "#5a3a1a", skin: "#d49a6a" });
      person(e, L + 0.55, 22.3, 1.1, { robe: "#e0ac7e", leaf: true, hair: "#8a4b14", skin: "#e8b58a", long: true });
      bush(e, L + 1.35, 22.4, 0.45, "#2f7d32", "#43a047", "#66bb6a");
      // paz entre os animais: leão e cordeiro
      lion(e, R - 0.7, 21.5, 1.15);
      lamb(e, R + 0.5, 21.6, 1.0);
      deer(e, R - 0.2, 17.6, 1.15);
      // aves e borboletas
      dove(e, L + 0.5, 5.2, 1.1);
      dove(e, R - 1.2, 4.2, 1.0);
      bird(e, L - 0.2, 3.3, 1);
      butterfly(e, 6.4, 8.4, 1.4, "#f472b6");
      butterfly(e, 9.6, 19.2, 1.4, "#fde047");
      break;
    }
    case "ararate": {
      // neve no chão
      const { g, s } = e;
      for (let i = 0; i < 40; i++) {
        const sx = -0.9 + r() * 17.8;
        const sy = r() * 26;
        if (sy > 11.6 && sy < 14.4) continue;
        g.globalAlpha = 0.55;
        ell(e, sx, sy, 0.3 + r() * 0.7, 0.18 + r() * 0.3, "#f5f9fc");
      }
      g.globalAlpha = 1;
      void s;
      // montanha de Ararate com neve e nuvens
      mountain(e, L + 0.2, 10.6, 3.8, 6.6, "#8d9aa8", "#738190", "#f4f8fb");
      mountain(e, L - 0.9, 10.6, 2.4, 4.0, "#9aa7b4", "#7f8c99", "#f4f8fb");
      ell(e, L + 1.2, 4.6, 0.9, 0.3, "rgba(255,255,255,0.9)");
      ell(e, L + 0.6, 4.4, 0.6, 0.28, "rgba(255,255,255,0.9)");
      // a arca de Noé pousada
      ark(e, R - 0.4, 9.8, 0.95);
      for (const [bx, by, br] of [[R - 1.6, 9.9, 0.4], [R + 1.0, 9.9, 0.35], [R - 0.9, 10.2, 0.28]]) {
        ell(e, bx, by, br * 1.3, br, "#8d9aa8", "#5c6877", 0.03);
      }
      // Noé e a pomba com o ramo de oliveira
      person(e, R - 1.85, 10.3, 0.8, { robe: "#7a5a3a", trim: "#d9c28b", hair: "#e8e8e8", staff: true });
      dove(e, R - 1.0, 5.3, 1.15, true);
      // arco-íris, o sinal da aliança
      const rainbow = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#38bdf8", "#818cf8"];
      e.g.globalAlpha = 0.75;
      rainbow.forEach((c, i) => {
        e.g.strokeStyle = c;
        e.g.lineWidth = Math.max(2, e.s * 0.2);
        e.g.beginPath();
        e.g.arc(e.X(R + 0.2), e.Y(23.8), (2.7 - i * 0.2) * e.s, Math.PI, Math.PI * 2);
        e.g.stroke();
      });
      e.g.globalAlpha = 1;
      ell(e, R - 2.4, 23.9, 0.5, 0.2, "rgba(255,255,255,0.95)");
      ell(e, R + 2.4, 23.9, 0.5, 0.2, "rgba(255,255,255,0.95)");
      // os animais, de dois em dois
      elephant(e, L + 0.2, 22.2, 0.9);
      elephant(e, L + 0.4, 19.9, 0.75);
      giraffe(e, R - 0.9, 20.2, 0.85);
      lion(e, R + 0.6, 17.4, 0.9);
      lion(e, R - 0.6, 17.1, 0.8);
      sheep(e, 6.2, 8.8, 0.9);
      sheep(e, 7.2, 8.9, 0.8);
      bird(e, L + 0.4, 15.2, 1.1);
      bird(e, R - 1.5, 15.6, 1.0);
      // pinheiros nevados
      for (const [px, py] of [[L - 0.3, 17.2], [L + 1.4, 18.2]] as const) {
        poly(e, [[px - 0.45, py], [px, py - 1.5], [px + 0.45, py]], "#2f5f4a", "#1f3f33", 0.03);
        poly(e, [[px - 0.3, py - 0.65], [px, py - 1.5], [px + 0.3, py - 0.65]], "#f4f8fb");
      }
      break;
    }
    case "sinai": {
      // dunas e ondulações de areia
      for (let i = 0; i < 40; i++) {
        const dx = -0.9 + r() * 17.8;
        const dy = r() * 26;
        if (dy > 11.7 && dy < 14.3) continue;
        curve(e, [[dx, dy], [dx + 0.3, dy - 0.1], [dx + 0.6, dy]], "rgba(150,105,45,0.35)", 0.06);
      }
      // o monte Sinai com fogo e fumaça no cume
      mountain(e, L + 0.1, 10.8, 3.9, 7.4, "#8a6a4a", "#6d4f33");
      mountain(e, L + 1.6, 10.8, 2.0, 4.0, "#9a7a58", "#7d5c3f");
      flame(e, L - 0.05, 4.8, 0.65);
      for (let i = 0; i < 3; i++) ell(e, L - 0.1 + i * 0.25, 3.7 - i * 0.55, 0.45 + i * 0.12, 0.28, `rgba(80,70,70,${0.7 - i * 0.18})`);
      curve(e, [[L + 0.7, 3.8], [L + 0.5, 4.5], [L + 0.8, 5.2]], "#fde047", 0.1); // raio
      // sarça ardente
      bush(e, R - 0.2, 9.3, 0.8, "#7d7134", "#9a8c42", "#bba95a");
      flame(e, R - 0.55, 9.1, 0.55);
      flame(e, R + 0.05, 9.0, 0.7);
      flame(e, R + 0.45, 9.2, 0.5);
      person(e, R - 1.4, 10.0, 0.85, { robe: "#8a6f4a", trim: "#d8c28b", hair: "#e8e8e8", staff: true, hood: "#c9b88a" });
      // as tábuas dos Dez Mandamentos
      tablets(e, L + 0.4, 20.7, 1.1);
      // acampamento de Israel: tabernáculo e tendas
      tent(e, R - 0.6, 20.8, 1.2, "#7a2f2f", "#f2c230", "#2563eb");
      tent(e, R + 0.7, 18.3, 0.8, "#6b4a2b", "#a07a48");
      tent(e, R - 1.1, 17.7, 0.7, "#6b4a2b", "#a07a48");
      // coluna de nuvem e de fogo
      ell(e, L + 1.5, 17.2, 0.5, 0.9, "rgba(235,235,235,0.55)");
      flame(e, L + 1.5, 18.2, 0.8);
      // bezerro de ouro no altar
      altar(e, L + 0.2, 16.4, 0.7);
      ell(e, L + 0.2, 15.55, 0.28, 0.17, "#f2c230", "#9a7414", 0.02);
      circ(e, L + 0.45, 15.5, 0.1, "#f2c230", "#9a7414", 0.02);
      // camelos, palmeiras e arbustos secos
      camel(e, R - 0.3, 24.1, 0.85);
      camel(e, L + 0.7, 24.0, 0.7);
      palm(e, L - 0.4, 14.9, 0.9, 0.3);
      palm(e, R + 0.9, 15.2, 0.95, -0.3);
      for (const [bx, by] of [[5.5, 6.5], [10.2, 8.2], [6.1, 18.8], [9.8, 19.8]] as const) bush(e, bx, by, 0.28, "#7d7134", "#9a8c42", "#bba95a");
      break;
    }
    case "jerico": {
      // muralhas da cidade, com a brecha rachada
      brickWall(e, -1.2, 9.5, 3.8, 3.2, { stone: "#d8c79a", dark: "#8e7c4f" });
      brickWall(e, 13.4, 9.5, 3.8, 3.2, { stone: "#d8c79a", dark: "#8e7c4f", crack: true });
      rect(e, 0.3, 8.2, 0.9, 1.5, "#4a3a22", "#2b2013", 0.03, 0.4); // portão
      line(e, 14.8, 6.5, 14.9, 8.8, "#c1121f", 0.09); // cordão vermelho de Raabe
      rect(e, 14.55, 6.3, 0.55, 0.6, "#3a2b17");
      for (const [bx, by, bs] of [[14.2, 9.7, 0.18], [15.3, 9.8, 0.22], [14.7, 9.9, 0.15], [13.8, 9.9, 0.14]] as const) rect(e, bx, by - bs, bs * 1.6, bs, "#c9b78a", "#7a6a45", 0.02, 0.02);
      // poeira dos muros caindo
      for (let i = 0; i < 4; i++) ell(e, 14.0 + i * 0.5, 9.8, 0.5, 0.25, "rgba(220,200,160,0.5)");
      // arca da aliança e sacerdotes com trombetas
      const gold = "#f2c230";
      rect(e, L - 0.5, 18.7, 1.3, 0.65, gold, "#9a7414", 0.04, 0.07);
      line(e, L - 0.9, 19.1, L + 1.2, 19.1, "#7a4f22", 0.07);
      poly(e, [[L - 0.1, 18.7], [L + 0.2, 18.35], [L + 0.4, 18.7]], "#fbdc6b", "#9a7414", 0.03);
      person(e, L - 0.95, 19.9, 0.9, { robe: "#f5f5f0", trim: "#2563eb", hair: "#333", arms: "up" });
      person(e, L + 1.25, 19.9, 0.9, { robe: "#f5f5f0", trim: "#2563eb", hair: "#555", arms: "up" });
      for (const sx of [-1, 1]) {
        const px = L + (sx < 0 ? -0.95 : 1.25) + 0.3;
        poly(e, [[px, 18.45], [px + 0.55, 18.15], [px + 0.55, 18.55]], gold, "#9a7414", 0.02);
      }
      for (const [px, py] of [[R - 0.6, 21.0], [R + 0.5, 21.4]] as const) {
        person(e, px, py, 0.9, { robe: "#f5f5f0", trim: "#2563eb", hair: "#222", arms: "up" });
        poly(e, [[px + 0.3, py - 1.3], [px + 0.85, py - 1.6], [px + 0.85, py - 1.2]], gold, "#9a7414", 0.02);
      }
      // ondas sonoras das trombetas
      e.g.strokeStyle = "rgba(250,204,21,0.55)";
      e.g.lineWidth = Math.max(1.5, e.s * 0.06);
      for (let i = 0; i < 3; i++) {
        e.g.beginPath();
        e.g.arc(e.X(R + 1.4), e.Y(19.8), (0.4 + i * 0.35) * e.s, -0.9, 0.9);
        e.g.stroke();
      }
      palm(e, L + 0.2, 24.6, 1.0, 0.3);
      palm(e, R - 0.4, 15.4, 0.95, -0.3);
      palm(e, R + 0.9, 24.4, 0.9, -0.2);
      break;
    }
    case "ela": {
      for (let i = 0; i < 34; i++) tuft(e, -0.8 + r() * 17.6, 0.8 + r() * 24.5, "#4f7a1f");
      // acampamento filisteu e Golias
      tent(e, L - 0.5, 6.6, 0.9, "#7a2f2f", "#d6b25a", "#b91c1c");
      tent(e, L + 1.5, 4.7, 0.8, "#6b2a2a", "#c9a24b");
      const gx = L + 0.7;
      const gy = 10.5;
      shadow(e, gx, gy, 0.7);
      rect(e, gx - 0.28, gy - 1.2, 0.2, 1.2, "#6b4a2b"); // pernas
      rect(e, gx + 0.08, gy - 1.2, 0.2, 1.2, "#6b4a2b");
      poly(e, [[gx - 0.5, gy - 2.7], [gx + 0.5, gy - 2.7], [gx + 0.55, gy - 1.1], [gx - 0.55, gy - 1.1]], "#8a8f98", "#4b5058", 0.04); // armadura
      circ(e, gx, gy - 3.05, 0.34, "#d9a678", "#7a5a3a", 0.03);
      poly(e, [[gx - 0.38, gy - 3.1], [gx, gy - 3.55], [gx + 0.38, gy - 3.1], [gx + 0.3, gy - 2.95], [gx - 0.3, gy - 2.95]], "#b08d3c", "#6b531b", 0.03); // elmo de bronze
      circ(e, gx - 0.12, gy - 3.05, 0.04, "#222");
      circ(e, gx + 0.12, gy - 3.05, 0.04, "#222");
      line(e, gx + 0.75, gy - 0.2, gx + 0.85, gy - 4.0, "#5a3a1a", 0.09); // lança
      poly(e, [[gx + 0.78, gy - 4.0], [gx + 0.96, gy - 4.0], [gx + 0.87, gy - 4.5]], "#cbd5e1", "#475569", 0.02);
      ell(e, gx - 0.75, gy - 1.9, 0.38, 0.55, "#b08d3c", "#6b531b", 0.04); // escudo
      circ(e, gx - 0.75, gy - 1.9, 0.12, "#7a2f2f");
      // acampamento de Israel, com Davi pastor
      tent(e, R + 0.5, 17.4, 0.85, "#c9b890", "#8a7a55", "#2563eb");
      tent(e, R - 1.0, 20.2, 0.75, "#c9b890", "#8a7a55");
      person(e, R - 0.2, 23.4, 0.8, { robe: "#7a4f2f", trim: "#e0c27a", hair: "#7a3a14", staff: true });
      line(e, R - 0.1, 22.4, R + 0.25, 22.0, "#8a6a3a", 0.03); // funda
      circ(e, R + 0.3, 21.95, 0.05, "#6b7280");
      sheep(e, R - 1.5, 23.8, 0.8);
      sheep(e, R + 0.9, 24.0, 0.7);
      sheep(e, R - 1.0, 24.7, 0.65);
      // as cinco pedras lisas do ribeiro
      for (const [px, py] of [[6.6, 13.0], [7.4, 13.3], [8.2, 12.9], [9.0, 13.3], [9.7, 13.0]] as const) ell(e, px, py + 0.55, 0.16, 0.11, "#c9c3b4", "#7a756a", 0.02);
      // carvalhos / terebintos do vale
      tree(e, R - 0.4, 15.9, 0.8, { dark: "#587a24", mid: "#729a33", light: "#93bb4f" });
      tree(e, L + 0.3, 17.9, 0.85, { dark: "#587a24", mid: "#729a33", light: "#93bb4f" });
      for (const [px, py] of [[5.4, 8.0], [10.7, 7.4], [5.3, 19.6], [10.8, 20.6]] as const) ell(e, px, py, 0.34, 0.22, "#9a9588", "#6a665a", 0.03);
      break;
    }
    case "galileia": {
      // o mar da Galileia: barcos de pesca e Jesus caminhando sobre as águas
      for (let i = 0; i < 14; i++) {
        const wx = -0.5 + r() * 16.5;
        curve(e, [[wx, 12.5 + r() * 1.1], [wx + 0.25, 12.3 + r() * 1.1], [wx + 0.5, 12.5 + r() * 1.1]], "rgba(255,255,255,0.7)", 0.05);
      }
      boat(e, 1.9, 13.6, 1.05);
      boat(e, 14.2, 13.5, 1.05);
      glow(e, 8, 12.5, 2.0, "rgba(255,248,200,0.5)");
      person(e, 8, 13.3, 1.0, { robe: "#f8fafc", trim: "#d4a73a", hair: "#7a4a1d", halo: true, arms: "up" });
      ell(e, 8, 13.35, 0.7, 0.2, "rgba(255,255,255,0.7)");
      fish(e, 6.0, 12.6, 0.8, "#c2d6e6");
      fish(e, 10.2, 13.3, 0.7, "#b7cde0");
      for (const [bx, by] of [[3.0, 12.4], [12.8, 12.5], [5.4, 13.6]] as const) bird(e, bx, by - 1.0, 1.0, "#fff");
      // pão e peixes: a multiplicação
      basket(e, L - 0.3, 22.4, 1.1, "bread");
      basket(e, L + 0.75, 22.6, 1.1, "fish");
      basket(e, L + 0.2, 21.5, 1.0, "bread");
      person(e, L + 1.6, 22.0, 0.85, { robe: "#c7d2fe", trim: "#fff", hair: "#7a4a1d" });
      // redes de pesca secando e vila de pescadores
      line(e, R - 1.5, 17.5, R - 1.5, 19.3, "#6b4423", 0.08);
      line(e, R + 0.7, 17.5, R + 0.7, 19.3, "#6b4423", 0.08);
      for (let i = 0; i < 5; i++) line(e, R - 1.5, 17.7 + i * 0.35, R + 0.7, 17.7 + i * 0.35 + 0.2, "rgba(255,255,255,0.7)", 0.03);
      for (let i = 0; i < 7; i++) line(e, R - 1.5 + i * 0.37, 17.6, R - 1.5 + i * 0.37, 18.9, "rgba(255,255,255,0.6)", 0.025);
      rect(e, R - 0.9, 23.4, 1.4, 1.0, "#f1e6c8", "#a8956b", 0.03);
      rect(e, R - 0.95, 23.2, 1.5, 0.28, "#b8744a", "#7a4a2b", 0.03);
      rect(e, R - 0.35, 23.9, 0.35, 0.5, "#6b4a2b");
      boat(e, R + 0.4, 25.6, 0.6);
      palm(e, L - 0.2, 17.0, 0.9, 0.3);
      palm(e, R + 0.9, 17.2, 0.85, -0.3);
      for (let i = 0; i < 8; i++) ell(e, -0.7 + r() * 17.4, 14.7 + r() * 0.5, 0.12, 0.08, "#e9dcb6");
      break;
    }
    case "jerusalem": {
      // paralelepípedos nos caminhos e oliveiras do monte
      templeBuilding(e, R - 0.1, 10.9, 0.95);
      // muralha, torre e porta da cidade
      brickWall(e, -1.2, 9.6, 3.9, 3.0, { stone: "#e8dcc0", dark: "#a29270" });
      rect(e, 0.5, 8.1, 0.95, 1.5, "#5a3d22", "#2b2013", 0.03, 0.45);
      rect(e, 1.9, 5.0, 0.8, 4.7, "#e8dcc0", "#a29270", 0.04, 0.05);
      poly(e, [[1.8, 5.0], [2.3, 4.2], [2.8, 5.0]], "#b8744a", "#7a4a2b", 0.03);
      rect(e, 2.1, 5.8, 0.4, 0.55, "#4a3a22");
      // casas de telhado plano
      for (const [hx, hy, hw] of [[5.4, 7.4, 1.1], [10.5, 6.2, 0.9], [5.3, 20.3, 1.0], [10.6, 18.9, 1.1]] as const) {
        rect(e, hx - hw / 2, hy - 0.8, hw, 0.8, "#f0e6cc", "#a29270", 0.03);
        rect(e, hx - hw / 2 - 0.05, hy - 0.88, hw + 0.1, 0.12, "#d9c9a0", "#a29270", 0.025);
        rect(e, hx - 0.12, hy - 0.5, 0.24, 0.5, "#5a3d22");
      }
      // candelabro de sete braços e altar do holocausto
      menorah(e, L + 0.1, 21.6, 1.3);
      altar(e, L + 1.9, 19.6, 0.7);
      // oliveiras do Monte das Oliveiras
      olive(e, R - 0.3, 19.8, 0.95);
      olive(e, R + 0.5, 23.2, 0.85);
      olive(e, L - 0.3, 17.0, 0.85);
      palm(e, R + 1.1, 16.0, 0.85, -0.25);
      palm(e, L + 1.5, 24.3, 0.85, 0.25);
      // peregrinos subindo à cidade
      person(e, R - 1.2, 24.5, 0.8, { robe: "#8a5a8a", trim: "#fff", hair: "#222" });
      person(e, R - 0.3, 25.0, 0.75, { robe: "#c2410c", trim: "#fde68a", hair: "#555", staff: true });
      dove(e, 6.8, 4.5, 1.0);
      break;
    }
    case "nova": {
      // raios de glória e brilhos
      e.g.save();
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * (0.1 + (0.8 * i) / 8);
        e.g.fillStyle = "rgba(255,246,200,0.16)";
        e.g.beginPath();
        e.g.moveTo(e.X(8), e.Y(-1));
        e.g.lineTo(e.X(8 + Math.cos(a - 0.05) * 30), e.Y(-1 - Math.sin(a - 0.05) * 30));
        e.g.lineTo(e.X(8 + Math.cos(a + 0.05) * 30), e.Y(-1 - Math.sin(a + 0.05) * 30));
        e.g.closePath();
        e.g.fill();
      }
      e.g.restore();
      for (let i = 0; i < 40; i++) {
        const sx = -0.9 + r() * 17.8;
        const sy = r() * 26;
        if (sy > 11.8 && sy < 14.2) continue;
        sparkle(e, sx, sy, 0.1 + r() * 0.14, `rgba(255,255,255,${0.5 + r() * 0.4})`);
      }
      // muro de jaspe em camadas de pedras preciosas e portão de pérola
      const gems = ["#8bc34a", "#29b6f6", "#9575cd", "#ffb300", "#26a69a", "#ef5350", "#ffd54f", "#4fc3f7"];
      for (const bx of [-1.2, 13.4]) {
        gems.forEach((c, i) => rect(e, bx, 9.7 - i * 0.4 - 0.4, 3.8, 0.4, c, "rgba(255,255,255,0.7)", 0.025, 0.02));
        rect(e, bx, 5.9, 3.8, 0.18, "#fff7d6", "rgba(190,150,40,0.9)", 0.03, 0.02);
      }
      // portão de pérola
      rect(e, 0.35, 8.0, 1.0, 1.7, "#fff", "#d8c37a", 0.04, 0.5);
      glow(e, 0.85, 8.9, 1.2, "rgba(255,255,255,0.7)");
      rect(e, 14.65, 8.0, 1.0, 1.7, "#fff", "#d8c37a", 0.04, 0.5);
      glow(e, 15.15, 8.9, 1.2, "rgba(255,255,255,0.7)");
      // rio da vida e árvores da vida com doze frutos
      tree(e, L + 0.2, 21.6, 1.15, { trunk: "#8a5a2b", dark: "#4f8f2e", mid: "#74b843", light: "#b4e07a", fruit: "#ffd23f", fruitGlow: true, fruits: 12 });
      tree(e, R - 0.2, 21.8, 1.15, { trunk: "#8a5a2b", dark: "#4f8f2e", mid: "#74b843", light: "#b4e07a", fruit: "#ffd23f", fruitGlow: true, fruits: 12 });
      // cristais
      crystal(e, L + 1.9, 17.9, 0.9, "rgba(125,211,252,0.9)", "rgba(196,181,253,0.9)");
      crystal(e, R - 1.7, 17.4, 1.0, "rgba(253,186,116,0.9)", "rgba(110,231,183,0.9)");
      crystal(e, L - 0.1, 17.1, 0.7, "rgba(244,114,182,0.9)", "rgba(125,211,252,0.9)");
      crystal(e, 5.4, 6.4, 0.7, "rgba(125,211,252,0.9)", "rgba(253,224,71,0.9)");
      crystal(e, 10.6, 19.5, 0.7, "rgba(196,181,253,0.9)", "rgba(244,114,182,0.9)");
      // anjos de luz
      for (const [ax, ay] of [[L + 0.4, 5.8], [R - 0.4, 5.2]] as const) {
        glow(e, ax, ay - 1.2, 1.3, "rgba(255,255,255,0.8)");
        poly(e, [[ax - 0.3, ay - 1.0], [ax - 1.0, ay - 1.7], [ax - 0.6, ay - 0.5]], "#fff", "#cbd5e1", 0.02);
        poly(e, [[ax + 0.3, ay - 1.0], [ax + 1.0, ay - 1.7], [ax + 0.6, ay - 0.5]], "#fff", "#cbd5e1", 0.02);
        person(e, ax, ay, 0.9, { robe: "#fff", trim: "#f2c230", hair: "#f2c230", halo: true });
      }
      break;
    }
  }
}
