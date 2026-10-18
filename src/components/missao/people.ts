import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Collider, Lane } from "@/lib/missao/map";

// Pessoas de Madureira: jogador e pedestres. Modelos CC0 do Quaternius (public/missao/people), recoloridos para
// cada pedestre ter roupa, pele e cabelo próprios. Animações: Idle, Walk, Run, Clapping.

const FILES = ["/missao/people/p0.glb", "/missao/people/p1.glb", "/missao/people/p2.glb", "/missao/people/p3.glb"];
/** p0 e p2 = homens; p1 e p3 = mulheres */
export const FEMALE = [false, true, false, true];
const HEIGHT = [1.78, 1.66, 1.8, 1.68];

type Clip = "Idle" | "Walk" | "Run" | "Clapping";

type Base = { scene: THREE.Object3D; clips: Partial<Record<Clip, THREE.AnimationClip>>; scale: number };

const SKIN = ["#f1c9a5", "#e0ac83", "#c68a5e", "#a8693f", "#8a5432", "#6b3e22", "#4f2c18"];
const HAIR = ["#1b1410", "#2e1f15", "#4a3020", "#6b4a2b", "#a07a45", "#111111", "#5a3826"];
const SHIRT = ["#d62828", "#1d4ed8", "#f59e0b", "#16a34a", "#7c3aed", "#db2777", "#0ea5e9", "#f97316", "#ffffff", "#111827", "#facc15", "#e11d48", "#14b8a6", "#9ca3af"];
const PANTS = ["#1f3a5f", "#273549", "#3b3b3b", "#111111", "#6b7280", "#7c4a2d", "#1e40af", "#d6c7a1", "#0f172a"];

export type Actor = {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<Clip, THREE.AnimationAction>>;
  cur: Clip | null;
  model: number;
};

export class PeopleKit {
  private bases: Base[] = [];

  async load(onProgress?: (p: number) => void): Promise<void> {
    const loader = new GLTFLoader();
    let done = 0;
    this.bases = await Promise.all(
      FILES.map(async (f, i) => {
        const g = await loader.loadAsync(f);
        done++;
        onProgress?.(done / FILES.length);
        const clips: Base["clips"] = {};
        for (const a of g.animations) {
          const n = a.name.split("|").pop() ?? "";
          for (const k of ["Idle", "Walk", "Run", "Clapping"] as Clip[]) if (n.endsWith(k) && !/Running|Jump/.test(n)) clips[k] = a;
        }
        const box = new THREE.Box3().setFromObject(g.scene);
        const h = box.max.y - box.min.y || 1;
        return { scene: g.scene, clips, scale: HEIGHT[i] / h };
      }),
    );
  }

  /** Cria uma pessoa do modelo `model` com cores sorteadas por `seed` (ou as dadas). */
  make(model: number, seed: number, castShadow: boolean): Actor {
    const base = this.bases[model % this.bases.length];
    const root = cloneSkinned(base.scene);
    root.scale.setScalar(base.scale);
    const r = mulberry(seed);
    const pick = (a: string[]) => a[Math.floor(r() * a.length)];
    const skin = new THREE.Color(pick(SKIN));
    const hair = new THREE.Color(pick(HAIR));
    const shirt = new THREE.Color(pick(SHIRT));
    const shirt2 = new THREE.Color(pick(SHIRT));
    const pants = new THREE.Color(pick(PANTS));
    root.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh) return;
      m.castShadow = castShadow;
      m.frustumCulled = false;
      const recolor = (mat: THREE.Material) => {
        const c = mat.clone() as THREE.MeshStandardMaterial;
        const n = (mat.name || "").toLowerCase();
        if (!c.color) return c;
        if (n.includes("skin")) c.color.copy(skin);
        else if (n.includes("hair")) c.color.copy(hair);
        else if (n.includes("jacket")) c.color.copy(shirt2);
        else if (n.includes("shirt")) c.color.copy(n.endsWith("2") ? shirt2 : shirt);
        else if (n.includes("pants")) c.color.copy(pants);
        c.roughness = 0.85;
        c.metalness = 0;
        return c;
      };
      m.material = Array.isArray(m.material) ? m.material.map(recolor) : recolor(m.material);
    });
    const mixer = new THREE.AnimationMixer(root);
    const actions: Actor["actions"] = {};
    for (const [k, clip] of Object.entries(base.clips) as [Clip, THREE.AnimationClip][]) actions[k] = mixer.clipAction(clip);
    const a: Actor = { root, mixer, actions, cur: null, model };
    play(a, "Idle");
    return a;
  }
}

export function play(a: Actor, clip: Clip, fade = 0.25, speed = 1) {
  const next = a.actions[clip] ?? a.actions.Idle;
  if (!next) return;
  next.timeScale = speed;
  if (a.cur === clip) return;
  const prev = a.cur ? a.actions[a.cur] : undefined;
  next.reset();
  next.setLoop(THREE.LoopRepeat, Infinity);
  next.play();
  if (prev && prev !== next) next.crossFadeFrom(prev, fade, false);
  a.cur = clip;
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ pedestres

const NAMES_M = ["Carlos", "Marcos", "Paulo", "Rafael", "Diego", "Anderson", "Seu Jorge", "Wellington", "Bruno", "Thiago", "Luiz", "Seu Zé", "Igor", "Leandro", "Fábio"];
const NAMES_F = ["Ana", "Juliana", "Patrícia", "Dona Maria", "Camila", "Vanessa", "Tatiane", "Dona Célia", "Bianca", "Fernanda", "Larissa", "Jéssica", "Dona Rosa", "Aline", "Priscila"];

/** Como cada pessoa reage quando você chega (dá variedade sem mudar a regra). */
export const MOODS = [
  { id: "pressa", hi: "Opa, tô meio com pressa... fala rápido!", no: "Ih, não entendi bem. Tenho que ir." },
  { id: "cetico", hi: "Religião? Sei não... eu não acredito muito nisso.", no: "Hum... não me convenceu, mas valeu." },
  { id: "aberto", hi: "Oi! Pode falar, tô ouvindo.", no: "Achei bonito, mas fiquei com dúvida." },
  { id: "triste", hi: "Tô passando por um momento difícil...", no: "Obrigado por tentar... fiquei pensando." },
  { id: "curioso", hi: "Você é da igreja ali? Sempre tive curiosidade.", no: "Interessante, mas não ficou claro pra mim." },
  { id: "afastado", hi: "Eu já fui da igreja, mas me afastei...", no: "Não sei se Deus ainda me quer..." },
  { id: "culpa", hi: "Será que Deus perdoa alguém como eu?", no: "Queria entender melhor isso." },
] as const;

export const YES = [
  "Nossa... nunca tinha pensado assim. Quero conhecer esse Jesus!",
  "Obrigado! Vou na igreja domingo, pode me esperar!",
  "Isso mexeu comigo. Pode orar por mim?",
  "Eu precisava ouvir isso hoje. Obrigado!",
  "Que coisa linda... eu quero essa vida nova!",
];

export type Npc = {
  id: number;
  actor: Actor;
  name: string;
  mood: (typeof MOODS)[number];
  lane: number;
  s: number;
  dir: 1 | -1;
  off: number;
  speed: number;
  x: number;
  z: number;
  yaw: number;
  /** andando / parado um pouco / conversando com o jogador / evangelizado (comemorando) */
  state: "walk" | "pause" | "talk" | "saved";
  timer: number;
  /** já foi evangelizado nesta rodada */
  saved: boolean;
  /** tentativas que não deram certo (no máximo 2 por pessoa) */
  fails: number;
};

export class Crowd {
  npcs: Npc[] = [];
  private ends = new Map<number, { lane: number; end: 0 | 1 }[]>();

  constructor(
    private kit: PeopleKit,
    private lanes: Lane[],
    private col: Collider,
    private scene: THREE.Object3D,
    private shadows: boolean,
  ) {
    lanes.forEach((l, i) => {
      for (const end of [0, 1] as const) {
        const p = end === 0 ? l.pts[0] : l.pts[l.pts.length - 1];
        const k = this.key(p[0], p[1]);
        const list = this.ends.get(k);
        if (list) list.push({ lane: i, end });
        else this.ends.set(k, [{ lane: i, end }]);
      }
    });
  }

  private key(x: number, z: number) {
    return Math.floor(x / 10 + 2048) * 4096 + Math.floor(z / 10 + 2048);
  }

  /** Espalha `n` pedestres; os mais próximos do ponto (cx, cz) primeiro (o começo da rodada fica movimentado). */
  spawn(n: number, cx: number, cz: number, seed = 1) {
    const r = mulberry(seed);
    // escolhe calçadas com mais chance perto do jogador
    const weights = this.lanes.map((l) => {
      const m = l.pts[Math.floor(l.pts.length / 2)];
      const d = Math.hypot(m[0] - cx, m[1] - cz);
      return l.len / (1 + (d / 160) ** 2);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      let t = r() * total;
      let lane = 0;
      for (; lane < weights.length - 1; lane++) {
        t -= weights[lane];
        if (t <= 0) break;
      }
      const model = Math.floor(r() * 4);
      const female = FEMALE[model];
      const actor = this.kit.make(model, Math.floor(r() * 1e9), this.shadows);
      this.scene.add(actor.root);
      const npc: Npc = {
        id: i,
        actor,
        name: (female ? NAMES_F : NAMES_M)[Math.floor(r() * 15)],
        mood: MOODS[Math.floor(r() * MOODS.length)],
        lane,
        s: r() * this.lanes[lane].len,
        dir: r() < 0.5 ? 1 : -1,
        off: (r() - 0.5) * 0.9,
        speed: 1.05 + r() * 0.45,
        x: 0,
        z: 0,
        yaw: 0,
        state: "walk",
        timer: 2 + r() * 10,
        saved: false,
        fails: 0,
      };
      this.place(npc);
      this.npcs.push(npc);
    }
  }

  private posOn(lane: number, s: number): [number, number, number] {
    const l = this.lanes[lane];
    let d = 0;
    for (let i = 1; i < l.pts.length; i++) {
      const [ax, az] = l.pts[i - 1];
      const [bx, bz] = l.pts[i];
      const L = Math.hypot(bx - ax, bz - az);
      if (d + L >= s || i === l.pts.length - 1) {
        const t = L > 0 ? Math.max(0, Math.min(1, (s - d) / L)) : 0;
        return [ax + (bx - ax) * t, az + (bz - az) * t, Math.atan2(bx - ax, bz - az)];
      }
      d += L;
    }
    const p = l.pts[0];
    return [p[0], p[1], 0];
  }

  private place(n: Npc) {
    const [x, z, a] = this.posOn(n.lane, n.s);
    const yaw = n.dir > 0 ? a : a + Math.PI;
    // desvio lateral (cada um anda num "trilho" diferente da calçada)
    const nx = Math.cos(a);
    const nz = -Math.sin(a);
    const [rx, rz] = this.col.resolve(x + nx * n.off, z + nz * n.off, 0.3);
    n.x = rx;
    n.z = rz;
    n.yaw = lerpAngle(n.yaw, yaw, 0.2);
  }

  update(dt: number, px: number, pz: number) {
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - px, n.z - pz);
      const near = d < 75;
      n.actor.root.visible = d < 150;
      if (n.state === "talk") {
        n.yaw = lerpAngle(n.yaw, Math.atan2(px - n.x, pz - n.z), 0.15);
        play(n.actor, "Idle");
      } else if (n.state === "saved") {
        n.timer -= dt;
        play(n.actor, "Clapping");
        if (n.timer <= 0) n.state = "walk";
      } else if (n.state === "pause") {
        n.timer -= dt;
        play(n.actor, "Idle");
        if (n.timer <= 0) {
          n.state = "walk";
          n.timer = 6 + Math.random() * 14;
        }
      } else {
        n.s += n.dir * n.speed * dt;
        const L = this.lanes[n.lane].len;
        if (n.s < 0 || n.s > L) this.turn(n);
        this.place(n);
        // não atravessa o jogador
        if (d < 0.75) {
          const ux = (n.x - px) / (d || 1);
          const uz = (n.z - pz) / (d || 1);
          n.x = px + ux * 0.75;
          n.z = pz + uz * 0.75;
        }
        play(n.actor, "Walk", 0.25, n.speed / 1.25);
        n.timer -= dt;
        if (n.timer <= 0) {
          n.state = "pause";
          n.timer = 1.5 + Math.random() * 3;
        }
      }
      n.actor.root.position.set(n.x, 0.15, n.z);
      n.actor.root.rotation.y = n.yaw;
      if (near) n.actor.mixer.update(dt);
    }
  }

  /** No fim da calçada: segue por outra que começa ali perto, ou volta. */
  private turn(n: Npc) {
    const L = this.lanes[n.lane].len;
    const atEnd = n.s > L ? 1 : 0;
    const p = atEnd ? this.lanes[n.lane].pts[this.lanes[n.lane].pts.length - 1] : this.lanes[n.lane].pts[0];
    const opts: { lane: number; end: 0 | 1 }[] = [];
    const cx = Math.floor(p[0] / 10);
    const cz = Math.floor(p[1] / 10);
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) {
        const l = this.ends.get(Math.floor(cx + i + 2048) * 4096 + Math.floor(cz + j + 2048));
        if (!l) continue;
        for (const o of l) {
          if (o.lane === n.lane) continue;
          const q = o.end === 0 ? this.lanes[o.lane].pts[0] : this.lanes[o.lane].pts[this.lanes[o.lane].pts.length - 1];
          if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 9) opts.push(o);
        }
      }
    if (opts.length && Math.random() < 0.85) {
      const o = opts[Math.floor(Math.random() * opts.length)];
      n.lane = o.lane;
      n.s = o.end === 0 ? 0 : this.lanes[o.lane].len;
      n.dir = o.end === 0 ? 1 : -1;
    } else {
      n.dir = n.dir > 0 ? -1 : 1;
      n.s = Math.max(0, Math.min(L, n.s));
    }
  }

  dispose() {
    for (const n of this.npcs) {
      this.scene.remove(n.actor.root);
      n.actor.mixer.stopAllAction();
    }
    this.npcs = [];
  }
}

export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
