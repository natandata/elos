// Desenho 3D de A Última Tribo (Three.js), no clima de um battle royale de campo aberto:
// dia claro, colinas, capim alto, árvores folhosas e sobreviventes com capacete, mochila e arma nas costas.
// Só mostra o estado da simulação (sim.ts); nenhuma regra mora aqui.
import * as THREE from "three";
import { PLANE_ALT, type Actor, type Game } from "./sim";
import { HALF, HM_N, heightAt, rayBoxes, zoneAt, type Building, type Container, type World } from "./world";

const SKIN = [0xe0b08a, 0xc68a5e, 0x8f6040, 0xf0c8a2, 0x70482c];
const GRASS_N = 2600;
const GRASS_R = 44;

const lam = (color: number, map?: THREE.Texture) => new THREE.MeshLambertMaterial({ color, map });
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sorteio fixo por posição (o capim e as manchas ficam sempre no mesmo lugar). */
const hash = (x: number, z: number) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  thighL: THREE.Group;
  thighR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  foreL: THREE.Group;
  foreR: THREE.Group;
  pack: THREE.Mesh;
  vest: THREE.Mesh;
  helmet: THREE.Mesh;
  hand: Record<string, THREE.Object3D>;
  back: Record<string, THREE.Object3D>;
  chute: THREE.Group;
  mats: THREE.MeshLambertMaterial[];
  tag: THREE.Sprite;
  tagKey: string;
  shadow: THREE.Mesh;
  phase: number;
  fall: number;
  crouch: number;
  prone: number;
  aim: number;
};

export class Renderer {
  private r: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(70, 1, 0.25, 1400);
  private sky!: THREE.Mesh;
  private rigs = new Map<number, Rig>();
  private loot = new Map<number, THREE.Group>();
  private loreMeshes = new Map<number, THREE.Mesh>();
  private zoneWall!: THREE.Mesh;
  private zoneTex!: THREE.CanvasTexture;
  private planeMesh!: THREE.Group;
  private grass!: THREE.InstancedMesh;
  private grassAt = { x: 1e9, z: 1e9 };
  private tracers: { line: THREE.Line; t: number }[] = [];
  private puffs: { m: THREE.Mesh; t: number; life: number; grow: number; rise: number }[] = [];
  private nades = new Map<number, THREE.Mesh>();
  private flames: THREE.Mesh[] = [];
  private smokes: { m: THREE.Mesh; cid: number; off: number }[] = [];
  private camo!: THREE.CanvasTexture;
  private clock = 0;
  private fov = 70;
  private camDist = 4.2;
  private w: World;

  constructor(
    canvas: HTMLCanvasElement,
    private game: Game,
  ) {
    this.w = game.world;
    const mobile = matchMedia("(pointer: coarse)").matches;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
    this.r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.4 : 2));
    this.scene.background = new THREE.Color(0xcfe0ee);
    this.scene.fog = new THREE.Fog(0xcfe0ee, 70, 430);
    this.scene.add(new THREE.HemisphereLight(0xe6f1ff, 0x8a8f66, 2.3));
    const sun = new THREE.DirectionalLight(0xfff2d6, 3.1);
    sun.position.set(-140, 220, -90);
    this.scene.add(sun);
    this.camo = this.camoTex();
    this.buildSky();
    this.buildGround();
    this.buildHorizon();
    this.buildBuildings();
    this.buildProps();
    this.buildGrass();
    for (const c of this.w.containers) this.addLoot(c);
    for (const l of this.w.lore) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.56), new THREE.MeshBasicMaterial({ color: 0xffe07a }));
      m.position.set(l.x, this.gy(l.x, l.z) + 0.9, l.z);
      this.scene.add(m);
      this.loreMeshes.set(l.id, m);
    }
    for (const a of game.actors) this.rigs.set(a.id, this.buildActor(a));
    this.buildZoneWall();
    this.buildPlane();
    this.resize();
  }

  private gy(x: number, z: number): number {
    return heightAt(this.w, x, z);
  }

  // ---------------------------------------------------------------- texturas
  private camoTex(): THREE.CanvasTexture {
    const t = canvasTexture(128, 128, (c) => {
      c.fillStyle = "#5a6142";
      c.fillRect(0, 0, 128, 128);
      const cols = ["#3d452c", "#787a52", "#2a2f20", "#8a8560"];
      for (let i = 0; i < 70; i++) {
        c.fillStyle = cols[i % cols.length];
        c.beginPath();
        c.ellipse(Math.random() * 128, Math.random() * 128, 6 + Math.random() * 16, 4 + Math.random() * 9, Math.random() * 3, 0, 6.3);
        c.fill();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  private foliageTex(tall: boolean, pine: boolean): THREE.CanvasTexture {
    const W = tall ? 128 : 256;
    const H = 256;
    return canvasTexture(W, H, (c) => {
      const greens = pine ? ["#2f4a2a", "#3a5a30", "#27401f", "#466a38"] : ["#5f8a34", "#739c3c", "#4c7429", "#8aa84a", "#3f6424"];
      for (let i = 0; i < (tall ? 150 : 260); i++) {
        // copa: mais cheia no meio, rala nas bordas
        const a = Math.random() * 6.28;
        const rr = Math.sqrt(Math.random());
        const x = W / 2 + Math.cos(a) * rr * W * 0.44;
        const y = H * 0.47 + Math.sin(a) * rr * H * (tall ? 0.45 : 0.4);
        c.fillStyle = greens[Math.floor(Math.random() * greens.length)];
        c.globalAlpha = 0.9;
        c.beginPath();
        c.arc(x, y, (tall ? 7 : 11) + Math.random() * (tall ? 9 : 16), 0, 6.3);
        c.fill();
        if (y / H > 0.55) {
          c.fillStyle = "rgba(20,30,10,0.18)";
          c.fill();
        }
      }
      c.globalAlpha = 1;
      // luz no topo
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(255,255,200,0.22)");
      g.addColorStop(0.5, "rgba(255,255,200,0)");
      c.globalCompositeOperation = "source-atop";
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    });
  }

  // ---------------------------------------------------------------- céu, chão e horizonte
  private buildSky() {
    const tex = canvasTexture(1024, 512, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#5f93cf");
      g.addColorStop(0.45, "#9cc2e6");
      g.addColorStop(0.62, "#d6e6f2");
      g.addColorStop(1, "#d6e6f2");
      c.fillStyle = g;
      c.fillRect(0, 0, 1024, 512);
      // nuvens: montes de bolas brancas com a base levemente cinza
      for (let k = 0; k < 26; k++) {
        const cx = Math.random() * 1024;
        const cy = 40 + Math.random() * 230;
        const s = 0.5 + Math.random() * 1.3;
        for (let i = 0; i < 16; i++) {
          const x = cx + (Math.random() - 0.5) * 150 * s;
          const y = cy + (Math.random() - 0.5) * 34 * s;
          const rr = (14 + Math.random() * 26) * s;
          const gr = c.createRadialGradient(x, y - rr * 0.3, rr * 0.1, x, y, rr);
          gr.addColorStop(0, "rgba(255,255,255,0.85)");
          gr.addColorStop(0.7, "rgba(238,243,248,0.5)");
          gr.addColorStop(1, "rgba(225,232,240,0)");
          c.fillStyle = gr;
          for (const ox of [0, -1024, 1024]) {
            c.beginPath();
            c.arc(x + ox, y, rr, 0, 6.3);
            c.fill();
          }
        }
      }
    });
    tex.wrapS = THREE.RepeatWrapping;
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
  }

  private buildGround() {
    const w = this.w;
    const S = 2048;
    const k = S / (HALF * 2);
    const px = (x: number) => (x + HALF) * k;
    const tex = canvasTexture(S, S, (c) => {
      // capim: base verde-amarelada com manchas, como um campo aberto
      c.fillStyle = "#86923f";
      c.fillRect(0, 0, S, S);
      const patch = (n: number, cols: string[], lo: number, hi: number, alpha: number) => {
        for (let i = 0; i < n; i++) {
          c.fillStyle = cols[i % cols.length];
          c.globalAlpha = alpha * (0.5 + Math.random() * 0.5);
          c.beginPath();
          c.ellipse(Math.random() * S, Math.random() * S, lo + Math.random() * (hi - lo), (lo + Math.random() * (hi - lo)) * 0.6, Math.random() * 3.1, 0, 6.3);
          c.fill();
        }
        c.globalAlpha = 1;
      };
      patch(700, ["#74873a", "#93a049", "#6d7f35", "#a3a856"], 30, 110, 0.5);
      patch(260, ["#a89a5c", "#9c8c52", "#b3a468"], 20, 80, 0.4); // capim seco
      patch(120, ["#8a7450", "#7d6846"], 18, 60, 0.45); // terra
      const zone = (key: string, color: string, alpha = 1) => {
        const z = w.zones.find((q) => q.key === key)!;
        c.globalAlpha = alpha;
        c.fillStyle = color;
        c.fillRect(px(z.x0), px(z.z0), (z.x1 - z.x0) * k, (z.z1 - z.z0) * k);
        c.globalAlpha = 1;
      };
      zone("floresta", "#55692f", 0.45);
      zone("fazenda", "#a08a55", 0.35);
      zone("fabrica", "#8a8780");
      zone("cidade", "#6a6a6c");
      // calçadas dos quarteirões
      c.fillStyle = "#96938b";
      for (let bx = 0; bx < 6; bx++) for (let bz = 0; bz < 4; bz++) c.fillRect(px(-18 + bx * 44 - 17), px(-202 + bz * 46 - 17), 34 * k, 34 * k);
      // rodovia com faixas
      c.fillStyle = "#47474a";
      c.fillRect(0, px(-9), S, 18 * k);
      c.fillStyle = "#e0c04a";
      for (let x = 0; x < S; x += 34) c.fillRect(x, px(-0.25), 18, 0.5 * k);
      c.fillStyle = "#d8d8d0";
      c.fillRect(0, px(-8.4), S, 0.35 * k);
      c.fillRect(0, px(8.05), S, 0.35 * k);
      // estradas de terra ligando os lugares
      c.strokeStyle = "#a08a62";
      c.lineCap = "round";
      c.lineWidth = 5 * k;
      const road = (pts: [number, number][]) => {
        c.beginPath();
        pts.forEach(([x, z], i) => (i ? c.lineTo(px(x), px(z)) : c.moveTo(px(x), px(z))));
        c.stroke();
      };
      road([
        [-10, 10],
        [-12, 60],
        [-10, 108],
      ]);
      road([
        [-150, 10],
        [-145, 50],
        [-150, 88],
      ]);
      road([
        [70, 10],
        [66, 90],
        [70, 176],
      ]);
      road([
        [-150, -10],
        [-140, -70],
        [-150, -130],
      ]);
      // acampamento: chão batido
      c.fillStyle = "#9a8056";
      c.beginPath();
      c.arc(px(70), px(192), 22 * k, 0, 6.3);
      c.fill();
      // plantações em fileiras
      for (const p of w.props)
        if (p.kind === "plantacao") {
          c.fillStyle = "#7a6642";
          c.fillRect(px(p.x - p.s / 2), px(p.z - p.rot / 2), p.s * k, p.rot * k);
          c.fillStyle = "#6f9a3a";
          for (let z = p.z - p.rot / 2 + 1; z < p.z + p.rot / 2; z += 2.4) c.fillRect(px(p.x - p.s / 2 + 1), px(z), (p.s - 2) * k, 0.9 * k);
        }
      // grão fino
      for (let i = 0; i < 26000; i++) {
        c.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,250,200,0.06)";
        const s = 1 + Math.random() * 3;
        c.fillRect(Math.random() * S, Math.random() * S, s, s);
      }
    });
    tex.anisotropy = 8;
    // a malha usa a mesma grade do relevo: o chão desenhado bate com a altura dos bonecos
    const N = HM_N - 1;
    const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, N, N);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.gy(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    this.scene.add(new THREE.Mesh(geo, lam(0xffffff, tex)));
    // além da borda: campo liso até o horizonte
    const far = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), lam(0x7f8c3e));
    far.rotation.x = -Math.PI / 2;
    far.position.y = -0.6;
    this.scene.add(far);
  }

  /** Morros e mata ao longe, para o horizonte não ficar vazio. */
  private buildHorizon() {
    const geo = new THREE.SphereGeometry(1, 10, 6);
    const n = 46;
    const m = new THREE.InstancedMesh(geo, lam(0xffffff), n);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash(i, 3) * 0.2;
      const rr = 330 + hash(i, 7) * 260;
      const s = 50 + hash(i, 11) * 90;
      d.position.set(Math.cos(a) * rr, -8, Math.sin(a) * rr);
      d.scale.set(s * 1.6, 14 + hash(i, 5) * 30, s);
      d.rotation.y = a;
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, col.setHex(hash(i, 2) < 0.5 ? 0x5f7a3a : 0x6f8846));
    }
    this.scene.add(m);
  }

  // ---------------------------------------------------------------- construções
  private wallTex(base: number, kind: "casa" | "predio" | "galpao"): THREE.CanvasTexture {
    const t = canvasTexture(128, 128, (c) => {
      c.fillStyle = hex(base);
      c.fillRect(0, 0, 128, 128);
      // manchas de tempo
      for (let i = 0; i < 40; i++) {
        c.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";
        c.fillRect(Math.random() * 128, Math.random() * 128, 8 + Math.random() * 30, 4 + Math.random() * 14);
      }
      if (kind === "predio") {
        for (let x = 0; x < 4; x++)
          for (let y = 0; y < 4; y++) {
            c.fillStyle = Math.random() < 0.12 ? "#0c0f14" : "#2b3440";
            c.fillRect(8 + x * 32, 8 + y * 32, 18, 20);
            c.fillStyle = "rgba(255,255,255,0.14)";
            c.fillRect(8 + x * 32, 8 + y * 32, 18, 5);
          }
      } else if (kind === "casa") {
        c.fillStyle = "#2b3440";
        c.fillRect(18, 34, 30, 34);
        c.fillRect(80, 34, 30, 34);
        c.strokeStyle = "#e9e4d6";
        c.lineWidth = 3;
        c.strokeRect(18, 34, 30, 34);
        c.strokeRect(80, 34, 30, 34);
        c.fillStyle = "rgba(0,0,0,0.12)";
        c.fillRect(0, 112, 128, 16);
      } else {
        c.strokeStyle = "rgba(0,0,0,0.18)";
        c.lineWidth = 2;
        for (let x = 0; x < 128; x += 16) {
          c.beginPath();
          c.moveTo(x, 0);
          c.lineTo(x, 128);
          c.stroke();
        }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  private buildBuildings() {
    const add = (o: THREE.Object3D) => this.scene.add(o);
    const walls = (b: Building, kind: "casa" | "predio" | "galpao", unit: number) => {
      const y0 = this.gy((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
      const side = (len: number) => {
        const t = this.wallTex(b.color, kind);
        t.repeat.set(Math.max(1, Math.round(len / unit)), Math.max(1, Math.round(b.h / unit)));
        return lam(0xffffff, t);
      };
      const top = lam(0x55575a);
      const sx = side(b.z1 - b.z0);
      const sz = side(b.x1 - b.x0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, b.h + 3, b.z1 - b.z0), [sx, sx, top, top, sz, sz]);
      m.position.set((b.x0 + b.x1) / 2, y0 + (b.h - 3) / 2, (b.z0 + b.z1) / 2);
      add(m);
      return y0;
    };
    const roof = (b: Building, y0: number, h: number, color: number, extra = 0.8) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, h, 4), lam(color));
      m.rotation.y = Math.PI / 4;
      m.scale.set(b.x1 - b.x0 + extra, 1, b.z1 - b.z0 + extra);
      m.position.set((b.x0 + b.x1) / 2, y0 + b.h + h / 2, (b.z0 + b.z1) / 2);
      add(m);
    };
    for (const b of this.w.buildings) {
      const cx = (b.x0 + b.x1) / 2;
      const cz = (b.z0 + b.z1) / 2;
      if (b.kind === "predio") walls(b, "predio", 6.5);
      else if (b.kind === "silo") {
        const y0 = this.gy(cx, cz);
        const rad = (b.x1 - b.x0) / 2;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, b.h + 2, 16), lam(b.color));
        m.position.set(cx, y0 + b.h / 2 - 1, cz);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 6, 0, 6.3, 0, Math.PI / 2), lam(0x9a9a94));
        dome.position.set(cx, y0 + b.h, cz);
        add(m);
        add(dome);
      } else if (b.kind === "conteiner" || b.kind === "muro") {
        const y0 = this.gy(cx, cz);
        const m = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, b.h + 1, b.z1 - b.z0), lam(b.color));
        m.position.set(cx, y0 + (b.h - 1) / 2, cz);
        add(m);
      } else {
        const y0 = walls(b, b.kind === "fabrica" || b.kind === "galpao" || b.kind === "celeiro" ? "galpao" : "casa", b.kind === "fabrica" ? 8 : 5);
        if (b.kind === "casa") roof(b, y0, 2.8, 0x9a4a36);
        if (b.kind === "celeiro") roof(b, y0, 4.6, 0x5a2018);
        if (b.kind === "galpao") roof(b, y0, 1.8, 0x6a6058);
        if (b.kind === "igreja") roof(b, y0, 5, 0x6a4a38);
        if (b.kind === "mercado" || b.kind === "delegacia" || b.kind === "hospital") roof(b, y0, 0.8, 0x4a4c50, 1.2);
        if (b.kind === "torre") {
          roof(b, y0, 7, 0x5a4034, 0.4);
          const cross = lam(0xf0ead8);
          const v = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), cross);
          v.position.set(cx, y0 + b.h + 8.2, cz);
          const h = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.3), cross);
          h.position.set(cx, y0 + b.h + 8.6, cz);
          add(v);
          add(h);
        }
        if (b.kind === "hospital") {
          const red = new THREE.MeshBasicMaterial({ color: 0xc8302a });
          const v = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5, 0.3), red);
          v.position.set(cx, y0 + b.h - 4, b.z1 + 0.1);
          const h = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 0.3), red);
          h.position.set(cx, y0 + b.h - 4, b.z1 + 0.1);
          add(v);
          add(h);
        }
        if (b.kind === "mercado" || b.kind === "delegacia") {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0 + 1.2, 1.2, 1.6), lam(b.kind === "mercado" ? 0xd8553a : 0x2f4f8a));
          stripe.position.set(cx, y0 + 4.2, b.z1 + 0.8);
          add(stripe);
        }
        if (b.kind === "fabrica")
          for (const off of [-0.3, 0.3]) {
            const ch = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 12, 10), lam(0x55575a));
            ch.position.set(cx + (b.x1 - b.x0) * off, y0 + b.h + 6, cz);
            add(ch);
          }
      }
    }
  }

  // ---------------------------------------------------------------- árvores, carros e o resto
  private buildProps() {
    const w = this.w;
    const by = (kind: string) => w.props.filter((p) => p.kind === kind);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    type P = (typeof w.props)[number];
    const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, list: P[], place: (p: P) => void, tint = true) => {
      if (!list.length) return;
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((p, i) => {
        d.position.set(0, 0, 0);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1, 1);
        place(p);
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
        if (tint) m.setColorAt(i, col.setHex(p.color));
      });
      m.instanceMatrix.needsUpdate = true;
      this.scene.add(m);
    };
    const white = () => lam(0xffffff);
    const g = (p: P) => this.gy(p.x, p.z);

    // ---- árvores: tronco + copa em três planos cruzados com textura de folhagem
    const leafy = by("arvore");
    const pines = by("pinheiro");
    // metade dos "pinheiros" vira álamo alto e fino, como no campo
    const poplar = pines.filter((_, i) => i % 2 === 0);
    const pine = pines.filter((_, i) => i % 2 === 1);
    inst(new THREE.CylinderGeometry(0.2, 0.34, 5, 6), lam(0x5c4630), [...leafy, ...pines], (p) => {
      d.position.set(p.x, g(p) + 2.3 * p.s, p.z);
      d.scale.setScalar(p.s);
    }, false);
    const crown = (list: P[], tex: THREE.Texture, wdt: number, hgt: number, cy: number, tint: number[]) => {
      if (!list.length) return;
      const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide });
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(wdt, hgt), mat, list.length * 3);
      list.forEach((p, i) => {
        for (let k = 0; k < 3; k++) {
          d.position.set(p.x, g(p) + cy * p.s, p.z);
          d.rotation.set(0, p.rot + (k * Math.PI) / 3, 0);
          d.scale.setScalar(p.s);
          d.updateMatrix();
          m.setMatrixAt(i * 3 + k, d.matrix);
          m.setColorAt(i * 3 + k, col.setHex(tint[Math.floor(hash(p.x, p.z) * tint.length)]));
        }
      });
      this.scene.add(m);
    };
    crown(leafy, this.foliageTex(false, false), 8.4, 7.6, 6.6, [0xffffff, 0xe8f0c8, 0xd8e8b0, 0xf4f0c0]);
    crown(poplar, this.foliageTex(true, false), 4.2, 11, 7.2, [0xd8e0b0, 0xc8d8a0, 0xe8e8c0]);
    crown(pine, this.foliageTex(true, true), 5.2, 10, 6.8, [0xffffff, 0xe0f0d8]);

    inst(new THREE.DodecahedronGeometry(1, 0), white(), by("pedra"), (p) => {
      d.position.set(p.x, g(p) + 0.35 * p.s, p.z);
      d.scale.set(p.s, p.s * 0.7, p.s);
      d.rotation.y = p.rot;
    });

    // ---- carros
    const cars = by("carro");
    inst(new THREE.BoxGeometry(2, 0.7, 4.4), white(), cars, (p) => {
      d.position.set(p.x, g(p) + 0.72, p.z);
      d.rotation.y = p.rot;
    });
    inst(new THREE.BoxGeometry(1.8, 0.62, 2.3), lam(0x1e242c), cars, (p) => {
      d.position.set(p.x, g(p) + 1.36, p.z);
      d.rotation.y = p.rot;
    }, false);
    const wheels: P[] = [];
    for (const p of cars)
      for (const [ox, oz] of [
        [1, 1.4],
        [-1, 1.4],
        [1, -1.4],
        [-1, -1.4],
      ]) {
        const c = Math.cos(p.rot);
        const s = Math.sin(p.rot);
        wheels.push({ ...p, x: p.x + ox * c + oz * s, z: p.z - ox * s + oz * c });
      }
    const wg = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
    wg.rotateZ(Math.PI / 2);
    inst(wg, lam(0x151515), wheels, (p) => {
      d.position.set(p.x, g(p) + 0.38, p.z);
      d.rotation.y = p.rot;
    }, false);

    inst(new THREE.ConeGeometry(2.2, 2.4, 4), white(), by("tenda"), (p) => {
      d.position.set(p.x, g(p) + 1.2 * p.s, p.z);
      d.rotation.y = p.rot;
      d.scale.setScalar(p.s);
    });
    const bale = new THREE.CylinderGeometry(0.9, 0.9, 1.5, 12);
    bale.rotateZ(Math.PI / 2);
    inst(bale, white(), by("fardo"), (p) => {
      d.position.set(p.x, g(p) + 0.9, p.z);
      d.rotation.y = p.rot;
    });
    inst(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 10), white(), by("barril"), (p) => d.position.set(p.x, g(p) + 0.55, p.z));
    inst(new THREE.BoxGeometry(0.7, 1.1, 0.18), white(), by("lapide"), (p) => {
      d.position.set(p.x, g(p) + 0.5, p.z);
      d.rotation.z = p.rot;
    });
    inst(new THREE.CylinderGeometry(0.1, 0.12, 6, 6), white(), by("poste"), (p) => d.position.set(p.x, g(p) + 3, p.z));
    for (const p of by("fogueira")) {
      const y = g(p);
      const logs = new THREE.Mesh(new THREE.ConeGeometry(0.7 * p.s, 0.5, 6), lam(0x3a2a1a));
      logs.position.set(p.x, y + 0.25, p.z);
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.4 * p.s, 1.1 * p.s, 6), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 }));
      fire.position.set(p.x, y + 0.8 * p.s, p.z);
      this.scene.add(logs, fire);
      this.flames.push(fire);
    }
  }

  // ---------------------------------------------------------------- capim alto em volta do jogador
  private buildGrass() {
    const tex = canvasTexture(256, 128, (c) => {
      c.lineCap = "round";
      for (let i = 0; i < 90; i++) {
        const x = 6 + Math.random() * 244;
        const h = 40 + Math.random() * 84;
        const lean = (Math.random() - 0.5) * 34;
        c.strokeStyle = ["#9aa648", "#86993c", "#b4b060", "#768f36", "#a39a52"][i % 5];
        c.lineWidth = 1.6 + Math.random() * 2;
        c.beginPath();
        c.moveTo(x, 128);
        c.quadraticCurveTo(x + lean * 0.3, 128 - h * 0.6, x + lean, 128 - h);
        c.stroke();
      }
    });
    const geo = new THREE.PlaneGeometry(1.9, 0.8);
    geo.translate(0, 0.4, 0);
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.35, side: THREE.DoubleSide });
    this.grass = new THREE.InstancedMesh(geo, mat, GRASS_N * 2);
    this.grass.frustumCulled = false;
    this.scene.add(this.grass);
  }

  /** Repõe o capim em volta de um ponto (cada tufo tem lugar fixo no mapa). */
  private placeGrass(cx: number, cz: number) {
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    const step = (GRASS_R * 2) / Math.sqrt(GRASS_N);
    const gx0 = Math.floor((cx - GRASS_R) / step);
    const gz0 = Math.floor((cz - GRASS_R) / step);
    const n = Math.ceil((GRASS_R * 2) / step);
    let i = 0;
    for (let a = 0; a < n && i < GRASS_N; a++)
      for (let b = 0; b < n && i < GRASS_N; b++) {
        const ix = gx0 + a;
        const iz = gz0 + b;
        const x = (ix + hash(ix, iz)) * step;
        const z = (iz + hash(iz, ix + 9)) * step;
        const zn = zoneAt(x, z);
        // sem capim no asfalto, no concreto e fora do mapa
        const bare = Math.abs(x) > HALF - 1 || Math.abs(z) > HALF - 1 || (zn && (zn.key === "cidade" || zn.key === "rodovia" || zn.key === "fabrica" || zn.key === "acampamento")) || hash(ix + 31, iz + 17) < 0.16;
        const s = bare ? 0 : 0.7 + hash(ix + 3, iz + 5) * 0.8;
        const y = this.gy(x, z);
        const rot = hash(ix + 7, iz + 1) * 3.14;
        for (let k = 0; k < 2; k++) {
          d.position.set(x, y, z);
          d.rotation.set(0, rot + (k * Math.PI) / 2, 0);
          d.scale.set(s, s, s);
          d.updateMatrix();
          this.grass.setMatrixAt(i * 2 + k, d.matrix);
          this.grass.setColorAt(i * 2 + k, col.setHex([0xffffff, 0xe6e8b0, 0xd0e09a, 0xf0e0a0][Math.floor(hash(ix + 13, iz + 2) * 4)]));
        }
        i++;
      }
    d.scale.set(0, 0, 0);
    d.updateMatrix();
    for (; i < GRASS_N; i++) {
      this.grass.setMatrixAt(i * 2, d.matrix);
      this.grass.setMatrixAt(i * 2 + 1, d.matrix);
    }
    this.grass.instanceMatrix.needsUpdate = true;
    if (this.grass.instanceColor) this.grass.instanceColor.needsUpdate = true;
    this.grassAt = { x: cx, z: cz };
  }

  // ---------------------------------------------------------------- suprimentos no chão
  private addLoot(c: Container) {
    const g = new THREE.Group();
    const box = (w: number, h: number, dd: number, color: number, x: number, z: number, ry = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), lam(color));
      m.position.set(x, h / 2, z);
      m.rotation.y = ry;
      g.add(m);
      return m;
    };
    if (c.kind === "airdrop") {
      box(1.7, 1.2, 1.3, 0xb02a2a, 0, 0);
      box(1.74, 0.16, 1.34, 0xe8e8e0, 0, 0).position.y = 0.6;
      const chute = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 6, 0, 6.3, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6a7a4a, side: THREE.DoubleSide }));
      chute.position.y = 6;
      chute.name = "chute";
      g.add(chute);
      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd83a2a, transparent: true, opacity: 0.4, depthWrite: false }));
        this.scene.add(m);
        this.smokes.push({ m, cid: c.id, off: i / 6 });
      }
    } else if (c.kind === "mochila") {
      box(0.6, 0.34, 0.8, 0x5a6142, 0, 0, 0.4);
      box(0.3, 0.14, 0.9, 0x2a2c30, 0.6, 0.1, 1.1);
    } else {
      // um montinho de coisas: caixa de munição, kit e mochila
      box(0.5, 0.26, 0.34, 0x4f5a34, -0.3, 0.1, 0.3);
      box(0.4, 0.22, 0.3, 0xe8e4dc, 0.32, -0.12, -0.4);
      box(0.42, 0.06, 0.1, 0xc8302a, 0.32, -0.12, -0.4).position.y = 0.24;
      box(0.46, 0.4, 0.34, 0x7a6a4a, 0.05, 0.42, 0.9);
      if (c.kind === "carro") box(0.9, 0.12, 0.14, 0x2a2c30, 0, -0.5, 0.2);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.02, 24), new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    ring.name = "ring";
    g.add(ring);
    g.position.set(c.x, this.gy(c.x, c.z) + (c.y ?? 0), c.z);
    g.rotation.y = (c.id * 1.7) % 6.28;
    g.visible = !c.opened;
    this.scene.add(g);
    this.loot.set(c.id, g);
  }

  // ---------------------------------------------------------------- sobreviventes
  private weaponMesh(id: string): THREE.Group {
    const g = new THREE.Group();
    const metal = lam(0x25272b);
    const wood = lam(0x6a4628);
    // o cano aponta para -Y (o antebraço estendido aponta para a frente)
    const bar = (w: number, h: number, d: number, mat: THREE.Material, y = 0, z = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(0, y, z);
      g.add(m);
    };
    if (id === "faca") {
      bar(0.04, 0.3, 0.07, lam(0xc8ccd2), -0.2);
      bar(0.06, 0.12, 0.08, wood);
    } else if (id === "bastao") bar(0.08, 0.9, 0.08, wood, -0.42);
    else if (id === "machado") {
      bar(0.06, 0.8, 0.06, wood, -0.36);
      bar(0.05, 0.2, 0.3, lam(0xa8acb2), -0.7, 0.12);
    } else if (id === "frigideira") {
      bar(0.05, 0.4, 0.05, metal, -0.15);
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.05, 12), metal);
      pan.rotation.x = Math.PI / 2;
      pan.position.y = -0.5;
      g.add(pan);
    } else if (id === "pistola") {
      bar(0.06, 0.26, 0.09, metal, -0.12);
      bar(0.06, 0.1, 0.15, metal, 0, -0.06);
    } else if (id === "submetralhadora") {
      bar(0.08, 0.5, 0.11, metal, -0.2);
      bar(0.06, 0.12, 0.26, metal, -0.1, -0.14);
      bar(0.07, 0.24, 0.1, metal, 0.12);
    } else if (id === "espingarda") {
      bar(0.08, 0.95, 0.08, metal, -0.42);
      bar(0.09, 0.36, 0.12, wood, 0.16, -0.02);
    } else if (id === "fuzil") {
      bar(0.07, 0.9, 0.09, metal, -0.36);
      bar(0.08, 0.34, 0.12, wood, 0.2, -0.02);
      bar(0.06, 0.1, 0.28, metal, -0.14, -0.16);
      bar(0.07, 0.3, 0.1, wood, -0.42, -0.02);
    } else if (id === "rifle") {
      bar(0.06, 1.2, 0.07, metal, -0.5);
      bar(0.09, 0.42, 0.12, wood, 0.14, -0.02);
      bar(0.07, 0.3, 0.07, metal, -0.3, 0.1);
    } else if (id === "arco") {
      bar(0.07, 0.7, 0.08, wood, -0.3);
      bar(0.6, 0.04, 0.05, metal, -0.6);
    }
    return g;
  }

  private buildActor(a: Actor): Rig {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const skin = lam(SKIN[a.id % SKIN.length]);
    const shirt = lam(a.color);
    const camo = lam(0xffffff, this.camo);
    const pants = lam(0x9a9a80, this.camo);
    const boots = lam(0x231d18);
    const mats = [skin, shirt, pants];
    const sleeved = a.id % 3 !== 0; // alguns de regata, como na imagem

    const torso = new THREE.Group();
    torso.position.y = 0.94;
    body.add(torso);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.6, 10), shirt);
    chest.scale.set(1.25, 1, 0.78);
    chest.position.y = 0.32;
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 10), pants);
    hips.scale.set(1.2, 1, 0.8);
    hips.position.y = -0.02;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), skin);
    neck.position.y = 0.68;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
    head.scale.set(0.92, 1.08, 1);
    head.position.y = 0.86;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 12, 8, 0, 6.3, 0, Math.PI * 0.55), lam([0x2a1c12, 0x4a3320, 0x151212, 0x6a4a2a][a.id % 4]));
    hair.position.y = 0.88;
    torso.add(chest, hips, neck, head, hair);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, 6.3, 0, Math.PI * 0.56), camo);
    helmet.position.y = 0.87;
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.5, 10), lam(0x3f4634));
    vest.scale.set(1.25, 1, 0.9);
    vest.position.y = 0.34;
    const pack = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.24, 4, 10), camo);
    pack.scale.set(1.15, 1, 0.8);
    pack.position.set(0, 0.36, -0.25);
    torso.add(helmet, vest, pack);

    const seg = (len: number, rad: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(rad, Math.max(0.01, len - rad * 2), 3, 8), mat);
      m.position.y = -len / 2;
      return m;
    };
    const limb = (parent: THREE.Object3D, x: number, y: number, l1: number, l2: number, rad: number, m1: THREE.Material, m2: THREE.Material, foot: boolean) => {
      const up = new THREE.Group();
      up.position.set(x, y, 0);
      up.add(seg(l1, rad, m1));
      const low = new THREE.Group();
      low.position.y = -l1;
      low.add(seg(l2, rad * 0.9, m2));
      if (foot) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(rad * 2.1, 0.12, rad * 3.6), boots);
        f.position.set(0, -l2 + 0.02, rad * 0.9);
        low.add(f);
      } else {
        const h = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.05, 8, 6), skin);
        h.position.y = -l2;
        low.add(h);
      }
      up.add(low);
      parent.add(up);
      return [up, low] as const;
    };
    const [thighL, shinL] = limb(body, -0.13, 0.94, 0.47, 0.47, 0.1, pants, pants, true);
    const [thighR, shinR] = limb(body, 0.13, 0.94, 0.47, 0.47, 0.1, pants, pants, true);
    const [armL, foreL] = limb(torso, -0.36, 0.56, 0.3, 0.3, 0.075, sleeved ? shirt : skin, skin, false);
    const [armR, foreR] = limb(torso, 0.36, 0.56, 0.3, 0.3, 0.075, sleeved ? shirt : skin, skin, false);

    const hand: Record<string, THREE.Object3D> = {};
    const back: Record<string, THREE.Object3D> = {};
    for (const id of ["faca", "bastao", "machado", "frigideira", "pistola", "submetralhadora", "espingarda", "fuzil", "rifle", "arco"]) {
      const h = this.weaponMesh(id);
      h.position.y = -0.32;
      h.visible = false;
      foreR.add(h);
      hand[id] = h;
      const b = this.weaponMesh(id);
      // atravessada nas costas, como na imagem
      b.position.set(0.02, 0.36, -0.42);
      b.rotation.set(0, 0, 0.5);
      b.visible = false;
      torso.add(b);
      back[id] = b;
    }

    // paraquedas
    const chute = new THREE.Group();
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 6, 0, 6.3, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: [0x7a8a52, 0xb04a34, 0x3f5f8a][a.id % 3], side: THREE.DoubleSide }));
    canopy.scale.y = 0.6;
    canopy.position.y = 5.4;
    chute.add(canopy);
    for (const [x, z] of [
      [1.8, 0],
      [-1.8, 0],
      [0, 1.8],
      [0, -1.8],
    ]) {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4.2, 3), lam(0xe8e8e0));
      line.position.set(x / 2, 3.6, z / 2);
      line.rotation.z = (-x / 1.8) * 0.42;
      line.rotation.x = (z / 1.8) * 0.42;
      chute.add(line);
    }
    chute.visible = false;
    root.add(chute);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.04;
    root.add(shadow);

    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
    tag.position.y = 2.35;
    tag.scale.set(2.4, 0.6, 1);
    root.add(tag);
    this.scene.add(root);
    return { root, body, torso, thighL, thighR, shinL, shinR, armL, armR, foreL, foreR, pack, vest, helmet, hand, back, chute, mats, tag, tagKey: "", shadow, phase: a.id, fall: 0, crouch: 0, prone: 0, aim: 0 };
  }

  private setTag(v: Rig, a: Actor, ally: boolean) {
    const key = `${a.name}|${ally}`;
    if (v.tagKey === key) return;
    v.tagKey = key;
    const mat = v.tag.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = canvasTexture(256, 64, (c) => {
      c.font = "800 28px system-ui, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = 5;
      c.strokeStyle = "rgba(0,0,0,0.8)";
      c.strokeText(a.name, 128, 32);
      c.fillStyle = ally ? "#7de0ff" : "#ffffff";
      c.fillText(a.name, 128, 32);
    });
    mat.needsUpdate = true;
  }

  private syncActor(a: Actor, dt: number) {
    const v = this.rigs.get(a.id)!;
    const g = this.game;
    const me = a === g.player;
    if (a.where === "plane") {
      v.root.visible = false;
      return;
    }
    v.root.visible = true;
    v.root.position.set(a.x, this.gy(a.x, a.z) + a.y, a.z);
    v.root.rotation.y = a.yaw;
    const dist = Math.hypot(a.x - g.player.x, a.z - g.player.z);
    // nome só de perto (ou dos aliados), para ninguém ser denunciado de longe
    const ally = g.allies(a, g.player);
    v.tag.visible = a.alive && !me && a.where === "ground" && (ally || dist < 30) && a.stance !== 2;
    if (v.tag.visible) this.setTag(v, a, ally);
    v.pack.visible = a.gear.mochila > 0;
    if (v.pack.visible) {
      const s = 0.82 + a.gear.mochila * 0.1;
      v.pack.scale.set(1.15 * s, s, 0.8 * s);
    }
    v.vest.visible = a.gear.colete > 0;
    v.helmet.visible = a.gear.capacete > 0;
    const wp = g.weaponOf(a);
    const other = a.active === 0 ? (a.guns[0] ?? a.guns[1])?.id : a.guns[a.active === 1 ? 1 : 0]?.id;
    for (const id in v.hand) {
      v.hand[id].visible = a.alive && a.where === "ground" && id === wp.id;
      v.back[id].visible = a.alive && id === other && id !== wp.id;
    }
    for (const m of v.mats) m.emissive.setHex(a.hurt > 0 ? 0x7a1010 : 0);
    v.chute.visible = a.chute;
    v.shadow.visible = a.alive && a.where === "ground";
    v.shadow.position.y = 0.05 - a.y;

    const R = v;
    for (const p of [R.thighL, R.thighR, R.shinL, R.shinR, R.armL, R.armR, R.foreL, R.foreR, R.torso]) p.rotation.set(0, 0, 0);
    R.body.rotation.set(0, 0, 0);
    R.body.position.set(0, 0, 0);

    if (!a.alive) {
      v.fall = Math.min(1, v.fall + dt * 2.6);
      v.body.rotation.x = -v.fall * (Math.PI / 2);
      v.body.position.y = v.fall * 0.2;
      v.armL.rotation.z = -v.fall * 0.6;
      v.armR.rotation.z = v.fall * 0.6;
      return;
    }
    if (a.where === "fall") {
      if (a.chute) {
        // pendurado no paraquedas: braços para cima segurando as cordas
        R.armL.rotation.set(-2.7, 0, -0.25);
        R.armR.rotation.set(-2.7, 0, 0.25);
        R.thighL.rotation.x = -0.25;
        R.thighR.rotation.x = -0.1;
        R.shinL.rotation.x = 0.4;
        R.shinR.rotation.x = 0.3;
      } else {
        // queda livre: de barriga para baixo, braços e pernas abertos
        R.body.rotation.x = 1.25;
        R.armL.rotation.set(-0.6, 0, -1.2);
        R.armR.rotation.set(-0.6, 0, 1.2);
        R.thighL.rotation.set(0.3, 0, -0.35);
        R.thighR.rotation.set(0.3, 0, 0.35);
        R.shinL.rotation.x = 0.9;
        R.shinR.rotation.x = 0.9;
      }
      return;
    }

    v.crouch += ((a.stance === 1 ? 1 : 0) - v.crouch) * Math.min(1, dt * 12);
    v.prone += ((a.stance === 2 ? 1 : 0) - v.prone) * Math.min(1, dt * 9);
    const ranged = wp.kind !== "melee";
    v.aim += ((a.ads ? 1 : 0) - v.aim) * Math.min(1, dt * 14);
    const k = Math.min(1, a.speed / 4.5);
    const run = Math.min(1, Math.max(0, (a.speed - 5) / 2.5));
    v.phase += dt * a.speed * (a.stance === 2 ? 5 : 2.05);
    const sw = Math.sin(v.phase);
    const cw = Math.cos(v.phase);

    if (v.prone > 0.02) {
      // deitado: corpo no chão, rastejando com braços e pernas
      const p = v.prone;
      R.body.rotation.x = p * 1.5;
      R.body.position.y = p * 0.2;
      R.thighL.rotation.set(sw * 0.35 * k * p, 0, -0.12 * p);
      R.thighR.rotation.set(-sw * 0.35 * k * p, 0, 0.12 * p);
      R.shinL.rotation.x = Math.max(0, sw) * 0.5 * k;
      R.shinR.rotation.x = Math.max(0, -sw) * 0.5 * k;
      R.armL.rotation.set(-2.6 * p + sw * 0.3 * k, 0, -0.3);
      R.armR.rotation.set(-2.75 * p - sw * 0.3 * k, 0, 0.25);
      R.foreL.rotation.x = -0.35;
      R.foreR.rotation.x = -0.2;
      R.torso.rotation.x = -0.25 * p;
      return;
    }

    // pernas
    if (a.y > 0.05) {
      R.thighL.rotation.x = -0.7;
      R.shinL.rotation.x = 1.1;
      R.thighR.rotation.x = -0.25;
      R.shinR.rotation.x = 0.7;
    } else {
      const stride = (0.5 + run * 0.35) * k;
      R.thighL.rotation.x = -sw * stride;
      R.thighR.rotation.x = sw * stride;
      R.shinL.rotation.x = Math.max(0, cw) * (0.7 + run * 0.6) * k;
      R.shinR.rotation.x = Math.max(0, -cw) * (0.7 + run * 0.6) * k;
      R.body.position.y = Math.abs(cw) * 0.04 * k;
    }
    // agachado: quadril baixo, joelhos dobrados, tronco inclinado
    if (v.crouch > 0.02) {
      const c = v.crouch;
      R.body.position.y -= 0.36 * c;
      R.thighL.rotation.x += -1.15 * c;
      R.thighR.rotation.x += -0.75 * c;
      R.shinL.rotation.x += 1.75 * c;
      R.shinR.rotation.x += 1.85 * c;
      R.torso.rotation.x += 0.32 * c;
    }
    R.torso.rotation.x += run * 0.22;

    // braços
    if (a.using) {
      R.armR.rotation.x = -1.1;
      R.foreR.rotation.x = -1.7;
      R.armL.rotation.x = -0.6;
      R.foreL.rotation.x = -1.2;
    } else if (ranged) {
      // arma na cintura; na mira sobe para o ombro. O coice levanta o cano.
      const kick = a.swing * 1.6;
      const up = v.aim;
      R.armR.rotation.set(-0.75 - up * 0.55 - kick, 0, 0.1 - up * 0.1);
      R.foreR.rotation.x = -0.85 + up * 0.5;
      R.armL.rotation.set(-0.95 - up * 0.45, 0, -0.55);
      R.foreL.rotation.x = -0.75 + up * 0.3;
      R.torso.rotation.y = -0.25;
      if (a.reloading > 0) {
        R.armL.rotation.x = -0.5 + Math.sin(this.clock * 9) * 0.25;
        R.foreL.rotation.x = -1.4;
      }
    } else {
      const armSw = sw * (0.45 + run * 0.4) * k;
      R.armL.rotation.x = armSw;
      R.foreL.rotation.x = -0.25 - run * 0.9;
      R.armR.rotation.x = a.swing > 0 ? -2.5 + (0.3 - a.swing) * 10 : -armSw - (wp.id === "punho" ? 0 : 0.25);
      R.foreR.rotation.x = a.swing > 0 ? -0.2 : -0.25 - run * 0.9 - (wp.id === "punho" ? 0 : 0.5);
    }
  }

  // ---------------------------------------------------------------- zona, avião, efeitos
  private buildZoneWall() {
    this.zoneTex = canvasTexture(64, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "rgba(70,130,255,0)");
      g.addColorStop(0.35, "rgba(70,130,255,0.55)");
      g.addColorStop(1, "rgba(120,180,255,0.9)");
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 256);
      // riscos verticais leves, para a parede "vibrar" quando anda
      for (let x = 0; x < 64; x += 8) {
        c.fillStyle = `rgba(200,230,255,${0.05 + Math.random() * 0.12})`;
        c.fillRect(x, 60, 2 + Math.random() * 3, 196);
      }
    });
    this.zoneTex.wrapS = this.zoneTex.wrapT = THREE.RepeatWrapping;
    this.zoneTex.repeat.set(120, 1);
    this.zoneWall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 80, 96, 1, true), new THREE.MeshBasicMaterial({ map: this.zoneTex, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    this.scene.add(this.zoneWall);
  }

  private buildPlane() {
    const g = new THREE.Group();
    const grey = lam(0x8a9096);
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 22, 12), grey);
    fus.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), grey);
    nose.position.z = 11;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(34, 0.5, 4.4), grey);
    wing.position.set(0, 1.6, 1);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(11, 0.4, 2.6), grey);
    tail.position.set(0, 1.2, -10);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 3.2), grey);
    fin.position.set(0, 3.4, -10);
    g.add(fus, nose, wing, tail, fin);
    for (const x of [-9, -4.5, 4.5, 9]) {
      const e = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3, 8), lam(0x55595e));
      e.rotation.x = Math.PI / 2;
      e.position.set(x, 1, 3);
      g.add(e);
    }
    this.scene.add(g);
    this.planeMesh = g;
  }

  private tracer(x0: number, z0: number, x1: number, z1: number, weapon: string, y0: number) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, this.gy(x1, z1) + 1.1, z1)]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: weapon === "arco" ? 0xe8dcc0 : 0xfff0a8, transparent: true, opacity: 0.85 }));
    this.scene.add(line);
    this.tracers.push({ line, t: weapon === "arco" ? 0.16 : 0.06 });
  }
  private puff(x: number, y: number, z: number, color: number, size: number, life: number, grow: number, rise = 0, opacity = 0.9) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.position.set(x, y, z);
    this.scene.add(m);
    this.puffs.push({ m, t: life, life, grow, rise });
  }

  // ---------------------------------------------------------------- quadro
  resize() {
    const cv = this.r.domElement;
    const w = cv.clientWidth || innerWidth;
    const h = cv.clientHeight || innerHeight;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  frame(dt: number, yaw: number, pitch: number) {
    const g = this.game;
    const p = g.player;
    this.clock += dt;
    for (const e of g.ev) {
      if (e.t === "shot") {
        const a = g.actors[e.id];
        const y0 = this.gy(a.x, a.z) + (a.stance === 2 ? 0.35 : a.stance === 1 ? 0.95 : 1.35);
        const s = Math.sin(a.yaw);
        const c = Math.cos(a.yaw);
        this.tracer(e.x0 + s * 0.7, e.z0 + c * 0.7, e.x1, e.z1, e.weapon, y0);
        if (e.weapon !== "arco") this.puff(e.x0 + s * 0.9, y0, e.z0 + c * 0.9, 0xffd27a, 0.16, 0.05, 6);
        // poeira onde a bala bate
        this.puff(e.x1, this.gy(e.x1, e.z1) + 1.05, e.z1, 0xc8bfa8, 0.1, 0.25, 5, 0.5, 0.6);
      } else if (e.t === "hit") this.puff(e.x, this.gy(e.x, e.z) + 1.2, e.z, 0xb8201a, 0.14, 0.2, 7);
      else if (e.t === "boom") {
        const y = this.gy(e.x, e.z);
        this.puff(e.x, y + 0.8, e.z, 0xffb040, 1.2, 0.35, 9);
        this.puff(e.x, y + 1.2, e.z, 0x3a3632, 1.6, 1.6, 2.2, 1.6, 0.7);
      } else if (e.t === "open") {
        const m = this.loot.get(e.cid);
        if (m) m.visible = false;
      } else if (e.t === "drop") {
        const c = this.w.containers.find((k) => k.id === e.cid);
        if (c) this.addLoot(c);
      }
    }
    for (const a of g.actors) this.syncActor(a, dt);

    // granadas no ar
    const live = new Set<number>();
    for (const n of g.grenades) {
      live.add(n.id);
      let m = this.nades.get(n.id);
      if (!m) {
        m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lam(0x3a4a2a));
        this.scene.add(m);
        this.nades.set(n.id, m);
      }
      m.position.set(n.x, this.gy(n.x, n.z) + n.y, n.z);
    }
    for (const [id, m] of this.nades)
      if (!live.has(id)) {
        this.scene.remove(m);
        this.nades.delete(id);
      }

    for (const l of this.w.lore) {
      const m = this.loreMeshes.get(l.id);
      if (!m) continue;
      m.visible = !l.taken;
      m.rotation.y += dt * 2;
      m.position.y = this.gy(l.x, l.z) + 0.9 + Math.sin(this.clock * 2 + l.id) * 0.12;
    }
    for (const c of this.w.containers) {
      const m = this.loot.get(c.id);
      if (!m || !m.visible) continue;
      if (c.kind === "airdrop") {
        m.position.y = this.gy(c.x, c.z) + (c.y ?? 0);
        const chute = m.getObjectByName("chute");
        if (chute) chute.visible = (c.y ?? 0) > 0.2;
      }
      const ring = m.getObjectByName("ring") as THREE.Mesh | undefined;
      if (ring) (ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(this.clock * 4) * 0.2;
    }
    // fumaça vermelha da caixa de suprimentos
    for (const s of this.smokes) {
      const c = this.w.containers.find((k) => k.id === s.cid);
      const on = !!c && !c.opened && (c.y ?? 0) < 60;
      s.m.visible = on;
      if (!on || !c) continue;
      const k = (this.clock * 0.16 + s.off) % 1;
      s.m.position.set(c.x + Math.sin(k * 9 + s.off * 6) * 1.2 * k, this.gy(c.x, c.z) + (c.y ?? 0) + 1 + k * 22, c.z + Math.cos(k * 7) * 1.2 * k);
      s.m.scale.setScalar(0.8 + k * 3.4);
      (s.m.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - k);
    }
    for (const f of this.flames) f.scale.y = 0.85 + Math.sin(this.clock * 11 + f.position.x) * 0.2;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.t -= dt;
      if (t.t <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const b = this.puffs[i];
      b.t -= dt;
      const k = 1 - b.t / b.life;
      b.m.scale.setScalar(1 + k * b.grow);
      b.m.position.y += b.rise * dt;
      const mat = b.m.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - k) * 0.9);
      if (b.t <= 0) {
        this.scene.remove(b.m);
        b.m.geometry.dispose();
        mat.dispose();
        this.puffs.splice(i, 1);
      }
    }

    // a zona (as Trevas): parede azul em volta da área segura
    const d = g.dark;
    this.zoneWall.position.set(d.x, 30, d.z);
    this.zoneWall.scale.set(Math.max(0.5, d.r), 1, Math.max(0.5, d.r));
    this.zoneTex.offset.x = this.clock * 0.02;
    this.zoneTex.repeat.x = Math.max(8, Math.round(d.r * 0.5));

    // avião
    const pl = g.plane;
    this.planeMesh.visible = pl.t < pl.dur + 8;
    if (this.planeMesh.visible) {
      const k = pl.t / pl.dur;
      this.planeMesh.position.set(pl.x0 + (pl.x1 - pl.x0) * k, PLANE_ALT + 4, pl.z0 + (pl.z1 - pl.z0) * k);
      this.planeMesh.rotation.y = pl.yaw;
    }

    // ---- câmera em terceira pessoa, por cima do ombro
    const wp = g.weaponOf(p);
    const aiming = p.ads && p.where === "ground";
    const air = p.where !== "ground";
    const targetFov = aiming ? Math.max(18, 70 / wp.zoom) : 70 + (p.speed > 6 ? 4 : 0);
    this.fov += (targetFov - this.fov) * Math.min(1, dt * 12);
    this.cam.fov = this.fov;
    this.cam.updateProjectionMatrix();
    const sy = Math.sin(yaw);
    const cy = Math.cos(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const rig = this.rigs.get(p.id)!;
    const eye = air ? 1.2 : 1.62 - rig.crouch * 0.5 - rig.prone * 1.15;
    const side = air ? 0 : aiming ? 0.42 : 0.62;
    const tx = p.x - cy * side;
    const tz = p.z + sy * side;
    const ty = this.gy(p.x, p.z) + p.y + eye;
    const want = p.where === "plane" ? 26 : air ? 9 : aiming ? 1.5 : 3.9;
    this.camDist += (want - this.camDist) * Math.min(1, dt * 8);
    let dist = this.camDist;
    // encurta a câmera quando há parede atrás
    if (!air) {
      const wall = rayBoxes(this.w, tx, tz, -sy, -cy, dist * cp + 0.4);
      dist = Math.max(0.6, Math.min(dist, (wall - 0.35) / Math.max(cp, 0.2)));
    }
    const cxp = tx - sy * cp * dist;
    const czp = tz - cy * cp * dist;
    const cyp = Math.max(this.gy(cxp, czp) + 0.35, ty + sp * dist);
    this.cam.position.set(cxp, cyp, czp);
    this.cam.lookAt(tx + sy * cp * 30, ty - sp * 30, tz + cy * cp * 30);
    // câmera colada na parede ou na luneta: some com o próprio boneco para não tapar a tela
    rig.body.visible = dist > 1.2 || !p.alive;
    this.sky.position.set(cxp, -40, czp);
    if (Math.hypot(cxp - this.grassAt.x, czp - this.grassAt.z) > 8) this.placeGrass(cxp, czp);
    this.r.render(this.scene, this.cam);
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      const drop = (x: THREE.Material) => {
        (x as THREE.MeshLambertMaterial).map?.dispose?.();
        x.dispose();
      };
      if (Array.isArray(mat)) mat.forEach(drop);
      else if (mat) drop(mat);
    });
    this.r.dispose();
  }
}
