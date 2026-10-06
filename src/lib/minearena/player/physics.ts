// Física de corpo (AABB) compartilhada por jogador e criaturas.
// Suporta blocos parciais (lajes e degraus): o corpo sobe sozinho degraus de até meio bloco.
import { BOXES, isFluid } from "../blocks/blocks";
import type { World } from "../world/world";

export interface Body {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  w: number;
  h: number;
  onGround: boolean;
  inWater: boolean;
  hitWall: boolean;
}

export const newBody = (x: number, y: number, z: number, w: number, h: number): Body => ({ x, y, z, vx: 0, vy: 0, vz: 0, w, h, onGround: false, inWater: false, hitWall: false });

/** 0 = livre, 1 = bloco inteiro, 2 = bloco parcial (laje/degrau). */
function cell(world: World, bx: number, by: number, bz: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): number {
  if (world.isSolid(bx, by, bz)) return 1;
  const boxes = BOXES[world.getBlock(bx, by, bz)];
  if (boxes) {
    for (const b of boxes) {
      if (x1 > bx + b[0] && x0 < bx + b[3] && y1 > by + b[1] && y0 < by + b[4] && z1 > bz + b[2] && z0 < bz + b[5]) return 2;
    }
  }
  return 0;
}

function scan(world: World, x: number, y: number, z: number, w: number, h: number, wantTop: boolean): { hit: number; full: boolean; top: number } {
  const r = w / 2;
  const x0 = x - r;
  const x1 = x + r;
  const z0 = z - r;
  const z1 = z + r;
  const y1 = y + h - 1e-6;
  let hit = 0;
  let full = false;
  let top = -Infinity;
  for (let bx = Math.floor(x0); bx <= Math.floor(x1); bx++) {
    for (let bz = Math.floor(z0); bz <= Math.floor(z1); bz++) {
      for (let by = Math.floor(y); by <= Math.floor(y1); by++) {
        const c = cell(world, bx, by, bz, x0, y, z0, x1, y1, z1);
        if (c === 0) continue;
        hit = 1;
        if (c === 1) {
          full = true;
          top = Math.max(top, by + 1);
        } else if (wantTop) {
          for (const b of BOXES[world.getBlock(bx, by, bz)] ?? []) {
            if (x1 > bx + b[0] && x0 < bx + b[3] && y1 > by + b[1] && y < by + b[4] && z1 > bz + b[2] && z0 < bz + b[5]) top = Math.max(top, by + b[4]);
          }
        }
        if (!wantTop) return { hit, full, top };
      }
    }
  }
  return { hit, full, top };
}

export const collides = (world: World, x: number, y: number, z: number, w: number, h: number): boolean => scan(world, x, y, z, w, h, false).hit === 1;

/** Move o corpo por dt segundos, resolvendo colisão eixo por eixo (em passos curtos pra não atravessar blocos). */
export function stepBody(world: World, b: Body, dt: number): void {
  const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
  const sdt = dt / steps;
  let grounded = b.onGround;
  b.hitWall = false;
  b.onGround = false;
  const r = b.w / 2;
  for (let s = 0; s < steps; s++) {
    // X
    b.x += b.vx * sdt;
    let sc = scan(world, b.x, b.y, b.z, b.w, b.h, true);
    if (sc.hit) {
      if (grounded && b.vy <= 0.5 && sc.top > b.y && sc.top - b.y <= 0.55 && !collides(world, b.x, sc.top + 1e-3, b.z, b.w, b.h)) {
        b.y = sc.top; // sobe o degrau
      } else {
        if (sc.full) b.x = b.vx > 0 ? Math.floor(b.x + r) - r - 1e-4 : Math.floor(b.x - r) + 1 + r + 1e-4;
        else b.x -= b.vx * sdt;
        b.vx = 0;
        b.hitWall = true;
      }
    }
    // Z
    b.z += b.vz * sdt;
    sc = scan(world, b.x, b.y, b.z, b.w, b.h, true);
    if (sc.hit) {
      if (grounded && b.vy <= 0.5 && sc.top > b.y && sc.top - b.y <= 0.55 && !collides(world, b.x, sc.top + 1e-3, b.z, b.w, b.h)) {
        b.y = sc.top;
      } else {
        if (sc.full) b.z = b.vz > 0 ? Math.floor(b.z + r) - r - 1e-4 : Math.floor(b.z - r) + 1 + r + 1e-4;
        else b.z -= b.vz * sdt;
        b.vz = 0;
        b.hitWall = true;
      }
    }
    // Y
    b.y += b.vy * sdt;
    sc = scan(world, b.x, b.y, b.z, b.w, b.h, true);
    if (sc.hit) {
      if (b.vy > 0) b.y = Math.floor(b.y + b.h) - b.h - 1e-4;
      else {
        b.y = sc.top > -Infinity ? sc.top : Math.floor(b.y) + 1;
        b.onGround = true;
        grounded = true;
      }
      b.vy = 0;
    }
  }
  const wb = world.getBlock(Math.floor(b.x), Math.floor(b.y + 0.4), Math.floor(b.z));
  b.inWater = isFluid(wb, "water");
}

/** Há chão logo abaixo (até 0,6 bloco)? Usado ao agachar na beirada. */
export function hasGround(world: World, x: number, y: number, z: number, w: number): boolean {
  return collides(world, x, y - 0.6, z, w, 0.55);
}

export function inLava(world: World, b: Body): boolean {
  return isFluid(world.getBlock(Math.floor(b.x), Math.floor(b.y + 0.3), Math.floor(b.z)), "lava");
}
