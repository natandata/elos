// Efeitos de ataque de cada herói (só visual). Cada personagem luta do seu jeito:
// Sansão esmaga com a clava, Noé e João usam água, Daniel ataca com garras etc.
// Coordenadas já em pixels; `s` = tamanho de um tile; `p` = progresso 0..1.

const TAU = Math.PI * 2;

/** Duração (ticks) do golpe corpo a corpo de cada herói; o resto usa a padrão. */
export const MELEE_DUR: Record<string, number> = { sansao: 10, noe: 9, joao: 8, isaque: 8, josue: 8, daniel: 7, miguel: 7, gideao: 6, jose: 6, adao: 7, jaco: 7, nabucodonosor: 10 };
/** Heróis à distância que ganham efeito ao acertar, e quanto ele dura. */
export const IMPACT_DUR = 9;
export const IMPACT_CARDS = new Set(["davi", "moises", "salomao", "ester", "maria", "eva", "isaias", "jeremias"]);
/** Heróis à distância com projétil próprio (os outros usam o padrão). */
export const CUSTOM_PROJ = new Set(["moises", "salomao", "ester", "maria", "isaias"]);

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points: number, rot: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;
    const rr = i % 2 === 0 ? r : r * 0.38;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Gotas em leque que sobem e caem. */
function droplets(ctx: CanvasRenderingContext2D, s: number, x: number, y: number, p: number, n: number, spread: number, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.12 + (0.76 * i) / Math.max(1, n - 1));
    const d = spread * s * Math.min(1, p * 1.3);
    ctx.globalAlpha = Math.max(0, 1 - p * 0.9);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 1.15 + p * p * s * 1.0, s * 0.1 * (1 - p * 0.5), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function ripple(ctx: CanvasRenderingContext2D, s: number, x: number, y: number, p: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = Math.max(0, 1 - p);
  ctx.lineWidth = Math.max(2, s * 0.12) * (1 - p * 0.5);
  ctx.beginPath();
  ctx.ellipse(x, y, r * s * (0.3 + p), r * s * (0.3 + p) * 0.45, 0, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function arc(ctx: CanvasRenderingContext2D, s: number, ang: number, p: number, color: string, width: number, radius = 0.95) {
  ctx.save();
  ctx.rotate(ang);
  ctx.strokeStyle = color;
  ctx.globalAlpha = Math.max(0, 1 - p);
  ctx.lineWidth = Math.max(3, s * width) * (1 - p * 0.6);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(-s * 0.2, 0, s * radius, -0.9 + p * 0.5, 0.9 + p * 0.5);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------ corpo a corpo

export function drawMelee(ctx: CanvasRenderingContext2D, s: number, card: string, x: number, y: number, ang: number, p: number) {
  ctx.save();
  ctx.translate(x, y);
  switch (card) {
    case "sansao": {
      // clava enorme desce de cima, racha o chão e solta estrelas
      const swing = Math.min(1, p / 0.4);
      const e = 1 - Math.pow(1 - swing, 3);
      const a = -2.1 + e * 2.2;
      const L = s * 1.7;
      const px = 0;
      const py = -L * 0.9;
      const ex = px + Math.sin(a) * L;
      const ey = py + Math.cos(a) * L;
      ctx.globalAlpha = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
      ctx.lineCap = "round";
      ctx.strokeStyle = "#7a4a1d";
      ctx.lineWidth = s * 0.2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillStyle = "#5b3414";
      ctx.strokeStyle = "#2f1a08";
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.arc(ex, ey, s * 0.3, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (swing >= 1) {
        const q = (p - 0.4) / 0.6;
        ripple(ctx, s, 0, s * 0.2, q, 1.5, "rgba(255,240,190,0.95)");
        ctx.strokeStyle = `rgba(60,40,20,${1 - q})`;
        ctx.lineWidth = Math.max(2, s * 0.07);
        for (let i = 0; i < 6; i++) {
          const aa = (i * TAU) / 6 + 0.3;
          const len = s * (0.45 + 0.7 * q);
          ctx.beginPath();
          ctx.moveTo(Math.cos(aa) * s * 0.2, s * 0.2 + Math.sin(aa) * s * 0.1);
          ctx.lineTo(Math.cos(aa) * len, s * 0.2 + Math.sin(aa) * len * 0.5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1 - q;
        for (let i = 0; i < 3; i++) star(ctx, (i - 1) * s * (0.5 + q * 0.6), -s * (0.4 + q * 0.9) + (i % 2) * s * 0.2, s * 0.2, 5, q * 4 + i, "#ffe066");
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "noe": {
      // onda que se levanta e quebra
      const h = s * 1.05 * Math.sin(Math.min(1, p) * Math.PI);
      const w = s * 0.95;
      ctx.fillStyle = `rgba(77,171,247,${0.8 * (1 - p * 0.5)})`;
      ctx.beginPath();
      ctx.moveTo(-w, s * 0.2);
      ctx.quadraticCurveTo(-w * 0.4, -h * 1.7, w * 0.2, -h);
      ctx.quadraticCurveTo(w * 0.95, -h * 0.5, w, s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - p * 0.6)})`;
      ctx.lineWidth = Math.max(2, s * 0.1);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-w * 0.85, -h * 0.1);
      ctx.quadraticCurveTo(-w * 0.4, -h * 1.7, w * 0.2, -h);
      ctx.stroke();
      droplets(ctx, s, 0, -h * 0.9, p, 7, 1.0, "#bfe3ff");
      ripple(ctx, s, 0, s * 0.25, p, 1.5, "rgba(147,205,255,0.9)");
      break;
    }
    case "joao":
    case "isaque": {
      // respingo de água do batismo
      droplets(ctx, s, 0, -s * 0.1, p, 9, 1.15, "#74c0fc");
      droplets(ctx, s, 0, -s * 0.1, Math.min(1, p * 1.2), 5, 0.6, "#e7f5ff");
      ripple(ctx, s, 0, s * 0.2, p, 1.2, "rgba(116,192,252,0.95)");
      break;
    }
    case "jose": {
      // golpe dourado com grãos de trigo
      arc(ctx, s, ang, p, "rgba(253,224,71,1)", 0.22);
      ctx.fillStyle = "#facc15";
      for (let i = 0; i < 7; i++) {
        const a = ang - 0.9 + (i * 1.8) / 6;
        const d = s * (0.4 + p * 1.0);
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.save();
        ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.11, s * 0.05, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "gideao": {
      // tocha: golpe de fogo com brasas
      arc(ctx, s, ang, p, "rgba(251,146,60,1)", 0.2, 0.8);
      for (let i = 0; i < 5; i++) {
        const a = (i * TAU) / 5 + 0.6;
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.fillStyle = i % 2 ? "#fde047" : "#fb923c";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.4 * (0.5 + p), -p * s * 0.7 + Math.sin(a) * s * 0.2, s * 0.08 * (1 - p * 0.5), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = Math.max(0, 1 - p * 1.2);
      ctx.font = `${0.8 * s}px system-ui, "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🔥", 0, -s * 0.2 - p * s * 0.3);
      ctx.globalAlpha = 1;
      break;
    }
    case "josue": {
      // golpe pesado que racha a pedra
      arc(ctx, s, ang, p, "rgba(226,232,240,1)", 0.3, 1.0);
      ctx.strokeStyle = `rgba(71,63,56,${1 - p})`;
      ctx.lineWidth = Math.max(2, s * 0.07);
      ctx.lineJoin = "round";
      for (let i = 0; i < 3; i++) {
        const a = ang + (i - 1) * 0.9 + 1.2;
        const len = s * (0.5 + p * 0.8);
        ctx.beginPath();
        ctx.moveTo(0, s * 0.15);
        ctx.lineTo(Math.cos(a) * len * 0.5 + s * 0.08, s * 0.15 + Math.sin(a) * len * 0.3);
        ctx.lineTo(Math.cos(a) * len, s * 0.15 + Math.sin(a) * len * 0.5);
        ctx.stroke();
      }
      ctx.fillStyle = "#94a3b8";
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * (0.15 + 0.7 * (i / 4));
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.fillRect(Math.cos(a) * s * 0.9 * p - s * 0.05, Math.sin(a) * s * 0.9 * p + p * p * s * 0.8, s * 0.1, s * 0.1);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "daniel": {
      // garras do leão: três riscos paralelos
      ctx.rotate(ang);
      const draw = Math.min(1, p / 0.5);
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        const ox = i * s * 0.22;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.5) * 2);
        const x0 = -s * 0.55 + ox * 0.4;
        const y0 = -s * 0.7 + ox;
        const x1 = x0 + s * 1.1 * draw;
        const y1 = y0 + s * 1.4 * draw;
        ctx.strokeStyle = "#ff8a3d";
        ctx.lineWidth = Math.max(3, s * 0.15);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.strokeStyle = "#fff7e0";
        ctx.lineWidth = Math.max(1.5, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "miguel": {
      // espada de luz
      arc(ctx, s, ang, p, "rgba(191,227,255,1)", 0.32, 1.05);
      arc(ctx, s, ang, p * 1.15, "rgba(255,255,255,0.95)", 0.12, 1.05);
      const k = Math.sin(Math.min(1, p) * Math.PI);
      star(ctx, 0, -s * 0.1, s * (0.15 + 0.5 * k), 4, 0, `rgba(255,255,255,${0.95 * (1 - p * 0.5)})`);
      ctx.globalAlpha = 1;
      break;
    }
    case "adao": {
      // golpe da terra: arco verde e folhas voando
      arc(ctx, s, ang, p, "rgba(74,168,76,1)", 0.24);
      for (let i = 0; i < 7; i++) {
        const a = ang - 1 + (i * 2) / 6;
        const d = s * (0.4 + p * 1.1);
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.fillStyle = i % 2 ? "#4aa84c" : "#86d46a";
        ctx.save();
        ctx.translate(Math.cos(a) * d, Math.sin(a) * d - p * s * 0.3);
        ctx.rotate(a + p * 3);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.14, s * 0.07, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "jaco": {
      // cajado e bênção dourada
      arc(ctx, s, ang, p, "rgba(160,110,60,1)", 0.26);
      star(ctx, 0, -s * 0.2, s * (0.1 + 0.35 * Math.sin(Math.min(1, p) * Math.PI)), 5, p * 3, `rgba(253,224,71,${1 - p * 0.6})`);
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = Math.max(0, 1 - p);
        circ2(ctx, (i - 1) * s * 0.5 * (0.5 + p), -p * s * 0.8 - i * s * 0.1, s * 0.07, "#fde68a");
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "nabucodonosor": {
      // golpe real: roxo e dourado, com onda de choque
      arc(ctx, s, ang, p, "rgba(168,85,247,1)", 0.34, 1.05);
      arc(ctx, s, ang, p * 1.1, "rgba(250,204,21,1)", 0.14, 1.05);
      ripple(ctx, s, 0, s * 0.2, p, 1.4, "rgba(250,204,21,0.9)");
      star(ctx, 0, -s * 0.15, s * 0.4 * Math.sin(Math.min(1, p) * Math.PI), 5, p * 2, "rgba(255,255,255,0.9)");
      break;
    }
    default:
      arc(ctx, s, ang, p, "rgba(255,248,200,1)", 0.26);
  }
  ctx.restore();
}

function circ2(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// ------------------------------------------------------------ projéteis próprios

/** Desenha o projétil de heróis à distância com estilo próprio. */
export function drawProjectile(ctx: CanvasRenderingContext2D, s: number, card: string, x1: number, y1: number, x2: number, y2: number, p: number, tickF: number) {
  const hx = x1 + (x2 - x1) * p;
  const hy = y1 + (y2 - y1) * p;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  switch (card) {
    case "moises": {
      // jato d'água do cajado
      const back = Math.max(0, p - 0.55);
      const tx = x1 + (x2 - x1) * back;
      const ty = y1 + (y2 - y1) * back;
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const n = 12;
      for (const [col, w] of [["#4dabf7", 0.22], ["#e7f5ff", 0.08]] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(2, s * w);
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const wob = Math.sin(t * TAU * 1.5 + tickF * 1.4) * s * 0.14;
          const px = (tx + (hx - tx) * t) * 1 + nx * wob;
          const py = (ty + (hy - ty) * t) * 1 + ny * wob;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#a5d8ff";
      ctx.beginPath();
      ctx.arc(hx, hy, s * 0.17, 0, TAU);
      ctx.fill();
      break;
    }
    case "salomao": {
      // esfera dourada da sabedoria
      for (let i = 3; i >= 1; i--) {
        const q = Math.max(0, p - i * 0.07);
        star(ctx, x1 + (x2 - x1) * q, y1 + (y2 - y1) * q, s * 0.12, 4, tickF * 0.3 + i, `rgba(253,224,71,${0.5 - i * 0.12})`);
      }
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, s * 0.32);
      g.addColorStop(0, "rgba(255,251,214,1)");
      g.addColorStop(0.5, "rgba(250,204,21,0.95)");
      g.addColorStop(1, "rgba(250,204,21,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hx, hy, s * 0.32, 0, TAU);
      ctx.fill();
      break;
    }
    case "ester": {
      // estrela real rosa e dourada
      for (let i = 4; i >= 1; i--) {
        const q = Math.max(0, p - i * 0.06);
        ctx.fillStyle = `rgba(244,114,182,${0.5 - i * 0.1})`;
        ctx.beginPath();
        ctx.arc(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q, s * (0.12 - i * 0.015), 0, TAU);
        ctx.fill();
      }
      star(ctx, hx, hy, s * 0.3, 5, tickF * 0.5, "#f472b6");
      star(ctx, hx, hy, s * 0.14, 5, tickF * 0.5, "#fde68a");
      break;
    }
    case "isaias": {
      // brasa ardente do altar
      for (let i = 4; i >= 1; i--) {
        const q = Math.max(0, p - i * 0.06);
        ctx.fillStyle = `rgba(251,146,60,${0.55 - i * 0.1})`;
        ctx.beginPath();
        ctx.arc(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q, s * (0.17 - i * 0.025), 0, TAU);
        ctx.fill();
      }
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, s * 0.3);
      g.addColorStop(0, "rgba(255,247,190,1)");
      g.addColorStop(0.5, "rgba(251,146,60,0.95)");
      g.addColorStop(1, "rgba(220,38,38,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hx, hy, s * 0.3, 0, TAU);
      ctx.fill();
      break;
    }
    case "maria": {
      // orbe azul suave de cuidado
      ctx.strokeStyle = "rgba(191,219,254,0.7)";
      ctx.lineWidth = Math.max(2, s * 0.06);
      ctx.beginPath();
      ctx.arc(hx, hy, s * (0.28 + Math.sin(tickF) * 0.03), 0, TAU);
      ctx.stroke();
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, s * 0.24);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.6, "rgba(96,165,250,0.95)");
      g.addColorStop(1, "rgba(96,165,250,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hx, hy, s * 0.24, 0, TAU);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------ impacto dos ataques à distância

export function drawImpact(ctx: CanvasRenderingContext2D, s: number, card: string, x: number, y: number, p: number) {
  ctx.save();
  ctx.translate(x, y);
  switch (card) {
    case "davi": {
      // pedra bate: lascas cinzas e poeirinha
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * (0.1 + 0.8 * (i / 4));
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.fillStyle = i % 2 ? "#adb5bd" : "#868e96";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.7 * p, Math.sin(a) * s * 0.7 * p + p * p * s * 0.5, s * 0.07, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "moises": {
      droplets(ctx, s, 0, 0, p, 8, 1.0, "#74c0fc");
      ripple(ctx, s, 0, s * 0.3, p, 1.1, "rgba(116,192,252,0.95)");
      break;
    }
    case "salomao": {
      ctx.strokeStyle = `rgba(250,204,21,${1 - p})`;
      ctx.lineWidth = Math.max(2, s * 0.08);
      ctx.lineCap = "round";
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2);
        ctx.lineTo(Math.cos(a) * s * (0.4 + p * 0.7), Math.sin(a) * s * (0.4 + p * 0.7));
        ctx.stroke();
      }
      break;
    }
    case "ester": {
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + p;
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.fillStyle = i % 2 ? "#f9a8d4" : "#f472b6";
        ctx.save();
        ctx.translate(Math.cos(a) * s * 0.8 * p, Math.sin(a) * s * 0.8 * p + p * s * 0.2);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.14, s * 0.07, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "isaias": {
      // explosão de brasas
      for (let i = 0; i < 9; i++) {
        const a = (i * TAU) / 9;
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.fillStyle = i % 2 ? "#fde047" : "#fb923c";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.8 * p, Math.sin(a) * s * 0.6 * p - p * s * 0.2, s * 0.1 * (1 - p * 0.5), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ripple(ctx, s, 0, s * 0.1, p, 1.0, "rgba(251,146,60,0.9)");
      break;
    }
    case "eva": {
      // pedaços de maçã e pétalas
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + p;
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.fillStyle = i % 2 ? "#ef4444" : "#fda4af";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.7 * p, Math.sin(a) * s * 0.7 * p + p * s * 0.3, s * 0.09, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "jeremias": {
      // cacos de barro
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * (0.1 + 0.8 * (i / 6));
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.fillStyle = i % 2 ? "#b45309" : "#92400e";
        ctx.save();
        ctx.translate(Math.cos(a) * s * 0.8 * p, Math.sin(a) * s * 0.8 * p + p * p * s * 0.7);
        ctx.rotate(i + p * 4);
        ctx.fillRect(-s * 0.06, -s * 0.04, s * 0.12, s * 0.08);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "maria": {
      ripple(ctx, s, 0, 0, p, 1.0, "rgba(147,197,253,0.95)");
      star(ctx, 0, -s * 0.2, s * 0.25 * Math.sin(Math.min(1, p) * Math.PI), 4, 0, "rgba(255,255,255,0.95)");
      break;
    }
  }
  ctx.restore();
}
