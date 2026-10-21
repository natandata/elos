// Clash of Tribos: desenho isométrico da vila em canvas. Tudo em coordenadas do mundo; a câmera vira uma transformação.
// Os desenhos das construções reaproveitam as imagens da Arena dos Heróis (ícones e adereços do campo).

import { BUILDINGS, GRID, OBSTACLES, TRIBES, isBuild, isObstacle, levelDef, type BuildKind, type ObstacleKind, type TribeKey } from "@/lib/tribos/data";
import { footprint, inProgress, produced, type TBuilding } from "@/lib/tribos/state";
import { emblemUrl } from "./emblems";

export const TW = 64;
export const TH = 32;

export type Cam = { x: number; y: number; z: number };

export const toWorld = (tx: number, ty: number): [number, number] => [((tx - ty) * TW) / 2, ((tx + ty) * TH) / 2];

/** Do ponto do mundo para a casa (fracionária) do terreno. */
export function toTile(wx: number, wy: number): [number, number] {
  const a = wy / (TH / 2);
  const b = wx / (TW / 2);
  return [(a + b) / 2, (a - b) / 2];
}

export function screenToTile(cam: Cam, w: number, h: number, sx: number, sy: number): [number, number] {
  const wx = (sx - w / 2) / cam.z + cam.x;
  const wy = (sy - h / 2) / cam.z + cam.y;
  return toTile(wx, wy);
}

export function applyCam(ctx: CanvasRenderingContext2D, cam: Cam, w: number, h: number, dpr: number): void {
  ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (w / 2 - cam.x * cam.z), dpr * (h / 2 - cam.y * cam.z));
}

// ---------------------------------------------------------------- imagens

const ICONS = ["castelo", "bau-ouro", "picareta", "tenda", "barril", "gota", "moeda", "martelo", "ampulheta", "diamante"] as const;
const CAMPO_IMGS = ["arvore", "arvore-seca", "palmeira", "pedras", "rochedo", "arbusto", "seixos", "capim", "cogumelos"] as const;
const POSES = ["parado", "costas", "cesto", "tora", "minerar", "carrinho", "colhe", "foice"] as const;
const TRIBE_LIST: TribeKey[] = ["feras", "bravos", "reliquias"];
const imgs = new Map<string, HTMLImageElement>();
let loading: Promise<void> | null = null;

/** Baixa as imagens uma vez só; resolve quando acabou (mesmo que alguma falhe). */
export function loadTribosAssets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const list: [string, string][] = [
    ...ICONS.map((n): [string, string] => [`i/${n}`, `/arena/icones/${n}.webp`]),
    ...CAMPO_IMGS.map((n): [string, string] => [`c/${n}`, `/arena/campo/${n}.webp`]),
    ...TRIBE_LIST.map((t): [string, string] => [`e/${t}`, emblemUrl(t)]),
    ["k/rei", "/tribos/rei.webp"] as [string, string],
    ["o/ciclo", "/tribos/obreiros/ciclo.webp"] as [string, string],
    ...POSES.map((n): [string, string] => [`o/${n}`, `/tribos/obreiros/${n}.webp`]),
    ...TRIBE_LIST.map((t): [string, string] => [`k/castelo-${t}`, `/tribos/castelo-${t}.webp`]),
  ];
  loading ??= Promise.all(
    list.map(
      ([k, src]) =>
        new Promise<void>((res) => {
          const im = new Image();
          im.onload = () => res();
          im.onerror = () => res();
          im.src = src;
          imgs.set(k, im);
        }),
    ),
  ).then(() => undefined);
  return loading;
}

export const sprite = (k: string): HTMLImageElement | null => img(k);
const img = (k: string): HTMLImageElement | null => {
  const im = imgs.get(k);
  return im && im.complete && im.naturalWidth > 0 ? im : null;
};

/** Desenha a imagem com a base centrada em (cx, baseY) e largura w. */
function spr(ctx: CanvasRenderingContext2D, key: string, cx: number, baseY: number, w: number, alpha = 1): void {
  const im = img(key);
  if (!im) return;
  const h = (w * im.naturalHeight) / im.naturalWidth;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(im, cx - w / 2, baseY - h, w, h);
  if (alpha !== 1) ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- terreno

const GX = GRID * (TW / 2) + 160;
const GY = 120;
const GW = GRID * TW + 320;
const GH = GRID * TH + 320;

const groundCache: Partial<Record<TribeKey, HTMLCanvasElement>> = {};

/** Terreno pré-desenhado: grama (Bravos), areia (Feras) ou terra árida (Relíquias), com bordas e detalhes. */
export function ground(tribe: TribeKey): HTMLCanvasElement {
  const hit = groundCache[tribe];
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = GW;
  c.height = GH;
  const g = c.getContext("2d")!;
  g.translate(GX, GY);
  const T = TRIBES[tribe].terrain;
  const [lx, ly] = toWorld(0, GRID);
  const [bx, by] = toWorld(GRID, GRID);
  const [rx, ry] = toWorld(GRID, 0);
  g.fillStyle = T.cliff;
  g.beginPath();
  g.moveTo(lx, ly);
  g.lineTo(bx, by);
  g.lineTo(bx, by + 26);
  g.lineTo(lx, ly + 26);
  g.closePath();
  g.fill();
  g.fillStyle = T.cliffDark;
  g.beginPath();
  g.moveTo(bx, by);
  g.lineTo(rx, ry);
  g.lineTo(rx, ry + 26);
  g.lineTo(bx, by + 26);
  g.closePath();
  g.fill();
  let seed = 7 + TRIBE_LIST.indexOf(tribe) * 13;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const [wx, wy] = toWorld(x, y);
      const edge = x < 2 || y < 2 || x >= GRID - 2 || y >= GRID - 2;
      g.fillStyle = edge ? T.edge : (x + y) % 2 === 0 ? T.a : T.b;
      g.beginPath();
      g.moveTo(wx, wy);
      g.lineTo(wx + TW / 2, wy + TH / 2);
      g.lineTo(wx, wy + TH);
      g.lineTo(wx - TW / 2, wy + TH / 2);
      g.closePath();
      g.fill();
      const px = wx + (rnd() - 0.5) * 34;
      const py = wy + TH / 2 + (rnd() - 0.5) * 12;
      if (tribe === "bravos") {
        // tufos de grama e florzinhas
        if (rnd() < 0.18) {
          g.strokeStyle = T.speck;
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(px - 3, py + 2);
          g.lineTo(px - 4, py - 3);
          g.moveTo(px, py + 2);
          g.lineTo(px, py - 5);
          g.moveTo(px + 3, py + 2);
          g.lineTo(px + 4, py - 3);
          g.stroke();
        }
        if (rnd() < 0.025) {
          g.fillStyle = "#fff3a0";
          g.beginPath();
          g.arc(px, py, 1.8, 0, Math.PI * 2);
          g.fill();
        }
      } else if (tribe === "feras") {
        // ondulações de duna e pedrinhas
        if (rnd() < 0.16) {
          g.strokeStyle = "#f8e7ad";
          g.lineWidth = 1.6;
          g.beginPath();
          g.ellipse(px, py, 9, 2.4, 0, Math.PI * 1.05, Math.PI * 1.95);
          g.stroke();
          g.strokeStyle = T.speck;
          g.beginPath();
          g.ellipse(px + 2, py + 3, 9, 2.4, 0, Math.PI * 0.05, Math.PI * 0.95);
          g.stroke();
        }
        if (rnd() < 0.05) {
          g.fillStyle = "#b99a55";
          g.beginPath();
          g.ellipse(px, py, 2.2, 1.4, 0, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        // rachaduras de terra seca e cascalho escuro
        if (rnd() < 0.13) {
          g.strokeStyle = T.speck;
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(px - 8, py);
          g.lineTo(px - 2, py + 2);
          g.lineTo(px + 1, py - 2);
          g.lineTo(px + 8, py + 1);
          g.moveTo(px - 2, py + 2);
          g.lineTo(px - 3, py + 6);
          g.stroke();
        }
        if (rnd() < 0.06) {
          g.fillStyle = "#6e3019";
          g.beginPath();
          g.ellipse(px, py, 2.4, 1.5, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
  groundCache[tribe] = c;
  return c;
}

export function drawGround(ctx: CanvasRenderingContext2D, tribe: TribeKey): void {
  ctx.drawImage(ground(tribe), -GX, -GY);
}

export const voidColor = (tribe: TribeKey): string => TRIBES[tribe].terrain.void;

// ---------------------------------------------------------------- formas

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, lift = 0): void {
  const [tx, ty] = toWorld(x, y);
  const [rx, ry] = toWorld(x + s, y);
  const [bx, by] = toWorld(x + s, y + s);
  const [lx, ly] = toWorld(x, y + s);
  ctx.beginPath();
  ctx.moveTo(tx, ty - lift);
  ctx.lineTo(rx, ry - lift);
  ctx.lineTo(bx, by - lift);
  ctx.lineTo(lx, ly - lift);
  ctx.closePath();
}

/** Marca o terreno ocupado (selecionado, fantasma etc.). */
export function drawFootprint(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string, stroke: string): void {
  diamond(ctx, x, y, s);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

/** Laje baixa de pedra sob a construção. */
function slab(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, h: number, base: string, topColor: string): void {
  const [lx, ly] = toWorld(x, y + s);
  const [bx, by] = toWorld(x + s, y + s);
  const [rx, ry] = toWorld(x + s, y);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  diamond(ctx, x - 0.1, y - 0.1, s + 0.35);
  ctx.fill();
  ctx.fillStyle = shade(base, 0.78);
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx, by - h);
  ctx.lineTo(lx, ly - h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(base, 0.92);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(rx, ry);
  ctx.lineTo(rx, ry - h);
  ctx.lineTo(bx, by - h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = topColor;
  diamond(ctx, x, y, s, h);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function outline(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  const a = 0.55 + 0.35 * Math.sin(t / 220);
  drawFootprint(ctx, x, y, s, `rgba(255,236,120,${0.18 * a})`, `rgba(255,214,0,${a})`);
}

function pill(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, bg: string, icon?: string): void {
  ctx.font = "800 11px system-ui, sans-serif";
  const ic = icon ? img(icon) : null;
  const w = ctx.measureText(text).width + 12 + (ic ? 15 : 0);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - 9, w, 18, 9);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (ic) {
    ctx.drawImage(ic, cx - w / 2 + 5, cy - 7, 14, 14);
    ctx.fillText(text, cx + 8, cy + 0.5);
  } else ctx.fillText(text, cx, cy + 0.5);
}

// ---------------------------------------------------------------- obstáculos

const OBST_SPRITE: Record<TribeKey, Record<ObstacleKind, [string, number]>> = {
  bravos: { bush: ["c/arbusto", 44], tree: ["c/arvore", 96], rock: ["c/rochedo", 92] },
  feras: { bush: ["c/seixos", 46], tree: ["c/palmeira", 78], rock: ["c/pedras", 92] },
  reliquias: { bush: ["c/seixos", 44], tree: ["c/arvore-seca", 84], rock: ["c/pedras", 90] },
};

function drawObstacle(ctx: CanvasRenderingContext2D, b: TBuilding, tribe: TribeKey, t: number, selected: boolean): void {
  if (!isObstacle(b.kind)) return;
  const s = OBSTACLES[b.kind].size;
  const [cx, cy] = toWorld(b.x + s / 2, b.y + s / 2);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 13 * s, 6.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const [key, w] = OBST_SPRITE[tribe][b.kind];
  const sway = b.kind === "tree" ? Math.sin(t / 900 + b.x) * 1.5 : 0;
  spr(ctx, key, cx + sway, cy + 10, w);
  if (selected) outline(ctx, b.x, b.y, s, t);
}

// ---------------------------------------------------------------- construções

export type DrawOpts = {
  tribe: TribeKey;
  now: number;
  /** tempo em ms para animações */
  t: number;
  selectedId: string | null;
  hiddenId: string | null;
  fmtLeft: (secs: number) => string;
};

function banner(ctx: CanvasRenderingContext2D, px: number, py: number, tribe: TribeKey, t: number, height = 62): void {
  ctx.strokeStyle = "#3a2a14";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px, py - height);
  ctx.stroke();
  const e = img(`e/${tribe}`);
  if (!e) return;
  const sway = Math.sin(t / 420) * 2;
  const w = 30;
  const h = (w * e.naturalHeight) / e.naturalWidth;
  ctx.drawImage(e, px + 2 + sway * 0.3, py - height - 2, w, h);
}

export function drawBuilding(ctx: CanvasRenderingContext2D, b: TBuilding, o: DrawOpts): void {
  const selected = o.selectedId === b.id;
  if (isObstacle(b.kind)) {
    drawObstacle(ctx, b, o.tribe, o.t, selected);
    if (inProgress(b, o.now) && b.upEnds) {
      const [cx, cy] = toWorld(b.x + OBSTACLES[b.kind].size / 2, b.y + OBSTACLES[b.kind].size / 2);
      pill(ctx, cx, cy - 70, o.fmtLeft((b.upEnds - o.now) / 1000), "rgba(20,20,20,0.82)", "i/martelo");
    }
    return;
  }
  if (!isBuild(b.kind)) return;
  const kind: BuildKind = b.kind;
  const def = BUILDINGS[kind];
  const s = def.size;
  const building = inProgress(b, o.now);
  const foundation = building && b.level < 1;
  const tribeColor = TRIBES[o.tribe].color;
  const [cx, cy] = toWorld(b.x + s / 2, b.y + s / 2);
  const lvl = Math.max(1, b.level);
  if (selected) outline(ctx, b.x, b.y, s, o.t);

  if (kind !== "hq") slab(ctx, b.x, b.y, s, foundation ? 4 : kind === "hut" ? 3 : 6, "#a39a84", foundation ? "#bcae8b" : "#c4bba3");
  const base = cy + s * 5;
  let top = base - 60;
  if (!foundation) {
    if (kind === "hq") {
      // castelo 3D na cor da tribo (a imagem já traz a plataforma de pedra)
      const w = 272 + Math.min(5, lvl) * 6;
      const bottom = cy + 62;
      spr(ctx, `k/castelo-${o.tribe}`, cx, bottom, w);
      const ch = img(`k/castelo-${o.tribe}`);
      const hgt = ch ? (w * ch.naturalHeight) / ch.naturalWidth : w;
      top = bottom - hgt;
      // emblema da tribo sobre a janela central
      const em = img(`e/${o.tribe}`);
      if (em) {
        const ew = 30;
        const eh = (ew * em.naturalHeight) / em.naturalWidth;
        ctx.drawImage(em, cx - (0.016 * w) - ew / 2, bottom - hgt * 0.465 - eh / 2, ew, eh);
      }
      // o líder da tribo, de guarda na frente do Salão
      const king = img("k/rei");
      if (king) {
        const kh = 98;
        const kw = (kh * king.naturalWidth) / king.naturalHeight;
        const breathe = Math.sin(o.t / 650) * 0.012;
        const look = Math.sin(o.t / 3400) > 0.55 ? -1 : 1;
        ctx.save();
        ctx.translate(cx + 66, cy + 66);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(0, 1, kw * 0.36, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.scale(look, 1 + breathe);
        ctx.drawImage(king, -kw / 2, -kh, kw, kh);
        ctx.restore();
      }
    } else if (kind === "gold_mine") {
      spr(ctx, "c/rochedo", cx + 4, base + 6, 118);
      spr(ctx, "i/picareta", cx - 30, base + 4, 50);
      for (const [ox, oy] of [[26, 8], [40, 2], [34, 16]] as const) spr(ctx, "i/moeda", cx + ox, base + oy, 17);
      top = base - 92;
    } else if (kind === "mana_pump") {
      const glow = ctx.createRadialGradient(cx, base - 18, 4, cx, base - 18, 56);
      glow.addColorStop(0, `rgba(80,200,255,${0.5 + Math.sin(o.t / 300) * 0.12})`);
      glow.addColorStop(1, "rgba(80,200,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 60, base - 80, 120, 120);
      spr(ctx, "i/gota", cx, base + 4 + Math.sin(o.t / 500) * 2, 82);
      top = base - 82;
    } else if (kind === "gold_store") {
      spr(ctx, "i/bau-ouro", cx, base + 8, 118);
      top = base - 96;
    } else if (kind === "mana_store") {
      spr(ctx, "i/barril", cx, base - 4, 62);
      spr(ctx, "i/barril", cx - 28, base + 8, 62);
      spr(ctx, "i/barril", cx + 28, base + 10, 62);
      top = base - 66;
    } else if (kind === "hut") {
      spr(ctx, "i/tenda", cx, base + 6, 92);
      const [bx, by] = toWorld(b.x + s - 0.3, b.y + s - 0.3);
      banner(ctx, bx, by, o.tribe, o.t, 34);
      top = base - 80;
    }
  }

  if (building) {
    // andaime listrado e relógio
    ctx.save();
    diamond(ctx, b.x, b.y, s, foundation ? 4 : 6);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,170,0,0.6)";
    ctx.lineWidth = 6;
    for (let i = -8; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 60 + i * 14, cy - 30);
      ctx.lineTo(cx + 20 + i * 14, cy + 40);
      ctx.stroke();
    }
    ctx.restore();
    if (foundation) spr(ctx, "i/martelo", cx, cy + 8 + Math.sin(o.t / 180) * 3, 40);
    if (b.upEnds && b.upStarted) {
      const total = Math.max(1, b.upEnds - b.upStarted);
      const f = Math.max(0, Math.min(1, (o.now - b.upStarted) / total));
      const py = Math.min(top, cy - 30) - 14;
      ctx.fillStyle = "rgba(20,20,20,0.85)";
      ctx.beginPath();
      ctx.roundRect(cx - 34, py - 7, 68, 14, 7);
      ctx.fill();
      ctx.fillStyle = tribeColor;
      ctx.beginPath();
      ctx.roundRect(cx - 32, py - 5, Math.max(4, 64 * f), 10, 5);
      ctx.fill();
      pill(ctx, cx, py - 18, o.fmtLeft((b.upEnds - o.now) / 1000), "rgba(20,20,20,0.82)", "i/ampulheta");
    }
  } else if (b.level >= 1 && (def.levels.length > 1 || kind === "hq")) {
    pill(ctx, cx, cy + (s * TH) / 2 + 12, `Nv ${b.level}`, "rgba(20,20,20,0.72)");
  }

  // coletor com recurso pronto: balão que sobe e desce
  if (def.makes && !building) {
    const amount = produced(b, o.now);
    const cap = levelDef(kind, b.level)?.cap ?? 1;
    if (amount >= Math.min(40, cap * 0.1)) {
      const bob = Math.sin(o.t / 260 + b.x) * 3;
      const py = top - 14 + bob;
      ctx.fillStyle = def.makes === "gold" ? "#f6c52b" : "#35b8ee";
      ctx.beginPath();
      ctx.arc(cx, py, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      const ic = img(def.makes === "gold" ? "i/moeda" : "i/gota");
      if (ic) ctx.drawImage(ic, cx - 11, py - 11, 22, 22);
    }
  }
}

/** Painter's algorithm: do fundo da tela para a frente. */
export function sortForDraw(bs: TBuilding[]): TBuilding[] {
  return [...bs].sort((a, b) => {
    const fa = footprint(a.kind, a.x, a.y);
    const fb = footprint(b.kind, b.x, b.y);
    return fa.x1 + fa.y1 - (fb.x1 + fb.y1) || a.x - b.x;
  });
}
