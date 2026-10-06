// Sprites 16×16 dos itens (pixel art desenhada por código) para a interface e para a mão do jogador.
import { BLOCK_BY_KEY, type BlockKey } from "../blocks/blocks";
import { ITEMS, type ItemDef } from "../items/items";
import { blockIconUrl } from "./atlas";

type RGB = [number, number, number];
const hex = (n: number): RGB => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
const mul = (c: RGB, k: number): RGB => [Math.min(255, Math.round(c[0] * k)), Math.min(255, Math.round(c[1] * k)), Math.min(255, Math.round(c[2] * k))];

const WOOD = hex(0x8a5a2e);
const WOOD_D = hex(0x5a3a1c);
const OUT = hex(0x1d1a24);

class Pen {
  readonly c = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  constructor() {
    this.c.width = this.c.height = 16;
    this.ctx = this.c.getContext("2d")!;
  }
  p(x: number, y: number, col: RGB): void {
    if (x < 0 || y < 0 || x > 15 || y > 15) return;
    this.ctx.fillStyle = css(col);
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  line(x0: number, y0: number, x1: number, y1: number, col: RGB, thick = 1): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : i / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.p(x, y, col);
      if (thick > 1) this.p(x + 1, y, col);
    }
  }
  disc(cx: number, cy: number, r: number, col: RGB, edge?: RGB): void {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y);
        if (d <= r) this.p(cx + x, cy + y, edge && d > r - 0.9 ? edge : col);
      }
    }
  }
  rows(rowsList: [number, number, number][], col: RGB): void {
    for (const [y, a, b] of rowsList) for (let x = a; x <= b; x++) this.p(x, y, col);
  }
}

function draw(def: ItemDef): HTMLCanvasElement {
  const pen = new Pen();
  const m = hex(def.color);
  const hi = mul(m, 1.3);
  const lo = mul(m, 0.68);
  const id = def.key;

  if (id.startsWith("pickaxe_")) {
    pen.line(3, 14, 10, 7, WOOD_D);
    pen.line(2, 14, 9, 7, WOOD);
    for (let a = 0; a <= 90; a += 5) {
      const r = (a * Math.PI) / 180;
      pen.p(4 + 8 * Math.cos(r), 12 - 8 * Math.sin(r), m);
      pen.p(4 + 7 * Math.cos(r), 12 - 7 * Math.sin(r), lo);
      pen.p(4 + 9 * Math.cos(r), 12 - 9 * Math.sin(r), hi);
    }
  } else if (id.startsWith("axe_")) {
    pen.line(3, 14, 10, 7, WOOD_D);
    pen.line(2, 14, 9, 7, WOOD);
    pen.rows([[2, 9, 12], [3, 8, 13], [4, 8, 13], [5, 8, 12], [6, 8, 11], [7, 8, 10]], m);
    pen.rows([[3, 12, 13], [4, 12, 13], [2, 9, 9]], hi);
    pen.rows([[7, 8, 10], [6, 8, 8]], lo);
  } else if (id.startsWith("shovel_")) {
    pen.line(3, 14, 10, 7, WOOD_D);
    pen.line(2, 14, 9, 7, WOOD);
    pen.disc(11, 5, 3, m, lo);
    pen.p(10, 4, hi);
    pen.p(11, 4, hi);
  } else if (id.startsWith("sword_")) {
    const gold = id === "sword_gideon";
    pen.line(6, 10, 14, 2, lo, 2);
    pen.line(5, 11, 13, 3, m, 2);
    pen.line(5, 10, 13, 2, hi);
    pen.line(4, 8, 8, 12, gold ? hex(0xffd66b) : WOOD, 1);
    pen.line(5, 8, 9, 12, gold ? hex(0xb9892a) : WOOD_D, 1);
    pen.line(2, 14, 5, 11, WOOD);
    pen.p(1, 15, gold ? hex(0xffd66b) : WOOD_D);
    if (id === "sword_archangel") {
      pen.p(12, 4, hex(0xffe08a));
      pen.p(14, 2, hex(0xffffff));
    }
  } else if (id.startsWith("spear_")) {
    pen.line(2, 14, 11, 5, WOOD_D);
    pen.line(3, 14, 12, 5, WOOD);
    pen.rows([[4, 12, 13], [3, 13, 14], [2, 14, 15], [3, 12, 12], [5, 11, 11]], m);
    pen.p(14, 2, hi);
    pen.p(13, 3, hi);
  } else if (id === "bow") {
    for (let a = -65; a <= 65; a += 4) {
      const r = (a * Math.PI) / 180;
      pen.p(3 + 9 * Math.cos(r), 8 - 9 * Math.sin(r), WOOD);
      pen.p(4 + 9 * Math.cos(r), 8 - 9 * Math.sin(r), WOOD_D);
    }
    pen.line(7, 1, 7, 15, hex(0xe8dcb8));
  } else if (id === "arrow") {
    pen.line(3, 13, 12, 4, hex(0xd7c9a6));
    pen.rows([[3, 12, 14], [4, 13, 14], [2, 13, 13]], hex(0xc9ced6));
    pen.line(1, 15, 3, 13, hex(0xe9e4d4), 2);
  } else if (id === "pebble") {
    pen.disc(8, 8, 4, hex(0xb8b8bc), hex(0x7a7a80));
    pen.p(6, 6, hex(0xe8e8ec));
  } else if (id === "sling") {
    for (let a = 0; a < 360; a += 12) {
      const r = (a * Math.PI) / 180;
      pen.p(8 + 5 * Math.cos(r), 6 + 4 * Math.sin(r), hex(0x9a6a3a));
    }
    pen.line(5, 9, 3, 14, WOOD_D);
    pen.line(11, 9, 13, 14, WOOD_D);
    pen.disc(8, 6, 1, hex(0xb8b8bc));
  } else if (id === "stick") {
    pen.line(3, 14, 13, 4, WOOD_D);
    pen.line(4, 14, 14, 4, WOOD);
  } else if (id === "coal") {
    pen.disc(8, 8, 4, hex(0x2a2a30), OUT);
    pen.p(6, 6, hex(0x5a5a66));
    pen.p(7, 6, hex(0x5a5a66));
  } else if (id === "raw_iron" || id === "raw_gold") {
    pen.disc(8, 8, 4, m, lo);
    pen.p(6, 6, hi);
    pen.p(7, 6, hi);
    pen.p(10, 9, hi);
  } else if (id === "iron_ingot" || id === "gold_ingot") {
    pen.rows([[6, 5, 12], [7, 4, 11], [8, 3, 10], [9, 3, 10], [10, 4, 10]], m);
    pen.rows([[6, 5, 12], [7, 4, 6]], hi);
    pen.rows([[10, 4, 10], [9, 9, 10]], lo);
  } else if (id === "sapphire") {
    pen.rows([[2, 6, 9], [3, 5, 10], [4, 4, 11], [5, 4, 11], [6, 5, 10], [7, 5, 10], [8, 6, 9], [9, 6, 9], [10, 7, 8]], m);
    pen.rows([[3, 6, 7], [4, 5, 6], [5, 5, 5]], hi);
    pen.rows([[8, 8, 9], [9, 8, 9], [7, 9, 10]], lo);
  } else if (id === "leather") {
    pen.rows([[3, 3, 12], [4, 3, 12], [5, 2, 13], [6, 2, 13], [7, 2, 13], [8, 2, 13], [9, 2, 13], [10, 3, 12], [11, 3, 12], [12, 4, 11]], m);
    for (let x = 4; x < 12; x += 2) pen.p(x, 4, lo);
  } else if (id === "wool") {
    pen.disc(6, 8, 3, hex(0xf6f6f6), hex(0xd8d8d8));
    pen.disc(10, 8, 3, hex(0xf6f6f6), hex(0xd8d8d8));
    pen.disc(8, 6, 3, hex(0xffffff), hex(0xd8d8d8));
    pen.disc(8, 10, 3, hex(0xf2f2f2), hex(0xd0d0d0));
  } else if (id.startsWith("hoe_")) {
    pen.line(3, 14, 11, 6, WOOD_D);
    pen.line(2, 14, 10, 6, WOOD);
    pen.line(7, 3, 13, 3, m);
    pen.line(7, 4, 13, 4, lo);
    pen.line(13, 3, 13, 6, m);
    pen.p(7, 3, hi);
  } else if (id === "bucket" || id === "bucket_water" || id === "bucket_lava") {
    const iron = hex(0xc9ced6);
    pen.rows([[5, 3, 12], [6, 3, 12], [7, 4, 11], [8, 4, 11], [9, 4, 11], [10, 4, 11], [11, 5, 10], [12, 5, 10]], iron);
    pen.rows([[5, 3, 4], [6, 3, 3], [7, 4, 4], [8, 4, 4]], hex(0xeef1f6));
    pen.rows([[11, 5, 10], [12, 5, 10]], hex(0x8a909c));
    pen.line(3, 4, 12, 4, hex(0x6a707c));
    pen.p(3, 5, hex(0x6a707c));
    pen.p(12, 5, hex(0x6a707c));
    if (id !== "bucket") {
      const f = id === "bucket_water" ? hex(0x3a76d6) : hex(0xff7a1a);
      pen.line(4, 5, 11, 5, f);
      pen.line(5, 6, 10, 6, id === "bucket_water" ? hex(0x6aa0f0) : hex(0xffd23a));
    }
  } else if (id === "ember_brand") {
    pen.line(3, 14, 9, 8, WOOD_D);
    pen.line(2, 14, 8, 8, WOOD);
    pen.disc(10, 6, 3, hex(0xff7a1a), hex(0xc2410c));
    pen.disc(10, 5, 1, hex(0xffe08a));
    pen.p(11, 2, hex(0xffb02e));
    pen.p(9, 2, hex(0xff7a1a));
  } else if (id === "sulfur" || id === "ember_shard") {
    pen.rows([[4, 6, 9], [5, 5, 10], [6, 4, 11], [7, 4, 11], [8, 5, 10], [9, 6, 9], [10, 7, 8]], m);
    pen.rows([[4, 6, 7], [5, 5, 6]], hi);
    pen.rows([[9, 6, 9], [10, 7, 8]], lo);
  } else if (id === "dates") {
    for (const [x, y] of [[5, 6], [8, 5], [10, 8], [6, 10], [9, 11]] as const) pen.disc(x, y, 1, m, lo);
    pen.line(7, 2, 8, 4, hex(0x4a9a3a));
  } else if (id === "seeds") {
    for (const [x, y] of [[5, 6], [9, 5], [7, 9], [11, 9], [4, 11], [8, 12]] as const) {
      pen.disc(x, y, 1, m, lo);
    }
  } else if (id === "feather") {
    pen.line(3, 13, 12, 4, hex(0xe8e8e8), 2);
    pen.line(3, 13, 7, 9, hex(0xffffff));
    pen.line(5, 14, 13, 6, hex(0xc9c9c9));
    pen.p(12, 3, hex(0xffffff));
  } else if (id === "wheat") {
    pen.line(5, 15, 5, 5, hex(0xa88f2a));
    pen.line(10, 15, 10, 4, hex(0xa88f2a));
    for (let y = 2; y < 8; y += 2) {
      pen.p(4, y + 2, m);
      pen.p(6, y + 2, m);
      pen.p(9, y + 1, m);
      pen.p(11, y + 1, m);
    }
    pen.p(5, 3, hi);
    pen.p(10, 2, hi);
  } else if (id === "bread") {
    pen.rows([[6, 4, 11], [7, 3, 12], [8, 3, 12], [9, 3, 12], [10, 4, 11]], hex(0xc98b3c));
    pen.rows([[6, 4, 11], [7, 3, 4]], hex(0xe3a85a));
    pen.rows([[10, 4, 11]], hex(0x9a6224));
    pen.p(6, 7, hex(0xe9c58a));
    pen.p(9, 8, hex(0xe9c58a));
  } else if (id === "apple") {
    pen.disc(8, 9, 4, hex(0xd63a3a), hex(0x8a1d1d));
    pen.p(6, 7, hex(0xff8a8a));
    pen.line(8, 5, 9, 3, WOOD_D);
    pen.p(10, 3, hex(0x4a9a3a));
    pen.p(11, 3, hex(0x4a9a3a));
  } else if (id === "meat" || id === "cooked_meat") {
    const raw = id === "meat";
    pen.disc(7, 8, 4, raw ? hex(0xc4504a) : hex(0x9a5a2b), raw ? hex(0x8a2a28) : hex(0x5a3010));
    pen.p(6, 6, raw ? hex(0xf08a80) : hex(0xc98a52));
    pen.line(10, 11, 13, 14, hex(0xf3ecd2), 1);
    pen.disc(14, 14, 1, hex(0xf3ecd2));
  } else if (def.kind === "armor") {
    const slot = def.armor?.slot ?? 1;
    if (slot === 0) {
      pen.rows([[4, 5, 10], [5, 4, 11], [6, 3, 12], [7, 3, 12], [8, 3, 12], [9, 3, 5], [9, 10, 12], [10, 3, 4], [10, 11, 12]], m);
      pen.rows([[4, 5, 7], [5, 4, 5]], hi);
      pen.rows([[8, 3, 12]], lo);
    } else if (slot === 1) {
      pen.rows([[3, 2, 5], [3, 10, 13], [4, 2, 13], [5, 3, 12], [6, 4, 11], [7, 4, 11], [8, 4, 11], [9, 4, 11], [10, 4, 11], [11, 4, 11], [12, 4, 11]], m);
      pen.rows([[4, 2, 4], [5, 3, 4]], hi);
      pen.rows([[10, 4, 11], [11, 4, 11], [12, 4, 11]], lo);
      pen.line(8, 4, 8, 12, hi);
    } else if (slot === 2) {
      pen.rows([[3, 4, 11], [4, 4, 11], [5, 4, 11], [6, 4, 11], [7, 4, 7], [7, 8, 11], [8, 4, 7], [8, 8, 11], [9, 4, 7], [9, 8, 11], [10, 4, 7], [10, 8, 11], [11, 4, 7], [11, 8, 11], [12, 4, 6], [12, 9, 11]], m);
      pen.rows([[3, 4, 11], [4, 4, 5]], hi);
      pen.rows([[11, 4, 7], [11, 8, 11]], lo);
    } else {
      pen.rows([[6, 3, 6], [7, 3, 6], [8, 3, 6], [9, 3, 7], [10, 2, 8], [11, 2, 8]], m);
      pen.rows([[6, 9, 12], [7, 9, 12], [8, 9, 12], [9, 9, 13], [10, 8, 14], [11, 8, 14]], m);
      pen.rows([[11, 2, 8], [11, 8, 14]], lo);
      pen.rows([[6, 3, 4], [6, 9, 10]], hi);
    }
  } else {
    pen.disc(8, 8, 4, m, lo);
  }
  return pen.c;
}

const cache = new Map<string, HTMLCanvasElement>();
export function spriteCanvas(key: string): HTMLCanvasElement | null {
  const def = ITEMS[key];
  if (!def || def.block !== undefined) return null;
  let c = cache.get(key);
  if (!c) cache.set(key, (c = draw(def)));
  return c;
}

const urls = new Map<string, string>();
/** Ícone do item (dataURL): cubo para blocos, pixel art para o resto. */
export function itemIconUrl(key: string): string {
  const hit = urls.get(key);
  if (hit) return hit;
  const def = ITEMS[key];
  let url = "";
  if (def?.block !== undefined) url = blockIconUrl(BLOCK_BY_KEY.get(key)?.key as BlockKey);
  else {
    const c = spriteCanvas(key);
    if (c) url = c.toDataURL();
  }
  urls.set(key, url);
  return url;
}

/** Pixels de um canvas 16×16 qualquer. */
export function canvasPixels(c: HTMLCanvasElement): { x: number; y: number; r: number; g: number; b: number }[] {
  const d = c.getContext("2d")!.getImageData(0, 0, 16, 16).data;
  const out: { x: number; y: number; r: number; g: number; b: number }[] = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4;
      if (d[i + 3] > 40) out.push({ x, y, r: d[i] / 255, g: d[i + 1] / 255, b: d[i + 2] / 255 });
    }
  }
  return out;
}

/** Pixels opacos do sprite (pra extrudar em 3D na mão). */
export function spritePixels(key: string): { x: number; y: number; r: number; g: number; b: number }[] {
  const c = spriteCanvas(key);
  if (!c) return [];
  const d = c.getContext("2d")!.getImageData(0, 0, 16, 16).data;
  const out: { x: number; y: number; r: number; g: number; b: number }[] = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4;
      if (d[i + 3] > 40) out.push({ x, y, r: d[i] / 255, g: d[i + 1] / 255, b: d[i + 2] / 255 });
    }
  }
  return out;
}
