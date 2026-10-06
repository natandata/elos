// Física de corpo (AABB) compartilhada por jogador e criaturas.
import { isFluid } from "../blocks/blocks";
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

function collides(world: World, x: number, y: number, z: number, w: number, h: number): boolean {
  const r = w / 2;
  const x0 = Math.floor(x - r);
  const x1 = Math.floor(x + r);
  const z0 = Math.floor(z - r);
  const z1 = Math.floor(z + r);
  const y0 = Math.floor(y);
  const y1 = Math.floor(y + h - 1e-6);
  for (let bx = x0; bx <= x1; bx++) for (let bz = z0; bz <= z1; bz++) for (let by = y0; by <= y1; by++) if (world.isSolid(bx, by, bz)) return true;
  return false;
}

/** Move o corpo por dt segundos, resolvendo colisão eixo por eixo (em passos curtos pra não atravessar blocos). */
export function stepBody(world: World, b: Body, dt: number): void {
  const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
  const sdt = dt / steps;
  b.hitWall = false;
  b.onGround = false;
  const r = b.w / 2;
  for (let s = 0; s < steps; s++) {
    // X
    b.x += b.vx * sdt;
    if (collides(world, b.x, b.y, b.z, b.w, b.h)) {
      b.x = b.vx > 0 ? Math.floor(b.x + r) - r - 1e-4 : Math.floor(b.x - r) + 1 + r + 1e-4;
      b.vx = 0;
      b.hitWall = true;
    }
    // Z
    b.z += b.vz * sdt;
    if (collides(world, b.x, b.y, b.z, b.w, b.h)) {
      b.z = b.vz > 0 ? Math.floor(b.z + r) - r - 1e-4 : Math.floor(b.z - r) + 1 + r + 1e-4;
      b.vz = 0;
      b.hitWall = true;
    }
    // Y
    b.y += b.vy * sdt;
    if (collides(world, b.x, b.y, b.z, b.w, b.h)) {
      if (b.vy > 0) b.y = Math.floor(b.y + b.h) - b.h - 1e-4;
      else {
        b.y = Math.floor(b.y) + 1;
        b.onGround = true;
      }
      b.vy = 0;
    }
  }
  const wb = world.getBlock(Math.floor(b.x), Math.floor(b.y + 0.4), Math.floor(b.z));
  b.inWater = isFluid(wb, "water");
}

export function inLava(world: World, b: Body): boolean {
  return isFluid(world.getBlock(Math.floor(b.x), Math.floor(b.y + 0.3), Math.floor(b.z)), "lava");
}
