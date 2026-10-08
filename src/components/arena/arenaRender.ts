import { BRIDGES, H, RIVER_BOT, RIVER_TOP, W, type Entity } from "@/lib/arena/core";
import { ARENAS, type ArenaTheme } from "@/lib/arena/arenas";
import { drawScenery } from "./arenaScenery";
import { glyph } from "./arenaGlyph";
import { campo, shade, tinted, type CampoName } from "./arenaAssets";

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

/** Marcas no chão da campanha: tábuas, mármore, palco, areia, pétalas, folhas, calçamento. Sutis, só para dar identidade. */
function drawFloor(g: CanvasRenderingContext2D, th: ArenaTheme, kind: NonNullable<ArenaTheme["floor"]>, X: (x: number) => number, Y: (y: number) => number, s: number, left: number, right: number, top: number, bottom: number) {
  const r = rng(53);
  const lw = Math.max(1, s * 0.03);
  const hline = (y: number) => {
    g.beginPath();
    g.moveTo(X(left), Y(y));
    g.lineTo(X(right), Y(y));
    g.stroke();
  };
  const vline = (x: number) => {
    g.beginPath();
    g.moveTo(X(x), Y(top));
    g.lineTo(X(x), Y(bottom));
    g.stroke();
  };
  g.save();
  g.lineWidth = lw;
  switch (kind) {
    case "planks": {
      g.strokeStyle = "rgba(40,20,5,0.14)";
      let row = 0;
      for (let y = top; y < bottom; y += 0.7, row++) {
        hline(y);
        for (let x = left + ((row * 1.9) % 3.1); x < right; x += 3.1) {
          g.beginPath();
          g.moveTo(X(x), Y(y));
          g.lineTo(X(x), Y(y + 0.7));
          g.stroke();
        }
      }
      break;
    }
    case "marble": {
      g.strokeStyle = "rgba(90,70,50,0.18)";
      for (let x = Math.floor(left); x < right; x += 2) vline(x);
      for (let y = Math.floor(top); y < bottom; y += 2) hline(y);
      break;
    }
    case "stage": {
      g.strokeStyle = "rgba(190,120,255,0.2)";
      for (let x = Math.floor(left); x < right; x += 2) vline(x);
      for (let y = Math.floor(top); y < bottom; y += 2) hline(y);
      break;
    }
    case "sand": {
      for (let i = 0; i < 90; i++) {
        g.fillStyle = r() < 0.5 ? "rgba(60,50,20,0.16)" : "rgba(255,240,190,0.14)";
        g.beginPath();
        g.ellipse(X(left + r() * (right - left)), Y(top + r() * (bottom - top)), s * (0.05 + r() * 0.09), s * 0.04, 0, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case "petals": {
      for (let i = 0; i < 70; i++) {
        g.fillStyle = ["rgba(249,168,212,0.55)", "rgba(255,255,255,0.6)", "rgba(253,164,175,0.5)"][i % 3];
        g.beginPath();
        g.ellipse(X(left + r() * (right - left)), Y(top + r() * (bottom - top)), s * 0.1, s * 0.05, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case "jungle": {
      for (let i = 0; i < 40; i++) {
        g.fillStyle = "rgba(10,60,20,0.14)";
        g.beginPath();
        g.ellipse(X(left + r() * (right - left)), Y(top + r() * (bottom - top)), s * (0.4 + r() * 0.5), s * (0.25 + r() * 0.3), r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case "paving": {
      g.strokeStyle = "rgba(90,80,60,0.1)";
      for (let x = Math.floor(left); x < right; x += 1) vline(x);
      for (let y = Math.floor(top); y < bottom; y += 1) hline(y);
      break;
    }
  }
  g.restore();
}

/** Fundo estático (grama, caminhos, rio, pontes, árvores): desenhado uma vez por tamanho. */
export function buildBackground(l: Layout, dpr: number, th: ArenaTheme = ARENAS[0].theme, key: string = ARENAS[0].key): HTMLCanvasElement {
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

  /** Desenha um adereço (base no ponto dado, altura em pixels) com sombra de contato. Devolve false se o sprite ainda não chegou. */
  const sprite = (name: CampoName, cx: number, by: number, h: number, tint?: string, amount = 0): boolean => {
    const base = campo(name);
    const img = tint ? tinted(name, tint, amount) : base;
    if (!img || !base) return false;
    const w = (h * base.naturalWidth) / base.naturalHeight;
    g.fillStyle = "rgba(10,30,5,0.2)";
    g.beginPath();
    g.ellipse(cx + w * 0.05, by - h * 0.03, w * 0.4, h * 0.1, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(img, cx - w / 2, by - h, w, h);
    return true;
  };

  // ---- grama: base, faixas de corte, manchas suaves e capim em volta (como o campo da referência)
  g.fillStyle = th.grass;
  g.fillRect(0, 0, l.cw, l.ch);
  const tile = 2 * s;
  const gx0 = X(0) - tile * Math.ceil(l.ox / tile);
  const gy0 = Y(0) - tile * Math.ceil(l.oy / tile);
  for (let ix = 0; gx0 + ix * tile < l.cw; ix++) {
    for (let iy = 0; gy0 + iy * tile < l.ch; iy++) {
      if ((ix + iy) % 2 === 0) {
        g.fillStyle = th.grassAlt;
        g.fillRect(gx0 + ix * tile, gy0 + iy * tile, tile, tile);
      }
    }
  }
  const rg = rng(31);
  // manchas largas de grama mais clara e mais escura
  for (let i = 0; i < 46; i++) {
    const bx = rg() * l.cw;
    const by = rg() * l.ch;
    const br = s * (1.8 + rg() * 3.4);
    const lightSpot = rg() < 0.5;
    const spot = g.createRadialGradient(bx, by, 0, bx, by, br);
    spot.addColorStop(0, lightSpot ? "rgba(255,255,200,0.1)" : "rgba(10,50,10,0.11)");
    spot.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = spot;
    g.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  // fios de capim
  const blades = Math.round((l.cw * l.ch) / 150);
  const bladeDark = shade(th.grass, 0.8);
  const bladeLight = shade(th.grass, 1.18);
  g.lineCap = "round";
  g.lineWidth = Math.max(1, s * 0.05);
  for (let i = 0; i < blades; i++) {
    const bx = rg() * l.cw;
    const by = rg() * l.ch;
    const len = s * (0.12 + rg() * 0.18);
    g.strokeStyle = rg() < 0.55 ? bladeDark : bladeLight;
    g.globalAlpha = 0.28 + rg() * 0.25;
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(bx + len * 0.2, by - len * 0.6, bx + (rg() - 0.5) * len, by - len);
    g.stroke();
  }
  g.globalAlpha = 1;
  // luz vindo de cima e à esquerda, sombra suave nas bordas
  const sun = g.createLinearGradient(0, 0, l.cw * 0.6, l.ch);
  sun.addColorStop(0, "rgba(255,255,220,0.1)");
  sun.addColorStop(0.5, "rgba(255,255,255,0)");
  sun.addColorStop(1, "rgba(0,30,0,0.1)");
  g.fillStyle = sun;
  g.fillRect(0, 0, l.cw, l.ch);
  const grad = g.createRadialGradient(X(W / 2), Y(H / 2), s, X(W / 2), Y(H / 2), s * 9);
  grad.addColorStop(0, th.shade);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, l.cw, l.ch);

  if (th.floor) drawFloor(g, th, th.floor, X, Y, s, left, right, top, bottom);

  // caminhos de terra
  const PATH = th.path;
  const PATH_EDGE = th.pathEdge;
  const pathRect = (x: number, y: number, w: number, h: number) => {
    const px = X(x);
    const py = Y(y);
    const pw = w * s;
    const ph = h * s;
    // sombra no chão + borda de terra mais escura
    g.fillStyle = "rgba(20,40,10,0.18)";
    roundRect(g, px - 3, py - 1, pw + 6, ph + 6, s * 0.34);
    g.fill();
    g.fillStyle = PATH_EDGE;
    roundRect(g, px - 2, py - 2, pw + 4, ph + 4, s * 0.3);
    g.fill();
    g.fillStyle = PATH;
    roundRect(g, px, py, pw, ph, s * 0.28);
    g.fill();
    // textura da terra: dentro do caminho, manchas, grãos e pedrinhas
    g.save();
    roundRect(g, px, py, pw, ph, s * 0.28);
    g.clip();
    const rp = rng(Math.round(x * 131 + y * 17 + w * 7));
    const dirtDark = shade(PATH, 0.86);
    const dirtLight = shade(PATH, 1.12);
    const n = Math.round((pw * ph) / (s * s) * 9);
    for (let i = 0; i < n; i++) {
      g.fillStyle = rp() < 0.5 ? dirtDark : dirtLight;
      g.globalAlpha = 0.16 + rp() * 0.22;
      g.beginPath();
      g.ellipse(px + rp() * pw, py + rp() * ph, s * (0.04 + rp() * 0.1), s * (0.03 + rp() * 0.06), rp() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    // sombreado das bordas (o caminho fica levemente afundado)
    const inner = g.createLinearGradient(px, py, px, py + ph);
    inner.addColorStop(0, "rgba(0,0,0,0.12)");
    inner.addColorStop(0.18, "rgba(0,0,0,0)");
    inner.addColorStop(0.82, "rgba(0,0,0,0)");
    inner.addColorStop(1, "rgba(0,0,0,0.1)");
    g.fillStyle = inner;
    g.fillRect(px, py, pw, ph);
    const innerX = g.createLinearGradient(px, py, px + pw, py);
    innerX.addColorStop(0, "rgba(0,0,0,0.12)");
    innerX.addColorStop(0.14, "rgba(0,0,0,0)");
    innerX.addColorStop(0.86, "rgba(0,0,0,0)");
    innerX.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = innerX;
    g.fillRect(px, py, pw, ph);
    g.restore();
    if (th.carpet) {
      g.strokeStyle = th.carpet;
      g.lineWidth = Math.max(1.5, s * 0.06);
      roundRect(g, px + s * 0.16, py + s * 0.16, Math.max(1, pw - s * 0.32), Math.max(1, ph - s * 0.32), s * 0.12);
      g.stroke();
    } else {
      // capim invadindo a beira do caminho
      g.strokeStyle = shade(th.grass, 0.78);
      g.lineWidth = Math.max(1, s * 0.05);
      g.lineCap = "round";
      const tuft = (tx: number, ty: number, dir: number) => {
        for (let k = -1; k <= 1; k++) {
          g.beginPath();
          g.moveTo(tx + k * s * 0.05, ty);
          g.quadraticCurveTo(tx + k * s * 0.09, ty + dir * s * 0.08, tx + k * s * 0.15, ty + dir * s * (0.16 + rp() * 0.06));
          g.stroke();
        }
      };
      for (let tx = px + s * 0.3; tx < px + pw - s * 0.2; tx += s * (0.5 + rp() * 0.5)) {
        tuft(tx, py, -1);
        tuft(tx + s * 0.2, py + ph, 1);
      }
    }
  };
  for (const lx of [4, W - 4]) pathRect(lx - 0.8, 5.5, 1.6, H - 11); // pistas
  pathRect(4 - 0.8, 2.2, W - 8 + 1.6, 1.5); // do Santuário às pistas (em cima)
  pathRect(4 - 0.8, H - 3.7, W - 8 + 1.6, 1.5); // idem (embaixo)
  for (const [x, y, w, h] of TOWER_POS) pathRect(x - w / 2 - 0.3, y - h / 2 - 0.3, w + 0.6, h + 0.6);

  // ---- rio: margem de terra molhada, água em degradê com sombra nas beiradas, pedrinhas e pontes
  const ry = Y(RIVER_TOP);
  const rh = (RIVER_BOT - RIVER_TOP) * s;
  g.fillStyle = "rgba(30,50,20,0.22)";
  g.fillRect(0, ry - s * 0.62, l.cw, rh + s * 1.24);
  g.fillStyle = shade(th.path, 0.78);
  g.fillRect(0, ry - s * 0.46, l.cw, rh + s * 0.92);
  g.fillStyle = th.waterEdge;
  g.fillRect(0, ry - s * 0.16, l.cw, rh + s * 0.32);
  const water = g.createLinearGradient(0, ry, 0, ry + rh);
  water.addColorStop(0, th.water[0]);
  water.addColorStop(0.5, th.water[1]);
  water.addColorStop(1, th.water[0]);
  g.fillStyle = water;
  g.fillRect(0, ry, l.cw, rh);
  for (const [y0, dir] of [[ry, 1], [ry + rh, -1]] as const) {
    const shadow = g.createLinearGradient(0, y0, 0, y0 + dir * s * 0.55);
    shadow.addColorStop(0, "rgba(0,30,60,0.38)");
    shadow.addColorStop(1, "rgba(0,30,60,0)");
    g.fillStyle = shadow;
    g.fillRect(0, Math.min(y0, y0 + dir * s * 0.55), l.cw, s * 0.55);
  }
  g.strokeStyle = th.waterLine;
  g.lineWidth = Math.max(1.5, s * 0.07);
  const r1 = rng(7);
  for (let i = 0; i < 14; i++) {
    const x = r1() * l.cw;
    const y = ry + s * 0.3 + r1() * (rh - s * 0.6);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + s * (0.5 + r1() * 0.7), y);
    g.stroke();
  }
  // pedras e seixos na margem (menos nas pontes)
  const r2 = rng(11);
  for (const edge of [RIVER_TOP, RIVER_BOT]) {
    for (let x = left + 0.3; x < right; x += 0.9 + r2() * 1.3) {
      if (BRIDGES.some((b) => Math.abs(x - b) < 1.9)) continue;
      const name = r2() < 0.5 ? "seixos" : "pedras";
      const hh = s * (0.46 + r2() * 0.3);
      if (!sprite(name, X(x), Y(edge) + (edge === RIVER_TOP ? -s * 0.12 : s * 0.3), hh)) {
        const rr = s * (0.22 + r2() * 0.2);
        g.fillStyle = th.rock;
        g.beginPath();
        g.ellipse(X(x), Y(edge) + (edge === RIVER_TOP ? -rr * 0.2 : rr * 0.2), rr * 1.3, rr, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  // pontes de madeira com pilares de pedra
  const bridgeImg = campo("ponte");
  for (const bx of BRIDGES) {
    if (bridgeImg) {
      const bh = (RIVER_BOT - RIVER_TOP + 1.8) * s;
      const bw = ((bh * bridgeImg.naturalWidth) / bridgeImg.naturalHeight) * 1.25;
      // sombra da ponte na água
      g.fillStyle = "rgba(0,30,50,0.28)";
      g.fillRect(X(bx) - bw * 0.36, ry - s * 0.1, bw * 0.78, rh + s * 0.4);
      g.drawImage(bridgeImg, X(bx) - bw / 2, ry + rh / 2 - bh / 2 - s * 0.05, bw, bh);
      continue;
    }
    const x0 = X(bx - 1.2);
    const w = 2.4 * s;
    const y0 = Y(RIVER_TOP - 0.3);
    const h = (RIVER_BOT - RIVER_TOP + 0.6) * s;
    g.fillStyle = th.bridge?.[1] ?? "#6b4423";
    g.fillRect(x0 - 3, y0 - 2, w + 6, h + 4);
    g.fillStyle = th.bridge?.[0] ?? "#b27a40";
    g.fillRect(x0, y0, w, h);
  }

  // chão batido embaixo das torres (as torres em si são desenhadas por quadro)
  for (const [x, y, w, h] of TOWER_POS) {
    const cx = X(x);
    const cy = Y(y) + s * 0.25;
    const plaza = g.createRadialGradient(cx, cy, s * 0.5, cx, cy, w * s * 0.82);
    plaza.addColorStop(0, shade(th.path, 0.9));
    plaza.addColorStop(0.7, th.pathEdge);
    plaza.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = plaza;
    g.beginPath();
    g.ellipse(cx, cy, w * s * 0.82, h * s * 0.7, 0, 0, Math.PI * 2);
    g.fill();
  }

  // ---- adereços fixos: arbustos, pedras, flores, capim, toco, cogumelos (as árvores balançam, ver buildAmbient)
  const r3 = rng(21);
  const onLane = (x: number, y: number) =>
    (Math.abs(x - 4) < 1.9 || Math.abs(x - (W - 4)) < 1.9) && y > 3.8 && y < H - 3.8 ||
    (y > 1.6 && y < 4.2 || y > H - 4.2 && y < H - 1.6) && x > 2.4 && x < W - 2.4 ||
    TOWER_POS.some(([tx, ty, tw, th2]) => Math.abs(x - tx) < tw * 0.75 + 0.6 && Math.abs(y - ty) < th2 * 0.75 + 0.6) ||
    y > RIVER_TOP - 1.1 && y < RIVER_BOT + 1.1;
  const leafTint = th.bushMid;
  const scatterEdge = (x: number, y: number) => {
    if (r3() < th.rockChance) sprite(r3() < 0.5 ? "pedras" : "rochedo", X(x), Y(y) + s * 0.4, s * (0.9 + r3() * 0.6));
    else sprite(r3() < 0.3 ? "arbusto-flores" : "arbusto", X(x), Y(y) + s * 0.5, s * (1.1 + r3() * 0.7), leafTint, 0.28);
  };
  // laterais (esquerda e direita), de ponta a ponta da tela
  for (const side of [0, 1]) {
    const bandW = Math.max(0.9, side === 0 ? -left : right - W);
    const baseX = side === 0 ? -bandW * 0.5 : W + bandW * 0.5;
    for (let y = top - 0.5; y < bottom + 0.5; y += 1.5 + r3() * 1.2) scatterEdge(baseX + (r3() - 0.5) * Math.min(0.8, bandW * 0.5), y);
  }
  // faixas de cima e de baixo (quando sobra tela)
  for (const edge of [0, 1]) {
    const bandH = edge === 0 ? -top : bottom - H;
    if (bandH < 0.8) continue;
    const baseY = edge === 0 ? -bandH * 0.5 : H + bandH * 0.5;
    for (let x = left; x < right; x += 1.5 + r3() * 1.2) scatterEdge(x, baseY + (r3() - 0.5) * Math.min(0.8, bandH * 0.5));
  }
  // dentro do campo: flores, capim, pedrinhas e algum toco
  const mineral = th.rockChance > 0.3;
  for (let i = 0; i < 26; i++) {
    const x = 0.6 + r3() * (W - 1.2);
    const y = 0.8 + r3() * (H - 1.6);
    if (onLane(x, y)) continue;
    const roll = r3();
    const name = roll < (mineral ? 0.18 : 0.34) ? "flores" : roll < 0.58 ? "capim" : roll < (mineral ? 0.9 : 0.74) ? (r3() < 0.6 ? "seixos" : "pedras") : roll < 0.88 ? "cogumelos" : "toco";
    sprite(name, X(x), Y(y) + s * 0.2, s * (0.55 + r3() * 0.35), name === "capim" ? leafTint : undefined, 0.25);
  }
  // cenário próprio de cada arena (a passagem bíblica do lugar)
  drawScenery({ g, s, X, Y, left, right, r: rng(97) }, key);
  if (th.vignette) {
    const vg = g.createRadialGradient(l.cw / 2, l.ch / 2, Math.min(l.cw, l.ch) * 0.35, l.cw / 2, l.ch / 2, Math.hypot(l.cw, l.ch) * 0.55);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, th.vignette);
    g.fillStyle = vg;
    g.fillRect(0, 0, l.cw, l.ch);
  }
  // cercas de madeira no fundo do campo (como na referência)
  if (key === "eden" || key === "ela") {
    for (const fx of [2.1, W - 2.1]) {
      sprite("cerca", X(fx), Y(0.62), s * 0.95);
      sprite("cerca", X(fx), Y(H + 0.1), s * 0.95);
    }
  }
  return c;
}

/** Torre desenhada por código: reserva enquanto os sprites não chegam. */
function drawTowerFlat(g: CanvasRenderingContext2D, s: number, e: Entity, t = 0, hitAge = 99, atkAge = 99) {
  const cx = e.x * s;
  const cy = e.y * s;
  const king = e.card === "santuario";
  const bw = e.radius * (king ? 1.75 : 1.8) * s;
  const bh = e.radius * (king ? 1.6 : 1.5) * s;
  const x0 = cx - bw / 2;
  const y0 = cy - bh / 2 - e.radius * 0.1 * s;
  const team = TEAM[e.side];
  const dark = TEAM_DARK[e.side];

  g.save();
  // tremor ao apanhar e leve coice ao atirar
  if (hitAge < 5) g.translate(Math.sin(hitAge * 2.6) * s * 0.09 * (1 - hitAge / 5), 0);
  if (atkAge < 3) g.translate(0, -s * 0.06);

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
  if (hitAge < 3) {
    g.fillStyle = `rgba(255,255,255,${0.55 * (1 - hitAge / 3)})`;
    roundRect(g, x0, y0, bw, bh, s * 0.12);
    g.fill();
  }
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
  const wave = Math.sin(t * 0.3 + e.id) * bw * 0.07;
  g.beginPath();
  g.moveTo(cx, y0 - bh * 0.62);
  g.quadraticCurveTo(cx + bw * 0.16, y0 - bh * 0.62 + wave, cx + bw * 0.32 + wave, y0 - bh * 0.5);
  g.quadraticCurveTo(cx + bw * 0.16, y0 - bh * 0.5 - wave, cx, y0 - bh * 0.38);
  g.closePath();
  g.fill();
  // ícone
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `${bh * 0.62}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  g.fillStyle = "#000";
  glyph(g, king ? "⛪" : "🏹", cx, y0 + bh * 0.66, bh * 0.62);

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
  g.fillStyle = "rgba(0,0,0,0.85)";
  roundRect(g, cx - barW / 2 - 1.5, barY - 1.5, barW + 3, s * 0.3 + 3, s * 0.12);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = team;
  roundRect(g, cx - barW / 2, barY, Math.max(2, barW * frac), s * 0.3, s * 0.1);
  g.fill();
  g.font = `bold ${s * 0.46}px system-ui, sans-serif`;
  g.lineWidth = 3;
  g.strokeStyle = "rgba(0,0,0,0.85)";
  g.strokeText(String(Math.max(0, Math.ceil(e.hp))), cx, barY - s * 0.32);
  g.fillStyle = "#fff";
  g.fillText(String(Math.max(0, Math.ceil(e.hp))), cx, barY - s * 0.32);
  g.restore();
}

// ====================================================================== torres (sprites) e vida do cenário

let scratch: HTMLCanvasElement | null = null;

/** Sprite inteiro coberto por um clarão branco (a torre pisca quando apanha). */
function drawFlash(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, a: number) {
  if (typeof document === "undefined") return;
  scratch ??= document.createElement("canvas");
  scratch.width = Math.max(1, Math.ceil(w));
  scratch.height = Math.max(1, Math.ceil(h));
  const c = scratch.getContext("2d")!;
  c.drawImage(img, 0, 0, w, h);
  c.globalCompositeOperation = "source-atop";
  c.fillStyle = `rgba(255,255,255,${a})`;
  c.fillRect(0, 0, w, h);
  g.drawImage(scratch, x, y);
}

/** Fumaça escura subindo (torre machucada). */
function smoke(g: CanvasRenderingContext2D, s: number, t: number, id: number, x: number, y: number, n: number, spread: number) {
  for (let i = 0; i < n; i++) {
    const p = (t * 0.018 + i / n + id * 0.137) % 1;
    const px = x + (i - (n - 1) / 2) * spread + Math.sin(p * 6 + i * 2) * s * 0.16;
    const py = y - p * s * 2.1;
    const r = s * (0.22 + p * 0.42);
    g.fillStyle = `rgba(70,66,64,${0.38 * (1 - p)})`;
    g.beginPath();
    g.arc(px, py, r, 0, Math.PI * 2);
    g.fill();
  }
}

function flame(g: CanvasRenderingContext2D, s: number, t: number, x: number, y: number, k: number) {
  const f = 0.85 + Math.sin(t * 0.7 + k * 3) * 0.15;
  const grad = g.createRadialGradient(x, y, 0, x, y, s * 0.5 * f);
  grad.addColorStop(0, "rgba(255,244,160,0.95)");
  grad.addColorStop(0.45, "rgba(255,150,40,0.8)");
  grad.addColorStop(1, "rgba(220,60,10,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(x, y - s * 0.12 * f, s * 0.3 * f, s * 0.55 * f, 0, 0, Math.PI * 2);
  g.fill();
}

/** Torre de pedra (sprite) com bandeirola do time que balança, tremor e clarão ao apanhar, fumaça quando está ferida. */
export function drawTower(g: CanvasRenderingContext2D, s: number, e: Entity, t = 0, hitAge = 99, atkAge = 99) {
  const king = e.card === "santuario";
  const img = campo(king ? (e.side === 0 ? "rei-azul" : "rei-vermelho") : e.side === 0 ? "torre-azul" : "torre-vermelha");
  if (!img) return drawTowerFlat(g, s, e, t, hitAge, atkAge);
  const cx = e.x * s;
  const cy = e.y * s;
  const w = (king ? 3.7 : 3.0) * s;
  const h = (w * img.naturalHeight) / img.naturalWidth;
  const baseY = cy + e.radius * 0.8 * s;
  const x0 = cx - w / 2;
  const y0 = baseY - h;
  const team = TEAM[e.side];
  const frac = Math.max(0, e.hp / e.maxHp);

  g.save();
  if (hitAge < 5) g.translate(Math.sin(hitAge * 2.6) * s * 0.09 * (1 - hitAge / 5), 0);
  if (atkAge < 3) g.translate(0, -s * 0.05);

  // sombra no chão
  g.fillStyle = "rgba(10,25,5,0.3)";
  g.beginPath();
  g.ellipse(cx + w * 0.04, baseY - h * 0.03, w * 0.48, w * 0.15, 0, 0, Math.PI * 2);
  g.fill();

  // a torre respira de leve e dá um solavanco ao atirar
  const breathe = 1 + Math.sin(t * 0.08 + e.id) * 0.004 + (atkAge < 4 ? Math.sin((atkAge / 4) * Math.PI) * 0.012 : 0);
  g.save();
  g.translate(cx, baseY);
  g.scale(1, breathe);
  g.translate(-cx, -baseY);
  g.drawImage(img, x0, y0, w, h);
  if (hitAge < 3) drawFlash(g, img, x0, y0, w, h, 0.6 * (1 - hitAge / 3));
  g.restore();

  // bandeirola do time numa ameia
  const px = cx - w * (king ? 0.3 : 0.28);
  const pTop = y0 + h * (king ? 0.14 : 0.1);
  g.strokeStyle = "#3b3f46";
  g.lineWidth = Math.max(1.5, s * 0.07);
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(px, pTop + s * 0.55);
  g.lineTo(px, pTop - s * 0.35);
  g.stroke();
  const wave = Math.sin(t * 0.32 + e.id) * s * 0.12;
  const wave2 = Math.sin(t * 0.32 + e.id + 1.4) * s * 0.1;
  g.fillStyle = team;
  g.beginPath();
  g.moveTo(px, pTop - s * 0.35);
  g.bezierCurveTo(px + s * 0.25, pTop - s * 0.4 + wave, px + s * 0.5, pTop - s * 0.22 + wave2, px + s * 0.72 + wave, pTop - s * 0.18 + wave2);
  g.lineTo(px + s * 0.66 + wave, pTop + s * 0.05 + wave2);
  g.bezierCurveTo(px + s * 0.45, pTop + s * 0.0 + wave2, px + s * 0.22, pTop - s * 0.02 + wave, px, pTop + s * 0.1);
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.28)";
  g.beginPath();
  g.moveTo(px, pTop - s * 0.35);
  g.bezierCurveTo(px + s * 0.25, pTop - s * 0.4 + wave, px + s * 0.4, pTop - s * 0.3 + wave2, px + s * 0.5, pTop - s * 0.26 + wave2);
  g.lineTo(px, pTop - s * 0.12);
  g.closePath();
  g.fill();

  // clarão do tiro na boca do canhão
  if (atkAge < 3) {
    const fx = cx + w * 0.02;
    const fy = y0 + h * (king ? 0.24 : 0.2);
    const k = 1 - atkAge / 3;
    const fl = g.createRadialGradient(fx, fy, 0, fx, fy, s * 0.7 * k + s * 0.2);
    fl.addColorStop(0, "rgba(255,250,200,0.95)");
    fl.addColorStop(0.4, "rgba(255,190,70,0.7)");
    fl.addColorStop(1, "rgba(255,120,20,0)");
    g.fillStyle = fl;
    g.beginPath();
    g.arc(fx, fy, s * 0.7 * k + s * 0.2, 0, Math.PI * 2);
    g.fill();
  }

  // ferida: fumaça (< 50%) e fogo (< 25%)
  if (frac < 0.5 && frac > 0) {
    smoke(g, s, t, e.id, cx + w * 0.12, y0 + h * 0.3, frac < 0.25 ? 5 : 3, w * 0.09);
    if (frac < 0.25) {
      flame(g, s, t, cx - w * 0.2, y0 + h * 0.3, e.id);
      flame(g, s, t, cx + w * 0.22, y0 + h * 0.36, e.id + 1);
    }
  }

  // coroa dourada na base
  const by = baseY + s * 0.3;
  g.fillStyle = "#b8860b";
  g.beginPath();
  g.arc(cx, by, s * 0.34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#facc15";
  g.beginPath();
  g.arc(cx, by - 1, s * 0.3, 0, Math.PI * 2);
  g.fill();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#7c5a06";
  g.font = `bold ${s * 0.42}px system-ui, sans-serif`;
  g.fillText("♛", cx, by);

  // vida: em cima da torre; se não couber na tela (torre do topo), vai embaixo
  const barW = Math.max(w * 0.62, s * 1.5);
  const above = y0 - s * 0.4;
  const barY = above + e.y * 0 < s * 0.9 + (cy - e.y * s) ? baseY + s * 0.78 : above;
  g.fillStyle = "rgba(0,0,0,0.85)";
  roundRect(g, cx - barW / 2 - 1.5, barY - 1.5, barW + 3, s * 0.3 + 3, s * 0.12);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = team;
  roundRect(g, cx - barW / 2, barY, Math.max(2, barW * frac), s * 0.3, s * 0.1);
  g.fill();
  g.font = `bold ${s * 0.46}px system-ui, sans-serif`;
  g.lineWidth = 3;
  g.strokeStyle = "rgba(0,0,0,0.85)";
  g.strokeText(String(Math.max(0, Math.ceil(e.hp))), cx, barY - s * 0.32);
  g.fillStyle = "#fff";
  g.fillText(String(Math.max(0, Math.ceil(e.hp))), cx, barY - s * 0.32);
  g.restore();
}

/** Escombros no lugar das torres que já caíram (com um fiapo de fumaça). */
export function drawRubble(g: CanvasRenderingContext2D, s: number, alive: Entity[], t: number) {
  for (let i = 0; i < TOWER_POS.length; i++) {
    const [x, y] = TOWER_POS[i];
    if (alive.some((e) => e.type === "tower" && Math.hypot(e.x - x, e.y - y) < 0.9)) continue;
    const king = i >= 4;
    const img = campo(king ? "ruina-rei" : "ruina-torre");
    if (!img) continue;
    const w = (king ? 3.9 : 3.1) * s;
    const h = (w * img.naturalHeight) / img.naturalWidth;
    const baseY = y * s + (king ? 1.2 : 0.9) * s;
    g.drawImage(img, x * s - w / 2, baseY - h, w, h);
    smoke(g, s, t, i * 7, x * s + w * 0.05, baseY - h * 0.45, 3, w * 0.12);
  }
}

// ---------------------------------------------------------------------- ambiente animado

type Thing = { name: CampoName; x: number; by: number; h: number; ph: number; amp: number; tint?: string; tintAmt?: number };

/** Grama de verdade (verde) ou terra seca (areia, rocha, neve)? Decide se há árvores frondosas. */
function isLush(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const gr = (n >> 8) & 255;
  const b = n & 255;
  return gr > r + 12 && gr > b + 12;
}
type Leaf = { x: number; y: number; v: number; ph: number; size: number; color: string };
export type Ambient = { cw: number; ch: number; ry: number; rh: number; tile: HTMLCanvasElement | null; tw: number; trees: Thing[]; reeds: Thing[]; lilies: Thing[]; leaves: Leaf[]; foam: string; th: ArenaTheme };

/** Tudo o que se mexe no cenário: água corrente, árvores e juncos balançando, folhas ao vento, sombras de nuvens. */
export function buildAmbient(l: Layout, th: ArenaTheme): Ambient {
  const s = l.s;
  const X = (x: number) => l.ox + x * s;
  const Y = (y: number) => l.oy + y * s;
  const left = -l.ox / s;
  const right = W + l.ox / s;
  const top = -l.oy / s;
  const bottom = H + l.oy / s;
  const ry = Y(RIVER_TOP);
  const rh = (RIVER_BOT - RIVER_TOP) * s;
  const r = rng(77);

  // faixa de água que se repete na horizontal (períodos inteiros: sem emenda)
  let tile: HTMLCanvasElement | null = null;
  const tw = Math.max(64, Math.round(s * 9));
  if (typeof document !== "undefined") {
    tile = document.createElement("canvas");
    tile.width = tw;
    tile.height = Math.max(4, Math.ceil(rh));
    const c = tile.getContext("2d")!;
    c.strokeStyle = "rgba(255,255,255,0.55)";
    c.lineCap = "round";
    c.lineWidth = Math.max(1.4, s * 0.07);
    for (let k = 0; k < 7; k++) {
      const yy = (tile.height * (k + 0.5)) / 7;
      const periods = 1 + (k % 3);
      const amp = s * (0.06 + (k % 2) * 0.04);
      const ph = r() * 6.28;
      c.globalAlpha = 0.35 + (k % 3) * 0.15;
      c.beginPath();
      for (let x = 0; x <= tw; x += 3) {
        const y = yy + Math.sin((x / tw) * Math.PI * 2 * periods + ph) * amp;
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = "rgba(255,255,255,0.8)";
    for (let k = 0; k < 9; k++) {
      c.beginPath();
      c.ellipse(r() * tw, r() * tile.height, s * 0.06, s * 0.035, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  const mineral = th.rockChance > 0.3;
  const lush = isLush(th.grass);
  const trees: Thing[] = [];
  const tintFor = th.bushMid;
  // colunas de árvores nas duas laterais, de ponta a ponta (encostadas e sobrepostas, como na referência)
  for (const side of [0, 1]) {
    for (let y = top - 0.8; y < bottom + 1.4; y += 1.9 + r() * 1.3) {
      const x = side === 0 ? left - 0.1 + r() * 0.9 : right + 0.1 - r() * 0.9;
      const roll = r();
      // terra seca: só pinheiros esparsos, na cor do tema; sem macieiras no deserto
      if (!lush && roll < 0.45) continue;
      const name: CampoName = !lush ? "pinheiro" : roll < (mineral ? 0.65 : 0.25) ? "pinheiro" : roll < 0.7 ? "arvore" : "macieira";
      trees.push({ name, x: X(x), by: Y(y) + s * 0.9, h: s * (name === "pinheiro" ? 3.9 : 3.2) * (0.9 + r() * 0.25), ph: r() * 6.28, amp: 0.018 + r() * 0.016, tint: name === "macieira" ? undefined : tintFor, tintAmt: lush ? 0.28 : 0.55 });
    }
  }
  // cantos de cima e de baixo
  for (const edge of [0, 1]) {
    const bandH = edge === 0 ? -top : bottom - H;
    if (bandH < 1.2) continue;
    for (let x = left + 2; x < right - 2; x += 2.6 + r() * 1.6) {
      trees.push({ name: r() < 0.5 ? "arvore" : "pinheiro", x: X(x), by: Y(edge === 0 ? -bandH * 0.15 : H + bandH * 0.9), h: s * (2.4 + r() * 0.8), ph: r() * 6.28, amp: 0.02, tint: tintFor });
    }
  }
  trees.sort((a, b) => a.by - b.by);

  const reeds: Thing[] = [];
  for (const edge of [RIVER_TOP, RIVER_BOT]) {
    for (let x = left + 0.5; x < right; x += 1.6 + r() * 2.4) {
      if (BRIDGES.some((b) => Math.abs(x - b) < 2.3)) continue;
      reeds.push({ name: "taboa", x: X(x), by: Y(edge) + (edge === RIVER_TOP ? s * 0.05 : s * 0.55), h: s * (0.9 + r() * 0.4), ph: r() * 6.28, amp: 0.06 });
    }
  }
  const lilies: Thing[] = [];
  for (let i = 0; i < 7; i++) {
    const x = left + r() * (right - left);
    if (BRIDGES.some((b) => Math.abs(x - b) < 1.9)) continue;
    lilies.push({ name: "vitoria-regia", x: X(x), by: ry + rh * (0.55 + r() * 0.3), h: s * (0.5 + r() * 0.25), ph: r() * 6.28, amp: 1 });
  }
  const leaves: Leaf[] = [];
  const colors = [th.bushLight, th.bushMid, "#fde68a", "#fbcfe8"];
  for (let i = 0; i < 16; i++) leaves.push({ x: r() * l.cw, y: r() * l.ch, v: 0.35 + r() * 0.5, ph: r() * 6.28, size: s * (0.07 + r() * 0.07), color: colors[i % colors.length] });
  return { cw: l.cw, ch: l.ch, ry, rh, tile, tw, trees, reeds, lilies, leaves, foam: "rgba(255,255,255,0.65)", th };
}

function drawThing(g: CanvasRenderingContext2D, th: Thing, t: number, shadow: boolean) {
  const img = th.tint !== undefined ? tinted(th.name, th.tint, th.tintAmt ?? 0.28) : campo(th.name);
  const base = campo(th.name);
  if (!img || !base) return;
  const w = (th.h * base.naturalWidth) / base.naturalHeight;
  if (shadow) {
    g.fillStyle = "rgba(10,30,5,0.22)";
    g.beginPath();
    g.ellipse(th.x + w * 0.05, th.by - th.h * 0.02, w * 0.4, th.h * 0.09, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.save();
  g.translate(th.x, th.by);
  g.rotate(Math.sin(t * 0.045 + th.ph) * th.amp);
  // a copa se estica de leve com o vento
  g.transform(1, 0, Math.sin(t * 0.045 + th.ph + 0.8) * th.amp * 0.9, 1, 0, 0);
  g.drawImage(img, -w / 2, -th.h, w, th.h);
  g.restore();
}

/** Quadro do ambiente (por baixo das tropas e das torres). `t` em ticks. */
export function drawAmbient(g: CanvasRenderingContext2D, a: Ambient, t: number) {
  // água
  if (a.tile) {
    g.save();
    g.beginPath();
    g.rect(0, a.ry, a.cw, a.rh);
    g.clip();
    const o1 = -((t * 0.55) % a.tw);
    g.globalAlpha = 0.55;
    for (let x = o1; x < a.cw; x += a.tw) g.drawImage(a.tile, x, a.ry);
    // segunda camada correndo ao contrário, espelhada
    g.globalAlpha = 0.35;
    const o2 = -(a.tw - ((t * 0.32) % a.tw)) - a.tw;
    g.save();
    g.translate(0, a.ry + a.rh);
    g.scale(1, -1);
    for (let x = o2; x < a.cw; x += a.tw) g.drawImage(a.tile, x, 0);
    g.restore();
    g.globalAlpha = 1;
    // espuma nas duas margens
    g.strokeStyle = a.foam;
    g.lineWidth = Math.max(1.5, a.rh * 0.045);
    g.lineCap = "round";
    for (const [yy, dir] of [[a.ry + a.rh * 0.07, 1], [a.ry + a.rh * 0.93, -1]] as const) {
      g.globalAlpha = 0.55 + Math.sin(t * 0.1 + dir) * 0.2;
      g.beginPath();
      for (let x = 0; x <= a.cw; x += 6) {
        const y = yy + Math.sin(x * 0.045 + t * 0.12 * dir) * a.rh * 0.035;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();
  }
  for (const li of a.lilies) {
    const bob = Math.sin(t * 0.05 + li.ph) * a.rh * 0.03;
    drawThing(g, { ...li, by: li.by + bob, amp: 0.05 }, t, false);
  }
  for (const r of a.reeds) drawThing(g, r, t, false);
  for (const tr of a.trees) drawThing(g, tr, t, true);
  // folhas e pétalas ao vento
  for (const lf of a.leaves) {
    const x = (lf.x + t * lf.v * 1.4) % (a.cw + 20) - 10;
    const y = (lf.y + Math.sin(t * 0.03 + lf.ph) * 14 + t * lf.v * 0.35) % (a.ch + 20) - 10;
    g.fillStyle = lf.color;
    g.globalAlpha = 0.75;
    g.save();
    g.translate(x, y);
    g.rotate(t * 0.04 + lf.ph);
    g.beginPath();
    g.ellipse(0, 0, lf.size * 1.6, lf.size * 0.8, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.globalAlpha = 1;
  // sombras de nuvens passando
  for (let i = 0; i < 3; i++) {
    const cx = ((t * (0.35 + i * 0.12) + i * a.cw * 0.45) % (a.cw + 400)) - 200;
    const cy = a.ch * (0.2 + i * 0.3);
    const cg = g.createRadialGradient(cx, cy, 0, cx, cy, a.cw * 0.28);
    cg.addColorStop(0, "rgba(0,20,40,0.07)");
    cg.addColorStop(1, "rgba(0,20,40,0)");
    g.fillStyle = cg;
    g.fillRect(cx - a.cw * 0.28, cy - a.cw * 0.28, a.cw * 0.56, a.cw * 0.56);
  }
}

export { H, W };
