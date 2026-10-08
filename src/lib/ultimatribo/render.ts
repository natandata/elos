// Desenho 3D de A Última Tribo (Three.js): mundo de baixo polígono, sobreviventes animados e efeitos.
// Só mostra o estado da simulação (sim.ts); nenhuma regra mora aqui.
import * as THREE from "three";
import type { Actor, Game } from "./sim";
import { HALF, rayBoxes, type Building, type Container, type World } from "./world";

const SKIN = [0xe2b48c, 0xc98e62, 0x9a6a44, 0xf0c9a4, 0x7a4f30];

type ActorView = {
  group: THREE.Group;
  body: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  pack: THREE.Mesh;
  vest: THREE.Mesh;
  helmet: THREE.Mesh;
  weapons: Record<string, THREE.Object3D>;
  mats: THREE.MeshLambertMaterial[];
  tag: THREE.Sprite;
  tagKey: string;
  shadow: THREE.Mesh;
  phase: number;
  fall: number;
};

const lam = (color: number) => new THREE.MeshLambertMaterial({ color });

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

export class Renderer {
  private r: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(62, 1, 0.3, 900);
  private sky!: THREE.Mesh;
  private views = new Map<number, ActorView>();
  private boxes = new Map<number, THREE.Group>();
  private loreMeshes = new Map<number, THREE.Mesh>();
  private darkWall: THREE.Mesh;
  private tracers: { line: THREE.Line; t: number }[] = [];
  private bursts: { m: THREE.Mesh; t: number }[] = [];
  private flames: THREE.Mesh[] = [];
  private clock = 0;
  private disposed: (() => void)[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    private game: Game,
  ) {
    const mobile = matchMedia("(pointer: coarse)").matches;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
    this.r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    this.scene.fog = new THREE.FogExp2(0x9a8f82, 0.0075);
    this.scene.background = new THREE.Color(0x8e8479);
    this.scene.add(new THREE.HemisphereLight(0xd6dcea, 0x6a5a48, 2.3));
    const sun = new THREE.DirectionalLight(0xffc48a, 2.6);
    sun.position.set(-120, 90, -160);
    this.scene.add(sun);
    this.buildSky();
    this.buildGround(game.world);
    this.buildBuildings(game.world);
    this.buildProps(game.world);
    for (const c of game.world.containers) this.addContainer(c);
    for (const l of game.world.lore) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), new THREE.MeshBasicMaterial({ color: 0xffd76a }));
      m.position.set(l.x, 1.1, l.z);
      this.scene.add(m);
      this.loreMeshes.set(l.id, m);
    }
    for (const a of game.actors) this.views.set(a.id, this.buildActor(a));
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 60, 72, 1, true), new THREE.MeshBasicMaterial({ color: 0x160a22, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    wall.position.y = 30;
    this.scene.add(wall);
    this.darkWall = wall;
    this.resize();
  }

  // ---------------------------------------------------------------- mundo
  private buildSky() {
    const geo = new THREE.SphereGeometry(420, 24, 12);
    const col: number[] = [];
    const top = new THREE.Color(0x4a5566);
    const mid = new THREE.Color(0x8e8479);
    const hor = new THREE.Color(0xe0a063);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 420;
      const c = y > 0.25 ? mid.clone().lerp(top, Math.min(1, (y - 0.25) / 0.6)) : hor.clone().lerp(mid, Math.max(0, y) / 0.25);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    this.sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
  }

  private buildGround(w: World) {
    const S = 1536;
    const k = S / (HALF * 2);
    const px = (x: number) => (x + HALF) * k;
    const tex = canvasTexture(S, S, (c) => {
      c.fillStyle = "#6c7550";
      c.fillRect(0, 0, S, S);
      const zone = (key: string, color: string) => {
        const z = w.zones.find((q) => q.key === key)!;
        c.fillStyle = color;
        c.fillRect(px(z.x0), px(z.z0), (z.x1 - z.x0) * k, (z.z1 - z.z0) * k);
      };
      zone("floresta", "#4d5f3d");
      zone("fazenda", "#8a7650");
      zone("fabrica", "#77756f");
      zone("igreja", "#7d8a5c");
      zone("cidade", "#5c5c5e");
      // calçadas dos quarteirões
      c.fillStyle = "#807d76";
      for (let bx = 0; bx < 6; bx++) for (let bz = 0; bz < 4; bz++) c.fillRect(px(-18 + bx * 44 - 17), px(-202 + bz * 46 - 17), 34 * k, 34 * k);
      // rodovia com faixa
      c.fillStyle = "#3d3d40";
      c.fillRect(0, px(-9), S, 18 * k);
      c.fillStyle = "#d9b53a";
      for (let x = 0; x < S; x += 26) c.fillRect(x, px(-0.3), 14, 0.6 * k);
      c.fillStyle = "#c9c9c0";
      c.fillRect(0, px(-8.4), S, 0.4 * k);
      c.fillRect(0, px(8), S, 0.4 * k);
      // acampamento: chão batido
      c.fillStyle = "#8a6f4a";
      c.beginPath();
      c.arc(px(70), px(192), 24 * k, 0, 6.3);
      c.fill();
      // caminho da igreja
      c.fillStyle = "#a89a78";
      c.fillRect(px(-12), px(12), 4 * k, 86 * k);
      // plantações em fileiras
      for (const p of w.props)
        if (p.kind === "plantacao") {
          c.fillStyle = "#6b5a3a";
          c.fillRect(px(p.x - p.s / 2), px(p.z - p.rot / 2), p.s * k, p.rot * k);
          c.fillStyle = "#5f8a3a";
          for (let z = p.z - p.rot / 2 + 1; z < p.z + p.rot / 2; z += 2.4) c.fillRect(px(p.x - p.s / 2 + 1), px(z), (p.s - 2) * k, 0.9 * k);
        }
      // sujeira e manchas
      for (let i = 0; i < 9000; i++) {
        c.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,240,200,0.05)";
        const s = 1 + Math.random() * 5;
        c.fillRect(Math.random() * S, Math.random() * S, s, s);
      }
    });
    tex.anisotropy = 4;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshLambertMaterial({ map: tex }));
    g.rotation.x = -Math.PI / 2;
    this.scene.add(g);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), lam(0x5a6044));
    far.rotation.x = -Math.PI / 2;
    far.position.y = -0.05;
    this.scene.add(far);
  }

  private windowTex(base: number): THREE.CanvasTexture {
    const t = canvasTexture(64, 64, (c) => {
      c.fillStyle = hex(base);
      c.fillRect(0, 0, 64, 64);
      for (let x = 0; x < 4; x++)
        for (let y = 0; y < 4; y++) {
          const roll = Math.random();
          c.fillStyle = roll < 0.07 ? "#f2c66a" : roll < 0.3 ? "#1a1f26" : "#2e3640";
          c.fillRect(4 + x * 16, 5 + y * 16, 9, 10);
        }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  private buildBuildings(w: World) {
    const roofMat = lam(0x4a3a30);
    const box = (b: Building, mat: THREE.Material | THREE.Material[]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, b.h, b.z1 - b.z0), mat);
      m.position.set((b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2);
      this.scene.add(m);
      return m;
    };
    const roof = (b: Building, h: number, mat = roofMat, extra = 0.6) => {
      const wx = b.x1 - b.x0 + extra;
      const wz = b.z1 - b.z0 + extra;
      const m = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, h, 4), mat);
      m.rotation.y = Math.PI / 4;
      m.scale.set(wx, 1, wz);
      m.position.set((b.x0 + b.x1) / 2, b.h + h / 2, (b.z0 + b.z1) / 2);
      this.scene.add(m);
    };
    for (const b of w.buildings) {
      const cx = (b.x0 + b.x1) / 2;
      const cz = (b.z0 + b.z1) / 2;
      if (b.kind === "predio") {
        const side = (len: number) => {
          const t = this.windowTex(b.color);
          t.repeat.set(Math.max(1, Math.round(len / 7)), Math.max(1, Math.round(b.h / 7)));
          return new THREE.MeshLambertMaterial({ map: t });
        };
        const top = lam(0x3a3c40);
        const sx = side(b.z1 - b.z0);
        const sz = side(b.x1 - b.x0);
        box(b, [sx, sx, top, top, sz, sz]);
      } else if (b.kind === "silo") {
        const rad = (b.x1 - b.x0) / 2;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, b.h, 14), lam(b.color));
        m.position.set(cx, b.h / 2, cz);
        this.scene.add(m);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 6, 0, 6.3, 0, Math.PI / 2), lam(0x8a8a84));
        dome.position.set(cx, b.h, cz);
        this.scene.add(dome);
      } else {
        box(b, lam(b.color));
        if (b.kind === "casa") roof(b, 2.6);
        if (b.kind === "celeiro") roof(b, 4.5, lam(0x5a2018));
        if (b.kind === "galpao") roof(b, 1.8, lam(0x5a5048));
        if (b.kind === "igreja") roof(b, 5, lam(0x5a4636));
        if (b.kind === "torre") {
          roof(b, 7, lam(0x4a3a30), 0.4);
          const cross = lam(0xe8e2d0);
          const v = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), cross);
          v.position.set(cx, b.h + 8.2, cz);
          const h = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.3), cross);
          h.position.set(cx, b.h + 8.6, cz);
          this.scene.add(v, h);
        }
        if (b.kind === "hospital") {
          const red = new THREE.MeshBasicMaterial({ color: 0xc8302a });
          const v = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5, 0.3), red);
          v.position.set(cx, b.h - 4, b.z1 + 0.1);
          const h = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 0.3), red);
          h.position.set(cx, b.h - 4, b.z1 + 0.1);
          this.scene.add(v, h);
        }
        if (b.kind === "mercado" || b.kind === "delegacia") {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0 + 1.2, 1.2, 1.6), lam(b.kind === "mercado" ? 0xe8d8a8 : 0xd8dde6));
          stripe.position.set(cx, 4.2, b.z1 + 0.8);
          this.scene.add(stripe);
        }
        if (b.kind === "fabrica") {
          for (const off of [-0.3, 0.3]) {
            const ch = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 12, 10), lam(0x3f3f42));
            ch.position.set(cx + (b.x1 - b.x0) * off, b.h + 6, cz);
            this.scene.add(ch);
          }
        }
      }
    }
  }

  private buildProps(w: World) {
    const by = (kind: string) => w.props.filter((p) => p.kind === kind);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, list: typeof w.props, place: (p: (typeof w.props)[number]) => void, tint = true) => {
      if (!list.length) return;
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((p, i) => {
        dummy.position.set(0, 0, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        place(p);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        if (tint) m.setColorAt(i, col.setHex(p.color));
      });
      m.instanceMatrix.needsUpdate = true;
      this.scene.add(m);
    };
    const white = () => lam(0xffffff);
    const trees = [...by("arvore"), ...by("pinheiro")];
    inst(new THREE.CylinderGeometry(0.22, 0.32, 4.4, 6), lam(0x5a4028), trees, (p) => {
      dummy.position.set(p.x, 2.2 * p.s, p.z);
      dummy.scale.setScalar(p.s);
    }, false);
    inst(new THREE.ConeGeometry(1.7, 5.2, 7), white(), by("pinheiro"), (p) => {
      dummy.position.set(p.x, 6.3 * p.s, p.z);
      dummy.scale.setScalar(p.s);
      dummy.rotation.y = p.rot;
    });
    inst(new THREE.IcosahedronGeometry(2, 0), white(), by("arvore"), (p) => {
      dummy.position.set(p.x, 5.6 * p.s, p.z);
      dummy.scale.set(p.s, p.s * 0.9, p.s);
      dummy.rotation.y = p.rot;
    });
    inst(new THREE.DodecahedronGeometry(1, 0), white(), by("pedra"), (p) => {
      dummy.position.set(p.x, 0.45 * p.s, p.z);
      dummy.scale.set(p.s, p.s * 0.7, p.s);
      dummy.rotation.y = p.rot;
    });
    const cars = by("carro");
    inst(new THREE.BoxGeometry(2, 0.75, 4.4), white(), cars, (p) => {
      dummy.position.set(p.x, 0.72, p.z);
      dummy.rotation.y = p.rot;
    });
    inst(new THREE.BoxGeometry(1.8, 0.65, 2.3), lam(0x20252c), cars, (p) => {
      dummy.position.set(p.x, 1.4, p.z);
      dummy.rotation.y = p.rot;
    }, false);
    const wheels: typeof w.props = [];
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
      dummy.position.set(p.x, 0.38, p.z);
      dummy.rotation.y = p.rot;
    }, false);
    inst(new THREE.ConeGeometry(2.2, 2.4, 4), white(), by("tenda"), (p) => {
      dummy.position.set(p.x, 1.2 * p.s, p.z);
      dummy.rotation.y = p.rot;
      dummy.scale.setScalar(p.s);
    });
    const bale = new THREE.CylinderGeometry(0.9, 0.9, 1.5, 12);
    bale.rotateZ(Math.PI / 2);
    inst(bale, white(), by("fardo"), (p) => {
      dummy.position.set(p.x, 0.9, p.z);
      dummy.rotation.y = p.rot;
    });
    inst(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 10), white(), by("barril"), (p) => dummy.position.set(p.x, 0.55, p.z));
    inst(new THREE.BoxGeometry(0.7, 1.1, 0.18), white(), by("lapide"), (p) => {
      dummy.position.set(p.x, 0.55, p.z);
      dummy.rotation.z = p.rot;
    });
    inst(new THREE.CylinderGeometry(0.1, 0.12, 6, 6), white(), by("poste"), (p) => dummy.position.set(p.x, 3, p.z));
    for (const p of by("fogueira")) {
      const logs = new THREE.Mesh(new THREE.ConeGeometry(0.7 * p.s, 0.5, 6), lam(0x3a2a1a));
      logs.position.set(p.x, 0.25, p.z);
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.4 * p.s, 1.1 * p.s, 6), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 }));
      fire.position.set(p.x, 0.8 * p.s, p.z);
      this.scene.add(logs, fire);
      this.flames.push(fire);
    }
  }

  private addContainer(c: Container) {
    const g = new THREE.Group();
    if (c.kind === "mochila") {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), lam(0x4a5a3a));
      bag.position.y = 0.25;
      g.add(bag);
    } else {
      const wood = lam(c.kind === "carro" ? 0x4a4f58 : 0x8a6a3a);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), wood);
      base.position.y = 0.35;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.14, 0.86), lam(c.kind === "carro" ? 0x6a707a : 0xb08a4a));
      lid.position.y = 0.77;
      lid.name = "lid";
      g.add(base, lid);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.2, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    ring.name = "ring";
    g.add(ring);
    g.position.set(c.x, 0, c.z);
    g.rotation.y = (c.id * 1.7) % 6.28;
    this.scene.add(g);
    this.boxes.set(c.id, g);
    if (c.opened) this.markOpened(c.id);
  }
  private markOpened(cid: number) {
    const g = this.boxes.get(cid);
    if (!g) return;
    const ring = g.getObjectByName("ring");
    if (ring) ring.visible = false;
    const lid = g.getObjectByName("lid");
    if (lid) {
      lid.rotation.x = -1.1;
      lid.position.set(0, 0.95, -0.45);
    } else g.visible = false;
  }

  // ---------------------------------------------------------------- sobreviventes
  private buildActor(a: Actor): ActorView {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    const skin = lam(SKIN[a.id % SKIN.length]);
    const jacket = lam(a.color);
    const pants = lam(0x33363c);
    const boots = lam(0x1e1a16);
    const mats = [skin, jacket, pants];
    const part = (w: number, h: number, d: number, mat: THREE.Material, y: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.y = y;
      return m;
    };
    const torso = part(0.62, 0.72, 0.34, jacket, 1.3);
    const hips = part(0.56, 0.22, 0.32, pants, 0.9);
    const head = part(0.36, 0.38, 0.36, skin, 1.9);
    const hair = part(0.4, 0.14, 0.4, lam([0x2a1c12, 0x4a3320, 0x151212, 0x6a4a2a][a.id % 4]), 2.12);
    body.add(torso, hips, head, hair);
    const limb = (x: number, y: number, len: number, w: number, mat: THREE.Material, foot?: THREE.Material) => {
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), mat);
      m.position.y = -len / 2;
      g.add(m);
      if (foot) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.16, w + 0.16), foot);
        f.position.set(0, -len + 0.06, 0.06);
        g.add(f);
      } else {
        const hand = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, w), skin);
        hand.position.y = -len - 0.05;
        g.add(hand);
      }
      body.add(g);
      return g;
    };
    const armL = limb(-0.42, 1.62, 0.6, 0.18, jacket);
    const armR = limb(0.42, 1.62, 0.6, 0.18, jacket);
    const legL = limb(-0.16, 0.82, 0.76, 0.22, pants, boots);
    const legR = limb(0.16, 0.82, 0.76, 0.22, pants, boots);
    const pack = part(0.5, 0.6, 0.26, lam(0x5a5236), 1.34);
    pack.position.z = -0.3;
    const vest = part(0.68, 0.5, 0.4, lam(0x3a4034), 1.36);
    const helmet = part(0.44, 0.2, 0.44, lam(0x3a4034), 2.14);
    body.add(pack, vest, helmet);

    // armas na mão direita (uma malha simples por arma; só a que está em uso aparece)
    const weapons: Record<string, THREE.Object3D> = {};
    const metal = lam(0x2a2c30);
    const wood = lam(0x6a4628);
    const mk = (id: string, build: (g: THREE.Group) => void) => {
      const g = new THREE.Group();
      build(g);
      g.position.y = -0.66;
      g.visible = false;
      armR.add(g);
      weapons[id] = g;
    };
    const bar = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      return m;
    };
    // com o braço estendido para a frente, o eixo -Y do braço aponta para a frente
    mk("faca", (g) => g.add(bar(0.05, 0.34, 0.07, lam(0xc8ccd2), 0, -0.2, 0), bar(0.07, 0.12, 0.09, wood)));
    mk("bastao", (g) => g.add(bar(0.09, 0.9, 0.09, wood, 0, -0.42, 0)));
    mk("machado", (g) => g.add(bar(0.07, 0.8, 0.07, wood, 0, -0.36, 0), bar(0.06, 0.2, 0.3, lam(0xa8acb2), 0, -0.7, 0.12)));
    mk("pistola", (g) => g.add(bar(0.08, 0.3, 0.1, metal, 0, -0.14, 0), bar(0.08, 0.1, 0.16, metal, 0, 0, -0.06)));
    mk("espingarda", (g) => g.add(bar(0.09, 0.95, 0.09, metal, 0, -0.42, 0), bar(0.1, 0.34, 0.12, wood, 0, 0.1, -0.02)));
    mk("rifle", (g) => g.add(bar(0.07, 1.15, 0.07, metal, 0, -0.5, 0), bar(0.1, 0.4, 0.12, wood, 0, 0.12, -0.02), bar(0.06, 0.22, 0.06, metal, 0, -0.3, 0.1)));
    mk("arco", (g) => {
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 5, 12, Math.PI), wood);
      bow.rotation.set(0, Math.PI / 2, Math.PI / 2);
      bow.position.y = -0.1;
      g.add(bow);
    });

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow);

    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
    tag.position.y = 2.75;
    tag.scale.set(2.6, 0.65, 1);
    group.add(tag);
    this.scene.add(group);
    return { group, body, armL, armR, legL, legR, pack, vest, helmet, weapons, mats, tag, tagKey: "", shadow, phase: a.id, fall: 0 };
  }

  private setTag(v: ActorView, a: Actor, ally: boolean) {
    const key = `${a.name}|${ally}|${a === this.game.player}`;
    if (v.tagKey === key) return;
    v.tagKey = key;
    const mat = v.tag.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = canvasTexture(256, 64, (c) => {
      c.font = "900 30px system-ui, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = 6;
      c.strokeStyle = "rgba(0,0,0,0.85)";
      const text = (ally ? "🤝 " : "") + a.name;
      c.strokeText(text, 128, 32);
      c.fillStyle = ally ? "#7dffa0" : "#ffffff";
      c.fillText(text, 128, 32);
    });
    mat.needsUpdate = true;
  }

  private syncActor(a: Actor, dt: number) {
    const v = this.views.get(a.id)!;
    const g = this.game;
    v.group.position.set(a.x, 0, a.z);
    v.group.rotation.y = a.yaw;
    const me = a === g.player;
    v.tag.visible = a.alive && !me;
    if (v.tag.visible) this.setTag(v, a, g.allies(a, g.player));
    v.pack.visible = !!a.gear.mochila;
    v.vest.visible = !!a.gear.colete && a.armor > 0;
    v.helmet.visible = !!a.gear.capacete && a.armor > 0;
    const wp = g.weaponOf(a);
    for (const id in v.weapons) v.weapons[id].visible = a.alive && id === wp.id;
    for (const m of v.mats) m.emissive.setHex(a.hurt > 0 ? 0x7a1010 : 0);

    if (!a.alive) {
      v.fall = Math.min(1, v.fall + dt * 2.6);
      v.body.rotation.x = -v.fall * (Math.PI / 2);
      v.body.position.y = v.fall * 0.25;
      v.shadow.visible = false;
      v.armL.rotation.x = v.armR.rotation.x = 0;
      return;
    }
    const k = Math.min(1, a.speed / 5);
    v.phase += dt * a.speed * 1.75;
    const sw = Math.sin(v.phase) * 0.75 * k;
    v.legL.rotation.x = sw;
    v.legR.rotation.x = -sw;
    v.body.position.y = Math.abs(Math.sin(v.phase)) * 0.05 * k;
    const ranged = wp.kind !== "melee";
    if (a.using) {
      v.armL.rotation.x = -1.9;
      v.armR.rotation.x = -1.9;
    } else if (ranged) {
      // braços para a frente, apontando; o coice levanta um pouco
      v.armR.rotation.x = -1.5 - a.swing * 2.2;
      v.armL.rotation.x = -1.35;
      v.armL.rotation.z = -0.35;
    } else {
      v.armL.rotation.z = 0;
      v.armL.rotation.x = -sw;
      v.armR.rotation.x = a.swing > 0 ? -2.3 + (0.3 - a.swing) * 9 : sw * 0.6 - (wp.id === "punho" ? 0 : 0.5);
    }
    if (!ranged) v.armL.rotation.z = 0;
  }

  // ---------------------------------------------------------------- efeitos
  private tracer(x0: number, z0: number, x1: number, z1: number, weapon: string) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, 1.45, z0), new THREE.Vector3(x1, 1.3, z1)]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: weapon === "arco" ? 0xe8dcc0 : 0xffe08a, transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    this.tracers.push({ line, t: weapon === "arco" ? 0.16 : 0.07 });
  }
  private burst(x: number, z: number, color: number) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    m.position.set(x, 1.3, z);
    this.scene.add(m);
    this.bursts.push({ m, t: 0.22 });
  }

  // ---------------------------------------------------------------- quadro
  resize() {
    const cv = this.r.domElement;
    const w = cv.clientWidth || innerWidth;
    const h = cv.clientHeight || innerHeight;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    // em pé (celular), abre o campo de visão para enxergar os lados
    this.cam.fov = w < h ? 80 : 62;
    this.cam.updateProjectionMatrix();
  }

  frame(dt: number, yaw: number, pitch: number) {
    const g = this.game;
    this.clock += dt;
    for (const e of g.ev) {
      if (e.t === "shot") this.tracer(e.x0, e.z0, e.x1, e.z1, e.weapon);
      else if (e.t === "hit") this.burst(e.x, e.z, 0xc8302a);
      else if (e.t === "open") this.markOpened(e.cid);
      else if (e.t === "drop") {
        const c = g.world.containers.find((k) => k.id === e.cid);
        if (c) this.addContainer(c);
      }
    }
    for (const a of g.actors) this.syncActor(a, dt);
    for (const l of g.world.lore) {
      const m = this.loreMeshes.get(l.id);
      if (!m) continue;
      m.visible = !l.taken;
      m.rotation.y += dt * 2;
      m.position.y = 1.1 + Math.sin(this.clock * 2 + l.id) * 0.15;
    }
    for (const [, box] of this.boxes) {
      const ring = box.getObjectByName("ring");
      if (ring?.visible) ((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(this.clock * 4) * 0.25;
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
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t -= dt;
      b.m.scale.setScalar(1 + (0.22 - b.t) * 9);
      (b.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, b.t / 0.22);
      if (b.t <= 0) {
        this.scene.remove(b.m);
        b.m.geometry.dispose();
        (b.m.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
      }
    }
    // as Trevas: parede escura em volta da área segura
    const d = g.dark;
    this.darkWall.position.set(d.x, 30, d.z);
    this.darkWall.scale.set(Math.max(0.5, d.r), 1, Math.max(0.5, d.r));

    // ---- câmera em terceira pessoa, por cima do ombro
    const p = g.player;
    const sy = Math.sin(yaw);
    const cy = Math.cos(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const tx = p.x - cy * 0.55;
    const tz = p.z + sy * 0.55;
    const ty = 1.75;
    let dist = 5.4;
    // encurta a câmera quando há parede atrás
    const wall = rayBoxes(g.world, tx, tz, -sy, -cy, dist * cp + 0.4);
    dist = Math.max(1.1, Math.min(dist, (wall - 0.35) / Math.max(cp, 0.2)));
    // câmera colada na parede: some com o próprio boneco para não tapar a tela
    this.views.get(p.id)!.body.visible = dist > 2.3 || !p.alive;
    this.cam.position.set(tx - sy * cp * dist, Math.max(0.5, ty + sp * dist), tz - cy * cp * dist);
    this.cam.lookAt(tx + sy * cp * 20, ty - sp * 20, tz + cy * cp * 20);
    this.sky.position.set(this.cam.position.x, 0, this.cam.position.z);
    this.r.render(this.scene, this.cam);
  }

  dispose() {
    for (const f of this.disposed) f();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
    this.r.dispose();
  }
}

