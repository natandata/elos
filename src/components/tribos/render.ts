// Clash of Tribos: desenho isométrico da vila em canvas. Tudo em coordenadas do mundo; a câmera vira uma transformação.

import { BUILDINGS, GRID, OBSTACLES, TRIBES, isBuild, isObstacle, levelDef, type TribeKey } from "@/lib/tribos/data";
import { footprint, inProgress, kindEmoji, produced, type TBuilding } from "@/lib/tribos/state";

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

const GX = GRID * (TW / 2) + 160;
const GY = 120;
const GW = GRID * TW + 320;
const GH = GRID * TH + 320;

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

const groundCache: Partial<Record<TribeKey, HTMLCanvasElement>> = {};

/** Terreno pré-desenhado (grama com tabuleiro suave, borda de rocha e pontinhos de vegetação). */
export function ground(tribe: TribeKey): HTMLCanvasElement {
  const hit = groundCache[tribe];
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = GW;
  c.height = GH;
  const g = c.getContext("2d")!;
  g.translate(GX, GY);
  const t = TRIBES[tribe];
  // base rochosa embaixo do terreno
  const [lx, ly] = toWorld(0, GRID);
  const [bx, by] = toWorld(GRID, GRID);
  const [rx, ry] = toWorld(GRID, 0);
  g.fillStyle = "#3b3a2f";
  g.beginPath();
  g.moveTo(lx, ly);
  g.lineTo(bx, by);
  g.lineTo(bx, by + 26);
  g.lineTo(lx, ly + 26);
  g.closePath();
  g.fill();
  g.fillStyle = "#2a291f";
  g.beginPath();
  g.moveTo(bx, by);
  g.lineTo(rx, ry);
  g.lineTo(rx, ry + 26);
  g.lineTo(bx, by + 26);
  g.closePath();
  g.fill();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const [wx, wy] = toWorld(x, y);
      const edge = x < 2 || y < 2 || x >= GRID - 2 || y >= GRID - 2;
      const base = (x + y) % 2 === 0 ? "#6dac4a" : "#65a444";
      g.fillStyle = edge ? "#5a8f3d" : base;
      g.beginPath();
      g.moveTo(wx, wy);
      g.lineTo(wx + TW / 2, wy + TH / 2);
      g.lineTo(wx, wy + TH);
      g.lineTo(wx - TW / 2, wy + TH / 2);
      g.closePath();
      g.fill();
      // toque da tribo: manchas de cor bem suaves
      if (rnd() < 0.06) {
        g.fillStyle = t.tint + "55";
        g.beginPath();
        g.ellipse(wx + (rnd() - 0.5) * 20, wy + TH / 2 + (rnd() - 0.5) * 8, 7, 3.5, 0, 0, Math.PI * 2);
        g.fill();
      }
      if (rnd() < 0.1) {
        g.fillStyle = "#4f8a36";
        g.fillRect(wx + (rnd() - 0.5) * 30, wy + TH / 2 + (rnd() - 0.5) * 12, 2, 4);
      }
    }
  }
  groundCache[tribe] = c;
  return c;
}

export function drawGround(ctx: CanvasRenderingContext2D, tribe: TribeKey): void {
  ctx.drawImage(ground(tribe), -GX, -GY);
}

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

function box(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, h: number, base: string, topColor: string): void {
  const [lx, ly] = toWorld(x, y + s);
  const [bx, by] = toWorld(x + s, y + s);
  const [rx, ry] = toWorld(x + s, y);
  // sombra no chão
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

const WALL: Record<string, { base: string; top: string; h: number }> = {
  hq: { base: "#d5c9a6", top: "#e7dcc0", h: 52 },
  gold_mine: { base: "#8d6b3d", top: "#f2c230", h: 22 },
  mana_pump: { base: "#5870b8", top: "#4cc9f0", h: 26 },
  gold_store: { base: "#a68c55", top: "#f6d365", h: 32 },
  mana_store: { base: "#4a5b9c", top: "#74d7f7", h: 32 },
  hut: { base: "#a97c50", top: "#b8895b", h: 18 },
};

/** Telhado de duas águas sobre uma base de altura h (a cumeeira corre ao longo de x). */
function gable(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, h: number, peak: number, roof: string, roofDark: string, wall: string): void {
  const [Tx, Ty] = toWorld(x, y);
  const [Rx, Ry] = toWorld(x + s, y);
  const [Bx, By] = toWorld(x + s, y + s);
  const [Lx, Ly] = toWorld(x, y + s);
  const over = 0.12;
  const [Mx0, My0] = toWorld(x - over, y + s / 2);
  const [Mx1, My1] = toWorld(x + s + over, y + s / 2);
  const mh = h + peak;
  // face de trás
  ctx.fillStyle = shade(roof, 0.95);
  ctx.beginPath();
  ctx.moveTo(Tx, Ty - h);
  ctx.lineTo(Rx, Ry - h);
  ctx.lineTo(Mx1, My1 - mh);
  ctx.lineTo(Mx0, My0 - mh);
  ctx.closePath();
  ctx.fill();
  // empenas (paredes triangulares das pontas)
  ctx.fillStyle = shade(wall, 0.8);
  ctx.beginPath();
  ctx.moveTo(Lx, Ly - h);
  ctx.lineTo(Tx, Ty - h);
  ctx.lineTo(Mx0, My0 - mh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(wall, 0.92);
  ctx.beginPath();
  ctx.moveTo(Bx, By - h);
  ctx.lineTo(Rx, Ry - h);
  ctx.lineTo(Mx1, My1 - mh);
  ctx.closePath();
  ctx.fill();
  // face da frente
  ctx.fillStyle = roofDark;
  ctx.beginPath();
  ctx.moveTo(Lx, Ly - h);
  ctx.lineTo(Bx, By - h);
  ctx.lineTo(Mx1, My1 - mh);
  ctx.lineTo(Mx0, My0 - mh);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawObstacle(ctx: CanvasRenderingContext2D, b: TBuilding, t: number, selected: boolean): void {
  const kind = b.kind;
  if (!isObstacle(kind)) return;
  const s = OBSTACLES[kind].size;
  const [cx, cy] = toWorld(b.x + s / 2, b.y + s / 2);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 14 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const sway = Math.sin(t / 900 + b.x) * 1.2;
  if (kind === "bush") {
    ctx.fillStyle = "#3f8a3a";
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 4, 8, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 3, 9, 0, Math.PI * 2);
    ctx.arc(cx, cy - 10, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "tree") {
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(cx - 4, cy - 22, 8, 26);
    ctx.fillStyle = "#2f7d32";
    ctx.beginPath();
    ctx.arc(cx + sway, cy - 36, 20, 0, Math.PI * 2);
    ctx.arc(cx - 13 + sway, cy - 26, 14, 0, Math.PI * 2);
    ctx.arc(cx + 14 + sway, cy - 27, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f9b43";
    ctx.beginPath();
    ctx.arc(cx - 5 + sway, cy - 42, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#8c8f94";
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy + 2);
    ctx.lineTo(cx - 14, cy - 22);
    ctx.lineTo(cx + 2, cy - 30);
    ctx.lineTo(cx + 20, cy - 16);
    ctx.lineTo(cx + 26, cy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#a9adb3";
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 22);
    ctx.lineTo(cx + 2, cy - 30);
    ctx.lineTo(cx + 8, cy - 14);
    ctx.lineTo(cx - 6, cy - 8);
    ctx.closePath();
    ctx.fill();
  }
  if (selected) outline(ctx, b.x, b.y, s, t);
}

function outline(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  const a = 0.55 + 0.35 * Math.sin(t / 220);
  drawFootprint(ctx, x, y, s, `rgba(255,236,120,${0.18 * a})`, `rgba(255,214,0,${a})`);
}

function pill(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, bg: string, fg = "#fff"): void {
  ctx.font = "800 11px system-ui, sans-serif";
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - 9, w, 18, 9);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 0.5);
}

export type DrawOpts = {
  tribe: TribeKey;
  now: number;
  /** tempo em ms para animações */
  t: number;
  selectedId: string | null;
  /** construção escondida enquanto se arrasta o fantasma */
  hiddenId: string | null;
  fmtLeft: (secs: number) => string;
};

export function drawBuilding(ctx: CanvasRenderingContext2D, b: TBuilding, o: DrawOpts): void {
  const selected = o.selectedId === b.id;
  if (isObstacle(b.kind)) {
    drawObstacle(ctx, b, o.t, selected);
    if (inProgress(b, o.now) && b.upEnds) {
      const [cx, cy] = toWorld(b.x + OBSTACLES[b.kind].size / 2, b.y + OBSTACLES[b.kind].size / 2);
      pill(ctx, cx, cy - 44, o.fmtLeft((b.upEnds - o.now) / 1000), "rgba(20,20,20,0.82)");
    }
    return;
  }
  if (!isBuild(b.kind)) return;
  const def = BUILDINGS[b.kind];
  const s = def.size;
  const w = WALL[b.kind];
  const building = inProgress(b, o.now);
  if (selected) outline(ctx, b.x, b.y, s, o.t);
  const tribeColor = TRIBES[o.tribe].color;
  const tribeDark = TRIBES[o.tribe].dark;
  const [cx, cy] = toWorld(b.x + s / 2, b.y + s / 2);
  const lvl = Math.max(1, b.level);
  // em obra nova: só a fundação
  const foundation = building && b.level < 1;
  let h = foundation ? 8 : w.h;
  if (b.kind === "hq") h = foundation ? 8 : 34 + Math.min(10, lvl * 2);
  if (b.kind === "hut") h = foundation ? 8 : 14;
  if (b.kind === "gold_mine") h = foundation ? 8 : 12;
  box(ctx, b.x, b.y, s, h, foundation ? "#8a7b5a" : w.base, foundation ? "#a39573" : w.top);
  let emojiY = cy - h - 4;
  if (!foundation) {
    const [Lx, Ly] = toWorld(b.x, b.y + s);
    const [Bx, By] = toWorld(b.x + s, b.y + s);
    const [Rx, Ry] = toWorld(b.x + s, b.y);
    if (b.kind === "hq" || b.kind === "hut") {
      const peak = b.kind === "hq" ? 30 : 16;
      gable(ctx, b.x, b.y, s, h, peak, tribeColor, tribeDark, w.base);
      emojiY = cy - h - peak - 6;
      if (b.kind === "hq") {
        // bandeira da tribo no topo
        ctx.strokeStyle = "#3a2a14";
        ctx.lineWidth = 2;
        const [mx, my] = toWorld(b.x + s - 0.2, b.y + s / 2);
        ctx.beginPath();
        ctx.moveTo(mx, my - h - peak + 6);
        ctx.lineTo(mx, my - h - peak - 22);
        ctx.stroke();
        ctx.fillStyle = tribeColor;
        const wave = Math.sin(o.t / 260) * 2;
        ctx.beginPath();
        ctx.moveTo(mx, my - h - peak - 22);
        ctx.lineTo(mx + 16, my - h - peak - 17 + wave);
        ctx.lineTo(mx, my - h - peak - 11);
        ctx.closePath();
        ctx.fill();
        // escudo com o mascote na parede da frente
        const sx = (Lx + Bx) / 2;
        const sy = (Ly + By) / 2 - h * 0.45;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(sx, sy, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = tribeColor;
        ctx.stroke();
        ctx.font = '19px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(TRIBES[o.tribe].mascot, sx, sy + 1);
        // porta
        ctx.fillStyle = "#4a3320";
        const [dx, dy] = toWorld(b.x + s * 0.5, b.y + s);
        ctx.beginPath();
        ctx.roundRect(dx - 7 + 14, dy - 22 - 2, 14, 22, [7, 7, 0, 0]);
        ctx.fill();
        emojiY = -9999;
      }
    } else if (b.kind === "gold_mine") {
      // pilha de pepitas e vigas de madeira
      ctx.fillStyle = "#6b4a2b";
      ctx.fillRect(cx - 18, cy - h - 20, 4, 20);
      ctx.fillRect(cx + 14, cy - h - 20, 4, 20);
      ctx.fillRect(cx - 18, cy - h - 22, 36, 4);
      ctx.fillStyle = "#ffd23f";
      for (const [ox, oy, r] of [[-8, 2, 6], [2, 4, 7], [10, 0, 5], [-1, -3, 6], [5, -4, 4]] as const) {
        ctx.beginPath();
        ctx.arc(cx + ox, cy - h + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      emojiY = cy - h - 30;
    } else if (b.kind === "mana_pump") {
      // tanque redondo com água brilhante
      const r = s * 11;
      ctx.fillStyle = "#3b4f97";
      ctx.beginPath();
      ctx.ellipse(cx, cy - 2, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - r, cy - h - 4, r * 2, h + 2);
      ctx.beginPath();
      ctx.ellipse(cx, cy - h - 4, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#6fd9ff";
      ctx.fill();
      ctx.strokeStyle = "#e6faff";
      ctx.lineWidth = 2;
      ctx.stroke();
      const sh = Math.sin(o.t / 400) * 0.1;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + sh})`;
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.3, cy - h - 6, r * 0.35, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      emojiY = cy - h - 26;
    } else if (b.kind === "gold_store" || b.kind === "mana_store") {
      // faixa da tribo e porta do cofre
      const [rx2, ry2] = toWorld(b.x + s, b.y);
      for (const [ax, ay, bx2, by2] of [[Lx, Ly, Bx, By], [Bx, By, rx2, ry2]] as const) {
        ctx.fillStyle = tribeColor;
        ctx.beginPath();
        ctx.moveTo(ax, ay - h + 8);
        ctx.lineTo(bx2, by2 - h + 8);
        ctx.lineTo(bx2, by2 - h + 14);
        ctx.lineTo(ax, ay - h + 14);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#2b2b2b";
      const px = Bx + (Rx - Bx) * 0.5;
      const py = By + (Ry - By) * 0.5;
      ctx.beginPath();
      ctx.moveTo(px - 10, py + 5 - 2);
      ctx.lineTo(px + 10, py - 5 - 2);
      ctx.lineTo(px + 10, py - 5 - 20);
      ctx.lineTo(px - 10, py + 5 - 20);
      ctx.closePath();
      ctx.fill();
      emojiY = cy - h - 4;
    }
  }
  // símbolo
  if (emojiY > -9000 && !foundation) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${s >= 3 ? 26 : 20}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.fillText(kindEmoji(b.kind), cx, emojiY);
  }

  if (building) {
    // andaime listrado e relógio
    ctx.save();
    diamond(ctx, b.x, b.y, s, h);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,170,0,0.55)";
    ctx.lineWidth = 6;
    for (let i = -8; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 60 + i * 14, cy - h - 30);
      ctx.lineTo(cx + 20 + i * 14, cy - h + 40);
      ctx.stroke();
    }
    ctx.restore();
    if (b.upEnds && b.upStarted) {
      const total = Math.max(1, b.upEnds - b.upStarted);
      const f = Math.max(0, Math.min(1, (o.now - b.upStarted) / total));
      const py = cy - h - 52;
      ctx.fillStyle = "rgba(20,20,20,0.85)";
      ctx.beginPath();
      ctx.roundRect(cx - 34, py - 7, 68, 14, 7);
      ctx.fill();
      ctx.fillStyle = tribeColor;
      ctx.beginPath();
      ctx.roundRect(cx - 32, py - 5, 64 * f, 10, 5);
      ctx.fill();
      pill(ctx, cx, py - 18, `🔨 ${o.fmtLeft((b.upEnds - o.now) / 1000)}`, "rgba(20,20,20,0.82)");
    }
  } else if (b.level >= 1 && (def.levels.length > 1 || b.kind === "hq")) {
    pill(ctx, cx, cy + (s * TH) / 2 + 8, `Nv ${b.level}`, "rgba(20,20,20,0.7)");
  }

  // coletor com recurso pronto: balão que sobe e desce
  if (def.makes && !building) {
    const amount = produced(b, o.now);
    const cap = levelDef(b.kind, b.level)?.cap ?? 1;
    if (amount >= Math.min(40, cap * 0.1)) {
      const bob = Math.sin(o.t / 260 + b.x) * 3;
      const py = cy - h - 36 + bob;
      ctx.fillStyle = def.makes === "gold" ? "#f6c52b" : "#35b8ee";
      ctx.beginPath();
      ctx.arc(cx, py, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = "15px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(def.makes === "gold" ? "🪙" : "💧", cx, py + 1);
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
