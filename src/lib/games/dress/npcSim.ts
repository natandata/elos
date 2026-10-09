// A multidão do Shopping Elos: 30 personagens bíblicas por andar que passeiam, olham vitrines, conversam, sobem e descem
// as escadas rolantes (sempre em pares, para continuar com 30 em cada andar) e, na praça de alimentação, sentam e comem.
// Código puro (sem navegador): o jogo 3D e o teste scripts/mall-e2e.ts usam o mesmo movimento da jogadora (stepBody).
import { stepBody, type Body, type World } from "./mallPhysics";
import { BIBLE_WOMEN, GOSSIP } from "./npcData";
import { BOOTH, CLOSED, CONSTRUCTION, ESCALATORS, ESC_X0, ESC_X1, FLOOR_COUNT, FOODS, FOOD_FLOOR, INFO_DESK, LANE_DOWN, LANE_UP, RESTAURANTS, STORES, counterFront, doorSpawn, floorAt, floorHalfZ, floorY, inRect, routeBetween, type Pt, type Seat } from "./shopping";

export const NPC_PER_FLOOR = 30;
/** 24 das personagens (as outras ficam só no baralho de conversas): menos texturas no celular. */
export const CROWD_POOL: number[] = BIBLE_WOMEN.map((_, i) => i).filter((i) => i % 3 !== 2);
export const LINE_S = 4.6;
const SPEED = 2.2;

type Mode = "idle" | "walk" | "meet" | "talk" | "sit" | "rwait" | "ride";
type Talk = { script: string[]; t0: number; first: boolean };
export type CrowdNpc = {
  id: number;
  /** índice em BIBLE_WOMEN */
  ch: number;
  /** andar a que pertence agora */
  home: number;
  b: Body;
  fx: 1 | -1;
  mv: number;
  mode: Mode;
  path: Pt[];
  after: Pt[];
  t: number;
  seat: number;
  /** andar de destino da viagem de escada rolante */
  dest: number;
  eat: string;
  mate: number;
  ready: boolean;
  talk: Talk | null;
  stuck: number;
  lx: number;
  lz: number;
  acc: number;
};

/** Área das escadas rolantes (nas pontas do corredor): quem passeia a pé desvia dela pela calçada. */
const inEscBox = (x: number, z: number): boolean => Math.abs(x) > 33 && Math.abs(z) < 8;
function avoidEsc(pts: Pt[], from: Pt): Pt[] {
  const out: Pt[] = [];
  let cur = from;
  for (const p of pts) {
    let hit = false;
    for (let i = 1; i < 20 && !hit; i++) hit = inEscBox(cur.x + ((p.x - cur.x) * i) / 20, cur.z + ((p.z - cur.z) * i) / 20);
    if (hit) {
      const zz = (cur.z + p.z >= 0 ? 1 : -1) * 12;
      out.push({ x: cur.x, z: zz }, { x: p.x, z: zz });
    }
    out.push(p);
    cur = p;
  }
  return out;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(l: T[]): T => l[Math.floor(Math.random() * l.length)];

export class Crowd {
  npcs: CrowdNpc[] = [];
  clock = 0;
  private sched = 2;
  private taken = new Set<number>();
  private freezeId: number | null = null;
  private skip = 0;
  constructor(
    private world: World,
    private seats: Seat[],
  ) {
    let id = 0;
    for (let f = 0; f < FLOOR_COUNT; f++) {
      for (let k = 0; k < NPC_PER_FLOOR; k++) {
        const p = this.promenade(f);
        this.npcs.push({
          id: id++,
          ch: CROWD_POOL[(f * 8 + k) % CROWD_POOL.length],
          home: f,
          b: { x: p.x, z: p.z, y: floorY(f), vx: 0, vz: 0, vy: 0, grounded: true },
          fx: Math.random() < 0.5 ? 1 : -1,
          mv: 0,
          mode: "idle",
          path: [],
          after: [],
          t: rnd(0.2, 6),
          seat: -1,
          dest: f,
          eat: "",
          mate: -1,
          ready: false,
          talk: null,
          stuck: 0,
          lx: p.x,
          lz: p.z,
          acc: 0,
        });
      }
    }
  }

  freeze(id: number | null): void {
    this.freezeId = id;
  }

  /** Pontos de passeio: calçadas do corredor, fora do átrio, das escadas rolantes e da obra. */
  private promenade(f: number): Pt {
    const hz = floorHalfZ(f);
    for (let i = 0; i < 40; i++) {
      const x = rnd(-52, 52);
      const side = Math.random() < 0.5 ? -1 : 1;
      const z = side * rnd(11, Math.min(hz - 3, f === FOOD_FLOOR ? 40 : 17));
      if (f === 0 && Math.abs(x) < 9 && Math.abs(z) < 9) continue;
      if (f > 0 && Math.abs(x) < 17 && Math.abs(z) < 12) continue;
      if (Math.abs(x) > 33 && Math.abs(z) < 8) continue;
      if (f === FOOD_FLOOR && x > CONSTRUCTION.x0 - 3) continue;
      return { x, z };
    }
    return { x: 20, z: 13 };
  }

  private goalFor(f: number): Pt {
    const r = Math.random();
    const doors = [...STORES, ...CLOSED].filter((s) => s.floor === f).map((s) => doorSpawn(s));
    if (f === 0 && r < 0.12) return { x: INFO_DESK.front.x + rnd(-2, 2), z: INFO_DESK.front.z - 0.5 };
    if (f === 0 && r < 0.2) return { x: BOOTH.front.x - 1.5, z: BOOTH.front.z + rnd(-1.5, 1.5) };
    if (f === FOOD_FLOOR && r < 0.45) {
      const c = counterFront(pick(RESTAURANTS));
      return { x: c.x + rnd(-2.5, 2.5), z: c.z + (c.z < 0 ? 1.2 : -1.2) };
    }
    if (doors.length && r < 0.6) {
      const d = pick(doors);
      return { x: d.x + rnd(-1.5, 1.5), z: d.z };
    }
    return this.promenade(f);
  }

  private pathTo(n: CrowdNpc, g: Pt): Pt[] {
    const f = floorAt(n.b.y);
    const a: Pt = { x: n.b.x, z: n.b.z };
    // contorna o átrio quando o trajeto reto o atravessa (mesma regra do botão "Ir para…")
    const out = routeBetween(f, f, a, g);
    return avoidEsc(out.length ? out : [g], a);
  }

  private newGoal(n: CrowdNpc): void {
    const f = n.home;
    if (f === FOOD_FLOOR || Math.random() < 0.1) {
      const free = this.seats.map((s, i) => ({ s, i })).filter(({ s, i }) => floorAt(s.y) === f && !this.taken.has(i));
      if (free.length && Math.random() < (f === FOOD_FLOOR ? 0.4 : 0.15)) {
        const { s, i } = pick(free);
        this.taken.add(i);
        n.seat = i;
        n.path = this.pathTo(n, { x: s.x - s.dir * 1.0, z: s.z });
        n.path.push({ x: s.x, z: s.z });
        n.mode = "walk";
        return;
      }
    }
    n.path = this.pathTo(n, this.goalFor(f));
    n.mode = "walk";
  }

  private release(n: CrowdNpc): void {
    if (n.seat >= 0) this.taken.delete(n.seat);
    n.seat = -1;
    n.eat = "";
    n.talk = null;
    n.ready = false;
    n.mate = -1;
  }

  private busy(n: CrowdNpc): boolean {
    return n.mode === "sit" || n.mode === "meet" || n.mode === "talk" || n.mode === "rwait" || n.mode === "ride";
  }

  private follow(n: CrowdNpc, dt: number): boolean {
    const tgt = n.path[0];
    if (!tgt) return true;
    const dx = tgt.x - n.b.x;
    const dz = tgt.z - n.b.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.7 || (n.path.length === 1 && n.seat >= 0 && n.mode === "walk" && d < 1.3)) {
      n.path.shift();
      return n.path.length === 0;
    }
    stepBody(this.world, n.b, { x: (dx / d) * SPEED, z: (dz / d) * SPEED }, dt, false);
    n.mv = 1;
    if (Math.abs(dx) > 0.25) n.fx = dx > 0 ? 1 : -1;
    const moved = Math.hypot(n.b.x - n.lx, n.b.z - n.lz);
    n.lx = n.b.x;
    n.lz = n.b.z;
    n.stuck = moved < SPEED * dt * 0.2 ? n.stuck + dt : 0;
    return false;
  }

  private startTalk(a: CrowdNpc, b: CrowdNpc): void {
    const script = pick(GOSSIP);
    const t = script.length * LINE_S + 2;
    a.mode = b.mode = "talk";
    a.t = b.t = t;
    const t0 = this.clock;
    a.talk = { script, t0, first: true };
    b.talk = { script, t0, first: false };
    a.mv = b.mv = 0;
    a.fx = b.b.x > a.b.x ? 1 : -1;
    b.fx = a.fx === 1 ? -1 : 1;
  }

  private scheduleTalk(): void {
    const f = Math.floor(Math.random() * FLOOR_COUNT);
    const here = this.npcs.filter((n) => n.home === f);
    if (here.filter((n) => n.mode === "talk" || n.mode === "meet").length >= 8) return;
    const free = here.filter((n) => !this.busy(n) && n.id !== this.freezeId);
    if (free.length < 2) return;
    const a = pick(free);
    const near = free.filter((n) => n !== a).sort((p, q) => Math.hypot(p.b.x - a.b.x, p.b.z - a.b.z) - Math.hypot(q.b.x - a.b.x, q.b.z - a.b.z));
    const b = near[Math.floor(Math.random() * Math.min(5, near.length))];
    const m = this.promenade(f);
    a.mode = b.mode = "meet";
    a.mate = b.id;
    b.mate = a.id;
    a.ready = b.ready = false;
    a.t = b.t = 28;
    a.path = this.pathTo(a, { x: m.x - 0.8, z: m.z });
    b.path = this.pathTo(b, { x: m.x + 0.8, z: m.z });
  }

  private scheduleRide(): void {
    if (this.npcs.filter((n) => n.mode === "ride" || n.mode === "rwait").length >= 8) return;
    const f = Math.floor(Math.random() * (FLOOR_COUNT - 1));
    const lo = this.npcs.filter((n) => n.home === f && !this.busy(n) && n.id !== this.freezeId);
    const hi = this.npcs.filter((n) => n.home === f + 1 && !this.busy(n) && n.id !== this.freezeId);
    if (!lo.length || !hi.length) return;
    const a = pick(lo);
    const b = pick(hi);
    this.setRide(a, f, f + 1, b);
    this.setRide(b, f + 1, f, a);
  }

  private setRide(n: CrowdNpc, from: number, to: number, mate: CrowdNpc): void {
    const up = to > from;
    const e = ESCALATORS.find((q) => q.from === Math.min(from, to) && q.up === up);
    if (!e) return;
    const lane = up ? (LANE_UP.z0 + LANE_UP.z1) / 2 : (LANE_DOWN.z0 + LANE_DOWN.z1) / 2;
    const entry: Pt = { x: up ? e.end * (ESC_X0 - 4) : e.end * (ESC_X1 + 3), z: lane };
    const route = routeBetween(from, to, { x: n.b.x, z: n.b.z }, this.goalFor(to));
    const i = route.findIndex((p) => Math.abs(p.x - entry.x) < 0.01 && Math.abs(p.z - entry.z) < 0.01);
    // a entrada de cima do poço só abre pela faixa (corrimão dos lados): chega em linha reta pela ponta do andar
    const approach: Pt[] = up ? [{ x: e.end * 28, z: lane }] : [{ x: e.end * 57, z: 9 }, { x: e.end * 57, z: lane }];
    const pre = avoidEsc([...route.slice(0, i), approach[0]], { x: n.b.x, z: n.b.z });
    n.path = [...pre, ...approach.slice(1), route[i]];
    // o ponto logo depois da entrada é o fim da escada rolante: esse trecho é o próprio passeio na escada
    n.after = [route[i + 1], ...avoidEsc(route.slice(i + 2), route[i + 1])];
    n.mode = "rwait";
    n.dest = to;
    n.mate = mate.id;
    n.ready = false;
    n.t = 40;
    n.seat = -1;
  }

  update(dt: number, viewFloor: number): void {
    dt = Math.min(dt, 0.1);
    this.clock += dt;
    this.sched -= dt;
    if (this.sched <= 0) {
      this.sched = rnd(1.2, 3);
      this.scheduleTalk();
      if (Math.random() < 0.6) this.scheduleRide();
    }
    this.skip++;
    for (const n of this.npcs) {
      n.acc += dt;
      // andares que ninguém está vendo andam em câmera lenta (1 a cada 4 quadros)
      if (floorAt(n.b.y) !== viewFloor && n.mode !== "ride" && this.skip % 4 !== n.id % 4) continue;
      const d = n.acc;
      n.acc = 0;
      n.mv = 0;
      if (n.id === this.freezeId && n.mode !== "ride") continue;
      switch (n.mode) {
        case "idle":
          n.t -= d;
          if (n.t <= 0) this.newGoal(n);
          break;
        case "walk": {
          const done = this.follow(n, d);
          if (n.seat >= 0 && done) {
            const s = this.seats[n.seat];
            n.b.x = s.x;
            n.b.z = s.z;
            n.b.y = s.y;
            n.b.vx = n.b.vz = n.b.vy = 0;
            n.fx = s.dir;
            n.mode = "sit";
            n.t = rnd(22, 50);
            const r = RESTAURANTS.find((q) => floorAt(s.y) === FOOD_FLOOR && inRect(q.zone, s.x, s.z));
            n.eat = r ? pick(FOODS.filter((q) => q.place === r.key)).icon : "";
          } else if (done || n.stuck > 1.6) {
            n.stuck = 0;
            n.path = [];
            n.mode = "idle";
            n.t = rnd(3, 9);
            if (n.seat >= 0) this.release(n);
          }
          break;
        }
        case "meet": {
          const m = this.npcs[n.mate];
          n.t -= d;
          if (!n.ready) {
            const done = this.follow(n, d);
            if (done || n.stuck > 1.6) n.ready = true;
          }
          if (n.t <= 0 || !m || m.mate !== n.id) {
            this.release(n);
            n.mode = "idle";
            n.t = 1;
          } else if (n.ready && m.ready && n.id < m.id) this.startTalk(n, m);
          break;
        }
        case "talk": {
          n.t -= d;
          if (n.t <= 0) {
            this.release(n);
            n.mode = "idle";
            n.t = rnd(1, 4);
          }
          break;
        }
        case "sit":
          n.t -= d;
          if (n.t <= 0) {
            const s = this.seats[n.seat];
            n.b.x = s.x - s.dir * 1.0;
            n.b.y = floorY(floorAt(s.y));
            n.b.vy = 0;
            this.release(n);
            n.mode = "idle";
            n.t = rnd(0.5, 3);
          }
          break;
        case "rwait": {
          const m = this.npcs[n.mate];
          n.t -= d;
          if (!n.ready) {
            const done = this.follow(n, d);
            if (done) n.ready = true;
            else if (n.stuck > 2.5) n.t = 0;
          }
          if (n.t <= 0 || !m || m.mate !== n.id) {
            n.path = [];
            n.after = [];
            this.release(n);
            n.mode = "idle";
            n.t = 1;
          } else if (n.ready && m.ready && (m.mode === "rwait" || m.mode === "ride")) {
            n.path = n.after;
            n.after = [];
            n.mode = "ride";
          }
          break;
        }
        case "ride": {
          const done = this.follow(n, d);
          // troca de andar quando sai da escada rolante (o par troca ao mesmo tempo: cada andar continua com 30)
          if (n.home !== n.dest && n.b.grounded && Math.abs(n.b.y - floorY(n.dest)) < 0.12) n.home = n.dest;
          if (done) {
            n.home = floorAt(n.b.y);
            this.release(n);
            n.mode = "idle";
            n.t = rnd(1, 4);
          } else if (n.stuck > 6) {
            // preso em cima de algo: volta ao chão do andar mais perto
            n.b.y = floorY(floorAt(n.b.y));
            n.home = floorAt(n.b.y);
            this.release(n);
            n.path = [];
            n.mode = "idle";
            n.t = 2;
          }
          break;
        }
      }
    }
  }

  /** O que a personagem está dizendo agora (só quando é a vez dela na conversa). */
  speaking(n: CrowdNpc): string | null {
    if (n.mode !== "talk" || !n.talk) return null;
    const idx = Math.floor((this.clock - n.talk.t0) / LINE_S);
    if (idx < 0 || idx >= n.talk.script.length) return null;
    if ((idx % 2 === 0) !== n.talk.first) return null;
    return n.talk.script[idx];
  }

  countOnFloor(f: number): number {
    return this.npcs.filter((n) => n.home === f).length;
  }
}
