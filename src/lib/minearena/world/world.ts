// Mundo em chunks: geração, malhas (só faces visíveis), edição de blocos e raycast.
import * as THREE from "three";
import { B, BLOCKS, type BlockKey, blockDef } from "../blocks/blocks";
import { BLOCK_TILES, tileIndex, tileUV } from "../blocks/tiles";
import { createAtlas } from "../textures/atlas";
import { CHUNK, WORLD_H } from "../config/config";
import { rand01 } from "./noise";
import { generateChunk } from "./worldgen";

export class Chunk {
  data: Uint8Array = new Uint8Array(CHUNK * CHUNK * WORLD_H);
  maxY = 0;
  meshO: THREE.Mesh | null = null;
  meshT: THREE.Mesh | null = null;
  needsMesh = true;
  constructor(
    public cx: number,
    public cz: number,
  ) {}
}

const ckey = (cx: number, cz: number) => ((cx & 0xffff) << 16) | (cz & 0xffff);
const idx = (x: number, y: number, z: number) => x + z * CHUNK + y * CHUNK * CHUNK;

// Faces: normal, 4 cantos em sentido anti-horário visto de fora, brilho fixo da face.
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.82 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.7 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.5 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.9 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.76 },
] as const;

/** UV do tile de cada face (0 lado +x… 2 topo, 3 base) por bloco. */
const FACE_UV = BLOCKS.map((b) => {
  const t = BLOCK_TILES[b.key as BlockKey];
  const side = tileUV(tileIndex(t[1]));
  return [side, side, tileUV(tileIndex(t[0])), tileUV(tileIndex(t[2])), side, side];
});

const AO_LEVEL = [0.52, 0.7, 0.85, 1];
const AO_BUF = [1, 1, 1, 1];

export interface RayHit {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  id: number;
  dist: number;
}

export class World {
  chunks = new Map<number, Chunk>();
  /** Blocos alterados pelo jogador: chave do chunk → (índice → id). Vai pro save. */
  mods = new Map<number, Map<number, number>>();
  readonly group = new THREE.Group();
  readonly matO: THREE.MeshBasicMaterial;
  readonly matT: THREE.MeshBasicMaterial;
  private atlas: THREE.CanvasTexture;
  private order: { cx: number; cz: number }[] = [];
  private lastPcx = Infinity;
  private lastPcz = Infinity;
  private lastR = -1;

  constructor(
    public seed: number,
    scene: THREE.Scene,
  ) {
    this.atlas = createAtlas();
    this.matO = new THREE.MeshBasicMaterial({ map: this.atlas, vertexColors: true, alphaTest: 0.5 });
    this.matT = new THREE.MeshBasicMaterial({ map: this.atlas, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    scene.add(this.group);
  }

  loadMods(saved: Record<string, number[]> | undefined): void {
    this.mods.clear();
    if (!saved) return;
    for (const [k, flat] of Object.entries(saved)) {
      const m = new Map<number, number>();
      for (let i = 0; i + 1 < flat.length; i += 2) m.set(flat[i], flat[i + 1]);
      this.mods.set(Number(k), m);
    }
  }
  exportMods(): Record<string, number[]> {
    const out: Record<string, number[]> = {};
    this.mods.forEach((m, k) => {
      const flat: number[] = [];
      m.forEach((id, i) => flat.push(i, id));
      if (flat.length) out[String(k)] = flat;
    });
    return out;
  }

  getBlock(x: number, y: number, z: number): number {
    if (y < 0 || y >= WORLD_H) return B.air;
    const ch = this.chunks.get(ckey(x >> 4, z >> 4));
    if (!ch) return B.air;
    return ch.data[idx(x & 15, y, z & 15)];
  }
  hasChunkAt(x: number, z: number): boolean {
    return this.chunks.has(ckey(x >> 4, z >> 4));
  }
  /** Chunk ainda não existe conta como sólido (ninguém atravessa o "vazio"). */
  isSolid(x: number, y: number, z: number): boolean {
    if (y < 0) return true;
    if (y >= WORLD_H) return false;
    const ch = this.chunks.get(ckey(x >> 4, z >> 4));
    if (!ch) return true;
    return blockDef(ch.data[idx(x & 15, y, z & 15)]).solid;
  }

  setBlock(x: number, y: number, z: number, id: number): void {
    if (y < 0 || y >= WORLD_H) return;
    const cx = x >> 4;
    const cz = z >> 4;
    const ch = this.chunks.get(ckey(cx, cz));
    if (!ch) return;
    const i = idx(x & 15, y, z & 15);
    ch.data[i] = id;
    if (y > ch.maxY) ch.maxY = Math.min(WORLD_H - 1, y + 1);
    const k = ckey(cx, cz);
    let m = this.mods.get(k);
    if (!m) this.mods.set(k, (m = new Map()));
    m.set(i, id);
    this.mesh(ch);
    const lx = x & 15;
    const lz = z & 15;
    if (lx === 0) this.remeshAt(cx - 1, cz);
    if (lx === 15) this.remeshAt(cx + 1, cz);
    if (lz === 0) this.remeshAt(cx, cz - 1);
    if (lz === 15) this.remeshAt(cx, cz + 1);
  }
  private remeshAt(cx: number, cz: number): void {
    const c = this.chunks.get(ckey(cx, cz));
    if (c) this.mesh(c);
  }

  private gen(cx: number, cz: number): void {
    const g = generateChunk(this.seed, cx, cz);
    const ch = new Chunk(cx, cz);
    ch.data = g.data;
    ch.maxY = g.maxY;
    const m = this.mods.get(ckey(cx, cz));
    if (m) {
      m.forEach((id, i) => {
        ch.data[i] = id;
        const y = Math.floor(i / (CHUNK * CHUNK));
        if (y >= ch.maxY) ch.maxY = Math.min(WORLD_H - 1, y + 1);
      });
    }
    this.chunks.set(ckey(cx, cz), ch);
  }

  /** Carrega/descarrega chunks em volta do jogador, respeitando um orçamento de tempo por quadro. */
  update(px: number, pz: number, radius: number, budgetMs: number): void {
    const pcx = Math.floor(px / CHUNK);
    const pcz = Math.floor(pz / CHUNK);
    if (pcx !== this.lastPcx || pcz !== this.lastPcz || radius !== this.lastR) {
      this.lastPcx = pcx;
      this.lastPcz = pcz;
      this.lastR = radius;
      const order: { cx: number; cz: number }[] = [];
      for (let dx = -radius - 1; dx <= radius + 1; dx++) for (let dz = -radius - 1; dz <= radius + 1; dz++) order.push({ cx: pcx + dx, cz: pcz + dz });
      order.sort((a, b) => (a.cx - pcx) ** 2 + (a.cz - pcz) ** 2 - ((b.cx - pcx) ** 2 + (b.cz - pcz) ** 2));
      this.order = order;
      for (const [k, ch] of this.chunks) {
        if (Math.max(Math.abs(ch.cx - pcx), Math.abs(ch.cz - pcz)) > radius + 2) {
          this.disposeMeshes(ch);
          this.chunks.delete(k);
        }
      }
    }
    const t0 = performance.now();
    for (const o of this.order) {
      if (performance.now() - t0 > budgetMs) break;
      let ch = this.chunks.get(ckey(o.cx, o.cz));
      if (!ch) {
        this.gen(o.cx, o.cz);
        ch = this.chunks.get(ckey(o.cx, o.cz));
        if (!ch) continue;
      }
      if (ch.needsMesh && Math.max(Math.abs(o.cx - pcx), Math.abs(o.cz - pcz)) <= radius) {
        if (this.chunks.has(ckey(o.cx + 1, o.cz)) && this.chunks.has(ckey(o.cx - 1, o.cz)) && this.chunks.has(ckey(o.cx, o.cz + 1)) && this.chunks.has(ckey(o.cx, o.cz - 1))) {
          this.mesh(ch);
        }
      }
    }
  }

  /** Todos os chunks num raio já têm malha? (tela de carregamento) */
  readyAround(px: number, pz: number, r: number): boolean {
    const pcx = Math.floor(px / CHUNK);
    const pcz = Math.floor(pz / CHUNK);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const ch = this.chunks.get(ckey(pcx + dx, pcz + dz));
        if (!ch || ch.needsMesh) return false;
      }
    }
    return true;
  }

  private disposeMeshes(ch: Chunk): void {
    for (const m of [ch.meshO, ch.meshT]) {
      if (!m) continue;
      this.group.remove(m);
      m.geometry.dispose();
    }
    ch.meshO = null;
    ch.meshT = null;
  }

  private mesh(ch: Chunk): void {
    this.disposeMeshes(ch);
    ch.needsMesh = false;
    const nE = this.chunks.get(ckey(ch.cx + 1, ch.cz));
    const nW = this.chunks.get(ckey(ch.cx - 1, ch.cz));
    const nS = this.chunks.get(ckey(ch.cx, ch.cz + 1));
    const nN = this.chunks.get(ckey(ch.cx, ch.cz - 1));
    const data = ch.data;

    // altura da superfície por coluna (pra escurecer cavernas)
    const hm = new Int16Array(CHUNK * CHUNK);
    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        let t = 0;
        for (let y = ch.maxY; y >= 0; y--) {
          const id = data[idx(x, y, z)];
          if (id !== 0 && (BLOCKS[id].opaque || BLOCKS[id].liquid)) {
            t = y;
            break;
          }
        }
        hm[x + z * CHUNK] = t;
      }
    }

    const get = (x: number, y: number, z: number): number => {
      if (y < 0) return 1;
      if (y >= WORLD_H) return 0;
      if (x < 0) return nW ? nW.data[idx(15, y, z)] : 1;
      if (x >= CHUNK) return nE ? nE.data[idx(0, y, z)] : 1;
      if (z < 0) return nN ? nN.data[idx(x, y, 15)] : 1;
      if (z >= CHUNK) return nS ? nS.data[idx(x, y, 0)] : 1;
      return data[idx(x, y, z)];
    };

    const po: number[] = [];
    const co: number[] = [];
    const uo: number[] = [];
    const io: number[] = [];
    const pt: number[] = [];
    const ct: number[] = [];
    const ut: number[] = [];
    const it: number[] = [];
    const wx0 = ch.cx * CHUNK;
    const wz0 = ch.cz * CHUNK;

    for (let y = 0; y <= ch.maxY; y++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const id = data[idx(x, y, z)];
          if (id === 0) continue;
          const def = BLOCKS[id];
          const P = def.blend ? pt : po;
          const C = def.blend ? ct : co;
          const UV = def.blend ? ut : uo;
          const I = def.blend ? it : io;
          const faceUV = FACE_UV[id];
          const jitter = 0.94 + rand01(this.seed, wx0 + x, y, wz0 + z) * 0.1;
          const hTop = hm[x + z * CHUNK];

          for (let f = 0; f < 6; f++) {
            const fd = FACES[f];
            const nid = get(x + fd.n[0], y + fd.n[1], z + fd.n[2]);
            if (nid === id) continue;
            const nd = BLOCKS[nid];
            if (nd.opaque) continue;
            if (def.liquid && f === 3) continue;
            // luz do céu: acima da superfície = claro; abaixo escurece com a profundidade
            const ny = y + fd.n[1];
            let light = 1;
            if (!def.glow) light = ny >= hTop ? 1 : Math.max(0.26, 1 - (hTop - ny) * 0.11);
            const k = fd.shade * jitter * light;
            const lowTop = def.liquid && get(x, y + 1, z) !== id;
            const base = P.length / 3;
            // oclusão ambiente: escurece cantos onde blocos se encontram
            const ao = AO_BUF;
            if (def.opaque) {
              const ax = f >> 1;
              const t1: number = ax === 0 ? 1 : 0;
              const t2: number = ax === 2 ? 1 : 2;
              const ox = x + fd.n[0];
              const oy = y + fd.n[1];
              const oz = z + fd.n[2];
              for (let v = 0; v < 4; v++) {
                const c = fd.c[v];
                const s1 = c[t1] === 1 ? 1 : -1;
                const s2 = c[t2] === 1 ? 1 : -1;
                const d1 = [t1 === 0 ? s1 : 0, t1 === 1 ? s1 : 0, t1 === 2 ? s1 : 0];
                const d2 = [t2 === 0 ? s2 : 0, t2 === 1 ? s2 : 0, t2 === 2 ? s2 : 0];
                const a = BLOCKS[get(ox + d1[0], oy + d1[1], oz + d1[2])].opaque ? 1 : 0;
                const b = BLOCKS[get(ox + d2[0], oy + d2[1], oz + d2[2])].opaque ? 1 : 0;
                const k2 = BLOCKS[get(ox + d1[0] + d2[0], oy + d1[1] + d2[1], oz + d1[2] + d2[2])].opaque ? 1 : 0;
                ao[v] = AO_LEVEL[a && b ? 0 : 3 - (a + b + k2)];
              }
            } else ao[0] = ao[1] = ao[2] = ao[3] = 1;
            for (let v = 0; v < 4; v++) {
              const c = fd.c[v];
              let vy: number = c[1];
              if (lowTop && vy === 1) vy = 0.88;
              P.push(x + c[0], y + vy, z + c[2]);
              C.push(k * ao[v], k * ao[v], k * ao[v]);
              const t = faceUV[f];
              let tu: number;
              let tv: number;
              switch (f) {
                case 0:
                  tu = 1 - c[2];
                  tv = c[1];
                  break;
                case 1:
                  tu = c[2];
                  tv = c[1];
                  break;
                case 2:
                  tu = c[0];
                  tv = c[2];
                  break;
                case 3:
                  tu = c[0];
                  tv = 1 - c[2];
                  break;
                case 4:
                  tu = c[0];
                  tv = c[1];
                  break;
                default:
                  tu = 1 - c[0];
                  tv = c[1];
              }
              UV.push(t[0] + tu * (t[2] - t[0]), t[1] + tv * (t[3] - t[1]));
            }
            if (ao[0] + ao[2] < ao[1] + ao[3]) I.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
            else I.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }

    const build = (pos: number[], colr: number[], uvs: number[], ind: number[], mat: THREE.Material): THREE.Mesh | null => {
      if (ind.length === 0) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
      g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colr), 3));
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(ind), 1));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.position.set(wx0, 0, wz0);
      this.group.add(m);
      return m;
    };
    ch.meshO = build(po, co, uo, io, this.matO);
    ch.meshT = build(pt, ct, ut, it, this.matT);
    if (ch.meshT) ch.meshT.renderOrder = 2;
  }

  /** Raio voxel (DDA). Ignora ar e líquidos. */
  raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number): RayHit | null {
    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);
    const sx = dx > 0 ? 1 : -1;
    const sy = dy > 0 ? 1 : -1;
    const sz = dz > 0 ? 1 : -1;
    const tdx = dx === 0 ? Infinity : Math.abs(1 / dx);
    const tdy = dy === 0 ? Infinity : Math.abs(1 / dy);
    const tdz = dz === 0 ? Infinity : Math.abs(1 / dz);
    let tx = dx === 0 ? Infinity : (dx > 0 ? x + 1 - ox : ox - x) * tdx;
    let ty = dy === 0 ? Infinity : (dy > 0 ? y + 1 - oy : oy - y) * tdy;
    let tz = dz === 0 ? Infinity : (dz > 0 ? z + 1 - oz : oz - z) * tdz;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    let t = 0;
    for (let i = 0; i < 64 && t <= maxDist; i++) {
      const id = this.getBlock(x, y, z);
      if (id !== 0 && !BLOCKS[id].liquid) return { x, y, z, nx, ny, nz, id, dist: t };
      if (tx < ty && tx < tz) {
        x += sx;
        t = tx;
        tx += tdx;
        nx = -sx;
        ny = 0;
        nz = 0;
      } else if (ty < tz) {
        y += sy;
        t = ty;
        ty += tdy;
        nx = 0;
        ny = -sy;
        nz = 0;
      } else {
        z += sz;
        t = tz;
        tz += tdz;
        nx = 0;
        ny = 0;
        nz = -sz;
      }
    }
    return null;
  }

  /** Altura do primeiro sólido de cima pra baixo numa coluna (ou -1). */
  surfaceY(x: number, z: number): number {
    for (let y = WORLD_H - 1; y >= 0; y--) if (this.isSolid(x, y, z)) return y;
    return -1;
  }

  dispose(): void {
    for (const ch of this.chunks.values()) this.disposeMeshes(ch);
    this.chunks.clear();
    this.group.removeFromParent();
    this.matO.dispose();
    this.matT.dispose();
    this.atlas.dispose();
  }
}
