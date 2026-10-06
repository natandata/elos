// Mundo em chunks: geração, malhas (só faces visíveis), edição de blocos e raycast.
import * as THREE from "three";
import { B, BLOCKS, type BlockKey, blockDef } from "../blocks/blocks";
import { BLOCK_TILES, tileIndex, tileUV } from "../blocks/tiles";
import { createAtlas } from "../textures/atlas";
import { CHUNK, WORLD_H } from "../config/config";
import type { LootTable } from "../structures/loot";
import type { LandmarkSite } from "../structures/landmarks";
import { generateChunk } from "./worldgen";
import { generateGeena } from "./geena";

export class Chunk {
  data: Uint8Array = new Uint8Array(CHUNK * CHUNK * WORLD_H);
  maxY = 0;
  meshO: THREE.Mesh | null = null;
  meshT: THREE.Mesh | null = null;
  needsMesh = true;
  /** Tochas deste chunk: x, y, z locais (de 3 em 3). */
  torches: number[] = [];
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
  const front = t[3] ? tileUV(tileIndex(t[3])) : side;
  return [side, side, tileUV(tileIndex(t[0])), tileUV(tileIndex(t[2])), front, side];
});

const AO_LEVEL = [0.52, 0.7, 0.85, 1];
const AO_BUF = [1, 1, 1, 1];

const LAYER = CHUNK * CHUNK;
const OPQ = new Uint8Array(256);
const LIQ = new Uint8Array(256);
const BLEND = new Uint8Array(256);
const GLOW = new Uint8Array(256);
const CROSS = new Uint8Array(256);
const FLUID = new Uint8Array(256);
const LEVEL = new Uint8Array(256);
for (const b of BLOCKS) {
  OPQ[b.id] = b.opaque ? 1 : 0;
  LIQ[b.id] = b.liquid ? 1 : 0;
  BLEND[b.id] = b.blend ? 1 : 0;
  GLOW[b.id] = b.glow ? 1 : 0;
  CROSS[b.id] = b.shape === "cross" ? 1 : 0;
  FLUID[b.id] = b.fluid === "water" ? 1 : b.fluid === "lava" ? 2 : 0;
  LEVEL[b.id] = b.level ?? 0;
}
const CROSS_PLANES = [
  [[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]],
  [[0, 0, 1], [1, 0, 0], [1, 1, 0], [0, 1, 1]],
];
/** Fração (u,v) do tile de cada canto de cada face. */
const FACE_TUV = FACES.map((fd, f) =>
  fd.c.map((c) => {
    switch (f) {
      case 0:
        return [1 - c[2], c[1]];
      case 1:
        return [c[2], c[1]];
      case 2:
        return [c[0], c[2]];
      case 3:
        return [c[0], 1 - c[2]];
      case 4:
        return [c[0], c[1]];
      default:
        return [1 - c[0], c[1]];
    }
  }),
);
const HM_BUF = new Int16Array(CHUNK * CHUNK);

/** Buffer de malha reaproveitado entre chunks (evita alocar milhares de números por malha). */
class MeshBuf {
  pos = new Float32Array(24000);
  col = new Float32Array(24000);
  uv = new Float32Array(16000);
  ind = new Uint32Array(36000);
  vcount = 0;
  icount = 0;
  reset(): void {
    this.vcount = 0;
    this.icount = 0;
  }
  private grow(): void {
    const g = <T extends Float32Array | Uint32Array>(a: T): T => {
      const n = new (a.constructor as new (n: number) => T)(a.length * 2);
      n.set(a);
      return n;
    };
    this.pos = g(this.pos);
    this.col = g(this.col);
    this.uv = g(this.uv);
    this.ind = g(this.ind);
  }
  vertex(x: number, y: number, z: number, r: number, g: number, b: number, u: number, v: number): void {
    if ((this.vcount + 1) * 3 > this.pos.length || (this.vcount + 1) * 2 > this.uv.length || this.icount + 6 > this.ind.length) this.grow();
    const i = this.vcount * 3;
    this.pos[i] = x;
    this.pos[i + 1] = y;
    this.pos[i + 2] = z;
    this.col[i] = r;
    this.col[i + 1] = g;
    this.col[i + 2] = b;
    this.uv[this.vcount * 2] = u;
    this.uv[this.vcount * 2 + 1] = v;
    this.vcount++;
  }
  quad(base: number, flip: boolean): void {
    if (this.icount + 6 > this.ind.length) this.grow();
    const a = this.ind;
    let i = this.icount;
    if (flip) {
      a[i++] = base + 1;
      a[i++] = base + 2;
      a[i++] = base + 3;
      a[i++] = base + 1;
      a[i++] = base + 3;
      a[i++] = base;
    } else {
      a[i++] = base;
      a[i++] = base + 1;
      a[i++] = base + 2;
      a[i++] = base;
      a[i++] = base + 2;
      a[i++] = base + 3;
    }
    this.icount = i;
  }
}
const BUF_O = new MeshBuf();
const BUF_T = new MeshBuf();

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
  /** Baús de estrutura ainda não abertos: "x,y,z" → tabela de saque. */
  lootChests = new Map<string, LootTable>();
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
    readonly dimension: "overworld" | "geena" = "overworld",
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

  /** Co-op: avisa os outros jogadores de um bloco alterado aqui. */
  onLocalSet: ((x: number, y: number, z: number, id: number) => void) | null = null;
  private netMute = false;

  /** Aplica um bloco vindo de outro jogador (sem reenviar). Se o chunk ainda não existe, guarda pra quando nascer. */
  setBlockRemote(x: number, y: number, z: number, id: number): void {
    if (y < 0 || y >= WORLD_H) return;
    const cx = x >> 4;
    const cz = z >> 4;
    if (this.chunks.has(ckey(cx, cz))) {
      this.netMute = true;
      this.setBlock(x, y, z, id, true);
      this.netMute = false;
      return;
    }
    const k = ckey(cx, cz);
    let m = this.mods.get(k);
    if (!m) this.mods.set(k, (m = new Map()));
    m.set(idx(x & 15, y, z & 15), id);
  }

  /** Chamado a cada bloco alterado (a simulação de fluidos escuta aqui). */
  onChange: ((x: number, y: number, z: number) => void) | null = null;

  /** `defer`: não remonta a malha na hora (a atualização do mundo remonta em lote). */
  setBlock(x: number, y: number, z: number, id: number, defer = false): void {
    if (y < 0 || y >= WORLD_H) return;
    const cx = x >> 4;
    const cz = z >> 4;
    const ch = this.chunks.get(ckey(cx, cz));
    if (!ch) return;
    const i = idx(x & 15, y, z & 15);
    const prev = ch.data[i];
    ch.data[i] = id;
    if (prev === B.torch || id === B.torch) {
      const tl = ch.torches;
      for (let t = 0; t < tl.length; t += 3) {
        if (tl[t] === (x & 15) && tl[t + 1] === y && tl[t + 2] === (z & 15)) {
          tl.splice(t, 3);
          break;
        }
      }
      if (id === B.torch) tl.push(x & 15, y, z & 15);
      for (let ddx = -1; ddx <= 1; ddx++) for (let ddz = -1; ddz <= 1; ddz++) { const n = this.chunks.get(ckey(cx + ddx, cz + ddz)); if (n) n.needsMesh = true; }
    }
    if (y > ch.maxY) ch.maxY = Math.min(WORLD_H - 1, y + 1);
    const k = ckey(cx, cz);
    let m = this.mods.get(k);
    if (!m) this.mods.set(k, (m = new Map()));
    m.set(i, id);
    const lx = x & 15;
    const lz = z & 15;
    if (defer) {
      ch.needsMesh = true;
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        if ((dx === -1 && lx === 0) || (dx === 1 && lx === 15) || (dz === -1 && lz === 0) || (dz === 1 && lz === 15)) {
          const n = this.chunks.get(ckey(cx + dx, cz + dz));
          if (n) n.needsMesh = true;
        }
      }
    } else {
      this.mesh(ch);
      if (lx === 0) this.remeshAt(cx - 1, cz);
      if (lx === 15) this.remeshAt(cx + 1, cz);
      if (lz === 0) this.remeshAt(cx, cz - 1);
      if (lz === 15) this.remeshAt(cx, cz + 1);
    }
    this.onChange?.(x, y, z);
    if (!this.netMute) this.onLocalSet?.(x, y, z, id);
  }
  private remeshAt(cx: number, cz: number): void {
    const c = this.chunks.get(ckey(cx, cz));
    if (c) this.mesh(c);
  }

  /** Tempos de geração e malha (ms) — pra ajustar o desempenho. */
  readonly stats = { genMs: 0, genN: 0, genMax: 0, meshMs: 0, meshN: 0, meshMax: 0 };

  /** Monumentos bíblicos plantados neste mundo (o terreno é gerado a partir deles). */
  landmarks: LandmarkSite[] = [];

  private gen(cx: number, cz: number): void {
    const t0 = performance.now();
    const g = this.dimension === "geena" ? generateGeena(this.seed, cx, cz) : generateChunk(this.seed, cx, cz, this.landmarks);
    for (const c of g.chests) this.lootChests.set(`${c.x},${c.y},${c.z}`, c.table);
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
    for (let t = 0; t < ch.data.length; t++) {
      if (ch.data[t] === B.torch) ch.torches.push(t % CHUNK, Math.floor(t / (CHUNK * CHUNK)), Math.floor(t / CHUNK) % CHUNK);
    }
    this.chunks.set(ckey(cx, cz), ch);
    if (ch.torches.length) for (let ddx = -1; ddx <= 1; ddx++) for (let ddz = -1; ddz <= 1; ddz++) { const n = this.chunks.get(ckey(cx + ddx, cz + ddz)); if (n && n !== ch) n.needsMesh = true; }
    const dt = performance.now() - t0;
    this.stats.genMs += dt;
    this.stats.genN++;
    this.stats.genMax = Math.max(this.stats.genMax, dt);
  }

  /** Carrega/descarrega chunks em volta do jogador, respeitando um orçamento de tempo por quadro. */
  update(px: number, pz: number, radius: number, budgetMs: number, maxOps = 99): void {
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
    let ops = 0;
    for (const o of this.order) {
      if (ops >= maxOps || performance.now() - t0 > budgetMs) break;
      let ch = this.chunks.get(ckey(o.cx, o.cz));
      if (!ch) {
        this.gen(o.cx, o.cz);
        ops++;
        ch = this.chunks.get(ckey(o.cx, o.cz));
        if (!ch) continue;
      }
      if (ch.needsMesh && Math.max(Math.abs(o.cx - pcx), Math.abs(o.cz - pcz)) <= radius) {
        if (this.chunks.has(ckey(o.cx + 1, o.cz)) && this.chunks.has(ckey(o.cx - 1, o.cz)) && this.chunks.has(ckey(o.cx, o.cz + 1)) && this.chunks.has(ckey(o.cx, o.cz - 1))) {
          this.mesh(ch);
          ops++;
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
    const t0 = performance.now();
    this.meshImpl(ch);
    const dt = performance.now() - t0;
    this.stats.meshMs += dt;
    this.stats.meshN++;
    this.stats.meshMax = Math.max(this.stats.meshMax, dt);
  }

  /** Oclusão ambiente ligada? (desligar poupa CPU no celular) */
  private ao = true;
  setAO(on: boolean): void {
    if (on === this.ao) return;
    this.ao = on;
    for (const c of this.chunks.values()) c.needsMesh = true;
  }

  private meshImpl(ch: Chunk): void {
    this.disposeMeshes(ch);
    ch.needsMesh = false;
    const nE = this.chunks.get(ckey(ch.cx + 1, ch.cz));
    const nW = this.chunks.get(ckey(ch.cx - 1, ch.cz));
    const nS = this.chunks.get(ckey(ch.cx, ch.cz + 1));
    const nN = this.chunks.get(ckey(ch.cx, ch.cz - 1));
    const data = ch.data;
    const maxY = ch.maxY;
    const geena = this.dimension === "geena";
    const ao = this.ao;

    // altura da superfície por coluna (pra escurecer cavernas)
    const hm = HM_BUF;
    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        let t = 0;
        for (let y = maxY; y >= 0; y--) {
          const id = data[x + z * CHUNK + y * LAYER];
          if (id !== 0 && (OPQ[id] === 1 || LIQ[id] === 1)) {
            t = y;
            break;
          }
        }
        hm[x + z * CHUNK] = t;
      }
    }

    /** Bloco em (x,y,z) locais (pode sair do chunk). */
    const get = (x: number, y: number, z: number): number => {
      if (y < 0) return 1;
      if (y >= WORLD_H) return 0;
      if (x < 0) return nW ? nW.data[15 + z * CHUNK + y * LAYER] : 1;
      if (x >= CHUNK) return nE ? nE.data[z * CHUNK + y * LAYER] : 1;
      if (z < 0) return nN ? nN.data[x + 15 * CHUNK + y * LAYER] : 1;
      if (z >= CHUNK) return nS ? nS.data[x + y * LAYER] : 1;
      return data[x + z * CHUNK + y * LAYER];
    };

    const bo = BUF_O;
    const bt = BUF_T;
    bo.reset();
    bt.reset();
    const wx0 = ch.cx * CHUNK;
    const wz0 = ch.cz * CHUNK;
    const aoV = AO_BUF;
    // luz das tochas (deste chunk e dos vizinhos), em coordenadas relativas a este chunk
    const torches: number[] = [];
    for (let ddx = -1; ddx <= 1; ddx++) {
      for (let ddz = -1; ddz <= 1; ddz++) {
        const c = ddx === 0 && ddz === 0 ? ch : this.chunks.get(ckey(ch.cx + ddx, ch.cz + ddz));
        if (!c || c.torches.length === 0) continue;
        for (let t = 0; t < c.torches.length; t += 3) torches.push(c.torches[t] + ddx * CHUNK, c.torches[t + 1], c.torches[t + 2] + ddz * CHUNK);
      }
    }
    const nT = torches.length;
    const torchLight = (px: number, py: number, pz: number): number => {
      let m = 0;
      for (let t = 0; t < nT; t += 3) {
        const d = Math.abs(torches[t] - px) + Math.abs(torches[t + 1] - py) + Math.abs(torches[t + 2] - pz);
        if (d < 9) {
          const l = 1 - d / 9;
          if (l > m) m = l;
        }
      }
      return m;
    };

    for (let y = 0; y <= maxY; y++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const i0 = x + z * CHUNK + y * LAYER;
          const id = data[i0];
          if (id === 0) continue;
          const inner = x > 0 && x < 15 && z > 0 && z < 15 && y > 0 && y < WORLD_H - 1;
          // bloco opaco totalmente cercado: nada a desenhar
          if (OPQ[id] === 1 && inner && OPQ[data[i0 + 1]] === 1 && OPQ[data[i0 - 1]] === 1 && OPQ[data[i0 + CHUNK]] === 1 && OPQ[data[i0 - CHUNK]] === 1 && OPQ[data[i0 + LAYER]] === 1 && OPQ[data[i0 - LAYER]] === 1) continue;

          const out = BLEND[id] === 1 ? bt : bo;
          const faceUV = FACE_UV[id];
          const jitter = 0.94 + (((x + wx0) * 73856093 ^ y * 19349663 ^ (z + wz0) * 83492791) & 255) / 2550;
          const hTop = hm[x + z * CHUNK];
          const glow = GLOW[id] === 1;

          if (CROSS[id] === 1) {
            const t = faceUV[0];
            let light = glow ? 1 : y >= hTop ? 1 : Math.max(0.3, 1 - (hTop - y) * 0.11);
            let warm = 0;
            if (nT && !glow) {
              const tl = torchLight(x, y, z);
              if (tl > 0 && 0.35 + 0.65 * tl > light) {
                warm = Math.min(1, (0.35 + 0.65 * tl - light) * 2 + 0.2);
                light = 0.35 + 0.65 * tl;
              }
            }
            const k = jitter * light;
            const wg = 1 - 0.12 * warm;
            const wb = 1 - 0.32 * warm;
            for (let pl = 0; pl < 2; pl++) {
              const cs = CROSS_PLANES[pl];
              for (let flip = 0; flip < 2; flip++) {
                const base = out.vcount;
                for (let q = 0; q < 4; q++) {
                  const j = flip ? 3 - q : q;
                  out.vertex(x + cs[j][0], y + cs[j][1] * 0.95, z + cs[j][2], k, k * wg, k * wb, j === 1 || j === 2 ? t[2] : t[0], j >= 2 ? t[3] : t[1]);
                }
                out.quad(base, false);
              }
            }
            continue;
          }

          const fl = FLUID[id];
          const opaque = OPQ[id] === 1;
          for (let f = 0; f < 6; f++) {
            const fd = FACES[f];
            const nx = x + fd.n[0];
            const ny = y + fd.n[1];
            const nz = z + fd.n[2];
            const nid = inner ? data[nx + nz * CHUNK + ny * LAYER] : get(nx, ny, nz);
            if (nid === id || (fl !== 0 && FLUID[nid] === fl)) continue;
            if (OPQ[nid] === 1) continue;
            if (LIQ[id] === 1 && f === 3) continue;
            let light = 1;
            if (!glow) light = geena ? 0.78 : ny >= hTop ? 1 : Math.max(0.26, 1 - (hTop - ny) * 0.11);
            let warm = 0;
            if (nT && !glow) {
              const tl = torchLight(nx, ny, nz);
              if (tl > 0 && 0.35 + 0.65 * tl > light) {
                warm = Math.min(1, (0.35 + 0.65 * tl - light) * 2 + 0.2);
                light = 0.35 + 0.65 * tl;
              }
            }
            const wg = 1 - 0.12 * warm;
            const wb = 1 - 0.32 * warm;
            const k = fd.shade * jitter * light;
            let fluidTop = 1;
            if (LIQ[id] === 1) {
              const above = get(x, y + 1, z);
              if (!(fl !== 0 && FLUID[above] === fl)) fluidTop = Math.max(0.12, (LEVEL[id] / (fl === 1 ? 8 : 4)) * 0.88);
            }
            // oclusão ambiente: escurece cantos onde blocos se encontram
            if (ao && opaque) {
              const ax = f >> 1;
              const t1: number = ax === 0 ? 1 : 0;
              const t2: number = ax === 2 ? 1 : 2;
              for (let v = 0; v < 4; v++) {
                const c = fd.c[v];
                const s1 = c[t1] === 1 ? 1 : -1;
                const s2 = c[t2] === 1 ? 1 : -1;
                const ox1 = nx + (t1 === 0 ? s1 : 0);
                const oy1 = ny + (t1 === 1 ? s1 : 0);
                const oz1 = nz + (t1 === 2 ? s1 : 0);
                const ox2 = nx + (t2 === 0 ? s2 : 0);
                const oy2 = ny + (t2 === 1 ? s2 : 0);
                const oz2 = nz + (t2 === 2 ? s2 : 0);
                const a1 = OPQ[get(ox1, oy1, oz1)];
                const a2 = OPQ[get(ox2, oy2, oz2)];
                const k2 = OPQ[get(ox1 + ox2 - nx, oy1 + oy2 - ny, oz1 + oz2 - nz)];
                aoV[v] = AO_LEVEL[a1 && a2 ? 0 : 3 - (a1 + a2 + k2)];
              }
            } else aoV[0] = aoV[1] = aoV[2] = aoV[3] = 1;
            const base = out.vcount;
            const t = faceUV[f];
            const tuv = FACE_TUV[f];
            for (let v = 0; v < 4; v++) {
              const c = fd.c[v];
              const vy = fluidTop < 1 && c[1] === 1 ? fluidTop : c[1];
              const kk = k * aoV[v];
              out.vertex(x + c[0], y + vy, z + c[2], kk, kk * wg, kk * wb, t[0] + tuv[v][0] * (t[2] - t[0]), t[1] + tuv[v][1] * (t[3] - t[1]));
            }
            out.quad(base, aoV[0] + aoV[2] < aoV[1] + aoV[3]);
          }
        }
      }
    }

    const build = (buf: MeshBuf, mat: THREE.Material): THREE.Mesh | null => {
      if (buf.icount === 0) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(buf.pos.slice(0, buf.vcount * 3), 3));
      g.setAttribute("color", new THREE.BufferAttribute(buf.col.slice(0, buf.vcount * 3), 3));
      g.setAttribute("uv", new THREE.BufferAttribute(buf.uv.slice(0, buf.vcount * 2), 2));
      g.setIndex(new THREE.BufferAttribute(buf.ind.slice(0, buf.icount), 1));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.position.set(wx0, 0, wz0);
      this.group.add(m);
      return m;
    };
    ch.meshO = build(bo, this.matO);
    ch.meshT = build(bt, this.matT);
    if (ch.meshT) ch.meshT.renderOrder = 2;
  }

  /** Raio voxel (DDA). Ignora ar e líquidos. */
  raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number, includeLiquid = false): RayHit | null {
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
      if (id !== 0 && (includeLiquid || !BLOCKS[id].liquid)) return { x, y, z, nx, ny, nz, id, dist: t };
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
