// Rig por camadas dos personagens da Arena (só visual).
// Cada ilustração é uma imagem inteira; ela é fatiada em cabeça, tronco, braços e pernas, e cada peça gira em volta
// da sua articulação (pescoço, ombro, quadril). As fatias se sobrepõem um pouco para não abrir fresta.
// Heróis com `RIGS` próprio (campanha) têm a articulação ajustada à mão; os outros usam o padrão, mais contido.

export type RigSpec = {
  /** altura do pescoço, fração da imagem (0 = topo) */
  neck: number;
  /** altura do ombro */
  shoulder: number;
  /** altura do quadril (pernas começam aqui) */
  hip: number;
  /** largura de cada braço, fração da imagem, a partir da borda */
  armW: number;
  /** onde o braço termina (mão) */
  armEnd: number;
  /** força dos movimentos (1 = padrão) */
  gain: number;
  /** quanto cada braço mexe (esq./dir. da imagem; 0 = parado, ex.: segura um instrumento) */
  armL: number;
  armR: number;
};

const DEFAULT_RIG: RigSpec = { neck: 0.24, shoulder: 0.3, hip: 0.56, armW: 0.2, armEnd: 0.62, gain: 0.7, armL: 1, armR: 1 };

/** Ajuste fino por herói. Só o que difere do padrão. */
const RIGS: Record<string, Partial<RigSpec>> = {
  amandinha: { neck: 0.26, shoulder: 0.32, hip: 0.57, armW: 0.24, armEnd: 0.66, gain: 1.3 },
  mbappe: { neck: 0.2, shoulder: 0.27, hip: 0.56, armW: 0.18, gain: 1.3, armL: 0.5, armR: 0.5 },
  nery: { neck: 0.2, shoulder: 0.27, hip: 0.56, armW: 0.22, gain: 1.4 },
  henrique: { neck: 0.22, shoulder: 0.28, hip: 0.55, armW: 0.2, gain: 1.3, armL: 0.5, armR: 0.4 },
  tiaaline: { neck: 0.22, shoulder: 0.3, hip: 0.56, armW: 0.2, gain: 1.3, armL: 0.6, armR: 0.6 },
  marcelinho: { neck: 0.22, shoulder: 0.28, hip: 0.56, armW: 0.2, gain: 1.4 },
  natanrebeca: { neck: 0.21, shoulder: 0.28, hip: 0.56, armW: 0.1, gain: 1.2, armL: 0.5, armR: 0.5 },
  zepa: { neck: 0.2, shoulder: 0.27, hip: 0.56, armW: 0.2, gain: 1.3, armL: 1, armR: 0.5 },
};

export const rigOf = (card: string): RigSpec => ({ ...DEFAULT_RIG, ...RIGS[card] });

export type RigPose = {
  /** fase da caminhada (rad) */
  gait: number;
  moving: boolean;
  /** progresso do golpe 0–1, ou -1 */
  atk: number;
  /** tranco 0–1 */
  hit: number;
  /** fase do "parado" (respiração) */
  idle: number;
  /** golpe à distância: puxa e solta, sem avançar */
  ranged?: boolean;
};

type Frac = { x0: number; y0: number; x1: number; y1: number };

function piece(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dst: { x: number; y: number; w: number; h: number }, f: Frac, pivot: { px: number; py: number }, ang: number, dx = 0, dy = 0) {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const sx = f.x0 * sw;
  const sy = f.y0 * sh;
  const sW = (f.x1 - f.x0) * sw;
  const sH = (f.y1 - f.y0) * sh;
  if (sW <= 0 || sH <= 0) return;
  const ox = dst.x + pivot.px * dst.w;
  const oy = dst.y + pivot.py * dst.h;
  ctx.save();
  ctx.translate(ox + dx, oy + dy);
  if (ang !== 0) ctx.rotate(ang);
  ctx.drawImage(img, sx, sy, sW, sH, dst.x + f.x0 * dst.w - ox, dst.y + f.y0 * dst.h - oy, (f.x1 - f.x0) * dst.w, (f.y1 - f.y0) * dst.h);
  ctx.restore();
}

const smooth = (u: number) => u * u * (3 - 2 * u);

/** Inclinação do tronco no golpe: recua na antecipação, curva pra frente no golpe e volta. */
function strikeLean(atk: number): number {
  if (atk < 0) return 0;
  if (atk < 0.28) return -(atk / 0.28) * 0.5;
  if (atk < 0.5) {
    const u = (atk - 0.28) / 0.22;
    return -0.5 + 1.5 * (1 - Math.pow(1 - u, 3));
  }
  return 1 - smooth((atk - 0.5) / 0.5);
}

/**
 * Desenha o personagem articulado. `x,y,w,h` = onde a imagem inteira cai (como `drawImage`).
 * Pernas alternam o passo, o tronco gira contra o passo, a cabeça atrasa meio passo, os braços balançam em oposição
 * e, no golpe, o tronco recua/avança com o braço da frente.
 */
export function drawRig(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, pose: RigPose, spec: RigSpec) {
  const dst = { x, y, w, h };
  const g = spec.gain;
  const { gait, moving, atk, hit, idle } = pose;
  const stride = moving ? Math.sin(gait) : Math.sin(idle) * 0.04;

  // pernas: uma vai pra frente enquanto a outra volta; a que sobe levanta um pouco
  const legAmp = moving ? 0.34 : 1;
  const hipY = spec.hip;
  const liftL = moving ? Math.max(0, Math.sin(gait)) * h * 0.035 : 0;
  const liftR = moving ? Math.max(0, -Math.sin(gait)) * h * 0.035 : 0;
  piece(ctx, img, dst, { x0: 0, y0: hipY, x1: 0.5, y1: 1 }, { px: 0.25, py: hipY }, stride * legAmp, 0, -liftL);
  piece(ctx, img, dst, { x0: 0.5, y0: hipY, x1: 1, y1: 1 }, { px: 0.75, py: hipY }, -stride * legAmp, 0, -liftR);

  // tronco: gira em volta do quadril (contra o passo, e se inclina no golpe)
  const lean = strikeLean(atk);
  const twist = (moving ? Math.sin(gait - 0.9) * 0.035 : Math.sin(idle * 0.7) * 0.012) * g;
  const torsoAng = twist + lean * 0.07 * g - hit * 0.05 * g;
  const swing = moving ? Math.sin(gait + Math.PI) : Math.sin(idle * 0.8) * 0.15; // braços em oposição às pernas
  const aw = spec.armW;
  const sY = spec.shoulder;
  const pivot = { px: 0.5, py: hipY };
  const top = spec.neck;
  // miolo do tronco (sem os braços), do pescoço ao quadril; sobe um pouco no fim para cobrir a junta das pernas
  piece(ctx, img, dst, { x0: aw, y0: top, x1: 1 - aw, y1: hipY + 0.02 }, pivot, torsoAng);
  // braços: movimento curto (ele só dá vida; o grosso do golpe vem do tronco e do corpo todo). Ângulo grande abriria fresta.
  const ag = Math.min(g, 1.2);
  const armPhase = moving ? swing * 0.1 * ag : swing * 0.03 * ag;
  let aL = -armPhase * spec.armL;
  let aR = armPhase * spec.armR;
  if (atk >= 0 && !pose.ranged) {
    // o braço da frente (direita) recua e dispara; o de trás acompanha pouco
    const arm = strikeLean(atk);
    aR += arm * 0.22 * ag * spec.armR;
    aL += -arm * 0.1 * ag * spec.armL;
  } else if (atk >= 0) {
    // à distância: os dois braços puxam e soltam
    const u = Math.sin(atk * Math.PI);
    aR += -u * 0.16 * ag * spec.armR;
    aL += -u * 0.1 * ag * spec.armL;
  }
  aL += hit * 0.1 * ag * spec.armL;
  aR += -hit * 0.1 * ag * spec.armR;
  const armTop = sY - 0.03;
  // ombro sobe/desce junto com o tronco: o pivô do braço fica preso ao tronco
  ctx.save();
  ctx.translate(dst.x + pivot.px * w, dst.y + pivot.py * h);
  ctx.rotate(torsoAng);
  ctx.translate(-(dst.x + pivot.px * w), -(dst.y + pivot.py * h));
  piece(ctx, img, dst, { x0: 0, y0: armTop, x1: aw + 0.02, y1: hipY + 0.02 }, { px: aw, py: sY }, aL);
  piece(ctx, img, dst, { x0: 1 - aw - 0.02, y0: armTop, x1: 1, y1: hipY + 0.02 }, { px: 1 - aw, py: sY }, aR);

  // cabeça: gira no pescoço, atrasada meio passo; sacode ao apanhar
  const headAng = ((moving ? Math.sin(gait - 1.4) * 0.03 : Math.sin(idle * 0.9 - 0.8) * 0.012) - lean * 0.05 - hit * 0.09) * g;
  const headDy = (moving ? -Math.abs(Math.sin(gait - 0.7)) * h * 0.007 : Math.sin(idle - 0.5) * h * 0.002) * g;
  piece(ctx, img, dst, { x0: 0, y0: 0, x1: 1, y1: Math.max(top + 0.03, armTop + 0.01) }, { px: 0.5, py: top }, headAng, 0, headDy);
  ctx.restore();
}
