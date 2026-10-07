// Braços e pernas que se mexem nos personagens da campanha (só visual).
// Cada ilustração é uma imagem inteira, então ela é fatiada: pernas (esquerda e direita), braços (faixas
// laterais do tronco) e o resto. Cada fatia gira em volta da sua articulação (quadril e ombro).

const LEG_TOP = 0.56;
const ARM_TOP = 0.2;
const ARM_W = 0.24;

type Slice = { sx: number; sy: number; sw: number; sh: number };

function piece(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dst: { x: number; y: number; w: number; h: number }, f: { x0: number; y0: number; x1: number; y1: number }, pivot: { px: number; py: number }, ang: number, dy: number) {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const src: Slice = { sx: f.x0 * sw, sy: f.y0 * sh, sw: (f.x1 - f.x0) * sw, sh: (f.y1 - f.y0) * sh };
  const dx = dst.x + f.x0 * dst.w;
  const dyy = dst.y + f.y0 * dst.h;
  const dw = (f.x1 - f.x0) * dst.w;
  const dh = (f.y1 - f.y0) * dst.h;
  const ox = dst.x + pivot.px * dst.w;
  const oy = dst.y + pivot.py * dst.h;
  ctx.save();
  ctx.translate(ox, oy + dy);
  ctx.rotate(ang);
  ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, dx - ox, dyy - oy, dw, dh);
  ctx.restore();
}

/**
 * Desenha o personagem com membros animados.
 * `gait` = fase da caminhada (rad), `moving` = está andando, `atk` = progresso do golpe (0–1) ou -1, `face` = lado para onde olha.
 */
export function drawLimbs(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, gait: number, moving: boolean, atk: number, face: number, idle: number) {
  const dst = { x, y, w, h };
  const stride = moving ? Math.sin(gait) : Math.sin(idle) * 0.04;
  const legAmp = moving ? 0.34 : 1;
  // pernas: uma vai pra frente enquanto a outra volta; a que sobe levanta um pouco
  const legL = stride * legAmp;
  const legR = -stride * legAmp;
  const liftL = moving ? Math.max(0, Math.sin(gait)) * h * 0.035 : 0;
  const liftR = moving ? Math.max(0, -Math.sin(gait)) * h * 0.035 : 0;
  piece(ctx, img, dst, { x0: 0, y0: LEG_TOP, x1: 0.5, y1: 1 }, { px: 0.25, py: LEG_TOP }, legL, -liftL);
  piece(ctx, img, dst, { x0: 0.5, y0: LEG_TOP, x1: 1, y1: 1 }, { px: 0.75, py: LEG_TOP }, legR, -liftR);

  // tronco e cabeça (parados): o miolo até a cintura e a faixa de cima inteira
  piece(ctx, img, dst, { x0: 0, y0: 0, x1: 1, y1: ARM_TOP }, { px: 0.5, py: 0.5 }, 0, 0);
  piece(ctx, img, dst, { x0: ARM_W, y0: ARM_TOP, x1: 1 - ARM_W, y1: LEG_TOP }, { px: 0.5, py: 0.5 }, 0, 0);

  // braços: balançam ao contrário das pernas; no golpe, o braço da frente chicoteia
  const strike = atk >= 0 ? Math.sin(Math.min(1, atk) * Math.PI) : 0;
  const swing = moving ? -Math.sin(gait) * 0.3 : Math.sin(idle * 1.3) * 0.05;
  const front = face >= 0 ? 1 : -1;
  const armL = swing - (front < 0 ? 0.7 * strike : 0.2 * strike);
  const armR = -swing + (front > 0 ? 0.7 * strike : 0.2 * strike);
  piece(ctx, img, dst, { x0: 0, y0: ARM_TOP, x1: ARM_W, y1: LEG_TOP }, { px: ARM_W, py: ARM_TOP }, armL, 0);
  piece(ctx, img, dst, { x0: 1 - ARM_W, y0: ARM_TOP, x1: 1, y1: LEG_TOP }, { px: 1 - ARM_W, py: ARM_TOP }, armR, 0);
}
