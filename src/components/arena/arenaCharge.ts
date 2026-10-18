// "Carga" do ataque: o efeito que nasce na mão/objeto do herói enquanto ele se prepara e dispara (só visual).
// Desenhado no espaço do sprite (origem nos pés, mesmo sistema do personagem), então acompanha o recuo e o giro do corpo.
// Fases do golpe (p = progresso 0–1): 0–0,28 prepara (carrega), 0,28–0,5 solta (clarão), depois some.

type Kind = "spark" | "note" | "flame" | "rays" | "page" | "dust";
type Spec = {
  /** posição da mão/objeto: fração da largura a partir do centro e da altura a partir do topo */
  fx: number;
  fy: number;
  kind: Kind;
  a: string;
  b: string;
  /** tamanho relativo */
  size: number;
};

const SPECS: Record<string, Spec> = {
  henrique: { fx: 0.3, fy: 0.3, kind: "note", a: "#f472b6", b: "#60a5fa", size: 1 },
  mbappe: { fx: 0.28, fy: 0.42, kind: "spark", a: "#60a5fa", b: "#ffffff", size: 1 },
  nery: { fx: 0.36, fy: 0.36, kind: "dust", a: "#f5e6c4", b: "#d8c7a3", size: 1.1 },
  tiaaline: { fx: 0.3, fy: 0.16, kind: "page", a: "#fef3c7", b: "#facc15", size: 1 },
  marcelinho: { fx: 0.3, fy: 0.4, kind: "spark", a: "#bef264", b: "#fde047", size: 0.9 },
  natanrebeca: { fx: 0.02, fy: 0.44, kind: "flame", a: "#fde047", b: "#f97316", size: 1.2 },
  zepa: { fx: 0.3, fy: 0.12, kind: "rays", a: "#fde68a", b: "#ffffff", size: 1.3 },
  amandinha: { fx: 0.34, fy: 0.5, kind: "dust", a: "#86efac", b: "#bbf7d0", size: 0.9 },
};

export const hasCharge = (card: string) => card in SPECS;

const TAU = Math.PI * 2;

/**
 * Desenha a carga do ataque. `w,h` = tamanho do sprite; `p` = progresso do golpe (0–1) ou -1.
 * Chame depois de desenhar o personagem, no mesmo sistema de coordenadas (origem nos pés).
 */
export function drawCharge(ctx: CanvasRenderingContext2D, card: string, w: number, h: number, p: number, tickF: number, ranged: boolean) {
  const sp = SPECS[card];
  if (!sp || p < 0 || p > 0.75) return;
  const x = sp.fx * w;
  const y = -h * 0.97 + sp.fy * h;
  const R = h * 0.26 * sp.size;
  const rel = ranged ? 0.3 : 0.38; // instante do disparo
  ctx.save();
  ctx.translate(x, y);
  if (p < rel) {
    // carrega: brilho cresce e partículas são puxadas pra mão
    const u = p / rel;
    const grow = u * u;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * (0.35 + grow * 0.85));
    g.addColorStop(0, hexA(sp.b, 0.95 * grow + 0.1));
    g.addColorStop(0.5, hexA(sp.a, 0.55 * grow));
    g.addColorStop(1, hexA(sp.a, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.35 + grow * 0.85), 0, TAU);
    ctx.fill();
    drawBits(ctx, sp, R, u, tickF, true);
  } else {
    // solta: clarão e anel que abrem e somem
    const u = Math.min(1, (p - rel) / 0.35);
    ctx.globalAlpha = 1 - u;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * (0.6 + u * 1.2));
    g.addColorStop(0, hexA(sp.b, 0.95));
    g.addColorStop(0.45, hexA(sp.a, 0.6));
    g.addColorStop(1, hexA(sp.a, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.6 + u * 1.2), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = hexA(sp.b, 0.9);
    ctx.lineWidth = Math.max(2, h * 0.03) * (1 - u * 0.6);
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.4 + u * 1.5), 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawBits(ctx, sp, R, u, tickF, false);
  }
  ctx.restore();
}

/** Partículas do estilo de cada herói. `in` = convergindo (carregando) ou saindo (soltando). */
function drawBits(ctx: CanvasRenderingContext2D, sp: Spec, R: number, u: number, tickF: number, converge: boolean) {
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + tickF * 0.35 * (i % 2 ? 1 : -1);
    const d = converge ? R * (1.5 - u * 1.2) : R * (0.5 + u * 1.7);
    const px = Math.cos(a) * d;
    const py = Math.sin(a) * d * 0.8;
    ctx.globalAlpha = converge ? 0.4 + u * 0.6 : 1 - u;
    const c = i % 2 ? sp.a : sp.b;
    switch (sp.kind) {
      case "note": {
        ctx.font = `bold ${R * 0.55}px system-ui, "Segoe UI Symbol", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = c;
        ctx.fillText(i % 2 ? "♪" : "♫", px, py);
        break;
      }
      case "flame": {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(px, py - (converge ? 0 : u * R * 0.6), R * 0.12, R * 0.22, 0, 0, TAU);
        ctx.fill();
        break;
      }
      case "page": {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a * 2);
        ctx.fillStyle = c;
        ctx.fillRect(-R * 0.12, -R * 0.08, R * 0.24, R * 0.16);
        ctx.restore();
        break;
      }
      case "rays": {
        ctx.strokeStyle = c;
        ctx.lineWidth = Math.max(1.5, R * 0.07);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * d * 0.55, Math.sin(a) * d * 0.55);
        ctx.lineTo(Math.cos(a) * d * 1.05, Math.sin(a) * d * 1.05);
        ctx.stroke();
        break;
      }
      case "dust": {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(px, py, R * 0.1, 0, TAU);
        ctx.fill();
        break;
      }
      default: {
        // faísca em estrela de 4 pontas
        ctx.fillStyle = c;
        ctx.beginPath();
        const r = R * 0.16;
        ctx.moveTo(px, py - r * 1.6);
        ctx.lineTo(px + r * 0.4, py - r * 0.4);
        ctx.lineTo(px + r * 1.6, py);
        ctx.lineTo(px + r * 0.4, py + r * 0.4);
        ctx.lineTo(px, py + r * 1.6);
        ctx.lineTo(px - r * 0.4, py + r * 0.4);
        ctx.lineTo(px - r * 1.6, py);
        ctx.lineTo(px - r * 0.4, py - r * 0.4);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}
