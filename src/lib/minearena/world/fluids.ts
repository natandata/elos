// Fluidos que escorrem: a água cai e se espalha, a lava é mais lenta; água + lava viram obsidiana ou pedra.
import { B, BLOCKS, FLUID_MAX, fluidId, isFluid } from "../blocks/blocks";
import type { World } from "./world";

type Kind = "water" | "lava";
const MAX_PER_STEP = 56;
const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

export class FluidSim {
  private active: Record<Kind, Set<string>> = { water: new Set(), lava: new Set() };
  private timer: Record<Kind, number> = { water: 0, lava: 0 };

  constructor(private world: World) {}

  /** Acorda a célula e as vizinhas se houver fluido por perto. */
  poke(x: number, y: number, z: number): void {
    const cells: [number, number, number][] = [[x, y, z], [x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]];
    for (const kind of ["water", "lava"] as const) {
      if (cells.some(([cx, cy, cz]) => isFluid(this.world.getBlock(cx, cy, cz), kind))) {
        for (const [cx, cy, cz] of cells) this.active[kind].add(key(cx, cy, cz));
      }
    }
  }

  update(dt: number): void {
    this.timer.water -= dt;
    this.timer.lava -= dt;
    if (this.timer.water <= 0) {
      this.timer.water = 0.22;
      this.step("water");
    }
    if (this.timer.lava <= 0) {
      this.timer.lava = 1.1;
      this.step("lava");
    }
  }

  private step(kind: Kind): void {
    const set = this.active[kind];
    if (set.size === 0) return;
    const batch = [...set].slice(0, MAX_PER_STEP);
    for (const k of batch) set.delete(k);
    for (const k of batch) {
      const [x, y, z] = k.split(",").map(Number);
      this.cell(kind, x, y, z);
    }
  }

  private level(kind: Kind, x: number, y: number, z: number): number {
    const id = this.world.getBlock(x, y, z);
    return isFluid(id, kind) ? (BLOCKS[id].level ?? 0) : 0;
  }

  private replaceable(x: number, y: number, z: number): boolean {
    const id = this.world.getBlock(x, y, z);
    return id === B.air || BLOCKS[id].shape === "cross" || BLOCKS[id].fluid !== undefined;
  }

  /** Coloca fluido numa célula (ou cria obsidiana/pedra se encontrar o outro fluido). */
  private put(kind: Kind, x: number, y: number, z: number, level: number): void {
    if (!this.world.hasChunkAt(x, z)) return;
    const cur = this.world.getBlock(x, y, z);
    const curInfo = BLOCKS[cur];
    if (curInfo.fluid && curInfo.fluid !== kind) {
      // água encontra lava: fonte de lava vira obsidiana, lava corrente vira pedra lavrada
      const lavaIsSource = (curInfo.fluid === "lava" ? curInfo.level : 0) === FLUID_MAX.lava;
      this.world.setBlock(x, y, z, kind === "water" ? (lavaIsSource ? B.obsidian : B.cobble) : B.cobble, true);
      return;
    }
    if (curInfo.fluid === kind && (curInfo.level ?? 0) >= level) return;
    this.world.setBlock(x, y, z, fluidId(kind, level), true);
  }

  private cell(kind: Kind, x: number, y: number, z: number): void {
    const max = FLUID_MAX[kind];
    const id = this.world.getBlock(x, y, z);
    // célula vazia: se algum vizinho deveria fluir pra cá, quem fez isso foi o vizinho; aqui só reavalia vizinhos
    if (!isFluid(id, kind)) {
      for (const [dx, dz] of DIRS) if (isFluid(this.world.getBlock(x + dx, y, z + dz), kind)) this.active[kind].add(key(x + dx, y, z + dz));
      if (isFluid(this.world.getBlock(x, y + 1, z), kind)) this.active[kind].add(key(x, y + 1, z));
      return;
    }
    const L = BLOCKS[id].level ?? 0;
    // fluido corrente sem fonte perde força
    if (L < max) {
      let expected = 0;
      if (isFluid(this.world.getBlock(x, y + 1, z), kind)) expected = max - 1;
      for (const [dx, dz] of DIRS) {
        const nl = this.level(kind, x + dx, y, z + dz);
        if (nl > 1 && !this.replaceable(x + dx, y - 1, z + dz)) expected = Math.max(expected, nl - 1);
        else if (nl === max && !this.replaceable(x + dx, y - 1, z + dz)) expected = Math.max(expected, max - 1);
      }
      if (expected < L) {
        this.world.setBlock(x, y, z, expected <= 0 ? B.air : fluidId(kind, expected), true);
        return;
      }
    }
    // cai
    if (y > 0 && this.replaceable(x, y - 1, z)) {
      this.put(kind, x, y - 1, z, max - 1);
      return;
    }
    const below = y > 0 ? this.world.getBlock(x, y - 1, z) : B.stone;
    if (isFluid(below, kind) && (BLOCKS[below].level ?? 0) < max - 1) {
      this.put(kind, x, y - 1, z, max - 1);
      return;
    }
    // espalha
    if (L > 1) {
      for (const [dx, dz] of DIRS) {
        const nx = x + dx;
        const nz = z + dz;
        if (!this.replaceable(nx, y, nz)) continue;
        const nl = this.level(kind, nx, y, nz);
        if (nl < L - 1) this.put(kind, nx, y, nz, L - 1);
      }
    }
  }
}
