import { BRIDGES, H, RIVER_BOT, RIVER_TOP, W, type Entity } from "@/lib/arena/core";

// Desenho do campo da Arena (arte própria, em canvas). O campo lógico tem
// W x H tiles; em volta há uma margem de árvores e pedras.

export const MX = 1.3;
export const MY = 0.5;

/** s = pixels por tile; (ox, oy) = onde o campo (0,0) cai dentro do canvas, que cobre a área toda. */
export type Layout = { s: number; cw: number; ch: number; ox: number; oy: number };

export function layoutFor(availW: number, availH: number): Layout {
  const s = Math.max(8, Math.min(availW / (W + 2 * MX), availH / (H + 2 * MY)));
  const cw = Math.floor(availW);
  const ch = Math.floor(availH);
  return { s, cw, ch, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2 };
}

export const TEAM = ["#2f6fe0", "#d63a3a"] as const;
export const TEAM_DARK = ["#1e4aa3", "#9b2323"] as const;

function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const TOWER_POS: [number, number, number, number][] = [
  // x, y, largura, altura do tablado de pedra (em tiles)
  [4, 5.5, 3.3, 3.2],
  [W - 4, 5.5, 3.3, 3.2],
  [4, H - 5.5, 3.3, 3.2],
  [W - 4, H - 5.5, 3.3, 3.2],
  [W / 2, 2.5, 4.4, 3.4],
  [W / 2, H - 2.5, 4.4, 3.4],
];

/** Fundo estático (grama, caminhos, rio, pontes, árvores): desenhado uma vez por tamanho. */
export function buildBackground(l: Layout, dpr: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(l.cw * dpr);
  c.height = Math.round(l.ch * dpr);
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const s = l.s;
  const X = (x: number) => l.ox + x * s;
  const Y = (y: number) => l.oy + y * s;
  const left = -l.ox / s; // limite esquerdo visível, em tiles (negativo)
  const right = W + l.ox / s;
  const top = -l.oy / s;
  const bottom = H + l.oy / s;

  // grama em xadrez grande e suave
  g.fillStyle = "#76ba4b";
  g.fillRect(0, 0, l.cw, l.ch);
  const tile = 2 * s;
  const gx0 = X(0) - tile * Math.ceil(l.ox / tile);
  const gy0 = Y(0) - tile * Math.ceil(l.oy / tile);
  for (let ix = 0; gx0 + ix * tile < l.cw; ix++) {
    for (let iy = 0; gy0 + iy * tile < l.ch; iy++) {
      if ((ix + iy) % 2 === 0) {
        g.fillStyle = "#6cb042";
        g.fillRect(gx0 + ix * tile, gy0 + iy * tile, tile, tile);
      }
    }
  }
  // sombra suave no centro do campo
  const grad = g.createRadialGradient(X(W / 2), Y(H / 2), s, X(W / 2), Y(H / 2), s * 9);
  grad.addColorStop(0, "rgba(40,90,30,0.16)");
  grad.addColorStop(1, "rgba(40,90,30,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, l.cw, l.ch);

  // caminhos de terra
  const PATH = "#dcbb7c";
  const PATH_EDGE = "#c29f60";
  const pathRect = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = PATH_EDGE;
    roundRect(g, X(x) - 2, Y(y) - 2, w * s + 4, h * s + 4, s * 0.3);
    g.fill();
    g.fillStyle = PATH;
    roundRect(g, X(x), Y(y), w * s, h * s, s * 0.28);
    g.fill();
  };
  for (const lx of [4, W - 4]) pathRect(lx - 0.8, 5.5, 1.6, H - 11); // pistas
  pathRect(4 - 0.8, 2.2, W - 8 + 1.6, 1.5); // do Santuário às pistas (em cima)
  pathRect(4 - 0.8, H - 3.7, W - 8 + 1.6, 1.5); // idem (embaixo)
  for (const [x, y, w, h] of TOWER_POS) pathRect(x - w / 2 - 0.3, y - h / 2 - 0.3, w + 0.6, h + 0.6);

  // rio
  const ry = Y(RIVER_TOP);
  const rh = (RIVER_BOT - RIVER_TOP) * s;
  const water = g.createLinearGradient(0, ry, 0, ry + rh);
  water.addColorStop(0, "#58b4ea");
  water.addColorStop(1, "#2f86c8");
  g.fillStyle = "#1f6aa8";
  g.fillRect(0, ry - 2, l.cw, rh + 4);
  g.fillStyle = water;
  g.fillRect(0, ry, l.cw, rh);
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = Math.max(1.5, s * 0.07);
  const r1 = rng(7);
  for (let i = 0; i < 22; i++) {
    const x = r1() * l.cw;
    const y = ry + s * 0.25 + r1() * (rh - s * 0.5);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + s * (0.5 + r1() * 0.7), y);
    g.stroke();
  }
  // pedras na margem do rio (menos nas pontes)
  const r2 = rng(11);
  for (const edge of [RIVER_TOP, RIVER_BOT]) {
    for (let x = left + 0.2; x < right; x += 0.8 + r2() * 0.9) {
      if (BRIDGES.some((b) => Math.abs(x - b) < 1.7)) continue;
      const rr = s * (0.22 + r2() * 0.2);
      g.fillStyle = "#8c96a3";
      g.beginPath();
      g.ellipse(X(x), Y(edge) + (edge === RIVER_TOP ? -rr * 0.2 : rr * 0.2), rr * 1.3, rr, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.28)";
      g.beginPath();
      g.ellipse(X(x) - rr * 0.3, Y(edge) - rr * 0.35, rr * 0.55, rr * 0.3, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // pontes de madeira
  for (const bx of BRIDGES) {
    const x0 = X(bx - 1.2);
    const w = 2.4 * s;
    const y0 = Y(RIVER_TOP - 0.3);
    const h = (RIVER_BOT - RIVER_TOP + 0.6) * s;
    g.fillStyle = "#6b4423";
    g.fillRect(x0 - 3, y0 - 2, w + 6, h + 4);
    g.fillStyle = "#b27a40";
    g.fillRect(x0, y0, w, h);
    g.strokeStyle = "#7d5128";
    g.lineWidth = Math.max(1.5, s * 0.06);
    for (let px = x0 + w / 6; px < x0 + w - 1; px += w / 6) {
      g.beginPath();
      g.moveTo(px, y0);
      g.lineTo(px, y0 + h);
      g.stroke();
    }
    g.fillStyle = "rgba(255,255,255,0.14)";
    g.fillRect(x0, y0, w, h * 0.12);
    for (const px of [x0 - 2, x0 + w + 2]) {
      for (const py of [y0, y0 + h]) {
        g.fillStyle = "#9aa3ad";
        g.beginPath();
        g.arc(px, py, s * 0.3, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#4b5563";
        g.lineWidth = 2;
        g.stroke();
      }
    }
  }

  // tablados de pedra embaixo das torres
  for (const [x, y, w, h] of TOWER_POS) {
    const px = X(x - w / 2);
    const py = Y(y - h / 2);
    g.fillStyle = "#6b7480";
    roundRect(g, px, py + s * 0.12, w * s, h * s, s * 0.35);
    g.fill();
    const stone = g.createLinearGradient(0, py, 0, py + h * s);
    stone.addColorStop(0, "#c3cad3");
    stone.addColorStop(1, "#98a1ad");
    g.fillStyle = stone;
    roundRect(g, px, py, w * s, h * s, s * 0.35);
    g.fill();
    g.strokeStyle = "#7b8491";
    g.lineWidth = 1.5;
    g.stroke();
  }

  // árvores e pedras na margem
  const r3 = rng(21);
  const bush = (cx: number, cy: number, rad: number) => {
    g.fillStyle = "rgba(20,60,20,0.35)";
    g.beginPath();
    g.ellipse(cx + rad * 0.15, cy + rad * 0.85, rad * 1.05, rad * 0.4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2f7d32";
    g.beginPath();
    g.arc(cx, cy, rad, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#43a047";
    g.beginPath();
    g.arc(cx - rad * 0.2, cy - rad * 0.2, rad * 0.75, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#66bb6a";
    g.beginPath();
    g.arc(cx - rad * 0.35, cy - rad * 0.4, rad * 0.4, 0, Math.PI * 2);
    g.fill();
  };
  const rock = (cx: number, cy: number, rr: number) => {
    g.fillStyle = "#8c96a3";
    g.beginPath();
    g.ellipse(cx, cy, rr * 1.3, rr, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.beginPath();
    g.ellipse(cx - rr * 0.3, cy - rr * 0.35, rr * 0.55, rr * 0.3, 0, 0, Math.PI * 2);
    g.fill();
  };
  const scatter = (x: number, y: number) => {
    if (r3() < 0.2) rock(X(x), Y(y), s * (0.3 + r3() * 0.25));
    else bush(X(x), Y(y), s * (0.5 + r3() * 0.35));
  };
  // laterais (esquerda e direita), de ponta a ponta da tela
  for (const side of [0, 1]) {
    const bandW = Math.max(0.9, side === 0 ? -left : right - W);
    const baseX = side === 0 ? -bandW * 0.5 : W + bandW * 0.5;
    for (let y = top - 0.5; y < bottom + 0.5; y += 1.1 + r3() * 0.7) scatter(baseX + (r3() - 0.5) * Math.min(0.8, bandW * 0.5), y);
  }
  // faixas de cima e de baixo (quando sobra tela)
  for (const edge of [0, 1]) {
    const bandH = edge === 0 ? -top : bottom - H;
    if (bandH < 0.8) continue;
    const baseY = edge === 0 ? -bandH * 0.5 : H + bandH * 0.5;
    for (let x = left; x < right; x += 1.1 + r3() * 0.7) scatter(x, baseY + (r3() - 0.5) * Math.min(0.8, bandH * 0.5));
  }
  // cercas de madeira no fundo do campo (como na referência)
  g.fillStyle = "#8a5a2b";
  for (const fy of [0.15, H - 0.15]) {
    for (const fx of [[0.6, 3.2], [W - 3.2, W - 0.6]]) {
      g.fillRect(X(fx[0]), Y(fy) - s * 0.15, (fx[1] - fx[0]) * s, s * 0.14);
      for (let px = fx[0]; px <= fx[1] + 0.01; px += (fx[1] - fx[0]) / 4) g.fillRect(X(px) - s * 0.07, Y(fy) - s * 0.3, s * 0.14, s * 0.5);
    }
  }
  return c;
}

/** Torre de pedra com bandeira do time, ícone, coroa dourada e barra de vida. */
export function drawTower(g: CanvasRenderingContext2D, s: number, e: Entity) {
  const cx = e.x * s;
  const cy = e.y * s;
  const king = e.card === "santuario";
  const bw = e.radius * (king ? 1.75 : 1.8) * s;
  const bh = e.radius * (king ? 1.6 : 1.5) * s;
  const x0 = cx - bw / 2;
  const y0 = cy - bh / 2 - e.radius * 0.1 * s;
  const team = TEAM[e.side];
  const dark = TEAM_DARK[e.side];

  // sombra
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.beginPath();
  g.ellipse(cx, y0 + bh + s * 0.05, bw * 0.62, s * 0.28, 0, 0, Math.PI * 2);
  g.fill();

  // corpo de pedra
  const stone = g.createLinearGradient(x0, 0, x0 + bw, 0);
  stone.addColorStop(0, "#aab2bd");
  stone.addColorStop(0.5, "#d3d8df");
  stone.addColorStop(1, "#949dab");
  g.fillStyle = stone;
  roundRect(g, x0, y0, bw, bh, s * 0.12);
  g.fill();
  g.strokeStyle = "#4b5563";
  g.lineWidth = Math.max(1.5, s * 0.07);
  g.stroke();
  // tijolos
  g.strokeStyle = "rgba(75,85,99,0.45)";
  g.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const ly = y0 + (bh * i) / 4;
    g.beginPath();
    g.moveTo(x0 + 2, ly);
    g.lineTo(x0 + bw - 2, ly);
    g.stroke();
    for (let j = 1; j < 4; j++) {
      const lx = x0 + (bw * (j + (i % 2 ? 0.5 : 0))) / 4;
      g.beginPath();
      g.moveTo(lx, ly);
      g.lineTo(lx, ly + bh / 4);
      g.stroke();
    }
  }
  // ameias
  const mw = bw / 7;
  g.fillStyle = "#b9c0ca";
  g.strokeStyle = "#4b5563";
  g.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const mx = x0 + mw * (0.5 + i * 2);
    g.fillRect(mx, y0 - mw * 0.9, mw, mw * 0.95);
    g.strokeRect(mx, y0 - mw * 0.9, mw, mw * 0.95);
  }
  // faixa do time + bandeirola
  g.fillStyle = team;
  g.fillRect(x0 + 1, y0 + bh * 0.1, bw - 2, bh * 0.2);
  g.fillStyle = dark;
  g.fillRect(x0 + 1, y0 + bh * 0.28, bw - 2, bh * 0.04);
  g.strokeStyle = "#374151";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx, y0 - mw * 0.9);
  g.lineTo(cx, y0 - bh * 0.62);
  g.stroke();
  g.fillStyle = team;
  g.beginPath();
  g.moveTo(cx, y0 - bh * 0.62);
  g.lineTo(cx + bw * 0.32, y0 - bh * 0.5);
  g.lineTo(cx, y0 - bh * 0.38);
  g.closePath();
  g.fill();
  // ícone
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `${bh * 0.62}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  g.fillStyle = "#000";
  g.fillText(king ? "⛪" : "🏹", cx, y0 + bh * 0.66);

  // coroa dourada na base
  const by = y0 + bh + s * 0.3;
  g.fillStyle = "#b8860b";
  g.beginPath();
  g.arc(cx, by, s * 0.34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#facc15";
  g.beginPath();
  g.arc(cx, by - 1, s * 0.3, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#7c5a06";
  g.font = `bold ${s * 0.42}px system-ui, sans-serif`;
  g.fillText("♛", cx, by);

  // vida
  const frac = Math.max(0, e.hp / e.maxHp);
  const barW = Math.max(bw, s * 1.5);
  const barY = y0 - bh * 0.95 - s * 0.35;
  g.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(g, cx - barW / 2 - 1, barY - 1, barW + 2, s * 0.3 + 2, s * 0.12);
  g.fill();
  g.fillStyle = team;
  roundRect(g, cx - barW / 2, barY, Math.max(2, barW * frac), s * 0.3, s * 0.1);
  g.fill();
  g.font = `bold ${s * 0.46}px system-ui, sans-serif`;
  g.lineWidth = 3;
  g.strokeStyle = "rgba(0,0,0,0.85)";
  g.strokeText(String(Math.max(0, Math.ceil(e.hp))), cx, barY - s * 0.32);
  g.fillStyle = "#fff";
  g.fillText(String(Math.max(0, Math.ceil(e.hp))), cx, barY - s * 0.32);
}

export { H, W };
