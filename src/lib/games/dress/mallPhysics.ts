// Movimento da jogadora no Shopping Elos (client-safe e sem navegador, para o jogo 3D e os testes usarem o mesmo código):
// piso (andares, escadas rolantes, degraus e bancos), pulo, gravidade, paredes e colunas.
import { ESCALATORS, FLOOR_H, HX, STEP_UP, WALLS, floorAt, floorHalfZ, inRect, rampY, surfaceY, type Wall } from "./shopping";

/** Algo baixo que dá para subir pulando e sentar/ficar em cima (palanque, banco, fonte): círculo (r) ou retângulo (hw, hd). */
export type Solid = { x: number; z: number; base: number; top: number; r?: number; hw?: number; hd?: number };
/** Coluna, planta, balcão: não dá para atravessar (círculo). */
export type Post = { x: number; z: number; r: number; base: number; height: number };
export type World = {
  surface: (x: number, z: number, y: number) => number;
  solids: Solid[];
  posts: Post[];
  walls: Wall[];
  /** Limites (meia largura/profundidade) na altura y. */
  limit: (y: number) => { hx: number; hz: number };
  carry?: (x: number, z: number, y: number) => { vx: number; vz: number } | null;
  fallY: number;
};
export type Body = { x: number; z: number; y: number; vx: number; vz: number; vy: number; grounded: boolean };

export const GRAVITY = 16;
export const JUMP_V = 6.4;
export const WALK = 5.2;
export const RUN = 8.5;
export const ESC_SPEED = 2.6;
const PAD = 0.5;

const insideSolid = (o: Solid, x: number, z: number): boolean =>
  o.r !== undefined ? Math.hypot(x - o.x, z - o.z) < o.r : Math.abs(x - o.x) < (o.hw ?? 0) && Math.abs(z - o.z) < (o.hd ?? 0);

/** Altura do chão sob a jogadora (considera quem está em cima de um degrau ou banco). */
export function groundOf(w: World, x: number, z: number, y: number): number {
  let g = w.surface(x, z, y);
  for (const o of w.solids) if (o.top <= y + 0.12 && o.top > g && y > o.base - 0.6 && insideSolid(o, x, z)) g = o.top;
  return g;
}

/** Um passo do movimento. `wish` é a velocidade que ela quer (já em coordenadas do mundo). */
export function stepBody(w: World, b: Body, wish: { x: number; z: number }, dt: number, jump: boolean): void {
  const c = w.carry?.(b.x, b.z, b.y);
  const tvx = wish.x + (c?.vx ?? 0);
  const tvz = wish.z + (c?.vz ?? 0);
  const k = Math.min(1, dt * 12);
  b.vx += (tvx - b.vx) * k;
  b.vz += (tvz - b.vz) * k;
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  const lim = w.limit(b.y);
  b.x = Math.max(-lim.hx, Math.min(lim.hx, b.x));
  b.z = Math.max(-lim.hz, Math.min(lim.hz, b.z));
  // colunas e plantas
  for (const p of w.posts) {
    if (b.y > p.base + p.height - 0.1 || b.y < p.base - 0.8) continue;
    const dx = b.x - p.x;
    const dz = b.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < p.r + PAD) {
      const f = (p.r + PAD) / (d || 0.001);
      b.x = p.x + dx * f;
      b.z = p.z + dz * f;
    }
  }
  // degraus e bancos: só passa por cima quem está mais alta (pulando)
  for (const o of w.solids) {
    if (b.y >= o.top - 0.1 || b.y < o.base - 0.8) continue;
    if (o.r !== undefined) {
      const dx = b.x - o.x;
      const dz = b.z - o.z;
      const d = Math.hypot(dx, dz);
      if (d < o.r + PAD) {
        const f = (o.r + PAD) / (d || 0.001);
        b.x = o.x + dx * f;
        b.z = o.z + dz * f;
      }
    } else {
      const hw = (o.hw ?? 0) + PAD;
      const hd = (o.hd ?? 0) + PAD;
      const dx = b.x - o.x;
      const dz = b.z - o.z;
      if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
        if (hw - Math.abs(dx) < hd - Math.abs(dz)) b.x = o.x + (dx >= 0 ? hw : -hw);
        else b.z = o.z + (dz >= 0 ? hd : -hd);
      }
    }
  }
  // paredes de vidro e grades
  for (const q of w.walls) {
    if (b.y < q.y0 - 0.3 || b.y > q.y1) continue;
    const x0 = q.x0 - PAD;
    const x1 = q.x1 + PAD;
    const z0 = q.z0 - PAD;
    const z1 = q.z1 + PAD;
    if (b.x > x0 && b.x < x1 && b.z > z0 && b.z < z1) {
      const l = b.x - x0;
      const r = x1 - b.x;
      const t = b.z - z0;
      const bt = z1 - b.z;
      const m = Math.min(l, r, t, bt);
      if (m === l) b.x = x0;
      else if (m === r) b.x = x1;
      else if (m === t) b.z = z0;
      else b.z = z1;
    }
  }
  if (jump && b.grounded) {
    b.vy = JUMP_V;
    b.grounded = false;
  }
  const g = groundOf(w, b.x, b.z, b.y);
  b.vy -= GRAVITY * dt;
  b.y += b.vy * dt;
  if (b.y <= g) {
    b.y = g;
    b.vy = 0;
    b.grounded = true;
  } else if (b.grounded && b.vy > -GRAVITY * dt * 1.5 && b.y - g < 0.6 && b.vy <= 0) {
    // desceu uma rampa ou um degrau pequeno andando: cola no chão
    b.y = g;
    b.vy = 0;
  } else b.grounded = false;
}

/** O mundo do corredor do shopping: 5 andares, escadas rolantes, grades e peças soltas (bancos, fonte, colunas). */
export function concourseWorld(extra: { solids?: Solid[]; posts?: Post[] } = {}): World {
  return {
    surface: surfaceY,
    solids: extra.solids ?? [],
    posts: extra.posts ?? [],
    walls: WALLS,
    limit: (y) => ({ hx: HX - 1, hz: floorHalfZ(floorAt(y)) - 1 }),
    carry: (x, z, y) => {
      for (const e of ESCALATORS) {
        if (!inRect(e.rect, x, z) || Math.abs(y - rampY(e, x)) > 0.35) continue;
        const dir = Math.sign(e.xHigh - e.xLow) * (e.up ? 1 : -1);
        return { vx: dir * ESC_SPEED, vz: 0 };
      }
      return null;
    },
    fallY: -8,
  };
}

/** O mundo de dentro de uma loja: piso reto do tamanho do salão. */
export function storeWorld(hw: number, hl: number, extra: { solids?: Solid[]; posts?: Post[] } = {}): World {
  return {
    surface: () => 0,
    solids: extra.solids ?? [],
    posts: extra.posts ?? [],
    walls: [],
    limit: () => ({ hx: hw - 1.9, hz: hl - 1.2 }),
    fallY: -8,
  };
}

export { FLOOR_H, STEP_UP };
