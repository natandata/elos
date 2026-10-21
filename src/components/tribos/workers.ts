// Clash of Tribos: os obreiros da vila. Cada cabana pronta é um obreiro que anda pelo mapa de verdade:
// quem tem obra vai até ela e martela; quem está livre vai quebrar pedra, cortar árvore, buscar ouro e maná
// e carrega o recurso até o cofre. Só visual (não muda o jogo): vive no aparelho.

import { BUILDINGS, GRID, isBuild, isObstacle, type TribeKey } from "@/lib/tribos/data";
import { footprint, inProgress, type TBuilding } from "@/lib/tribos/state";
import { sprite, toWorld } from "./render";

type Carry = { color: string; dark: string };
type Step = "toSource" | "work" | "toDrop" | "drop" | "rest";
type Tool = "pick" | "hammer";
type Spark = "rock" | "wood" | "gold" | "mana" | "dust";

type Worker = {
  i: number;
  x: number;
  y: number;
  path: [number, number][];
  mode: "gather" | "build";
  step: Step;
  timer: number;
  /** alvo atual (fonte do recurso ou obra) */
  target: TBuilding | null;
  spark: Spark;
  carry: Carry | null;
  dropAt: TBuilding | null;
  face: 1 | -1;
  phase: number;
  hidden: boolean;
  tool: Tool;
  hit: boolean;
  /** andando para cima na tela (mostra o personagem de costas) */
  up: boolean;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; icon?: string };

const CARRY: Record<string, Carry> = {
  gold: { color: "#f6c52b", dark: "#a8780a" },
  mana: { color: "#35b8ee", dark: "#1a6a96" },
  wood: { color: "#a0703c", dark: "#5e3d1a" },
  stone: { color: "#a4a8ae", dark: "#5f636a" },
  herb: { color: "#5bb04a", dark: "#2f6a25" },
};

const SPEED = 2.1;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export class Crew {
  workers: Worker[] = [];
  parts: Particle[] = [];
  private blocked = new Uint8Array(GRID * GRID);
  private lastBs: TBuilding[] | null = null;

  private rebuild(bs: TBuilding[]): void {
    this.blocked.fill(0);
    for (const b of bs) {
      const f = footprint(b.kind, b.x, b.y);
      for (let y = f.y0; y <= f.y1; y++) for (let x = f.x0; x <= f.x1; x++) if (x >= 0 && y >= 0 && x < GRID && y < GRID) this.blocked[y * GRID + x] = 1;
    }
  }

  private free(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < GRID && y < GRID && !this.blocked[y * GRID + x];
  }

  /** Caminho mais curto em casas (sem atravessar construções). Null se não há caminho. */
  private bfs(sx: number, sy: number, gx: number, gy: number): [number, number][] | null {
    if (sx === gx && sy === gy) return [];
    const prev = new Int16Array(GRID * GRID).fill(-1);
    const q: number[] = [sy * GRID + sx];
    prev[sy * GRID + sx] = sy * GRID + sx;
    const goal = gy * GRID + gx;
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      if (c === goal) break;
      const cx = c % GRID;
      const cy = (c / GRID) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        const n = ny * GRID + nx;
        if (!this.free(nx, ny) || prev[n] !== -1) continue;
        prev[n] = c;
        q.push(n);
      }
    }
    if (prev[goal] === -1) return null;
    const out: [number, number][] = [];
    for (let c = goal; c !== sy * GRID + sx; c = prev[c]) out.push([c % GRID, (c / GRID) | 0]);
    return out.reverse();
  }

  /** Casa livre em volta da construção, a mais perto de (fx, fy). */
  private edgeSpot(b: TBuilding, fx: number, fy: number): [number, number] | null {
    const f = footprint(b.kind, b.x, b.y);
    let best: [number, number] | null = null;
    let bd = Infinity;
    for (let y = f.y0 - 1; y <= f.y1 + 1; y++) {
      for (let x = f.x0 - 1; x <= f.x1 + 1; x++) {
        if (x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1) continue;
        if (!this.free(x, y)) continue;
        const d = Math.hypot(x - fx, y - fy);
        if (d < bd) {
          bd = d;
          best = [x, y];
        }
      }
    }
    return best;
  }

  private goTo(w: Worker, spot: [number, number] | null): boolean {
    if (!spot) return false;
    const p = this.bfs(Math.round(w.x - 0.5), Math.round(w.y - 0.5), spot[0], spot[1]);
    if (!p) return false;
    w.path = p;
    return true;
  }

  private spawn(i: number, hut: TBuilding): Worker {
    const spot = this.edgeSpot(hut, hut.x, hut.y + 2) ?? [hut.x, hut.y];
    return { i, x: spot[0] + 0.5, y: spot[1] + 0.5, path: [], mode: "gather", step: "rest", timer: rnd(0.2, 1.5), target: null, spark: "dust", carry: null, dropAt: null, face: 1, phase: Math.random() * 6, hidden: false, tool: "pick", hit: false, up: false };
  }

  private pickGather(w: Worker, bs: TBuilding[], now: number): void {
    const ok = (b: TBuilding) => b.level >= 1 && !inProgress(b, now);
    const collectors = bs.filter((b) => isBuild(b.kind) && BUILDINGS[b.kind].makes && ok(b));
    const obstacles = bs.filter((b) => isObstacle(b.kind) && !inProgress(b, now));
    const pool = Math.random() < 0.55 && collectors.length ? collectors : obstacles.length ? obstacles : collectors;
    // prefere o que está perto do obreiro (fica à vista e não atravessa o mapa inteiro)
    const list = [...pool].sort((p, q) => Math.hypot(p.x - w.x, p.y - w.y) - Math.hypot(q.x - w.x, q.y - w.y)).slice(0, 4);
    if (!list.length) {
      w.step = "rest";
      w.timer = 2;
      return;
    }
    const t = list[Math.floor(Math.random() * list.length)];
    w.target = t;
    w.tool = "pick";
    if (isBuild(t.kind)) {
      const makes = BUILDINGS[t.kind].makes;
      w.spark = makes === "mana" ? "mana" : "gold";
      w.carry = null;
    } else {
      w.spark = t.kind === "tree" ? "wood" : "rock";
      w.carry = null;
    }
    if (this.goTo(w, this.edgeSpot(t, w.x, w.y))) w.step = "toSource";
    else {
      w.step = "rest";
      w.timer = 1.5;
    }
  }

  private pickDrop(w: Worker, bs: TBuilding[], now: number): void {
    const t = w.target;
    const want = t && isBuild(t.kind) ? BUILDINGS[t.kind].makes : null;
    const stores = bs.filter((b) => isBuild(b.kind) && b.level >= 1 && !inProgress(b, now) && (want ? BUILDINGS[b.kind].stores === want : false));
    const hq = bs.find((b) => b.kind === "hq");
    const pool = stores.length ? stores : hq ? [hq] : [];
    let best: TBuilding | null = null;
    let bd = Infinity;
    for (const b of pool) {
      const d = Math.hypot(b.x - w.x, b.y - w.y);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    w.dropAt = best;
    if (best && this.goTo(w, this.edgeSpot(best, w.x, w.y))) w.step = "toDrop";
    else {
      w.carry = null;
      w.step = "rest";
      w.timer = 1;
    }
  }

  private burst(w: Worker, n: number): void {
    const [wx, wy] = toWorld(w.x, w.y);
    const col = w.spark === "gold" ? "#ffd23f" : w.spark === "mana" ? "#7fdcff" : w.spark === "wood" ? "#b07a42" : w.spark === "rock" ? "#cfd3d8" : "#d8c9a5";
    for (let k = 0; k < n; k++) {
      this.parts.push({ x: wx + w.face * 10, y: wy - 10, vx: rnd(-40, 40) + w.face * 14, vy: rnd(-70, -20), life: 0, max: rnd(0.35, 0.7), color: col, size: rnd(1.6, 3.2) });
    }
  }

  update(dt: number, now: number, bs: TBuilding[]): void {
    dt = Math.min(0.25, dt);
    if (bs !== this.lastBs) {
      this.rebuild(bs);
      this.lastBs = bs;
    }
    const huts = bs.filter((b) => b.kind === "hut" && b.level >= 1).sort((a, b) => (a.id < b.id ? -1 : 1));
    while (this.workers.length < huts.length) this.workers.push(this.spawn(this.workers.length, huts[this.workers.length]));
    if (this.workers.length > huts.length) this.workers.length = huts.length;
    const busy = bs.filter((b) => inProgress(b, now)).sort((a, b) => (a.id < b.id ? -1 : 1));

    for (const w of this.workers) {
      const job = busy[w.i];
      if (job && !(w.mode === "build" && w.target?.id === job.id)) {
        w.mode = "build";
        w.target = job;
        w.tool = "hammer";
        w.spark = "dust";
        w.carry = null;
        w.hidden = false;
        w.step = this.goTo(w, this.edgeSpot(job, w.x, w.y)) ? "toSource" : "work";
      } else if (!job && w.mode === "build") {
        w.mode = "gather";
        w.step = "rest";
        w.timer = rnd(0.3, 1);
        w.target = null;
        w.tool = "pick";
      }
      const prevX = w.x;
      const prevY = w.y;

      // andar
      if (w.path.length) {
        w.hidden = false;
        const [px, py] = w.path[0];
        const dx = px + 0.5 - w.x;
        const dy = py + 0.5 - w.y;
        const d = Math.hypot(dx, dy);
        const step = SPEED * dt;
        if (d <= step) {
          w.x = px + 0.5;
          w.y = py + 0.5;
          w.path.shift();
        } else {
          w.x += (dx / d) * step;
          w.y += (dy / d) * step;
        }
        w.phase += dt * 9;
        const [cx1, cy1] = toWorld(w.x, w.y);
        const [cx0, cy0] = toWorld(prevX, prevY);
        const wsx = cx1 - cx0;
        if (Math.abs(cy1 - cy0) > 0.01) w.up = cy1 < cy0;
        if (Math.abs(wsx) > 0.01) w.face = wsx > 0 ? 1 : -1;
        if (!w.path.length) this.arrive(w);
        continue;
      }

      // parado
      w.phase += dt * (w.step === "work" ? 7 : 2);
      if (w.step === "work") {
        const t = w.target;
        if (t) {
          const [cx] = toWorld(t.x + 0.5, t.y + 0.5);
          w.face = cx >= toWorld(w.x, w.y)[0] ? 1 : -1;
        }
        const swing = Math.sin(w.phase);
        if (swing > 0.92 && !w.hit) {
          w.hit = true;
          this.burst(w, w.mode === "build" ? 4 : 6);
        } else if (swing < 0.4) w.hit = false;
        if (w.mode === "gather") {
          w.timer -= dt;
          if (w.timer <= 0) {
            const t2 = w.target;
            const col = t2 && isBuild(t2.kind) ? (BUILDINGS[t2.kind].makes === "mana" ? CARRY.mana : CARRY.gold) : t2?.kind === "tree" ? CARRY.wood : t2?.kind === "bush" ? CARRY.herb : CARRY.stone;
            w.carry = col;
            this.pickDrop(w, bs, now);
          }
        }
      } else if (w.step === "drop") {
        w.timer -= dt;
        if (w.timer <= 0) {
          const [wx, wy] = toWorld(w.x, w.y);
          if (w.carry) this.parts.push({ x: wx, y: wy - 24, vx: 0, vy: -26, life: 0, max: 0.9, color: w.carry.color, size: 0, icon: w.carry === CARRY.mana ? "i/gota" : w.carry === CARRY.gold ? "i/moeda" : undefined });
          w.carry = null;
          w.step = "rest";
          w.timer = rnd(0.4, 1.6);
        }
      } else if (w.step === "rest") {
        w.timer -= dt;
        if (w.timer <= 0 && w.mode === "gather") this.pickGather(w, bs, now);
      }
    }

    for (let k = this.parts.length - 1; k >= 0; k--) {
      const p = this.parts[k];
      p.life += dt;
      if (p.life >= p.max) {
        this.parts.splice(k, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.icon) p.vy += 180 * dt;
    }
  }

  private arrive(w: Worker): void {
    if (w.step === "toSource") {
      w.step = "work";
      w.timer = rnd(3, 4.6);
    } else if (w.step === "toDrop") {
      w.step = "drop";
      w.timer = 0.7;
    }
  }

  /** Itens para misturar com as construções na ordem de desenho: [profundidade, desenhar]. */
  items(tribe: TribeKey): { depth: number; draw: (ctx: CanvasRenderingContext2D, t: number) => void }[] {
    return this.workers.filter((w) => !w.hidden).map((w) => ({ depth: w.x + w.y + 0.4, draw: (ctx, t) => drawWorker(ctx, w, tribe, t) }));
  }

  drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.parts) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, a);
      if (p.icon) {
        const im = sprite(p.icon);
        if (im) ctx.drawImage(im, p.x - 8, p.y - 8, 16, 16);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Tamanho em que cada pose aparece (altura em px do mundo) — todas na mesma escala de personagem.
const POSE_H: Record<string, number> = { parado: 100, costas: 92, cesto: 78, tora: 88, minerar: 82, carrinho: 72, colhe: 78, foice: 68 };

function poseFor(w: Worker, walking: boolean): string {
  const female = w.i % 2 === 1;
  if (w.step === "work" && !walking) {
    if (w.mode === "build") return female ? "foice" : "parado";
    return female ? "foice" : "minerar";
  }
  if (w.carry) {
    if (female) return "colhe";
    if (w.carry === CARRY.gold) return "cesto";
    if (w.carry === CARRY.wood) return "tora";
    return "carrinho";
  }
  if (female) return "colhe";
  return walking && w.up ? "costas" : "parado";
}

/** Obreiros com a arte da folha de personagens: cada estado usa uma pose (andando, carregando, minerando, martelando). */
function drawWorker(ctx: CanvasRenderingContext2D, w: Worker, tribe: TribeKey, t: number): void {
  void tribe;
  void t;
  const [wx, wy] = toWorld(w.x, w.y);
  const walking = w.path.length > 0;
  const pose = poseFor(w, walking);
  const im = sprite(`o/${pose}`);
  if (!im) return;
  const h = POSE_H[pose] ?? 64;
  const wd = (h * im.naturalWidth) / im.naturalHeight;
  const working = w.step === "work" && !walking;
  const sw = Math.sin(w.phase);
  // andando: pulinho e balanço; trabalhando: golpe (afunda e levanta); parado: respira
  const hop = walking ? Math.abs(Math.sin(w.phase)) * 4 : 0;
  const tilt = walking ? Math.sin(w.phase) * 0.06 : working ? sw * 0.07 : 0;
  const squash = working ? 1 - Math.max(0, sw) * 0.05 : 1 + Math.sin(w.phase * 0.5) * 0.01;
  ctx.save();
  ctx.translate(wx, wy + 5);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 0, wd * 0.34, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -hop);
  ctx.rotate(tilt);
  ctx.scale(w.face, squash);
  ctx.drawImage(im, -wd / 2, -h, wd, h);
  ctx.restore();
}
