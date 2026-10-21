// Clash of Tribos: os obreiros da vila. Cada cabana pronta é um obreiro que anda pelo mapa de verdade:
// quem tem obra vai até ela e martela; quem está livre vai quebrar pedra, cortar árvore, buscar ouro e maná
// e carrega o recurso até o cofre. Só visual (não muda o jogo): vive no aparelho.

import { BUILDINGS, GRID, TRIBES, isBuild, isObstacle, type TribeKey } from "@/lib/tribos/data";
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
    return { i, x: spot[0] + 0.5, y: spot[1] + 0.5, path: [], mode: "gather", step: "rest", timer: rnd(0.2, 1.5), target: null, spark: "dust", carry: null, dropAt: null, face: 1, phase: Math.random() * 6, hidden: false, tool: "pick", hit: false };
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
    dt = Math.min(0.06, dt);
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
        const wsx = toWorld(w.x, w.y)[0] - toWorld(prevX, w.y)[0];
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

function drawWorker(ctx: CanvasRenderingContext2D, w: Worker, tribe: TribeKey, t: number): void {
  void t;
  const T = TRIBES[tribe];
  const [wx, wy] = toWorld(w.x, w.y);
  const walking = w.path.length > 0;
  const bob = walking ? Math.abs(Math.sin(w.phase)) * 2.2 : w.step === "work" ? Math.abs(Math.sin(w.phase)) * 1.2 : 0;
  const leg = walking ? Math.sin(w.phase) * 4 : 0;
  ctx.save();
  ctx.translate(wx, wy + 4);
  ctx.scale(2.2, 2.2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 1, 8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(w.face, 1);
  // pernas
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-2.5, -6 - bob);
  ctx.lineTo(-2.5 + leg, 0);
  ctx.moveTo(2.5, -6 - bob);
  ctx.lineTo(2.5 - leg, 0);
  ctx.stroke();
  const by = -bob;
  // saco nas costas
  if (w.carry) {
    ctx.fillStyle = w.carry.color;
    ctx.strokeStyle = w.carry.dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-7, -17 + by, 6.5, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = w.carry.dark;
    ctx.fillRect(-9, -23 + by, 4, 2.5);
  }
  // corpo (túnica na cor da tribo)
  ctx.fillStyle = T.color;
  ctx.strokeStyle = T.dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-5.5, -19 + by, 11, 14, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#5a3b1e";
  ctx.fillRect(-5.5, -10 + by, 11, 2);
  // cabeça e chapéu
  ctx.fillStyle = "#f0c79a";
  ctx.beginPath();
  ctx.arc(0, -24 + by, 5.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = T.dark;
  ctx.beginPath();
  ctx.arc(0, -26 + by, 5.8, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-7.2, -26.4 + by, 14.4, 2);
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(2.2, -24.5 + by, 1.6, 1.6);
  // ferramenta na mão
  if (w.step === "work" && !walking) {
    const im = sprite(w.tool === "hammer" ? "i/martelo" : "i/picareta");
    const swing = Math.sin(w.phase);
    if (im) {
      ctx.save();
      ctx.translate(6, -14 + by);
      ctx.rotate(-1.1 + (swing + 1) * 0.85);
      ctx.drawImage(im, -3, -19, 22, 22);
      ctx.restore();
    }
  } else if (!w.carry && walking && w.tool === "pick") {
    const im = sprite("i/picareta");
    if (im) {
      ctx.save();
      ctx.translate(6, -14 + by);
      ctx.rotate(0.5);
      ctx.drawImage(im, -3, -19, 20, 20);
      ctx.restore();
    }
  }
  ctx.restore();
}
