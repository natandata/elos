// Missão Madureira: dados do mapa (gerado por scripts/missao-build-map.py) e colisão. Client-safe, sem DOM.
// Metros, plano local: x = leste, z = sul (no three.js o norte é -z). Origem = lote da PIB de Madureira.

export type Bld = {
  /** contorno [x0,z0,x1,z1,...] (sentido anti-horário visto de cima no plano x/z) */
  p: number[];
  /** altura (m) */
  h: number;
  /** 0 edificação, 1 galpão, 2 telheiro, 3 marquise, 4 casa de máquina, 5 caixa d'água */
  k: number;
  /** começa no alto (em cima de outra construção) */
  y?: number;
  /** ponto marcante */
  m?: "church" | "mercadao";
};

export type Road = { c: number[]; w: number; k: string; n?: string; o?: 1; b?: 1 };

export type MapData = {
  v: number;
  attr: string;
  origin: [number, number];
  bounds: [number, number, number, number];
  spawn: { x: number; z: number; yaw: number; front?: [number, number] };
  landmarks: Record<"estacao" | "viaduto" | "mercadao" | "parque" | "igreja", [number, number]>;
  churchLot: number[];
  blocks: number[][];
  bld: Bld[];
  roads: Road[];
  rails: { c: number[]; b?: 1 }[];
  platforms: number[][];
  parks: number[][];
  grass: number[][];
  water: number[][];
  trees: [number, number][];
  towers: [number, number][];
  plines: number[][];
};

export const MAP_URL = "/missao/map.json";

export async function loadMap(): Promise<MapData> {
  const r = await fetch(MAP_URL);
  if (!r.ok) throw new Error("mapa");
  return (await r.json()) as MapData;
}

export const pts = (flat: number[]): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
};

export function pointInPoly(x: number, z: number, flat: number[]): boolean {
  let c = false;
  const n = flat.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = flat[i * 2];
    const zi = flat[i * 2 + 1];
    const xj = flat[j * 2];
    const zj = flat[j * 2 + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi) c = !c;
  }
  return c;
}

// ------------------------------------------------------------------ colisão (paredes em grade)

type Seg = { ax: number; az: number; bx: number; bz: number; poly: number };

const CELL = 8;

/** Grade de paredes: o jogador e os pedestres não atravessam prédios, plataformas nem água. */
export class Collider {
  private cells = new Map<number, Seg[]>();
  private polys: number[][] = [];
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;

  constructor(map: MapData) {
    [this.x0, this.z0, this.x1, this.z1] = map.bounds;
    const solids: number[][] = [];
    for (const b of map.bld) if ((b.k === 0 || b.k === 1) && !b.y && b.h >= 2) solids.push(b.p);
    for (const p of map.platforms) solids.push(p);
    for (const w of map.water) solids.push(w);
    for (const p of solids) this.addPoly(p);
  }

  private key(cx: number, cz: number) {
    return cx * 4096 + cz;
  }

  private addPoly(flat: number[]) {
    const id = this.polys.length;
    this.polys.push(flat);
    const n = flat.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const s: Seg = { ax: flat[i * 2], az: flat[i * 2 + 1], bx: flat[j * 2], bz: flat[j * 2 + 1], poly: id };
      const cx0 = Math.floor(Math.min(s.ax, s.bx) / CELL);
      const cx1 = Math.floor(Math.max(s.ax, s.bx) / CELL);
      const cz0 = Math.floor(Math.min(s.az, s.bz) / CELL);
      const cz1 = Math.floor(Math.max(s.az, s.bz) / CELL);
      for (let cx = cx0; cx <= cx1; cx++)
        for (let cz = cz0; cz <= cz1; cz++) {
          const k = this.key(cx + 2048, cz + 2048);
          const list = this.cells.get(k);
          if (list) list.push(s);
          else this.cells.set(k, [s]);
        }
    }
  }

  private near(x: number, z: number): Seg[] {
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    const out: Seg[] = [];
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) {
        const l = this.cells.get(this.key(cx + i + 2048, cz + j + 2048));
        if (l) for (const s of l) out.push(s);
      }
    return out;
  }

  /** Está dentro de alguma parede? */
  inside(x: number, z: number): boolean {
    const seen = new Set<number>();
    for (const s of this.near(x, z)) {
      if (seen.has(s.poly)) continue;
      seen.add(s.poly);
      if (pointInPoly(x, z, this.polys[s.poly])) return true;
    }
    return false;
  }

  /** Empurra um círculo (x, z, raio) para fora das paredes. Devolve a posição corrigida. */
  resolve(x: number, z: number, r: number): [number, number] {
    for (let it = 0; it < 3; it++) {
      let moved = false;
      const segs = this.near(x, z);
      // dentro de um polígono (passou rápido demais): sai pela parede mais perto
      const seen = new Set<number>();
      for (const s of segs) {
        if (seen.has(s.poly)) continue;
        seen.add(s.poly);
        if (!pointInPoly(x, z, this.polys[s.poly])) continue;
        let best: [number, number] | null = null;
        let bd = 1e9;
        for (const t of segs) {
          if (t.poly !== s.poly) continue;
          const [qx, qz] = closest(x, z, t);
          const d = Math.hypot(qx - x, qz - z);
          if (d < bd) {
            bd = d;
            best = [qx, qz];
          }
        }
        if (best) {
          const dx = best[0] - x;
          const dz = best[1] - z;
          const L = Math.hypot(dx, dz) || 1;
          x = best[0] + (dx / L) * r;
          z = best[1] + (dz / L) * r;
          moved = true;
        }
      }
      for (const s of segs) {
        const [qx, qz] = closest(x, z, s);
        const dx = x - qx;
        const dz = z - qz;
        const d = Math.hypot(dx, dz);
        if (d < r && d > 1e-6) {
          x = qx + (dx / d) * r;
          z = qz + (dz / d) * r;
          moved = true;
        }
      }
      if (!moved) break;
    }
    x = Math.min(this.x1 - 1, Math.max(this.x0 + 1, x));
    z = Math.min(this.z1 - 1, Math.max(this.z0 + 1, z));
    return [x, z];
  }

  /** Linha livre entre dois pontos? (para a câmera não entrar em prédios) */
  firstHit(ax: number, az: number, bx: number, bz: number): number {
    // amostra a linha: devolve a fração (0–1) do primeiro ponto dentro de parede, ou 1
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(2, Math.ceil(L / 0.5));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (this.inside(ax + (bx - ax) * t, az + (bz - az) * t)) return (i - 1) / n;
    }
    return 1;
  }
}

function closest(x: number, z: number, s: Seg): [number, number] {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / L2));
  return [s.ax + dx * t, s.az + dz * t];
}

// ------------------------------------------------------------------ calçadas (caminhos dos pedestres)

export type Lane = { pts: [number, number][]; len: number };

const LANE_ROADS = new Set(["primary", "secondary", "tertiary", "residential", "unclassified", "living_street", "pedestrian", "footway", "service", "primary_link", "secondary_link"]);

/** Linhas paralelas às ruas, na calçada (um lado e outro), onde os pedestres caminham. */
export function buildLanes(map: MapData, col: Collider): Lane[] {
  const lanes: Lane[] = [];
  for (const r of map.roads) {
    if (!LANE_ROADS.has(r.k) || r.b) continue;
    const p = pts(r.c);
    if (p.length < 2) continue;
    const sides = r.k === "footway" || r.k === "pedestrian" ? [0] : [-1, 1];
    for (const side of sides) {
      const off = side * (r.w / 2 + 1.3);
      const out: [number, number][] = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[Math.max(0, i - 1)];
        const b = p[Math.min(p.length - 1, i + 1)];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const L = Math.hypot(dx, dz) || 1;
        const nx = -dz / L;
        const nz = dx / L;
        const q: [number, number] = [p[i][0] + nx * off, p[i][1] + nz * off];
        if (!col.inside(q[0], q[1])) out.push(q);
      }
      if (out.length < 2) continue;
      let len = 0;
      for (let i = 1; i < out.length; i++) len += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
      if (len > 12) lanes.push({ pts: out, len });
    }
  }
  return lanes;
}

/** Distância (m) até a rua mais próxima de uma das classes (para saber se a fachada é comercial). */
export function roadIndex(map: MapData, kinds: Set<string>) {
  const segs: [number, number, number, number][] = [];
  for (const r of map.roads) {
    if (!kinds.has(r.k)) continue;
    const p = pts(r.c);
    for (let i = 1; i < p.length; i++) segs.push([p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]]);
  }
  const grid = new Map<number, number[]>();
  const C = 20;
  segs.forEach((s, i) => {
    for (let cx = Math.floor(Math.min(s[0], s[2]) / C); cx <= Math.floor(Math.max(s[0], s[2]) / C); cx++)
      for (let cz = Math.floor(Math.min(s[1], s[3]) / C); cz <= Math.floor(Math.max(s[1], s[3]) / C); cz++) {
        const k = (cx + 2048) * 4096 + cz + 2048;
        const l = grid.get(k);
        if (l) l.push(i);
        else grid.set(k, [i]);
      }
  });
  return (x: number, z: number): number => {
    const cx = Math.floor(x / C);
    const cz = Math.floor(z / C);
    let best = 1e9;
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) {
        const l = grid.get((cx + i + 2048) * 4096 + cz + j + 2048);
        if (!l) continue;
        for (const id of l) {
          const s = segs[id];
          const [qx, qz] = closest(x, z, { ax: s[0], az: s[1], bx: s[2], bz: s[3], poly: 0 });
          best = Math.min(best, Math.hypot(qx - x, qz - z));
        }
      }
    return best;
  };
}
