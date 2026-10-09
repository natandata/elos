// Shopping Elos: monta os lugares em 3D (o corredor de 5 andares e o interior de cada loja). Sem React: o ShoppingWorld3D cuida da jogadora, da câmera e dos controles.
import * as THREE from "three";
import { iconImg, iconTexture } from "./mallIcons";
import { concourseWorld, storeWorld, type Post, type Solid, type World } from "@/lib/games/dress/mallPhysics";
import {
  ATRIUM,
  BOOTH,
  CLOSED,
  DOOR_RANGE,
  ESCALATORS,
  ESC_X0,
  FLOOR_COUNT,
  FLOOR_H,
  FLOOR_INFO,
  HX,
  INFO_DESK,
  LANE_DOWN,
  LANE_UP,
  LOUNGE_ZONE,
  MALL_NAME,
  RESTAURANTS,
  SHELF_SPACING,
  SHELF_TIERS,
  STORES,
  STORE_HL,
  STORE_HW,
  STORE_W,
  WALLS,
  counterFront,
  counterZ,
  doorSpawn,
  floorHalfZ,
  floorY,
  holesOf,
  itemHeight,
  seatsOf,
  storeShelves,
  storesSelling,
  subtractRects,
  tablesOf,
  type RareOffer,
  type Rect,
  type Seat,
  type StoreDef,
} from "@/lib/games/dress/shopping";
import { offerItem } from "@/lib/games/dress/shopping";
import { SLOT_VIEWBOX_RATIO } from "./slotRatio";

export type Interact =
  | { kind: "door"; store: string; label: string; x: number; z: number; y: number; rx: number; rz: number }
  | { kind: "closed"; label: string; x: number; z: number; y: number; rx: number; rz: number }
  | { kind: "exit"; label: string; x: number; z: number; y: number; rx: number; rz: number }
  | { kind: "mallexit"; label: string; x: number; z: number; y: number; rx: number; rz: number }
  | { kind: "counter"; place: string; label: string; x: number; z: number; y: number; rx: number; rz: number }
  | { kind: "booth"; label: string; x: number; z: number; y: number; rx: number; rz: number }
  | { kind: "elevator"; label: string; x: number; z: number; y: number; rx: number; rz: number }
  | { kind: "info"; label: string; x: number; z: number; y: number; rx: number; rz: number }
  | { kind: "item"; itemId: string; slot: string; family: string; label: string; ay: number; x: number; z: number; y: number; rx: number; rz: number }
  | { kind: "rare"; offerId: number; label: string; x: number; z: number; y: number; rx: number; rz: number };

export type ItemSprite = { key: string; itemId: string; slot: string; sprite: THREE.Sprite; w: number; h: number; x: number; y: number; z: number; face: number; loaded: boolean; loading: boolean; badge: THREE.Mesh | null; family: string; price: number };

export type Place = {
  key: string;
  group: THREE.Group;
  world: World;
  interacts: Interact[];
  seats: Seat[];
  spawn: { x: number; z: number; y: number; yaw: number };
  items: ItemSprite[];
  clear: number;
  fog: [number, number, number];
  /** chamado todo quadro */
  update: (t: number, dt: number, me: { x: number; y: number; z: number; mv: number }) => void;
  setOwned: (owned: Set<string>) => void;
  setOffers: (offers: RareOffer[]) => void;
  setBubble: (lines: string[]) => void;
  setMirror: (c: HTMLCanvasElement | null) => void;
  dispose: () => void;
};

// ------------------------------------------------------------------ materiais e texturas
class Kit {
  group = new THREE.Group();
  private mats = new Map<number, THREE.MeshLambertMaterial>();
  private disp: { dispose: () => void }[] = [];
  track<T extends { dispose: () => void }>(o: T): T {
    this.disp.push(o);
    return o;
  }
  geo<T extends THREE.BufferGeometry>(g: T): T {
    return this.track(g);
  }
  mat(color: number, opts: { opacity?: number; emissive?: number } = {}): THREE.MeshLambertMaterial {
    const key = color * 1000 + Math.round((opts.opacity ?? 1) * 100) + (opts.emissive ? 7 : 0);
    let m = this.mats.get(key);
    if (!m) {
      m = this.track(new THREE.MeshLambertMaterial({ color, transparent: (opts.opacity ?? 1) < 1, opacity: opts.opacity ?? 1, emissive: opts.emissive ?? 0 }));
      this.mats.set(key, m);
    }
    return m;
  }
  basic(color: number, opacity = 1): THREE.MeshBasicMaterial {
    return this.track(new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  }
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, parent: THREE.Object3D = this.group, opacity = 1): THREE.Mesh {
    const m = new THREE.Mesh(this.geo(new THREE.BoxGeometry(w, h, d)), this.mat(color, { opacity }));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  cyl(rt: number, rb: number, h: number, color: number, x: number, y: number, z: number, seg = 14, parent: THREE.Object3D = this.group): THREE.Mesh {
    const m = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(rt, rb, h, seg)), this.mat(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  sphere(r: number, color: number, x: number, y: number, z: number, parent: THREE.Object3D = this.group): THREE.Mesh {
    const m = new THREE.Mesh(this.geo(new THREE.SphereGeometry(r, 10, 8)), this.mat(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  dispose() {
    this.group.removeFromParent();
    for (const d of this.disp) d.dispose();
    this.disp.length = 0;
  }
}

function canvasOf(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}
const asTex = (c: HTMLCanvasElement): THREE.CanvasTexture => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

function tileTexture(a: string, b: string): THREE.CanvasTexture {
  const [c, g] = canvasOf(128, 128);
  g.fillStyle = a;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = b;
  g.fillRect(0, 0, 64, 64);
  g.fillRect(64, 64, 64, 64);
  g.strokeStyle = "rgba(0,0,0,0.07)";
  g.lineWidth = 2;
  g.strokeRect(0, 0, 128, 128);
  const t = asTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function woodTex(cols: string[]): THREE.CanvasTexture {
  const [c, g] = canvasOf(256, 256);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[i % cols.length];
    g.fillRect(0, i * 32, 256, 32);
    g.fillStyle = "rgba(0,0,0,0.22)";
    g.fillRect(0, i * 32, 256, 2);
  }
  const t = asTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function stripeTex(): THREE.CanvasTexture {
  const [c, g] = canvasOf(64, 64);
  g.fillStyle = "#6b6f7a";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#9097a3";
  for (let i = 0; i < 4; i++) g.fillRect(0, i * 16 + 2, 64, 10);
  const t = asTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const LEAD_ICON: Record<string, string> = { "🚪": "porta", "ℹ": "interrogacao", "🎫": "bilhete", "🎵": "nota", "🍽": "talheres", "🪞": "brilhos", "🔥": "fogo", "💜": "brilhos", "⭐": "estrela", "✔": "certo", "⬆": "seta-cima", "⬇": "seta-baixo" };
function labelCanvas(text: string, w: number, h: number, fg: string, bg: string, border: string, font = 56, iconName?: string): HTMLCanvasElement {
  const [c, g] = canvasOf(w, h);
  // um emoji no começo do texto vira o ícone correspondente
  const lead = /^([^\p{L}\p{N}\s]️?)\s*/u.exec(text);
  if (!iconName && lead) {
    const ic = LEAD_ICON[lead[1].replace(/️/g, "")];
    if (ic) {
      iconName = ic;
      text = text.slice(lead[0].length);
    }
  }
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(6, 6, w - 12, h - 12, h * 0.28);
  g.fill();
  g.strokeStyle = border;
  g.lineWidth = 7;
  g.stroke();
  g.fillStyle = fg;
  g.textBaseline = "middle";
  const im = iconName ? iconImg(iconName) : undefined;
  const isz = im ? h * 0.66 : 0;
  const gap = im ? h * 0.1 : 0;
  let size = font;
  g.font = `900 ${size}px system-ui, sans-serif`;
  while (g.measureText(text).width + isz + gap > w - 50 && size > 18) {
    size -= 3;
    g.font = `900 ${size}px system-ui, sans-serif`;
  }
  const tw = g.measureText(text).width;
  const x0 = (w - (tw + isz + gap)) / 2;
  if (im) g.drawImage(im, x0, (h - isz) / 2, isz, isz);
  g.textAlign = "left";
  g.fillText(text, x0 + isz + gap, h / 2 + 2);
  return c;
}

/** Placa fixa (plano) com texto. */
function signPlane(k: Kit, text: string, w: number, fg = "#5b1f78", bg = "rgba(255,255,255,0.95)", border = "#e9b84a", ratio = 4, icon?: string): THREE.Mesh {
  const tex = k.track(asTex(labelCanvas(text, 512, Math.round(512 / ratio), fg, bg, border, 56, icon)));
  const m = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(w, w / ratio)), k.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })));
  return m;
}
/** Placa/ícone fixo (plano que não gira para a câmera, então nunca "corta" nem atravessa outra placa). */
function planeMat(k: Kit, tex: THREE.Texture | null, opts: { opacity?: number } = {}): THREE.MeshBasicMaterial {
  return k.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide, opacity: opts.opacity ?? 1 }));
}
function spriteOf(k: Kit, tex: THREE.Texture, w: number, h: number, _fog = true, ry = 0): THREE.Mesh {
  void _fog;
  const m = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(w, h)), planeMat(k, tex));
  m.rotation.y = ry;
  return m;
}
function starsTexture(): THREE.CanvasTexture {
  const [c, g] = canvasOf(64, 64);
  g.translate(32, 32);
  g.fillStyle = "#fff";
  g.shadowColor = "#ffe9a0";
  g.shadowBlur = 10;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 26 : 7;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  return asTex(c);
}

const addPoints = (k: Kit, count: number, box: { x: number; y: number; z: number; w: number; h: number; d: number }, color = 0xfff0b8, size = 0.26): THREE.Points => {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box.x + (Math.random() - 0.5) * box.w;
    pos[i * 3 + 1] = box.y + Math.random() * box.h;
    pos[i * 3 + 2] = box.z + (Math.random() - 0.5) * box.d;
  }
  const g = k.geo(new THREE.BufferGeometry());
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, k.track(new THREE.PointsMaterial({ size, map: k.track(starsTexture()), transparent: true, depthWrite: false, color, opacity: 0.8, blending: THREE.AdditiveBlending })));
  p.frustumCulled = false;
  k.group.add(p);
  return p;
};

// ------------------------------------------------------------------ o corredor do shopping
export type MallOpts = { offers: RareOffer[]; owned: Set<string> };

/** A jogadora está dentro da água da fonte (em cima da borda, na altura da água)? */
export const isInFountain = (x: number, y: number, z: number): boolean => Math.hypot(x, z) < 3.75 && y > 0.4 && y < 1.4;

export function buildConcourse(): Place {
  const k = new Kit();
  const g = k.group;
  const interacts: Interact[] = [];
  const seats: Seat[] = [];
  const solids: Solid[] = [];
  const posts: Post[] = [];
  const animated: ((t: number, dt: number, me: { x: number; y: number; z: number; mv: number }) => void)[] = [];
  const stepTex = k.track(stripeTex());

  for (let f = 0; f < FLOOR_COUNT; f++) {
    const fy = floorY(f);
    const hz = floorHalfZ(f);
    const info = FLOOR_INFO[f];
    const parts = subtractRects({ x0: -HX, x1: HX, z0: -hz, z1: hz }, holesOf(f));
    for (const r of parts) {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      const tex = k.track(tileTexture(info.tile[0], info.tile[1]));
      tex.repeat.set(w / 4, d / 4);
      const top = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(w, d)), k.track(new THREE.MeshLambertMaterial({ map: tex })));
      top.rotation.x = -Math.PI / 2;
      top.position.set((r.x0 + r.x1) / 2, fy + 0.01, (r.z0 + r.z1) / 2);
      g.add(top);
      k.box(w, 0.6, d, 0xd9d2cc, (r.x0 + r.x1) / 2, fy - 0.31, (r.z0 + r.z1) / 2);
    }
    // paredes
    const wallH = FLOOR_H - 0.6;
    for (const side of [-1, 1] as const) {
      k.box(HX * 2 + 1, wallH, 0.6, info.color, 0, fy + wallH / 2, side * (hz + 0.3));
      k.box(HX * 2 + 1, 0.5, 0.7, 0xb8a79c, 0, fy + 0.25, side * (hz + 0.28));
    }
    for (const sx of [-1, 1] as const) k.box(0.6, wallH, hz * 2 + 1, info.color, sx * (HX + 0.3), fy + wallH / 2, 0);
    // janelas (bem maiores na praça de alimentação)
    const winN = f === 4 ? 14 : 8;
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < winN; i++) {
        const wx = -HX + 6 + (i * (HX * 2 - 12)) / (winN - 1);
        if (f < 4) continue;
        const win = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(5, 5.6)), k.basic(0xbfe3ff, 0.85));
        win.position.set(wx, fy + 4.4, side * (hz - 0.01));
        win.rotation.y = side < 0 ? 0 : Math.PI;
        g.add(win);
      }
    }
    // colunas ao longo das paredes (andares com lojas)
    if (f < 4) {
      for (const side of [-1, 1] as const)
        for (const px of [-45, -27, -9, 9, 27, 45]) {
          k.cyl(0.5, 0.55, wallH, 0xf4efe6, px, fy + wallH / 2, side * (hz - 1.3));
          posts.push({ x: px, z: side * (hz - 1.3), r: 0.5, base: fy, height: wallH });
        }
    }
    // grades do átrio e dos poços (vidro com corrimão dourado)
    for (const q of WALLS) {
      if (q.y1 - q.y0 > 4) continue;
      if (Math.abs(q.y0 - (fy - 0.6)) > 0.01) continue;
      const w = q.x1 - q.x0;
      const d = q.z1 - q.z0;
      k.box(w, 1.5, d, 0xcfe9ff, (q.x0 + q.x1) / 2, fy + 0.85, (q.z0 + q.z1) / 2, g, 0.38);
      k.box(w + 0.1, 0.12, d + 0.1, 0xe9b84a, (q.x0 + q.x1) / 2, fy + 1.62, (q.z0 + q.z1) / 2);
    }
    // letreiro do andar (sobre o átrio)
    if (f > 0) {
      const sn = signPlane(k, `${info.name} · ${info.sub}`, 9.5, "#ffffff", "rgba(91,31,120,0.92)", "#e9b84a", 5);
      sn.position.set(0, fy + 4.2, ATRIUM.z1 + 0.6);
      sn.rotation.y = Math.PI;
      g.add(sn);
      const sn2 = signPlane(k, `${info.name} · ${info.sub}`, 9.5, "#ffffff", "rgba(91,31,120,0.92)", "#e9b84a", 5);
      sn2.position.set(0, fy + 4.2, ATRIUM.z0 - 0.6);
      g.add(sn2);
    }
    // elevador no fim do corredor (ponta oeste): a cabine de vidro em cada andar
    {
      const ex = -(HX - 2.4);
      k.box(3.6, 0.3, 4.6, 0x8a8f9c, ex, fy + 0.15, 0);
      k.box(3.6, 0.3, 4.6, 0x8a8f9c, ex, fy + 6.2, 0);
      for (const zz of [-2.2, 2.2]) k.box(3.6, 6.2, 0.3, 0xdfe6f2, ex, fy + 3.1, zz, g, 0.55);
      k.box(0.3, 6.2, 4.6, 0xb8bfcc, ex - 1.65, fy + 3.1, 0);
      k.box(0.3, 6.0, 4.4, 0xffe3a8, ex - 1.5, fy + 3.1, 0);
      k.box(3.2, 0.1, 4.2, 0xf4ead8, ex, fy + 0.35, 0);
      for (const zz of [-0.95, 0.95]) {
        k.box(0.12, 5.0, 1.8, 0xdff1ff, ex + 1.75, fy + 2.8, zz, g, 0.45);
        k.box(0.2, 5.1, 0.12, 0xe9b84a, ex + 1.75, fy + 2.8, zz * 1.9);
      }
      k.box(0.3, 0.4, 4.6, 0xe9b84a, ex + 1.8, fy + 5.7, 0);
      const es = signPlane(k, "ELEVADOR", 3.4, "#ffffff", "rgba(40,60,120,0.95)", "#ffd23f", 4, "seta-cima");
      es.position.set(ex + 1.95, fy + 6.6, 0);
      es.rotation.y = Math.PI / 2;
      g.add(es);
      const ed = signPlane(k, `Andar ${f}`, 1.8, "#ffd23f", "rgba(20,20,30,0.95)", "#8a8f9c", 4);
      ed.position.set(ex + 1.95, fy + 5.2, 1.0 * 0);
      ed.rotation.y = Math.PI / 2;
      ed.position.z = -3.0;
      g.add(ed);
      for (const zz of [-2.2, 2.2]) posts.push({ x: ex, z: zz, r: 0.9, base: fy, height: 6.2 });
      posts.push({ x: ex - 1.4, z: 0, r: 1.2, base: fy, height: 6.2 });
      interacts.push({ kind: "elevator", label: "Elevador", x: ex + 4.6, z: 0, y: fy, rx: 3.0, rz: 2.6 });
    }
    // bancos (dá para sentar) e plantas
    const benchSpots: [number, number][] = f === 4 ? [] : [[-24, 12.5], [24, 12.5], [-24, -12.5], [24, -12.5]];
    for (const [bx, bz] of benchSpots) {
      k.box(2.8, 0.45, 0.95, 0xe7b3c9, bx, fy + 0.3, bz);
      k.box(2.8, 0.7, 0.18, 0xd98cae, bx, fy + 0.75, bz + (bz > 0 ? 0.45 : -0.45));
      solids.push({ x: bx, z: bz, base: fy, top: fy + 0.53, hw: 1.4, hd: 0.5 });
      seats.push({ x: bx - 0.7, z: bz, y: fy + 0.53, dir: 1 }, { x: bx + 0.7, z: bz, y: fy + 0.53, dir: -1 });
    }
    const plantSpots: [number, number][] = f === 4 ? [[-17, 0], [17, 0]] : [[-56, 16], [56, 16], [-56, -16], [56, -16], [-14, 16], [14, 16], [-14, -16], [14, -16]];
    for (const [px, pz] of plantSpots) {
      k.cyl(0.5, 0.4, 0.8, 0xf5f5f5, px, fy + 0.4, pz, 10);
      k.sphere(1.0, 0x3f8f4f, px, fy + 1.6, pz);
      posts.push({ x: px, z: pz, r: 0.6, base: fy, height: 2.6 });
    }
  }

  // ---- escadas rolantes
  for (const e of ESCALATORS) {
    const lane = e.up ? LANE_UP : LANE_DOWN;
    const cz = (lane.z0 + lane.z1) / 2;
    const run = Math.abs(e.xHigh - e.xLow);
    const len = Math.hypot(run, FLOOR_H);
    const ang = Math.atan2(FLOOR_H, run);
    const dir = Math.sign(e.xHigh - e.xLow);
    const cx = (e.xLow + e.xHigh) / 2;
    const cy = floorY(e.from) + FLOOR_H / 2;
    const ramp = new THREE.Group();
    ramp.position.set(cx, cy, cz);
    ramp.rotation.z = dir * ang;
    g.add(ramp);
    const tex = stepTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, len / 1.1);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    k.track(tex);
    const belt = new THREE.Mesh(k.geo(new THREE.BoxGeometry(len, 0.22, 2.3)), [k.mat(0x555a66), k.mat(0x555a66), new THREE.MeshLambertMaterial({ map: tex }), k.mat(0x444851), k.mat(0x555a66), k.mat(0x555a66)].map((m) => k.track(m)));
    // as texturas das faces ficam no eixo x do cinto: gira para as listras correrem no comprimento
    tex.rotation = Math.PI / 2;
    tex.center.set(0.5, 0.5);
    belt.position.y = -0.11;
    ramp.add(belt);
    for (const zz of [-1.22, 1.22]) {
      k.box(len, 1.1, 0.16, 0xcfe9ff, 0, 0.55, zz, ramp, 0.4);
      k.box(len, 0.14, 0.22, 0x2b2f3a, 0, 1.12, zz, ramp);
    }
    // estrutura embaixo
    k.box(len, 0.35, 2.6, 0x8a8f9c, 0, -0.45, 0, ramp);
    animated.push((t) => {
      tex.offset.y = (e.up ? -1 : 1) * (t * 0.9);
    });
    // setinha do sentido
    const arrow = spriteOf(k, k.track(asTex(labelCanvas(e.up ? "⬆ SOBE" : "⬇ DESCE", 256, 96, "#ffffff", "rgba(40,60,120,0.9)", "#ffd23f", 44))), 2.4, 0.9);
    arrow.position.set(e.end * (ESC_X0 - 2.2), floorY(e.from) + 2.2, cz);
    g.add(arrow);
    const arrow2 = spriteOf(k, k.track(asTex(labelCanvas(e.up ? "⬆ SOBE" : "⬇ DESCE", 256, 96, "#ffffff", "rgba(40,60,120,0.9)", "#ffd23f", 44))), 2.4, 0.9);
    arrow2.position.set(e.end * (ESC_X0 + 14.2), floorY(e.from + 1) + 2.2, cz);
    g.add(arrow2);
  }

  // ---- térreo: fonte, entrada, balcão de informações, cabine de bilhetes
  const stage0 = floorY(0);
  k.cyl(4.2, 4.4, 0.6, 0xf3ebe4, 0, stage0 + 0.3, 0, 32);
  const water = new THREE.Mesh(k.geo(new THREE.CylinderGeometry(3.7, 3.7, 0.05, 32)), k.track(new THREE.MeshLambertMaterial({ color: 0x7fd0f2, transparent: true, opacity: 0.8 })));
  water.position.set(0, stage0 + 0.58, 0);
  g.add(water);
  k.cyl(0.5, 0.8, 2.2, 0xf3ebe4, 0, stage0 + 1.4, 0, 14);
  k.sphere(0.7, 0xf4d37a, 0, stage0 + 2.8, 0);
  solids.push({ x: 0, z: 0, base: stage0, top: stage0 + 0.6, r: 4.3 });
  posts.push({ x: 0, z: 0, r: 0.9, base: stage0 + 0.6, height: 3.4 });
  const jets = addPoints(k, 60, { x: 0, y: stage0 + 0.6, z: 0, w: 2.4, h: 3.6, d: 2.4 }, 0xbfe9ff, 0.2);
  animated.push((t) => {
    jets.rotation.y = t * 0.6;
  });
  // animação da água quando a jogadora entra na fonte: ondas que se abrem a partir dos pés e gotas que pulam
  const ripples: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(k.geo(new THREE.RingGeometry(0.85, 1, 32)), k.track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })));
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    g.add(r);
    ripples.push(r);
  }
  const DROPS = 28;
  const dropPos = new Float32Array(DROPS * 3);
  const dropVel = new Float32Array(DROPS * 3);
  const dropLife = new Float32Array(DROPS);
  const dropGeo = k.geo(new THREE.BufferGeometry());
  dropGeo.setAttribute("position", new THREE.BufferAttribute(dropPos, 3));
  const dropPts = new THREE.Points(dropGeo, k.track(new THREE.PointsMaterial({ size: 0.16, color: 0xd8f3ff, transparent: true, opacity: 0.95, depthWrite: false })));
  dropPts.frustumCulled = false;
  g.add(dropPts);
  let rippleT = 0;
  let dropT = 0;
  animated.push((_t, dt, me) => {
    const inWater = isInFountain(me.x, me.y, me.z);
    rippleT += dt;
    ripples.forEach((r, i) => {
      const ph = ((rippleT * 0.9 + i / 3) % 1);
      r.visible = inWater;
      if (!inWater) return;
      r.position.set(me.x, stage0 + 0.62, me.z);
      r.scale.setScalar(0.4 + ph * (me.mv > 0.2 ? 2.4 : 1.6));
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.8;
    });
    dropT += dt;
    for (let i = 0; i < DROPS; i++) {
      if (dropLife[i] > 0) {
        dropLife[i] -= dt;
        dropVel[i * 3 + 1] -= 9 * dt;
        dropPos[i * 3] += dropVel[i * 3] * dt;
        dropPos[i * 3 + 1] += dropVel[i * 3 + 1] * dt;
        dropPos[i * 3 + 2] += dropVel[i * 3 + 2] * dt;
        if (dropPos[i * 3 + 1] < stage0 + 0.6) dropLife[i] = 0;
      } else {
        dropPos[i * 3 + 1] = -50;
        if (inWater && me.mv > 0.15 && dropT > 0.03) {
          dropT = 0;
          dropLife[i] = 0.7;
          dropPos[i * 3] = me.x + (Math.random() - 0.5) * 0.6;
          dropPos[i * 3 + 1] = stage0 + 0.7;
          dropPos[i * 3 + 2] = me.z + (Math.random() - 0.5) * 0.6;
          dropVel[i * 3] = (Math.random() - 0.5) * 2.2;
          dropVel[i * 3 + 1] = 2.2 + Math.random() * 2.2;
          dropVel[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
        }
      }
    }
    dropGeo.attributes.position.needsUpdate = true;
  });
  const bigSign = spriteOf(k, k.track(asTex(labelCanvas(MALL_NAME.toUpperCase(), 1024, 220, "#fff6c2", "rgba(91,31,120,0.95)", "#e9b84a", 120))), 18, 3.9, false);
  bigSign.position.set(0, stage0 + 6.8, -(floorHalfZ(0) - 0.8));
  g.add(bigSign);
  const bigSign2 = spriteOf(k, k.track(asTex(labelCanvas(MALL_NAME.toUpperCase(), 1024, 220, "#fff6c2", "rgba(91,31,120,0.95)", "#e9b84a", 120))), 18, 3.9, false, Math.PI);
  bigSign2.position.set(0, stage0 + 6.8, floorHalfZ(0) - 0.8);
  g.add(bigSign2);
  // entrada (porta de vidro no centro da parede sul)
  k.box(7, 6.2, 0.4, 0xa5d6f2, 0, 3.1, floorHalfZ(0) - 0.05, g, 0.55);
  k.box(7.4, 0.35, 0.5, 0xe9b84a, 0, 6.3, floorHalfZ(0) - 0.05);
  const exitSign = signPlane(k, "🚪 SAÍDA", 4, "#1f6b2e", "rgba(255,255,255,0.95)", "#2a9d4a");
  exitSign.position.set(0, 5.2, floorHalfZ(0) - 0.4);
  exitSign.rotation.y = Math.PI;
  g.add(exitSign);
  interacts.push({ kind: "mallexit", label: "🚪 Sair do shopping", x: 0, z: floorHalfZ(0) - 2.4, y: stage0, rx: 3.6, rz: 2.4 });
  // balcão de informações
  k.box(6.4, 1.3, 1.6, 0xf1dbe8, INFO_DESK.x, 0.65, INFO_DESK.z);
  k.box(6.6, 0.15, 1.8, 0xe9b84a, INFO_DESK.x, 1.35, INFO_DESK.z);
  for (const dx of [-2.4, -0.8, 0.8, 2.4]) posts.push({ x: INFO_DESK.x + dx, z: INFO_DESK.z, r: 1.1, base: 0, height: 1.3 });
  const infoSign = signPlane(k, "ℹ️ INFORMAÇÕES", 4.6, "#1d4f91", "rgba(255,255,255,0.96)", "#3b82f6");
  infoSign.position.set(INFO_DESK.x, 3.9, INFO_DESK.z + 0.9);
  infoSign.rotation.y = Math.PI;
  g.add(infoSign);
  interacts.push({ kind: "info", label: "ℹ️ Peças raras de hoje", x: INFO_DESK.front.x, z: INFO_DESK.front.z, y: stage0, rx: 4.2, rz: 2.2 });
  // cabine de bilhetes (no fim do térreo)
  k.box(4.4, 4.6, 7.4, 0xffe3a3, BOOTH.x + 0.4, 2.3, BOOTH.z);
  k.box(0.5, 2.0, 5.0, 0x5ec4f2, BOOTH.x - 1.85, 2.9, BOOTH.z, g, 0.7);
  k.box(1.0, 0.3, 5.6, 0xe9b84a, BOOTH.x - 2.0, 1.85, BOOTH.z);
  const boothSign = spriteOf(k, k.track(asTex(labelCanvas("🎫 CABINE DE BILHETES", 1024, 200, "#fff6c2", "rgba(160,60,20,0.95)", "#ffd23f", 92))), 8.6, 1.7, false, -Math.PI / 2);
  boothSign.position.set(BOOTH.x - 1.2, 5.8, BOOTH.z);
  g.add(boothSign);
  posts.push({ x: BOOTH.x + 0.4, z: BOOTH.z - 2.4, r: 2.0, base: 0, height: 4.6 }, { x: BOOTH.x + 0.4, z: BOOTH.z + 2.4, r: 2.0, base: 0, height: 4.6 }, { x: BOOTH.x + 0.4, z: BOOTH.z, r: 2.0, base: 0, height: 4.6 });
  interacts.push({ kind: "booth", label: "🎫 Doar bilhetes", x: BOOTH.front.x, z: BOOTH.front.z, y: stage0, rx: 2.8, rz: 3.4 });

  // ---- fachadas das lojas
  const facade = (s: StoreDef) => {
    const fy = floorY(s.floor);
    const hz = floorHalfZ(s.floor);
    const open = !!s.slots;
    const gr = new THREE.Group();
    gr.position.set(s.x, fy, s.side * (hz - 0.35));
    g.add(gr);
    const face = -s.side; // para dentro do corredor
    k.box(STORE_W, 7.6, 0.5, open ? s.color : 0xcfc9c4, 0, 3.8, 0, gr);
    k.box(STORE_W + 0.4, 0.5, 0.7, open ? s.accent : 0x8a7f78, 0, 7.5, 0, gr);
    // porta
    const door = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(4.4, 5)), k.basic(open ? 0x2c2140 : 0x6f6b69));
    door.position.set(0, 2.5, face * 0.27);
    door.rotation.y = face > 0 ? 0 : Math.PI;
    gr.add(door);
    for (const dx of [-2.35, 2.35]) k.box(0.3, 5.2, 0.4, 0xe9b84a, dx, 2.6, face * 0.3, gr);
    k.box(5, 0.3, 0.4, 0xe9b84a, 0, 5.15, face * 0.3, gr);
    // vitrines
    for (const wx of [-5.6, 5.6]) {
      const win = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(4.4, 4)), k.basic(open ? 0xfff2cf : 0xb8b2ad, open ? 0.95 : 0.8));
      win.position.set(wx, 2.6, face * 0.27);
      win.rotation.y = face > 0 ? 0 : Math.PI;
      gr.add(win);
      const em = spriteOf(k, iconTexture(s.icon), 2.6, 2.6, false, face > 0 ? 0 : Math.PI);
      em.position.set(wx, 2.7, face * 0.9);
      gr.add(em);
    }
    const sign = signPlane(k, open ? s.name : `${s.name} — em breve`, 9.6, open ? "#ffffff" : "#5d5753", open ? hexAlpha(s.accent) : "rgba(235,230,226,0.95)", open ? "#ffe08a" : "#9b948f", 5);
    sign.position.set(0, 6.3, face * 0.34);
    sign.rotation.y = face > 0 ? 0 : Math.PI;
    gr.add(sign);
    if (!open) {
      const tape = spriteOf(k, iconTexture("alerta"), 2.2, 2.2, false, face > 0 ? 0 : Math.PI);
      tape.position.set(0, 1.4, face * 1.0);
      gr.add(tape);
    }
    const spawn = doorSpawn(s);
    if (open) interacts.push({ kind: "door", store: s.id, label: `🚪 Entrar: ${s.name}`, x: spawn.x, z: s.side * (hz - 2.6), y: fy, rx: DOOR_RANGE.dx, rz: DOOR_RANGE.dz });
    else interacts.push({ kind: "closed", label: `🚧 ${s.name} (em breve)`, x: spawn.x, z: s.side * (hz - 2.6), y: fy, rx: DOOR_RANGE.dx, rz: DOOR_RANGE.dz });
  };
  for (const s of [...STORES, ...CLOSED]) facade(s);

  // ---- praça de alimentação
  {
    const fy = floorY(4);
    for (const r of RESTAURANTS) {
      const z0 = r.zone.z0;
      const z1 = r.zone.z1;
      const tint = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(r.zone.x1 - r.zone.x0 - 1, z1 - z0 - 1)), k.track(new THREE.MeshLambertMaterial({ color: r.color, transparent: true, opacity: 0.45 })));
      tint.rotation.x = -Math.PI / 2;
      tint.position.set(r.cx, fy + 0.03, (z0 + z1) / 2);
      g.add(tint);
      // balcão e cozinha
      const cz = counterZ(r);
      k.box(15, 1.4, 1.8, r.accent, r.cx, fy + 0.7, cz);
      k.box(15.4, 0.18, 2.1, 0xf3d9a3, r.cx, fy + 1.48, cz);
      k.box(15, 6.5, 0.6, r.color, r.cx, fy + 3.25, r.side * 43.3);
      k.box(15, 0.4, 0.8, r.accent, r.cx, fy + 6.6, r.side * 43.2);
      for (const dx of [-6, -3, 0, 3, 6]) posts.push({ x: r.cx + dx, z: cz, r: 2.2, base: fy, height: 1.5 });
      const mainEmoji = spriteOf(k, iconTexture(r.icon), 3.2, 3.2, false, r.side < 0 ? 0 : Math.PI);
      mainEmoji.position.set(r.cx - 4, fy + 4.2, r.side * 42.6);
      g.add(mainEmoji);
      const name = signPlane(k, r.name, 11, "#ffffff", hexAlpha(r.accent), "#ffe08a", 5, r.icon);
      name.position.set(r.cx, fy + 5.5, r.side * 42.8 - r.side * 0.5);
      name.rotation.y = r.side < 0 ? 0 : Math.PI;
      g.add(name);
      interacts.push({ kind: "counter", place: r.key, label: `🍽 Cardápio: ${r.name}`, x: counterFront(r).x, z: counterFront(r).z, y: fy, rx: 7.5, rz: 2.4 });
      // mesas e cadeiras
      for (const t of tablesOf(r)) {
        k.cyl(1.05, 1.05, 0.12, 0xfff6e6, t.x, fy + 1.0, t.z, 20);
        k.cyl(0.14, 0.2, 1.0, r.accent, t.x, fy + 0.5, t.z, 8);
        k.cyl(0.6, 0.6, 0.06, r.accent, t.x, fy + 0.04, t.z, 12);
        posts.push({ x: t.x, z: t.z, r: 0.95, base: fy, height: 1.1 });
      }
      for (const s of seatsOf(r)) {
        k.box(0.8, 0.12, 0.8, r.color, s.x, fy + 0.46, s.z);
        k.box(0.12, 0.5, 0.8, r.accent, s.x - s.dir * 0.4, fy + 0.78, s.z);
        k.box(0.12, 0.45, 0.12, r.accent, s.x, fy + 0.22, s.z);
        seats.push({ x: s.x, z: s.z, y: fy + 0.5, dir: s.dir });
      }
      // luminárias penduradas
      for (const lx of [-9, 0, 9]) {
        k.cyl(0.02, 0.02, 3, 0xaaaaaa, r.cx + lx, fy + 7.5, r.side * 20, 4);
        k.sphere(0.45, 0xfff1b0, r.cx + lx, fy + 6.0, r.side * 20);
      }
    }
    // praça de convivência: sofás, palco e telão
    const L = LOUNGE_ZONE;
    k.box(L.zone.x1 - L.zone.x0 - 6, 0.5, 8, 0xf2c8de, L.cx, fy + 0.25, 32);
    solids.push({ x: L.cx, z: 32, base: fy, top: fy + 0.5, hw: (L.zone.x1 - L.zone.x0 - 6) / 2, hd: 4 });
    const tv = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(14, 6.4)), k.basic(0x2d1b55));
    tv.position.set(L.cx, fy + 5.2, 43.5);
    tv.rotation.y = Math.PI;
    g.add(tv);
    const tvText = signPlane(k, "🎵 Praça de Convivência", 12, "#fff6c2", "rgba(45,27,85,0.95)", "#e9b84a", 5);
    tvText.position.set(L.cx, fy + 5.2, 43.1);
    tvText.rotation.y = Math.PI;
    g.add(tvText);
    for (const sx of [-12, 12]) {
      for (const sz of [14, 22]) {
        k.box(5, 0.7, 1.8, 0xd96fa8, L.cx + sx, fy + 0.35, sz);
        k.box(5, 1.2, 0.35, 0xc2578f, L.cx + sx, fy + 0.95, sz - 0.9);
        solids.push({ x: L.cx + sx, z: sz, base: fy, top: fy + 0.55, hw: 2.5, hd: 0.9 });
        seats.push({ x: L.cx + sx - 1.3, z: sz, y: fy + 0.55, dir: sx < 0 ? 1 : -1 }, { x: L.cx + sx + 1.3, z: sz, y: fy + 0.55, dir: sx < 0 ? 1 : -1 });
      }
    }
    const fsign = signPlane(k, "🍽 PRAÇA DE ALIMENTAÇÃO", 12, "#fff6c2", "rgba(160,60,20,0.95)", "#ffd23f", 5);
    fsign.position.set(0, fy + 5.6, ATRIUM.z1 + 0.6);
    fsign.rotation.y = Math.PI;
    g.add(fsign);
    // telhado de vidro com vigas
    const roof = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(HX * 2, 88)), k.basic(0xc7e6ff, 0.55));
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, fy + FLOOR_H - 0.5, 0);
    g.add(roof);
    for (let i = -5; i <= 5; i++) k.box(0.5, 0.5, 88, 0xdedede, i * 11, fy + FLOOR_H - 0.55, 0);
  }

  // ---- brilho no ar e céu
  const dust = addPoints(k, 220, { x: 0, y: 1, z: 0, w: HX * 2 - 6, h: FLOOR_H * 4.4, d: 38 }, 0xfff0b8, 0.24);
  animated.push((t) => {
    dust.position.y = Math.sin(t * 0.4) * 0.25;
  });

  const world = concourseWorld({ solids, posts });
  const spawnPt = { x: 0, z: -12, y: 0, yaw: Math.PI };
  return {
    key: "mall",
    group: g,
    world,
    interacts,
    seats,
    spawn: spawnPt,
    items: [],
    clear: 0xdcecff,
    fog: [0xdcecff, 40, 120],
    update: (t, dt, me) => {
      for (const a of animated) a(t, dt, me);
    },
    setOwned: () => undefined,
    setOffers: () => undefined,
    setBubble: () => undefined,
    setMirror: () => undefined,
    dispose: () => k.dispose(),
  };
}

const hexAlpha = (n: number, a = 0.93): string => {
  const r = (n >> 16) & 255;
  const gg = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${gg},${b},${a})`;
};

// ------------------------------------------------------------------ o interior de uma loja (do tamanho do salão de partidas)
export function buildStore(def: StoreDef, opts: MallOpts): Place {
  const k = new Kit();
  const g = k.group;
  const HW = STORE_HW;
  const HL = STORE_HL;
  const H = 8.5;
  const interacts: Interact[] = [];
  const seats: Seat[] = [];
  const solids: Solid[] = [];
  const posts: Post[] = [];
  const animated: ((t: number, dt: number) => void)[] = [];
  const slots = def.slots ?? [];
  const shelves = storeShelves(slots);

  // chão, paredes, teto
  const wood = k.track(woodTex([hex(def.color), hex(shade(def.color, 0.92)), hex(shade(def.color, 0.85)), hex(shade(def.color, 0.97))]));
  wood.repeat.set(HW / 2.5, HL / 2.5);
  const floor = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(HW * 2, HL * 2)), k.track(new THREE.MeshLambertMaterial({ map: wood })));
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  const wallCol = shade(def.color, 1.12);
  k.box(HW * 2 + 1, H, 0.6, wallCol, 0, H / 2, -HL - 0.3);
  k.box(HW * 2 + 1, H, 0.6, wallCol, 0, H / 2, HL + 0.3);
  k.box(0.6, H, HL * 2, wallCol, -HW - 0.3, H / 2, 0);
  k.box(0.6, H, HL * 2, wallCol, HW + 0.3, H / 2, 0);
  k.box(HW * 2, 0.5, HL * 2, 0xfff7ee, 0, H + 0.25, 0);
  k.box(HW * 2 + 1, 0.5, 0.7, def.accent, 0, 0.25, -HL - 0.25);
  // colunas e janelas
  for (const z of [-HL + 8, -HL + 20, 0, HL - 20]) {
    for (const x of [-9, 9]) {
      k.cyl(0.55, 0.65, H, 0xffffff, x, H / 2, z);
      k.cyl(0.9, 1.0, 0.5, 0xe9b84a, x, 0.25, z);
      posts.push({ x, z, r: 1.0, base: 0, height: H });
    }
  }
  for (let i = 0; i < 6; i++) {
    const wz = -HL + 10 + i * 8.4;
    for (const sx of [-1, 1] as const) {
      const win = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(4, 5)), k.basic(0xbfe3ff, 0.85));
      win.position.set(sx * (HW - 0.02), 4.4, wz);
      win.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(win);
    }
  }
  // tapete e lustres
  const rugTex = k.track(tileTexture(hex(shade(def.accent, 1.5)), hex(shade(def.accent, 1.65))));
  rugTex.repeat.set(3, 9);
  const rug = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(9, 26)), k.track(new THREE.MeshLambertMaterial({ map: rugTex })));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.02, 2);
  g.add(rug);
  for (const cz of [-14, 0, 14]) {
    k.cyl(0.03, 0.03, 2, 0xe9b84a, 0, H - 1, cz, 4);
    const ring = new THREE.Mesh(k.geo(new THREE.TorusGeometry(1.5, 0.08, 8, 24)), k.mat(0xe9b84a));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, H - 2, cz);
    g.add(ring);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.sphere(0.16, 0xfff3b0, Math.cos(a) * 1.5, H - 2, cz + Math.sin(a) * 1.5);
    }
  }

  // letreiro grande na parede do fundo
  const title = spriteOf(k, k.track(asTex(labelCanvas(def.name, 1024, 220, "#ffffff", hexAlpha(def.accent, 0.95), "#ffe08a", 110, def.icon))), 13, 2.8, false);
  title.position.set(0, 7.0, -HL + 0.6);
  g.add(title);

  // prateleiras
  const shelfBack = k.mat(shade(def.color, 1.08));
  const board = k.mat(0xffffff);
  const trim = k.mat(def.accent);
  for (const u of shelves.units) {
    const grp = new THREE.Group();
    grp.position.set(u.x, 0, u.z);
    const back = new THREE.Mesh(k.geo(new THREE.BoxGeometry(0.12, 5.3, SHELF_SPACING - 0.08)), shelfBack);
    back.position.set(-u.face * 0.42, 2.65, 0);
    grp.add(back);
    for (let t = 0; t < SHELF_TIERS; t++) {
      const b = new THREE.Mesh(k.geo(new THREE.BoxGeometry(0.95, 0.09, SHELF_SPACING - 0.08)), board);
      b.position.set(0, 0.42 + t * 1.2, 0);
      grp.add(b);
    }
    const top = new THREE.Mesh(k.geo(new THREE.BoxGeometry(1, 0.12, SHELF_SPACING - 0.04)), trim);
    top.position.set(0, 5.3, 0);
    grp.add(top);
    const base = new THREE.Mesh(k.geo(new THREE.BoxGeometry(0.95, 0.4, SHELF_SPACING - 0.08)), trim);
    base.position.set(0, 0.2, 0);
    grp.add(base);
    g.add(grp);
  }
  for (const s of shelves.signs) {
    const pl = signPlane(k, s.text, 4.6, "#5b1f78", "rgba(255,255,255,0.95)", "#e9b84a", 4, s.icon);
    pl.position.set(-s.face * (HW - 0.12), 6.5, s.z);
    pl.rotation.y = s.face === 1 ? Math.PI / 2 : -Math.PI / 2;
    g.add(pl);
  }
  // etiquetas de preço (compartilhadas): 💜 épica, ⭐ lendária, ✔ já é sua
  const badgeTex = {
    epic: k.track(asTex(labelCanvas("💜 60", 200, 90, "#ffffff", "rgba(122,60,178,0.95)", "#e9d0ff", 46))),
    legend: k.track(asTex(labelCanvas("⭐ 150", 200, 90, "#3a2600", "rgba(255,210,63,0.97)", "#fff2a8", 46))),
    owned: k.track(asTex(labelCanvas("✔ sua", 200, 90, "#ffffff", "rgba(42,157,74,0.95)", "#c8f5d4", 46))),
  };
  const badgeMat = {
    epic: planeMat(k, badgeTex.epic),
    legend: planeMat(k, badgeTex.legend),
    owned: planeMat(k, badgeTex.owned),
  };
  const placeholder = k.track(new THREE.SpriteMaterial({ color: 0xe8d4e0, transparent: true, opacity: 0.55, depthWrite: false }));
  const items: ItemSprite[] = [];
  const ownedNow = new Set(opts.owned);
  for (const p of shelves.placed) {
    const ratio = SLOT_VIEWBOX_RATIO[p.slot];
    const hh = itemHeight(p.slot);
    const ww = Math.min(SHELF_SPACING * 0.86, hh * ratio);
    const hFinal = ww / ratio;
    const sp = new THREE.Sprite(placeholder);
    sp.scale.set(ww * 0.8, hFinal * 0.8, 1);
    sp.position.set(p.x, p.y - (hh - hFinal) / 2, p.z);
    g.add(sp);
    // etiqueta de preço na base da prateleira, embaixo de cada peça
    const badge = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(0.8, 0.36)), ownedNow.has(p.family) ? badgeMat.owned : badgeMat[p.rarity]);
    badge.rotation.y = p.face * (Math.PI / 2);
    badge.position.set(p.x + p.face * 0.55, p.board - 0.04, p.z);
    g.add(badge);
    items.push({ key: `${p.slot}:${p.item.id}`, itemId: p.item.id, slot: p.slot, sprite: sp, w: ww, h: hFinal, x: p.x, y: p.y - (hh - hFinal) / 2, z: p.z, face: p.face, loaded: false, loading: false, badge, family: p.family, price: p.price });
    interacts.push({ kind: "item", itemId: p.item.id, slot: p.slot, family: p.family, label: p.item.name.split(" (")[0], ay: p.y, x: p.x + p.face * 1.6, y: 0, z: p.z, rx: 2.4, rz: SHELF_SPACING / 2 + 0.1 });
  }

  // espelhos de corpo inteiro (mostram a avatar de verdade)
  const mirrorCanvas = document.createElement("canvas");
  mirrorCanvas.width = 256;
  mirrorCanvas.height = 512;
  const mirrorTex = k.track(asTex(mirrorCanvas));
  const drawMirror = (src: HTMLCanvasElement | null) => {
    const gg = mirrorCanvas.getContext("2d")!;
    const grad = gg.createLinearGradient(0, 0, 256, 512);
    grad.addColorStop(0, "#eaf4ff");
    grad.addColorStop(1, "#e7d8f7");
    gg.fillStyle = grad;
    gg.fillRect(0, 0, 256, 512);
    if (src) {
      const dh = 340;
      const dw = (dh * src.width) / src.height;
      gg.drawImage(src, (256 - dw) / 2, 512 - dh - 8, dw, dh);
    }
    gg.fillStyle = "rgba(255,255,255,0.3)";
    gg.beginPath();
    gg.moveTo(0, 0);
    gg.lineTo(130, 0);
    gg.lineTo(0, 170);
    gg.fill();
    mirrorTex.needsUpdate = true;
  };
  drawMirror(null);
  for (const mx of [-7, 7]) {
    k.box(3.2, 4.8, 0.3, 0xe9b84a, mx, 2.6, -HL + 0.4);
    const m = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(2.7, 4.3)), k.track(new THREE.MeshBasicMaterial({ map: mirrorTex })));
    m.position.set(mx, 2.6, -HL + 0.58);
    g.add(m);
  }
  const mirrorLbl = signPlane(k, "🪞 Veja como ficou", 4.4, "#5b1f78");
  mirrorLbl.position.set(0, 5.0, -HL + 0.6);
  g.add(mirrorLbl);

  // sofás de descanso (dá para sentar)
  for (const [sx, sz] of [[-6, 10], [6, 10], [-6, -4], [6, -4]] as const) {
    k.box(2.8, 0.55, 1.2, 0xd96fa8, sx, 0.3, sz);
    k.box(2.8, 0.9, 0.3, 0xc2578f, sx, 0.75, sz - 0.5);
    solids.push({ x: sx, z: sz, base: 0, top: 0.55, hw: 1.4, hd: 0.6 });
    seats.push({ x: sx - 0.7, z: sz, y: 0.55, dir: sx < 0 ? 1 : -1 }, { x: sx + 0.7, z: sz, y: 0.55, dir: sx < 0 ? 1 : -1 });
  }
  for (const [px, pz] of [[-13, HL - 3], [13, HL - 3], [-13, -HL + 3], [13, -HL + 3]] as const) {
    k.cyl(0.5, 0.4, 0.8, 0xf5f5f5, px, 0.4, pz, 10);
    k.sphere(1.0, 0x3f8f4f, px, 1.6, pz);
    posts.push({ x: px, z: pz, r: 0.6, base: 0, height: 2.6 });
  }

  // balcão e atendente
  k.box(5.6, 1.3, 1.5, 0xfff0f6, -9, 0.65, HL - 8);
  k.box(5.8, 0.15, 1.7, 0xe9b84a, -9, 1.35, HL - 8);
  posts.push({ x: -10.4, z: HL - 8, r: 1.2, base: 0, height: 1.3 }, { x: -7.6, z: HL - 8, r: 1.2, base: 0, height: 1.3 });
  const nameTag = signPlane(k, `${def.attendant} · atendente`, 4.2, "#5b1f78", "rgba(255,255,255,0.95)", "#e9b84a", 5);
  nameTag.position.set(-9, 3.6, HL - 8);
  nameTag.rotation.y = Math.PI;
  g.add(nameTag);
  const bubbleCanvas = document.createElement("canvas");
  bubbleCanvas.width = 640;
  bubbleCanvas.height = 220;
  const bubbleTex = k.track(asTex(bubbleCanvas));
  const bubble = spriteOf(k, bubbleTex, 5.2, 1.8, false);
  bubble.position.set(-9, 5.0, HL - 9.3);
  g.add(bubble);
  let lines: string[] = [];
  let lineIdx = 0;
  let lineT = 99;
  const drawBubble = (text: string) => {
    const gg = bubbleCanvas.getContext("2d")!;
    gg.clearRect(0, 0, 640, 220);
    gg.fillStyle = "rgba(255,255,255,0.97)";
    gg.beginPath();
    gg.roundRect(8, 8, 624, 170, 36);
    gg.fill();
    gg.beginPath();
    gg.moveTo(280, 176);
    gg.lineTo(310, 214);
    gg.lineTo(340, 176);
    gg.fill();
    gg.strokeStyle = "#e9b84a";
    gg.lineWidth = 6;
    gg.beginPath();
    gg.roundRect(8, 8, 624, 170, 36);
    gg.stroke();
    gg.fillStyle = "#5b1f78";
    gg.textAlign = "center";
    gg.textBaseline = "middle";
    gg.font = "800 38px system-ui, sans-serif";
    const words = text.split(" ");
    const rows: string[] = [];
    let cur = "";
    for (const w of words) {
      if (gg.measureText(`${cur} ${w}`).width > 570 && cur) {
        rows.push(cur);
        cur = w;
      } else cur = cur ? `${cur} ${w}` : w;
    }
    rows.push(cur);
    const lh = 46;
    const y0 = 93 - ((rows.length - 1) * lh) / 2;
    rows.forEach((r, i) => gg.fillText(r, 320, y0 + i * lh));
    bubbleTex.needsUpdate = true;
  };
  drawBubble(`Bem-vinda à ${def.name}!`);

  // saída
  k.box(7, 6.2, 0.4, 0xa5d6f2, 0, 3.1, HL - 0.1, g, 0.55);
  const exitSign = signPlane(k, "🚪 SAÍDA", 4, "#1f6b2e", "rgba(255,255,255,0.95)", "#2a9d4a");
  exitSign.position.set(0, 5.2, HL - 0.4);
  exitSign.rotation.y = Math.PI;
  g.add(exitSign);
  interacts.push({ kind: "exit", label: "🚪 Sair da loja", x: 0, y: 0, z: HL - 2.6, rx: 3.6, rz: 2.4 });

  // peças raras do dia (um pedestal para cada oferta cujo espaço esta loja vende)
  const rareGroup = new THREE.Group();
  g.add(rareGroup);
  let rareSprites: { sp: THREE.Sprite; tag: THREE.Mesh; glow: THREE.Sprite; id: number }[] = [];
  const glowTex = k.track(
    (() => {
      const [c, gg] = canvasOf(128, 128);
      const grad = gg.createRadialGradient(64, 64, 4, 64, 64, 62);
      grad.addColorStop(0, "rgba(255,224,102,0.95)");
      grad.addColorStop(1, "rgba(255,224,102,0)");
      gg.fillStyle = grad;
      gg.fillRect(0, 0, 128, 128);
      return asTex(c);
    })(),
  );
  let rarePosts: Post[] = [];
  let offersNow: RareOffer[] = [];
  const relevant = (o: RareOffer) => {
    const it = offerItem(o.family);
    return !!it && slots.includes(it.slot);
  };
  const layoutRares = (offers: RareOffer[]) => {
    offersNow = offers;
    for (let i = interacts.length - 1; i >= 0; i--) if (interacts[i].kind === "rare") interacts.splice(i, 1);
    for (let i = items.length - 1; i >= 0; i--) if (items[i].key.startsWith("rare:")) items.splice(i, 1);
    for (const p of rarePosts) {
      const at = posts.indexOf(p);
      if (at >= 0) posts.splice(at, 1);
    }
    rarePosts = [];
    for (const r of rareSprites) {
      (r.tag.material as THREE.SpriteMaterial).map?.dispose();
      (r.tag.material as THREE.SpriteMaterial).dispose();
    }
    rareSprites = [];
    for (const c of [...rareGroup.children]) rareGroup.remove(c);
    const mine = offers.filter(relevant);
    mine.forEach((o, i) => {
      const it = offerItem(o.family)!;
      const px = (i - (mine.length - 1) / 2) * 5.2;
      const pz = HL - 18;
      const ped = new THREE.Mesh(k.geo(new THREE.CylinderGeometry(1.1, 1.3, 1.2, 20)), k.mat(0xe9b84a));
      ped.position.set(px, 0.6, pz);
      rareGroup.add(ped);
      const top = new THREE.Mesh(k.geo(new THREE.CylinderGeometry(1.25, 1.25, 0.14, 20)), k.mat(0xfff0b8, { emissive: 0x3a2a00 }));
      top.position.set(px, 1.27, pz);
      rareGroup.add(top);
      const ratio = SLOT_VIEWBOX_RATIO[it.slot];
      const hh = it.slot === "tunic" || it.slot === "mantle" ? 2.5 : it.slot === "head" ? 1.5 : 1.3;
      const sp = new THREE.Sprite(placeholder);
      sp.scale.set(hh * ratio * 0.8, hh * 0.8, 1);
      sp.position.set(px, 1.34 + hh / 2 + 0.2, pz);
      rareGroup.add(sp);
      const glow = new THREE.Sprite(k.track(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.85, blending: THREE.AdditiveBlending })));
      glow.scale.set(hh * 2.2, hh * 2.2, 1);
      glow.position.copy(sp.position);
      rareGroup.add(glow);
      const sold = o.left <= 0;
      const label = o.mine ? `✔ Você já tem` : sold ? "ESGOTADA" : `🔥 ${o.price} 🎫 · restam ${o.left}`;
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.9), new THREE.MeshBasicMaterial({ map: asTex(labelCanvas(label, 512, 120, "#ffffff", sold ? "rgba(90,90,100,0.95)" : "rgba(190,40,70,0.96)", "#ffe08a", 54)), transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }));
      tag.position.set(px, 1.3 + hh + 0.75, pz);
      rareGroup.add(tag);
      const title = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.7), new THREE.MeshBasicMaterial({ map: asTex(labelCanvas(it.name, 512, 100, "#5b1f78", "rgba(255,255,255,0.96)", "#e9b84a", 46)), transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }));
      title.position.set(px, 1.3 + hh + 1.5, pz);
      rareGroup.add(title);
      rareSprites.push({ sp, tag, glow, id: o.id });
      const post: Post = { x: px, z: pz, r: 1.2, base: 0, height: 1.3 };
      posts.push(post);
      rarePosts.push(post);
      interacts.push({ kind: "rare", offerId: o.id, label: `🔥 Peça rara: ${it.name}`, x: px, y: 0, z: pz + 2.2, rx: 2.6, rz: 2.0 });
      // a textura da peça chega do banco (ver ShoppingWorld3D): ela procura o sprite pela chave rare:<id>
      items.push({ key: `rare:${o.id}`, itemId: it.id, slot: it.slot, sprite: sp, w: hh * ratio, h: hh, x: px, y: 1.34 + hh / 2 + 0.2, z: pz, face: 0, loaded: false, loading: false, badge: null, family: o.family, price: o.price });
    });
    // atendente avisa
    const rareHere = mine.filter((o) => o.left > 0 && !o.mine);
    const rareNames = mine.map((o) => offerItem(o.family)?.name ?? "peça rara");
    const elsewhere = offers.filter((o) => !relevant(o) && o.left > 0).map((o) => {
      const it = offerItem(o.family);
      const st = it ? storesSelling(it.slot)[0] : undefined;
      return st ? `${it?.name} na loja ${st.name} (${st.floor === 0 ? "térreo" : `${st.floor}º andar`})` : "";
    }).filter(Boolean);
    const nl: string[] = [`Bem-vinda à ${def.name}! Pode provar à vontade.`];
    if (mine.length) nl.unshift(rareHere.length ? `✨ Hoje temos peça RARA aqui: ${rareNames.join(" e ")}! Só 3 unidades por 24 horas!` : `Hoje a nossa peça rara (${rareNames.join(", ")}) já esgotou ou já é sua.`);
    else if (elsewhere.length) nl.push(`Hoje não temos peça rara por aqui, mas tem: ${elsewhere[0]}.`);
    nl.push("Peças 💜 custam 60 bilhetes e as ⭐ custam 150.");
    lines = nl;
    lineIdx = 0;
    lineT = 99;
  };
  layoutRares(opts.offers);

  const world = storeWorld(HW, HL, { solids, posts });
  return {
    key: `s:${def.id}`,
    group: g,
    world,
    interacts,
    seats,
    spawn: { x: 0, z: HL - 5.5, y: 0, yaw: 0 },
    items,
    clear: 0xf1dfe9,
    fog: [0xf1dfe9, 30, 75],
    update: (t, dt) => {
      for (const a of animated) a(t, dt);
      lineT += dt;
      if (lines.length && lineT > 5.2) {
        lineT = 0;
        drawBubble(lines[lineIdx % lines.length]);
        lineIdx++;
      }
      for (const r of rareSprites) {
        r.glow.material.opacity = 0.6 + Math.sin(t * 3 + r.id) * 0.25;
        r.sp.position.y += Math.sin(t * 2 + r.id) * 0.0015;
      }
    },
    setOwned: (owned) => {
      ownedNow.clear();
      for (const f of owned) ownedNow.add(f);
      for (const it of items) if (it.badge) it.badge.material = ownedNow.has(it.family) ? badgeMat.owned : badgeMat[it.price >= 150 ? "legend" : "epic"];
    },
    setOffers: (offers) => layoutRares(offers),
    setBubble: (l) => {
      if (l.length) {
        lines = l;
        lineIdx = 0;
        lineT = 99;
      }
    },
    setMirror: (c) => drawMirror(c),
    dispose: () => {
      void offersNow;
      k.dispose();
    },
  };
}

/** Cor mais clara/escura (fator > 1 clareia). */
function shade(n: number, f: number): number {
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const gg = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return (r << 16) | (gg << 8) | b;
}

export type { Rect };
