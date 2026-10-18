// A barca (arca) gigante do Noé sobre uma ponte e as marolas de quem está debaixo d'água (só visual).

const TAU = Math.PI * 2;

/** Desenha a arca em cima da ponte, com chegada (cai do céu), saída (afunda) e a contagem regressiva. */
export function drawArk(ctx: CanvasRenderingContext2D, s: number, tileX: number, tileY: number, from: number, until: number, tickF: number) {
  const age = tickF - from;
  const rem = until - tickF;
  if (age < 0 || rem <= -10) return;
  const cx = tileX * s;
  let cy = tileY * s;
  let alpha = 1;
  let scale = 1;
  // chegada: cai do alto, bate na água e quica
  if (age < 9) {
    const u = age / 9;
    cy -= Math.pow(1 - u, 2) * 6 * s;
    alpha = Math.min(1, u * 2.5);
    scale = 0.7 + 0.3 * u;
  } else if (age < 14) {
    cy += Math.sin(((age - 9) / 5) * Math.PI) * 0.12 * s;
  }
  // saída: afunda devagar
  if (rem < 8) {
    const u = 1 - Math.max(0, rem) / 8;
    cy += u * 0.9 * s;
    alpha *= 1 - u;
  }
  const bob = Math.sin(tickF * 0.18) * 0.04 * s;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy + bob);
  ctx.scale(scale, scale);

  // sombra e espuma
  ctx.fillStyle = "rgba(0,30,60,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 0.62 * s, 1.7 * s, 0.34 * s, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = Math.max(2, s * 0.07);
  for (let i = 0; i < 2; i++) {
    const w = 1.5 + Math.sin(tickF * 0.2 + i * 2) * 0.12 + i * 0.25;
    ctx.globalAlpha = alpha * (0.7 - i * 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0.55 * s, w * s, 0.3 * s + i * 0.05 * s, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;

  // arco-íris atrás da cabine (a aliança de Deus com Noé)
  const cols = ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"];
  ctx.lineWidth = Math.max(2, s * 0.09);
  for (let i = 0; i < cols.length; i++) {
    ctx.strokeStyle = cols[i];
    ctx.globalAlpha = alpha * 0.55;
    ctx.beginPath();
    ctx.arc(0, -0.05 * s, (1.25 + i * 0.075) * s, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;

  // casco
  const hull = ctx.createLinearGradient(0, -0.1 * s, 0, 0.62 * s);
  hull.addColorStop(0, "#a8702f");
  hull.addColorStop(1, "#5b3414");
  ctx.fillStyle = hull;
  ctx.strokeStyle = "#2f1a08";
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(-1.55 * s, -0.12 * s);
  ctx.quadraticCurveTo(-1.35 * s, 0.55 * s, -0.7 * s, 0.62 * s);
  ctx.lineTo(0.7 * s, 0.62 * s);
  ctx.quadraticCurveTo(1.35 * s, 0.55 * s, 1.55 * s, -0.12 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // tábuas
  ctx.strokeStyle = "rgba(47,26,8,0.55)";
  ctx.lineWidth = Math.max(1, s * 0.03);
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-1.5 * s + i * 0.12 * s, (-0.12 + i * 0.2) * s);
    ctx.lineTo(1.5 * s - i * 0.12 * s, (-0.12 + i * 0.2) * s);
    ctx.stroke();
  }
  // convés
  ctx.fillStyle = "#c99a5b";
  ctx.strokeStyle = "#2f1a08";
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.beginPath();
  ctx.ellipse(0, -0.12 * s, 1.55 * s, 0.14 * s, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // cabine
  ctx.fillStyle = "#d9b06c";
  ctx.beginPath();
  ctx.rect(-0.78 * s, -0.95 * s, 1.56 * s, 0.85 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7c2d12";
  ctx.beginPath();
  ctx.moveTo(-0.95 * s, -0.95 * s);
  ctx.lineTo(0, -1.5 * s);
  ctx.lineTo(0.95 * s, -0.95 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // janelas e porta
  ctx.fillStyle = "#3b2a14";
  for (const wx of [-0.45, 0.45]) {
    ctx.beginPath();
    ctx.arc(wx * s, -0.62 * s, 0.1 * s, 0, TAU);
    ctx.fill();
  }
  ctx.fillRect(-0.12 * s, -0.5 * s, 0.24 * s, 0.4 * s);
  // pombinha
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.beginPath();
  ctx.ellipse(0.1 * s, -1.6 * s + Math.sin(tickF * 0.3) * 0.03 * s, 0.14 * s, 0.08 * s, -0.3, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // contagem regressiva (mini relógio em cima da arca)
  const left = Math.max(0, rem) / 20;
  const total = (until - from) / 20;
  const by = -2.05 * s;
  const r = 0.42 * s;
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.beginPath();
  ctx.arc(0, by, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#fde68a";
  ctx.lineWidth = Math.max(2.5, s * 0.1);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, by, r * 0.8, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, left / total));
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.round(s * 0.5)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(Math.max(0, Math.ceil(left))), 0, by + s * 0.03);
  ctx.restore();
}

/** Marolas e bolhas em volta de quem está dentro d'água (`k` = quão fundo, 0–1). */
export function drawWaterRipples(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, k: number, tickF: number, seed: number) {
  ctx.save();
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  for (let i = 0; i < 2; i++) {
    const p = (tickF * 0.06 + i * 0.5 + seed * 0.13) % 1;
    ctx.globalAlpha = (1 - p) * (0.35 + 0.45 * k);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.7 + p * 1.1), r * (0.7 + p * 1.1) * 0.4, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 3; i++) {
    const p = (tickF * 0.08 + i * 0.33 + seed * 0.21) % 1;
    ctx.globalAlpha = (1 - p) * k;
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 2.3 + seed) * r * 0.8, y - p * r * 1.6, r * (0.07 + 0.05 * (1 - p)), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
