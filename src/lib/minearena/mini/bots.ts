// Jogadores do computador (bots) dos minigames. Só o ANFITRIÃO simula os bots; os outros jogadores recebem as posições
// (mensagem "bpos") e as mortes (mensagem "dead") como se fossem jogadores comuns.
//
// Jogos Vorazes: correm pela ponte até a Cornucópia, "saqueiam" (ficam mais fortes) e caçam quem está perto.
// Skywars: saqueiam a própria ilha, constroem ponte de blocos até o inimigo mais próximo e lutam (podem cair no vazio).
// Batalha de Construção: constroem uma casa, torre, pirâmide ou castelo bloco a bloco no terreno deles.
import { B } from "../blocks/blocks";
import { isBotId, type MiniMap, type MiniPlayer } from "./types";

export interface BotZone {
  started: boolean;
  r: number;
  dmg: number;
}

/** O que os bots precisam do motor (implementado em game.ts). */
export interface BotHost {
  isSolid(x: number, y: number, z: number): boolean;
  /** Põe um bloco aqui e avisa os outros jogadores. */
  setBlock(x: number, y: number, z: number, id: number): void;
  phase(): string;
  zone(): BotZone;
  /** Jogadores de verdade (inclui o local): posição e se ainda estão na partida. */
  humans(): { id: string; x: number; y: number; z: number; alive: boolean }[];
  /** Dano de um bot num jogador de verdade. */
  hurtHuman(id: string, dmg: number, fx: number, fz: number, botId: string): void;
  addVisual(id: string, name: string, x: number, y: number, z: number): void;
  moveVisual(id: string, x: number, y: number, z: number, yaw: number): void;
  removeVisual(id: string): void;
  broadcast(t: string, data: Record<string, unknown>): void;
  /** Um bot morreu (o diretor avisa todo mundo). */
  died(id: string, by?: string): void;
  /** Ruído de golpe/efeito perto de mim (opcional). */
  hitFx(x: number, y: number, z: number): void;
}

type Plan = [number, number, number, number][];

interface Bot {
  id: string;
  name: string;
  idx: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vy: number;
  hp: number;
  dead: boolean;
  placed: boolean;
  tier: number;
  looted: boolean;
  atkCd: number;
  stuck: number;
  wander: { x: number; z: number; t: number } | null;
  way: { x: number; z: number }[];
  kx: number;
  kz: number;
  lastHit: { id: string; t: number } | null;
  zoneT: number;
  lootT: number;
  // construção
  plan: Plan;
  step: number;
  buildT: number;
  orbit: number;
}

const MAX_HP = 20;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// ---------------------------------------------------------------------------- plantas da Batalha de Construção
function box(plan: Plan, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) plan.push([x, y, z, id]);
}
function ring(plan: Plan, x0: number, y: number, z0: number, x1: number, z1: number, id: number, hole?: (x: number, z: number) => boolean): void {
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
      if (hole?.(x, z)) continue;
      plan.push([x, y, z, id]);
    }
  }
}

function house(cx: number, cz: number, y: number): Plan {
  const p: Plan = [];
  const x0 = cx - 4, x1 = cx + 4, z0 = cz - 3, z1 = cz + 3;
  box(p, x0 - 1, y - 1, z0 - 1, x1 + 1, y - 1, z1 + 1, B.cobble);
  for (let h = 0; h < 4; h++) {
    ring(p, x0, y + h, z0, x1, z1, h === 0 || h === 3 ? B.cobble : B.planks, (x, z) => (z === z0 && x === cx && h < 2) || (h === 1 && (z === z0 || z === z1) && (x === cx - 2 || x === cx + 2)) || (h === 1 && (x === x0 || x === x1) && z === cz));
    if (h === 1) {
      for (const [x, z] of [[cx - 2, z0], [cx + 2, z0], [cx - 2, z1], [cx + 2, z1], [x0, cz], [x1, cz]]) p.push([x, y + h, z, B.glass]);
    }
  }
  for (let k = 0; ; k++) {
    const a0 = x0 + k, a1 = x1 - k, b0 = z0 + k, b1 = z1 - k;
    if (a0 > a1 || b0 > b1) break;
    box(p, a0, y + 4 + k, b0, a1, y + 4 + k, b1, k % 2 === 0 ? B.brick : B.planks);
  }
  p.push([x1 - 1, y + 5, z1 - 1, B.cobble], [x1 - 1, y + 6, z1 - 1, B.cobble], [cx, y, z0 - 1, B.torch]);
  return p;
}

function tower(cx: number, cz: number, y: number): Plan {
  const p: Plan = [];
  box(p, cx - 4, y - 1, cz - 4, cx + 4, y - 1, cz + 4, B.cobble);
  for (let h = 0; h < 15; h++) {
    ring(p, cx - 3, y + h, cz - 3, cx + 3, cz + 3, h % 5 === 3 ? B.brick : B.cobble, (x, z) => (h < 2 && z === cz - 3 && x === cx) || (h % 5 === 2 && (x === cx || z === cz) && h > 2));
    if (h % 5 === 2 && h > 2) for (const [x, z] of [[cx, cz - 3], [cx, cz + 3], [cx - 3, cz], [cx + 3, cz]]) p.push([x, y + h, z, B.glass]);
  }
  box(p, cx - 4, y + 15, cz - 4, cx + 4, y + 15, cz + 4, B.planks);
  ring(p, cx - 4, y + 16, cz - 4, cx + 4, cz + 4, B.cobble, (x, z) => (x + z) % 2 === 0);
  for (let h = 0; h < 5; h++) p.push([cx, y + 16 + h, cz, h === 4 ? B.torch : B.log]);
  return p;
}

function pyramid(cx: number, cz: number, y: number): Plan {
  const p: Plan = [];
  for (let k = 0; k < 8; k++) {
    const r = 7 - k;
    box(p, cx - r, y + k, cz - r, cx + r, y + k, cz + r, k % 3 === 2 ? B.limestone : B.sandstone);
  }
  p.push([cx, y + 8, cz, B.gold_block]);
  for (let h = 0; h < 2; h++) p.push([cx, y + h, cz - 7, B.air]);
  return p;
}

function castle(cx: number, cz: number, y: number): Plan {
  const p: Plan = [];
  const r = 8;
  for (let h = 0; h < 4; h++) ring(p, cx - r, y + h, cz - r, cx + r, cz + r, B.cobble, (x, z) => z === cz - r && Math.abs(x - cx) <= 1 && h < 3);
  ring(p, cx - r, y + 4, cz - r, cx + r, cz + r, B.cobble, (x, z) => (x + z) % 2 === 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = cx + sx * r, tz = cz + sz * r;
      for (let h = 0; h < 8; h++) ring(p, tx - 1, y + h, tz - 1, tx + 1, tz + 1, B.stone);
      box(p, tx - 1, y + 8, tz - 1, tx + 1, y + 8, tz + 1, B.brick);
      p.push([tx, y + 9, tz, B.torch]);
    }
  }
  box(p, cx - 2, y, cz - 2, cx + 2, y + 2, cz + 2, B.planks);
  box(p, cx - 1, y, cz - 1, cx + 1, y + 1, cz + 1, B.air);
  box(p, cx - 2, y + 3, cz - 2, cx + 2, y + 3, cz + 2, B.brick);
  p.push([cx, y + 4, cz, B.gold_block]);
  return p;
}

const PLANS = [house, tower, pyramid, castle];

// ---------------------------------------------------------------------------- bots
export class MiniBots {
  private bots: Bot[] = [];
  private t = 0;
  private posT = 0;
  private playT = 0;
  private lastPhase = "";

  constructor(
    private host: BotHost,
    private map: MiniMap,
    players: MiniPlayer[],
  ) {
    players.forEach((p, idx) => {
      if (!isBotId(p.id)) return;
      const sp = map.spawns[idx % map.spawns.length];
      this.bots.push({
        id: p.id,
        name: p.name,
        idx,
        x: sp.x,
        y: sp.y,
        z: sp.z,
        yaw: sp.yaw,
        vy: 0,
        hp: MAX_HP,
        dead: false,
        placed: false,
        tier: 0,
        looted: false,
        atkCd: rnd(0.5, 1.5),
        stuck: 0,
        wander: null,
        way: [],
        kx: 0,
        kz: 0,
        lastHit: null,
        zoneT: 0,
        lootT: 0,
        plan: [],
        step: 0,
        buildT: rnd(0, 0.5),
        orbit: rnd(0, Math.PI * 2),
      });
    });
  }

  get count(): number {
    return this.bots.length;
  }

  get ids(): string[] {
    return this.bots.map((b) => b.id);
  }

  alive(id: string): boolean {
    const b = this.bots.find((x) => x.id === id);
    return !!b && !b.dead;
  }

  /** Alguém atingiu um bot (jogador de verdade ou outro bot). */
  hurt(id: string, dmg: number, by: string, fx: number, fz: number): void {
    const b = this.bots.find((x) => x.id === id);
    if (!b || b.dead || this.host.phase() !== "play" || this.map.game === "build") return;
    const armor = b.tier >= 2 ? 0.3 : b.tier === 1 ? 0.15 : 0;
    b.hp -= Math.max(0.5, dmg) * (1 - armor);
    b.lastHit = { id: by, t: this.t };
    const dx = b.x - fx;
    const dz = b.z - fz;
    const n = Math.hypot(dx, dz) || 1;
    b.kx += (dx / n) * 7;
    b.kz += (dz / n) * 7;
    this.host.hitFx(b.x, b.y + 1.2, b.z);
    if (b.hp <= 0) this.kill(b, by);
  }

  private kill(b: Bot, by?: string): void {
    if (b.dead) return;
    b.dead = true;
    this.host.removeVisual(b.id);
    this.host.died(b.id, by);
  }

  dispose(): void {
    for (const b of this.bots) this.host.removeVisual(b.id);
    this.bots = [];
  }

  // ------------------------------------------------------------------ laço
  update(dt: number): void {
    dt = Math.min(dt, 0.1);
    this.t += dt;
    const phase = this.host.phase();
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      if (phase === "countdown" || phase === "play") this.placeAll();
      if (phase === "play") this.playT = 0;
    }
    if (phase === "play") {
      this.playT += dt;
      for (const b of this.bots) {
        if (b.dead) continue;
        if (this.map.game === "build") this.buildTick(b, dt);
        else this.fightTick(b, dt);
      }
    }
    // mostra os bots e avisa os outros jogadores
    this.posT -= dt;
    if (this.posT <= 0 && (phase === "countdown" || phase === "play" || phase === "judge")) {
      this.posT = 0.15;
      const list: number[][] = [];
      for (const b of this.bots) {
        if (b.dead || !b.placed) continue;
        this.host.moveVisual(b.id, b.x, b.y, b.z, b.yaw);
        list.push([b.idx, +b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2), +b.yaw.toFixed(2)]);
      }
      if (list.length) this.host.broadcast("bpos", { l: list });
    }
  }

  private placeAll(): void {
    for (const b of this.bots) {
      if (b.placed || b.dead) continue;
      const sp = this.map.spawns[b.idx % this.map.spawns.length];
      b.x = sp.x;
      b.y = sp.y;
      b.z = sp.z;
      b.yaw = sp.yaw;
      b.placed = true;
      this.host.addVisual(b.id, b.name, b.x, b.y, b.z);
      if (this.map.game === "build") {
        const pl = this.map.plots[b.idx];
        const cx = Math.round((pl.x0 + pl.x1) / 2);
        const cz = Math.round((pl.z0 + pl.z1) / 2);
        b.plan = PLANS[Math.floor(Math.random() * PLANS.length)](cx, cz, pl.floorY + 1).filter((q) => q[1] > pl.floorY && q[0] >= pl.x0 && q[0] <= pl.x1 && q[2] >= pl.z0 && q[2] <= pl.z1 && q[1] <= pl.ceilY);
      } else if (this.map.game === "hunger") {
        // ponte mais perto: até a borda do lago e depois até a Cornucópia
        const a = Math.atan2(b.z - this.map.center.z, b.x - this.map.center.x);
        const bridge = Math.round(a / (Math.PI / 6)) * (Math.PI / 6);
        const c = this.map.center;
        b.way = [
          { x: c.x + Math.cos(bridge) * 32, z: c.z + Math.sin(bridge) * 32 },
          { x: c.x + Math.cos(bridge) * 10, z: c.z + Math.sin(bridge) * 10 },
          { x: c.x + Math.cos(bridge + 0.5) * 5, z: c.z + Math.sin(bridge + 0.5) * 5 },
        ];
      }
    }
  }

  // ------------------------------------------------------------------ batalha
  private fightTick(b: Bot, dt: number): void {
    const g = this.map.game;
    b.atkCd -= dt;
    // empurrão do golpe
    if (Math.abs(b.kx) + Math.abs(b.kz) > 0.1) {
      this.move(b, b.x + b.kx * dt, b.z + b.kz * dt, false, true);
      b.kx *= Math.max(0, 1 - dt * 6);
      b.kz *= Math.max(0, 1 - dt * 6);
    }
    // zona
    const z = this.host.zone();
    const dc = Math.hypot(b.x - this.map.center.x, b.z - this.map.center.z);
    const outside = z.started && dc > z.r;
    if (outside) {
      b.zoneT += dt;
      if (b.zoneT >= 1) {
        b.zoneT = 0;
        b.hp -= z.dmg;
        if (b.hp <= 0) return this.kill(b, undefined);
      }
    } else b.zoneT = 0;
    // vazio
    if (b.y < this.map.voidY) return this.kill(b, b.lastHit && this.t - b.lastHit.t < 8 ? b.lastHit.id : undefined);
    // gravidade
    this.gravity(b, dt);
    if (b.dead) return;

    // saque: Jogos Vorazes no centro; Skywars depois de uns segundos (os baús da própria ilha)
    if (!b.looted) {
      if (g === "hunger" && b.way.length === 0) {
        // chegou na Cornucópia: leva uns segundos revirando os baús
        b.lootT += dt;
        if (b.lootT >= 12) this.loot(b, 1);
      }
      if (g === "skywars" && this.playT > 14 + b.idx * 1.3) this.loot(b, 1);
    }
    if (g === "skywars" && b.tier === 1 && (dc < 20 || this.playT > 90)) this.loot(b, 2);
    if (g === "hunger" && b.tier === 1 && this.playT > 70) this.loot(b, 2);

    // para onde ir?
    let goal: { x: number; z: number } | null = null;
    let target: { id: string; x: number; y: number; z: number } | null = null;
    if (outside) goal = { x: this.map.center.x, z: this.map.center.z };
    else if (g === "hunger" && b.way.length) goal = b.way[0];
    else if (b.looted || g === "skywars") {
      target = this.nearestEnemy(b, g === "hunger" ? 70 : 200);
      if (target && (g === "hunger" || b.looted)) goal = { x: target.x, z: target.z };
    }
    if (!goal) {
      if (!b.wander || b.wander.t <= 0 || Math.hypot(b.x - b.wander.x, b.z - b.wander.z) < 1.5) {
        const a = Math.random() * Math.PI * 2;
        const rr = rnd(4, 18);
        b.wander = { x: clamp(b.x + Math.cos(a) * rr, 2, 510), z: clamp(b.z + Math.sin(a) * rr, 2, 510), t: rnd(3, 6) };
      }
      b.wander.t -= dt;
      goal = b.wander;
    }

    const dx = goal.x - b.x;
    const dz = goal.z - b.z;
    const d = Math.hypot(dx, dz);
    if (target && d < 2.1) {
      // luta
      b.yaw = Math.atan2(-dx, -dz);
      if (b.atkCd <= 0) {
        b.atkCd = rnd(1.0, 1.45);
        if (Math.random() < 0.65) this.strike(b, target);
      }
      return;
    }
    if (g === "hunger" && b.way.length && d < 2.5) {
      b.way.shift();
      return;
    }
    if (d > 0.5) {
      const speed = target ? 4.1 : 3.4;
      // só faz ponte quando está indo atrás de alguém (ou fugindo da zona), não ao passear
      this.walk(b, goal.x, goal.z, speed, dt, g === "skywars" && (!!target || outside));
    }
  }

  private loot(b: Bot, tier: number): void {
    b.looted = true;
    if (b.tier < tier) b.tier = tier;
  }

  private strike(b: Bot, t: { id: string; x: number; y: number; z: number }): void {
    const dmg = ([2, 4.2, 6][b.tier] ?? 2) * rnd(0.85, 1.15);
    if (isBotId(t.id)) this.hurt(t.id, dmg, b.id, b.x, b.z);
    else this.host.hurtHuman(t.id, dmg, b.x, b.z, b.id);
  }

  private nearestEnemy(b: Bot, range: number): { id: string; x: number; y: number; z: number } | null {
    let best: { id: string; x: number; y: number; z: number } | null = null;
    let bd = range;
    for (const h of this.host.humans()) {
      if (!h.alive) continue;
      const d = Math.hypot(h.x - b.x, h.z - b.z) + Math.abs(h.y - b.y) * 0.5;
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    for (const o of this.bots) {
      if (o === b || o.dead || !o.placed) continue;
      const d = Math.hypot(o.x - b.x, o.z - b.z) + Math.abs(o.y - b.y) * 0.5 + 6; // prefere gente de verdade
      if (d < bd) {
        bd = d;
        best = { id: o.id, x: o.x, y: o.y, z: o.z };
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ movimento
  /** Primeiro chão que dá para pisar em (x,z) perto da altura atual, ou null. */
  private groundAt(x: number, z: number, fromY: number): number | null {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const top = Math.floor(fromY + 1.2);
    for (let cy = top; cy >= Math.floor(fromY) - 3; cy--) {
      if (!this.host.isSolid(ix, cy - 1, iz)) continue;
      if (this.host.isSolid(ix, cy, iz) || this.host.isSolid(ix, cy + 1, iz)) return null; // parede na frente
      return cy;
    }
    return null;
  }

  private gravity(b: Bot, dt: number): void {
    const g = this.groundAt(b.x, b.z, b.y);
    if (g !== null && b.y - g < 0.3 && b.vy <= 0) {
      b.y += (g - b.y) * Math.min(1, dt * 14);
      b.vy = 0;
      return;
    }
    if (g !== null && b.vy <= 0 && b.y + b.vy * dt <= g) {
      b.y = g;
      b.vy = 0;
      return;
    }
    // sem chão: cai
    b.vy = Math.max(-40, b.vy - 28 * dt);
    b.y += b.vy * dt;
  }

  private move(b: Bot, nx: number, nz: number, bridge: boolean, push = false): boolean {
    const c = this.map.center;
    const lim = this.map.limit - 1;
    const dc = Math.hypot(nx - c.x, nz - c.z);
    if (dc > lim) {
      nx = c.x + ((nx - c.x) / dc) * lim;
      nz = c.z + ((nz - c.z) / dc) * lim;
    }
    const g = this.groundAt(nx, nz, b.y);
    if (g !== null && g - b.y <= 1.15) {
      b.x = nx;
      b.z = nz;
      return true;
    }
    if (g === null && this.host.isSolid(Math.floor(nx), Math.floor(b.y), Math.floor(nz))) return false; // parede
    if (g !== null) return false; // degrau alto demais
    if (bridge) {
      // faz a ponte: um bloco debaixo do próximo passo
      const by = Math.round(b.y) - 1;
      if (!this.host.isSolid(Math.floor(nx), by, Math.floor(nz))) this.host.setBlock(Math.floor(nx), by, Math.floor(nz), B.planks);
      b.x = nx;
      b.z = nz;
      return true;
    }
    if (push) {
      b.x = nx;
      b.z = nz;
      return true;
    }
    return false;
  }

  private walk(b: Bot, tx: number, tz: number, speed: number, dt: number, bridge: boolean): void {
    if (b.vy < -0.5) return; // caindo
    const dx = tx - b.x;
    const dz = tz - b.z;
    const d = Math.hypot(dx, dz) || 1;
    const step = Math.min(d, speed * dt);
    const base = Math.atan2(dz, dx);
    const tries = b.stuck > 1.2 ? [0, 0.9, -0.9, 1.6, -1.6, 2.4] : [0, 0.6, -0.6, 1.2, -1.2];
    for (const off of tries) {
      const a = base + off;
      if (this.move(b, b.x + Math.cos(a) * step, b.z + Math.sin(a) * step, bridge && off === 0)) {
        b.yaw = Math.atan2(-Math.sin(a), -Math.cos(a));
        b.stuck = Math.max(0, b.stuck - dt);
        return;
      }
    }
    b.stuck += dt;
    if (b.stuck > 2.5) {
      b.stuck = 0;
      b.wander = null;
      // destravar: sobe no degrau
      b.y += 1.2;
    }
  }

  // ------------------------------------------------------------------ construção
  private buildTick(b: Bot, dt: number): void {
    const pl = this.map.plots[b.idx];
    if (!pl) return;
    const cx = (pl.x0 + pl.x1) / 2 + 0.5;
    const cz = (pl.z0 + pl.z1) / 2 + 0.5;
    // anda em volta da obra
    b.orbit += dt * 0.35;
    const tx = cx + Math.cos(b.orbit) * 9.5;
    const tz = cz + Math.sin(b.orbit) * 9.5;
    this.gravity(b, dt);
    const dx = tx - b.x;
    const dz = tz - b.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.4) {
      const st = Math.min(d, 3.2 * dt);
      const nx = b.x + (dx / d) * st;
      const nz = b.z + (dz / d) * st;
      const g = this.groundAt(nx, nz, b.y);
      if (g !== null && g - b.y <= 1.15) {
        b.x = nx;
        b.z = nz;
      }
      b.yaw = Math.atan2(-dx, -dz);
    }
    b.buildT -= dt;
    if (b.buildT <= 0 && b.step < b.plan.length) {
      b.buildT = rnd(0.35, 0.7);
      const [x, y, z, id] = b.plan[b.step++];
      this.host.setBlock(x, y, z, id);
      // abre um pouco de caminho para colocar vários blocos seguidos (blocos "rápidos": o mesmo andar)
      while (b.step < b.plan.length && b.plan[b.step][1] === y && Math.random() < 0.55) {
        const q = b.plan[b.step++];
        this.host.setBlock(q[0], q[1], q[2], q[3]);
      }
    }
  }
}
