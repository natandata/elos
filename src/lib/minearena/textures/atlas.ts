// Texturas pixeladas 16×16 geradas por código (sem arquivos de imagem): atlas dos blocos, rachaduras e ícones.
import * as THREE from "three";
import { BLOCK_TILES, ATLAS_COLS, ATLAS_ROWS, TILE_NAMES, TILE_PX, type TileName, tileIndex } from "../blocks/tiles";
import { BLOCK_BY_KEY, type BlockKey } from "../blocks/blocks";
import { hashInt } from "../world/noise";

type RGB = [number, number, number];
const hex = (n: number): RGB => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const mul = (c: RGB, k: number): RGB => [clamp(c[0] * k), clamp(c[1] * k), clamp(c[2] * k)];
const rnd = (x: number, y: number, s: number) => hashInt(s, x, y, 7) / 4294967296;

type Put = (x: number, y: number, c: RGB, a?: number) => void;
const N = TILE_PX;

function noiseFill(put: Put, base: RGB, amp: number, seed: number) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) put(x, y, mul(base, 1 + (rnd(x, y, seed) - 0.5) * amp));
}
/** Manchas maiores (blocos 3×3) pra dar relevo à pedra e à terra. */
const blotch = (x: number, y: number, s: number) => rnd(Math.floor(x / 3), Math.floor(y / 3), s + 50) - 0.5;

function drawTile(name: TileName, put: Put): void {
  const s = tileIndex(name) * 17 + 3;
  switch (name) {
    case "grass_top": {
      noiseFill(put, hex(0x5da13a), 0.3, s);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (rnd(x, y, s + 1) < 0.1) put(x, y, hex(0x86c24f));
      break;
    }
    case "dirt":
    case "grass_side":
    case "snow_side": {
      const base = hex(0x7b5a33);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          let k = 1 + (rnd(x, y, s) - 0.5) * 0.25 + blotch(x, y, s) * 0.18;
          if (rnd(x, y, s + 2) < 0.1) k *= 0.7;
          let c = mul(base, k);
          if (rnd(x, y, s + 3) < 0.04) c = hex(0xa88960);
          put(x, y, c);
        }
      }
      if (name !== "dirt") {
        const top = name === "grass_side" ? hex(0x5da13a) : hex(0xf2f6fa);
        for (let x = 0; x < N; x++) {
          const depth = 3 + Math.floor(rnd(x, 0, s + 4) * 3);
          for (let y = 0; y < depth; y++) put(x, y, mul(top, 1 + (rnd(x, y, s + 5) - 0.5) * (name === "grass_side" ? 0.3 : 0.08)));
        }
      }
      break;
    }
    case "stone": {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) put(x, y, mul(hex(0x7d7d80), 1 + (rnd(x, y, s) - 0.5) * 0.14 + blotch(x, y, s) * 0.2));
      break;
    }
    case "cobble": {
      noiseFill(put, hex(0x4a4a4e), 0.12, s);
      const rows = [0, 5, 10];
      rows.forEach((r0, ri) => {
        const off = ri % 2 ? 4 : 0;
        for (let cx = -off; cx < N; cx += 8) {
          const col = mul(hex(0x7d7d80), 0.85 + rnd(cx, r0, s + 6) * 0.35);
          for (let y = r0 + 1; y < Math.min(N, r0 + 5); y++)
            for (let x = Math.max(0, cx + 1); x < Math.min(N, cx + 8); x++) put(x, y, mul(col, 1 + (rnd(x, y, s + 7) - 0.5) * 0.15));
        }
      });
      break;
    }
    case "sand":
    case "sandstone_top": {
      noiseFill(put, hex(name === "sand" ? 0xe3d398 : 0xd8c27e), 0.14, s);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (rnd(x, y, s + 1) < 0.07) put(x, y, hex(0xbfae74));
      break;
    }
    case "sandstone_side": {
      noiseFill(put, hex(0xd8c27e), 0.1, s);
      for (let y = 0; y < N; y++) {
        const band = y % 6 === 5 ? 0.82 : y % 6 === 0 ? 1.06 : 1;
        for (let x = 0; x < N; x++) put(x, y, mul(hex(0xd8c27e), band * (1 + (rnd(x, y, s) - 0.5) * 0.1)));
      }
      break;
    }
    case "log_side": {
      for (let x = 0; x < N; x++) {
        const col = 0.78 + rnd(x, 0, s) * 0.4 + (x % 5 === 0 ? -0.18 : 0);
        for (let y = 0; y < N; y++) put(x, y, mul(hex(0x6a4c30), col * (1 + (rnd(x, y, s + 1) - 0.5) * 0.18)));
      }
      break;
    }
    case "log_top": {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
          if (d > 6.6) put(x, y, mul(hex(0x5d4630), 0.9 + rnd(x, y, s) * 0.2));
          else put(x, y, mul(Math.floor(d) % 2 ? hex(0xa17a44) : hex(0xb98f55), 1 + (rnd(x, y, s + 1) - 0.5) * 0.1));
        }
      }
      break;
    }
    case "planks":
    case "table_top":
    case "table_side": {
      for (let y = 0; y < N; y++) {
        const board = Math.floor(y / 4);
        const tone = 0.9 + rnd(board, 0, s) * 0.22;
        for (let x = 0; x < N; x++) {
          let k = tone * (1 + (rnd(x, y, s + 1) - 0.5) * 0.12);
          if (y % 4 === 3) k *= 0.7;
          if ((x + board * 5) % 16 === 0) k *= 0.8;
          put(x, y, mul(hex(0xb88a52), k));
        }
      }
      if (name === "table_top") {
        for (let i = 0; i < N; i++) {
          put(i, 0, hex(0x4a3018));
          put(i, 15, hex(0x4a3018));
          put(0, i, hex(0x4a3018));
          put(15, i, hex(0x4a3018));
          if (i > 1 && i < 14) {
            put(i, 5, hex(0x6a4a2a));
            put(i, 10, hex(0x6a4a2a));
            put(5, i, hex(0x6a4a2a));
            put(10, i, hex(0x6a4a2a));
          }
        }
      }
      if (name === "table_side") {
        // serrote e martelo pendurados
        for (let i = 0; i < 7; i++) put(3 + i, 4 + (i % 2), hex(0xc9ced6));
        for (let i = 0; i < 4; i++) put(3, 6 + i, hex(0x6a4a2a));
        for (let i = 0; i < 6; i++) put(10, 3 + i, hex(0x4a3018));
        for (let i = 0; i < 4; i++) put(9 + (i % 4), 3, hex(0x8a8a90));
        for (let i = 0; i < N; i++) {
          put(i, 14, hex(0x4a3018));
          put(i, 15, hex(0x4a3018));
        }
      }
      break;
    }
    case "leaves": {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const r = rnd(x, y, s);
          if (r < 0.2) put(x, y, hex(0x000000), 0);
          else put(x, y, mul(hex(0x4a8a30), 0.7 + rnd(x, y, s + 1) * 0.6));
        }
      }
      break;
    }
    case "coal_ore":
    case "iron_ore":
    case "gold_ore":
    case "sapphire_ore": {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) put(x, y, mul(hex(0x7d7d80), 1 + (rnd(x, y, 9) - 0.5) * 0.14 + blotch(x, y, 9) * 0.2));
      const col = name === "coal_ore" ? hex(0x22222a) : name === "iron_ore" ? hex(0xd8a881) : name === "gold_ore" ? hex(0xf5d34a) : hex(0x3b82f6);
      const hi = name === "coal_ore" ? hex(0x4a4a55) : name === "iron_ore" ? hex(0xf0cfae) : name === "gold_ore" ? hex(0xfff0a0) : hex(0xa5c8ff);
      for (let k = 0; k < 6; k++) {
        const cx = 1 + Math.floor(rnd(k, 1, s) * 13);
        const cy = 1 + Math.floor(rnd(k, 2, s) * 13);
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
          if (dx + dy === 2 && rnd(k, 3, s) < 0.5) continue;
          put(cx + dx, cy + dy, dx === 0 && dy === 0 ? hi : col);
        }
      }
      break;
    }
    case "water": {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) put(x, y, mul(hex(0x2f6fd0), 1 + (rnd(x, y, s) - 0.5) * 0.12 + (y % 5 === 0 ? 0.08 : 0)));
      break;
    }
    case "lava": {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const v = rnd(Math.floor(x / 2), Math.floor(y / 2), s);
          put(x, y, v < 0.25 ? hex(0xc2410c) : v < 0.7 ? hex(0xff7a1a) : hex(0xffd23a));
        }
      }
      break;
    }
    case "glass": {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const edge = x === 0 || y === 0 || x === 15 || y === 15;
          const shine = (x + y === 5 || x + y === 6 || x + y === 11) && x > 2 && x < 13;
          if (edge) put(x, y, hex(0xcfe9f2), 230);
          else if (shine) put(x, y, hex(0xffffff), 190);
          else put(x, y, hex(0xcfe9f2), 40);
        }
      }
      break;
    }
    case "mudbrick": {
      noiseFill(put, hex(0xc19a68), 0.16, s);
      for (let y = 0; y < N; y++) {
        const row = Math.floor(y / 4);
        for (let x = 0; x < N; x++) {
          const joint = y % 4 === 3 || (x + (row % 2) * 4) % 8 === 7;
          if (joint) put(x, y, mul(hex(0xe6d3a8), 0.92 + rnd(x, y, s + 1) * 0.1));
          else if (rnd(x, y, s + 2) < 0.06) put(x, y, hex(0xe0c27a)); // palha
        }
      }
      break;
    }
    case "bedrock": {
      noiseFill(put, hex(0x3a3a40), 0.9, s);
      break;
    }
    case "snow_top": {
      noiseFill(put, hex(0xf2f6fa), 0.06, s);
      break;
    }
    case "gold_block": {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const inner = x === 1 || y === 1 || x === 14 || y === 14;
          const shine = Math.abs(x - y) < 2 && x > 2 && x < 13;
          let k = 1 + (rnd(x, y, s) - 0.5) * 0.1;
          if (border) k = 0.7;
          else if (inner) k = 1.15;
          else if (shine) k = 1.25;
          put(x, y, mul(hex(0xf0c93a), k));
        }
      }
      break;
    }
    case "cactus_side":
    case "cactus_top": {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const stripe = name === "cactus_side" && x % 4 === 0 ? 0.78 : 1;
          put(x, y, mul(hex(0x2f8f43), stripe * (1 + (rnd(x, y, s) - 0.5) * 0.15)));
        }
      }
      if (name === "cactus_side") for (let i = 0; i < 6; i++) put(2 + (i * 5) % 12, 2 + ((i * 7) % 12), hex(0xf2eec9));
      else for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) if (Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) > 3.5) put(x, y, hex(0x24703a));
      break;
    }
    case "limestone": {
      noiseFill(put, hex(0xe8e0cc), 0.08, s);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const row = Math.floor(y / 8);
          if (y % 8 === 7 || (x + row * 8) % 16 === 15) put(x, y, hex(0xb9ae94));
          else if (y % 8 === 0) put(x, y, hex(0xf6f0e0));
        }
      }
      break;
    }
  }
}

/** Desenha um tile num canvas 16×16. */
export function tileCanvas(name: TileName): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(N, N);
  const put: Put = (x, y, col, a = 255) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = (y * N + x) * 4;
    img.data[i] = col[0];
    img.data[i + 1] = col[1];
    img.data[i + 2] = col[2];
    img.data[i + 3] = a;
  };
  drawTile(name, put);
  ctx.putImageData(img, 0, 0);
  return c;
}

const tileCache = new Map<TileName, HTMLCanvasElement>();
export function cachedTile(name: TileName): HTMLCanvasElement {
  let t = tileCache.get(name);
  if (!t) tileCache.set(name, (t = tileCanvas(name)));
  return t;
}

/** Atlas com todos os tiles dos blocos (filtro "vizinho mais próximo" pra manter o pixel nítido). */
export function createAtlas(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = ATLAS_COLS * N;
  c.height = ATLAS_ROWS * N;
  const ctx = c.getContext("2d")!;
  TILE_NAMES.forEach((n, i) => ctx.drawImage(cachedTile(n), (i % ATLAS_COLS) * N, Math.floor(i / ATLAS_COLS) * N));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 10 estágios de rachadura pra quebra de bloco. */
export function createCracks(): THREE.CanvasTexture[] {
  const segs: [number, number][][] = [];
  for (let k = 0; k < 6; k++) {
    const path: [number, number][] = [];
    let x = 8 + Math.floor(rnd(k, 1, 77) * 3 - 1);
    let y = 8 + Math.floor(rnd(k, 2, 77) * 3 - 1);
    const dir = (k / 6) * Math.PI * 2;
    for (let i = 0; i < 9; i++) {
      path.push([Math.round(x), Math.round(y)]);
      x += Math.cos(dir + (rnd(k, i, 78) - 0.5) * 1.4) * 1.2;
      y += Math.sin(dir + (rnd(k, i, 79) - 0.5) * 1.4) * 1.2;
    }
    segs.push(path);
  }
  const out: THREE.CanvasTexture[] = [];
  for (let stage = 0; stage < 10; stage++) {
    const c = document.createElement("canvas");
    c.width = c.height = N;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    const upto = Math.ceil(((stage + 1) / 10) * 9);
    segs.forEach((path, k) => {
      if (k > stage / 1.8 + 0.5) return;
      path.slice(0, upto).forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
    });
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    out.push(t);
  }
  return out;
}

// ---- ícone de bloco (cubo isométrico) ----
const iconCache = new Map<string, string>();
export function blockIconUrl(key: BlockKey | string): string {
  const hit = iconCache.get(key);
  if (hit) return hit;
  const def = BLOCK_BY_KEY.get(key);
  const tiles = def ? BLOCK_TILES[def.key as BlockKey] : undefined;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  if (tiles) {
    const [top, side] = [cachedTile(tiles[0]), cachedTile(tiles[1])];
    ctx.save();
    ctx.transform(0.875, 0.4375, -0.875, 0.4375, 16, 2);
    ctx.drawImage(top, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.transform(0.875, 0.4375, 0, 0.875, 2, 9);
    ctx.drawImage(side, 0, 0);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, 0, 16, 16);
    ctx.restore();
    ctx.save();
    ctx.transform(0.875, -0.4375, 0, 0.875, 16, 16);
    ctx.drawImage(side, 0, 0);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, 16, 16);
    ctx.restore();
  }
  const url = c.toDataURL();
  iconCache.set(key, url);
  return url;
}
