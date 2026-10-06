// Criaturas, heróis aliados, chefes e projéteis: IA, física, habilidades, spawn e drops.
import * as THREE from "three";
import { B } from "../blocks/blocks";
import type { Sound } from "../audio/audio";
import type { Particles } from "../particles/particles";
import { type Body, newBody, stepBody } from "../player/physics";
import { biomeAt } from "../world/worldgen";
import type { World } from "../world/world";
import { type AbilityDef, MOBS, type MobDef } from "./definitions";
import { type Rig, animate, buildModel, disposeRig, flash } from "./models";

export interface Entity {
  id: number;
  def: MobDef;
  rig: Rig;
  body: Body;
  hp: number;
  maxHp: number;
  yaw: number;
  anim: number;
  dead: boolean;
  deadT: number;
  hurtT: number;
  invuln: number;
  atkCd: number;
  atkAnim: number;
  provoked: number;
  fleeT: number;
  pacified: number;
  wanderT: number;
  wanderYaw: number;
  walking: boolean;
  homeX: number;
  homeZ: number;
  ally: boolean;
  gifted: boolean;
  kx: number;
  kz: number;
  cds: number[];
  windup: number;
  stuckT: number;
  lastX: number;
  lastZ: number;
}

export interface ManagerHooks {
  damagePlayer(amount: number, fromX: number, fromZ: number): void;
  healPlayer(n: number): void;
  give(item: string, count: number): void;
  say(text: string): void;
  onKill(def: MobDef): void;
}

export interface Env {
  px: number;
  py: number;
  pz: number;
  alive: boolean;
  daylight: number;
  mobile: boolean;
}

interface Proj {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  dmg: number;
  life: number;
  owner: "player" | "ally";
  gravity: number;
}

const isHostile = (e: Entity) => !e.dead && (e.def.behavior === "hostile" || e.def.behavior === "boss");
const SUPPORT_ABILITIES = new Set(["sling", "fire", "wave", "calm"]);

export class EntityManager {
  list: Entity[] = [];
  private projs: Proj[] = [];
  private nextId = 1;
  private spawnT = 3;
  private arrowGeo = new THREE.BoxGeometry(0.06, 0.06, 0.55);
  private stoneGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  private arrowMat = new THREE.MeshBasicMaterial({ color: 0xe8dcb8 });
  private stoneMat = new THREE.MeshBasicMaterial({ color: 0x9a9aa2 });

  constructor(
    private scene: THREE.Scene,
    private world: World,
    private fx: Particles,
    private sfx: Sound,
    private hooks: ManagerHooks,
    private seed: number,
  ) {}

  // ---------- criação ----------
  spawn(def: MobDef, x: number, y: number, z: number): Entity {
    const rig = buildModel(def.model);
    rig.root.position.set(x, y, z);
    this.scene.add(rig.root);
    const e: Entity = {
      id: this.nextId++,
      def,
      rig,
      body: newBody(x, y, z, rig.radius * 2, rig.height),
      hp: def.hp,
      maxHp: def.hp,
      yaw: Math.random() * Math.PI * 2,
      anim: Math.random() * 10,
      dead: false,
      deadT: 0,
      hurtT: 0,
      invuln: 0,
      atkCd: 0.5,
      atkAnim: 0,
      provoked: 0,
      fleeT: 0,
      pacified: 0,
      wanderT: Math.random() * 3,
      wanderYaw: 0,
      walking: false,
      homeX: x,
      homeZ: z,
      ally: false,
      gifted: false,
      kx: 0,
      kz: 0,
      cds: (def.abilities ?? []).map(() => 2 + Math.random() * 3),
      windup: 0,
      stuckT: 0,
      lastX: x,
      lastZ: z,
    };
    this.list.push(e);
    return e;
  }

  private remove(e: Entity): void {
    disposeRig(e.rig);
    this.list = this.list.filter((o) => o !== e);
  }

  allyCount(): number {
    return this.list.filter((e) => e.ally && !e.dead).length;
  }

  bossNear(px: number, pz: number): Entity | null {
    let best: Entity | null = null;
    for (const e of this.list) {
      if (e.dead || e.def.behavior !== "boss") continue;
      const d = Math.hypot(e.body.x - px, e.body.z - pz);
      if (d < 50 && (!best || d < Math.hypot(best.body.x - px, best.body.z - pz))) best = e;
    }
    return best;
  }

  /** Raio contra as caixas das criaturas. Devolve a mais próxima. */
  pick(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, reach: number): { e: Entity; dist: number } | null {
    let best: { e: Entity; dist: number } | null = null;
    for (const e of this.list) {
      if (e.dead) continue;
      const b = e.body;
      const r = b.w / 2 + 0.12;
      const t = rayBox(ox, oy, oz, dx, dy, dz, b.x - r, b.y - 0.05, b.z - r, b.x + r, b.y + b.h + 0.1, b.z + r);
      if (t !== null && t <= reach && (!best || t < best.dist)) best = { e, dist: t };
    }
    return best;
  }

  // ---------- dano ----------
  hurt(e: Entity, amount: number, kbx: number, kbz: number, byPlayer: boolean): boolean {
    if (e.dead || e.invuln > 0) return false;
    if (e.def.behavior === "hero" && byPlayer) {
      this.hooks.say("Não ataque os heróis!");
      return false;
    }
    const dmg = amount * (1 - Math.min(0.8, e.def.defense * 0.04));
    e.hp -= dmg;
    e.hurtT = 0.3;
    e.invuln = 0.1;
    const heavy = e.def.behavior === "boss" ? 0.25 : 1;
    e.kx += kbx * 6 * heavy;
    e.kz += kbz * 6 * heavy;
    this.fx.burst(e.body.x, e.body.y + e.body.h * 0.6, e.body.z, 0xc23030, 8, 3, 0.1);
    this.sfx.play("hit");
    if (e.def.behavior === "passive") e.fleeT = 4;
    if (e.def.behavior === "neutral") e.provoked = 10;
    if (e.hp <= 0) this.die(e);
    return true;
  }

  private die(e: Entity): void {
    e.dead = true;
    e.deadT = 0;
    this.fx.burst(e.body.x, e.body.y + e.body.h * 0.5, e.body.z, 0xdddddd, 14, 3.5, 0.14);
    this.sfx.play("death");
    if (e.def.behavior === "hero") {
      this.hooks.say(`${e.def.name} caiu em batalha.`);
      return;
    }
    for (const l of e.def.loot) {
      if (Math.random() > l.chance) continue;
      const n = l.min + Math.floor(Math.random() * (l.max - l.min + 1));
      if (n > 0) this.hooks.give(l.item, n);
    }
    if (e.def.behavior === "boss") this.hooks.say(`${e.def.name} foi derrotado!`);
    this.hooks.onKill(e.def);
  }

  /** Dano em área ao redor de um ponto (ataques de heróis e do chefe). */
  private aoeOnEntities(x: number, y: number, z: number, radius: number, dmg: number, filter: (e: Entity) => boolean, push = 5): void {
    for (const e of this.list) {
      if (e.dead || !filter(e)) continue;
      const dx = e.body.x - x;
      const dz = e.body.z - z;
      const d = Math.hypot(dx, dz);
      if (d > radius || Math.abs(e.body.y - y) > 3) continue;
      const n = d || 1;
      this.hurt(e, dmg, (dx / n) * push * 0.2, (dz / n) * push * 0.2, false);
    }
  }

  // ---------- interação com heróis ----------
  recruit(e: Entity): { ok: boolean; message: string } {
    if (e.def.behavior !== "hero") return { ok: false, message: "" };
    if (!e.ally && this.allyCount() >= 2) return { ok: false, message: "Dois heróis já caminham com você." };
    e.ally = true;
    return { ok: true, message: `${e.def.name} caminha ao seu lado.` };
  }
  dismiss(e: Entity): void {
    e.ally = false;
    e.homeX = e.body.x;
    e.homeZ = e.body.z;
  }

  // ---------- projéteis ----------
  shoot(shape: "arrow" | "stone", ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, speed: number, dmg: number, gravity: number, owner: "player" | "ally"): void {
    const mesh = new THREE.Mesh(shape === "arrow" ? this.arrowGeo : this.stoneGeo, shape === "arrow" ? this.arrowMat : this.stoneMat);
    mesh.position.set(ox, oy, oz);
    this.scene.add(mesh);
    const n = Math.hypot(dx, dy, dz) || 1;
    this.projs.push({ mesh, x: ox, y: oy, z: oz, vx: (dx / n) * speed, vy: (dy / n) * speed, vz: (dz / n) * speed, dmg, life: 4, owner, gravity });
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projs) {
      p.life -= dt;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
      if (this.world.isSolid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) {
        p.life = 0;
        continue;
      }
      for (const e of this.list) {
        if (e.dead) continue;
        if (p.owner === "ally" ? !isHostile(e) : e.def.behavior === "hero") continue;
        const b = e.body;
        const r = b.w / 2 + 0.2;
        if (p.x > b.x - r && p.x < b.x + r && p.z > b.z - r && p.z < b.z + r && p.y > b.y - 0.1 && p.y < b.y + b.h + 0.1) {
          const n = Math.hypot(p.vx, p.vz) || 1;
          this.hurt(e, p.dmg, p.vx / n, p.vz / n, p.owner === "player");
          p.life = 0;
          break;
        }
      }
    }
    for (const p of this.projs) {
      if (p.life <= 0) {
        p.mesh.removeFromParent();
      }
    }
    this.projs = this.projs.filter((p) => p.life > 0);
  }

  // ---------- spawn ----------
  private spawnTick(dt: number, env: Env): void {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 1.4 + Math.random() * 1.2;
    const alive = this.list.filter((e) => !e.dead);
    if (alive.length >= (env.mobile ? 14 : 22)) return;
    const px = Math.floor(env.px);
    const pz = Math.floor(env.pz);
    const surf = this.world.surfaceY(px, pz);
    const underground = surf > 0 && env.py < surf - 6;
    const night = env.daylight < 0.35;

    let x = 0;
    let y = 0;
    let z = 0;
    let found = false;
    if (underground && Math.random() < 0.7) {
      for (let tries = 0; tries < 10 && !found; tries++) {
        x = Math.floor(env.px + (Math.random() - 0.5) * 36);
        z = Math.floor(env.pz + (Math.random() - 0.5) * 36);
        const cy = Math.floor(env.py + (Math.random() - 0.5) * 12);
        if (Math.hypot(x - env.px, z - env.pz) < 10) continue;
        if (!this.world.hasChunkAt(x, z)) continue;
        if (!this.world.isSolid(x, cy - 1, z) || this.world.isSolid(x, cy, z) || this.world.isSolid(x, cy + 1, z)) continue;
        y = cy;
        found = true;
      }
    } else {
      const ang = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 16;
      x = Math.floor(env.px + Math.cos(ang) * dist);
      z = Math.floor(env.pz + Math.sin(ang) * dist);
      if (this.world.hasChunkAt(x, z)) {
        const sy = this.world.surfaceY(x, z);
        if (sy > 0 && this.world.getBlock(x, sy + 1, z) === B.air && this.world.getBlock(x, sy, z) !== B.water) {
          y = sy + 1;
          found = true;
        }
      }
    }
    if (!found) return;

    const biome = biomeAt(this.seed, x, z);
    const present = new Map<string, number>();
    for (const e of alive) present.set(e.def.id, (present.get(e.def.id) ?? 0) + 1);
    const bossAlive = alive.some((e) => e.def.behavior === "boss");
    const heroes = alive.filter((e) => e.def.behavior === "hero").length;

    const pool: { def: MobDef; w: number }[] = [];
    for (const def of MOBS) {
      const r = def.spawn;
      if (!r) continue;
      if (underground && found && y < surf - 4 && !r.underground) continue;
      if (r.time === "night" && !(night || (underground && r.underground))) continue;
      if (r.time === "day" && night) continue;
      if (r.biomes && !r.biomes.includes(biome)) continue;
      if (def.behavior === "boss" && bossAlive) continue;
      if (def.behavior === "hero" && (heroes >= 2 || present.has(def.id))) continue;
      if ((present.get(def.id) ?? 0) >= 6) continue;
      pool.push({ def, w: r.weight });
    }
    if (pool.length === 0) return;
    let roll = Math.random() * pool.reduce((s, p) => s + p.w, 0);
    let chosen = pool[0].def;
    for (const p of pool) {
      roll -= p.w;
      if (roll <= 0) {
        chosen = p.def;
        break;
      }
    }
    const [gmin, gmax] = chosen.spawn?.group ?? [1, 1];
    const n = gmin + Math.floor(Math.random() * (gmax - gmin + 1));
    for (let i = 0; i < n; i++) {
      const sx = x + (Math.random() - 0.5) * 3;
      const sz = z + (Math.random() - 0.5) * 3;
      if (this.world.isSolid(Math.floor(sx), Math.floor(y), Math.floor(sz))) continue;
      this.spawn(chosen, sx, y, sz);
    }
  }

  // ---------- atualização ----------
  update(dt: number, env: Env): void {
    this.spawnTick(dt, env);
    for (const e of [...this.list]) this.updateEntity(e, dt, env);
    this.updateProjectiles(dt);
  }

  private updateEntity(e: Entity, dt: number, env: Env): void {
    const def = e.def;
    const b = e.body;
    e.anim += dt;
    e.hurtT = Math.max(0, e.hurtT - dt);
    e.invuln = Math.max(0, e.invuln - dt);
    e.atkCd = Math.max(0, e.atkCd - dt);
    e.provoked = Math.max(0, e.provoked - dt);
    e.fleeT = Math.max(0, e.fleeT - dt);
    e.pacified = Math.max(0, e.pacified - dt);
    for (let i = 0; i < e.cds.length; i++) e.cds[i] -= dt;
    if (e.atkAnim > 0) e.atkAnim = e.atkAnim + dt / 0.35 >= 1 ? 0 : e.atkAnim + dt / 0.35;

    if (e.dead) {
      e.deadT += dt;
      animate(e.rig, { t: e.anim, speed: 0, attack: 0, windup: 0, dead: e.deadT * 2 });
      flash(e.rig, 0);
      if (e.deadT > 1.1) this.remove(e);
      return;
    }

    const dPlayer = Math.hypot(b.x - env.px, b.z - env.pz);
    // longe demais: some (heróis aliados voltam pro lado do jogador)
    if (dPlayer > 70 && !e.ally) {
      this.remove(e);
      return;
    }
    if (isHostile(e) && def.behavior !== "boss" && env.daylight > 0.7 && !e.ally && b.y > 12 && Math.random() < dt * 0.15) {
      this.fx.burst(b.x, b.y + 1, b.z, 0xffd36a, 8, 2, 0.1);
      this.remove(e);
      return;
    }

    // ---- escolhe alvo ----
    let target: { x: number; y: number; z: number; ent: Entity | null; r: number } | null = null;
    let tdist = Infinity;
    if (isHostile(e) && e.pacified <= 0) {
      if (env.alive && dPlayer <= def.chaseRange) {
        target = { x: env.px, y: env.py, z: env.pz, ent: null, r: 0.3 };
        tdist = dPlayer;
      }
      for (const o of this.list) {
        if (!o.ally || o.dead) continue;
        const d = Math.hypot(o.body.x - b.x, o.body.z - b.z);
        if (d <= def.chaseRange * 0.6 && d < tdist) {
          target = { x: o.body.x, y: o.body.y, z: o.body.z, ent: o, r: o.rig.radius };
          tdist = d;
        }
      }
    } else if (def.behavior === "neutral" && e.provoked > 0 && env.alive) {
      target = { x: env.px, y: env.py, z: env.pz, ent: null, r: 0.3 };
      tdist = dPlayer;
    } else if (e.ally) {
      for (const o of this.list) {
        if (!isHostile(o)) continue;
        const d = Math.hypot(o.body.x - b.x, o.body.z - b.z);
        if (d <= 13 && d < tdist) {
          target = { x: o.body.x, y: o.body.y, z: o.body.z, ent: o, r: o.rig.radius };
          tdist = d;
        }
      }
    }

    // ---- movimento desejado ----
    let wantX = 0;
    let wantZ = 0;
    let speed = 0;
    const toward = (tx: number, tz: number, sp: number) => {
      const dx = tx - b.x;
      const dz = tz - b.z;
      const n = Math.hypot(dx, dz) || 1;
      wantX = dx / n;
      wantZ = dz / n;
      speed = sp;
    };

    const supportHero = e.ally && (def.abilities ?? []).some((a) => SUPPORT_ABILITIES.has(a.type));
    if (e.windup > 0) {
      speed = 0;
    } else if (e.fleeT > 0 && env.alive) {
      toward(b.x - (env.px - b.x), b.z - (env.pz - b.z), def.speed * 1.6);
    } else if (e.ally) {
      if (dPlayer > 30) {
        this.teleportNear(e, env);
      } else if (target && !supportHero && tdist > def.attackRange + target.r) {
        toward(target.x, target.z, def.speed * 1.2);
      } else if (dPlayer > 3.5) {
        toward(env.px, env.pz, def.speed * (dPlayer > 10 ? 1.8 : 1.15));
      }
    } else if (target) {
      if (tdist > def.attackRange + target.r - 0.2) toward(target.x, target.z, def.speed);
    } else if (def.behavior === "hero") {
      speed = 0;
    } else {
      e.wanderT -= dt;
      if (e.wanderT <= 0) {
        e.walking = Math.random() < 0.55;
        e.wanderT = e.walking ? 2 + Math.random() * 3 : 1.5 + Math.random() * 3;
        e.wanderYaw = Math.random() * Math.PI * 2;
        if (Math.hypot(b.x - e.homeX, b.z - e.homeZ) > 22) e.wanderYaw = Math.atan2(e.homeX - b.x, e.homeZ - b.z);
      }
      if (e.walking) {
        wantX = Math.sin(e.wanderYaw);
        wantZ = Math.cos(e.wanderYaw);
        speed = def.speed * 0.55;
      }
    }

    // travado contra parede: tenta outro rumo
    if (speed > 0) {
      e.stuckT += dt;
      if (e.stuckT > 1) {
        if (Math.hypot(b.x - e.lastX, b.z - e.lastZ) < 0.25) {
          e.wanderYaw = Math.random() * Math.PI * 2;
          wantX = Math.sin(e.wanderYaw);
          wantZ = Math.cos(e.wanderYaw);
          if (b.onGround) b.vy = 8;
        }
        e.stuckT = 0;
        e.lastX = b.x;
        e.lastZ = b.z;
      }
    }

    if (speed > 0) {
      const ty = Math.atan2(wantX, wantZ);
      let dy = ty - e.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      e.yaw += dy * Math.min(1, dt * 10);
    } else if (target && e.windup <= 0) {
      const ty = Math.atan2(target.x - b.x, target.z - b.z);
      let dy = ty - e.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      e.yaw += dy * Math.min(1, dt * 12);
    }

    // ---- física ----
    const lerp = Math.min(1, dt * 9);
    b.vx += (wantX * speed - b.vx) * lerp;
    b.vz += (wantZ * speed - b.vz) * lerp;
    b.vx += e.kx;
    b.vz += e.kz;
    e.kx *= Math.max(0, 1 - dt * 12);
    e.kz *= Math.max(0, 1 - dt * 12);
    if (b.inWater) b.vy = Math.min(2.4, b.vy + 22 * dt);
    else b.vy = Math.max(-30, b.vy - 26 * dt);
    if (b.hitWall && b.onGround && speed > 0) b.vy = 8.2;
    stepBody(this.world, b, dt);
    if (b.y < -5) {
      this.remove(e);
      return;
    }

    // ---- ataque ----
    if (target && def.attackRange > 0 && e.windup <= 0 && e.atkCd <= 0 && def.dmg > 0) {
      const flat = Math.hypot(target.x - b.x, target.z - b.z);
      if (flat <= def.attackRange + target.r && Math.abs(target.y - b.y) < 2.2) {
        e.atkCd = def.attackCooldown;
        e.atkAnim = 0.01;
        if (target.ent) this.hurt(target.ent, def.dmg, Math.sin(e.yaw) * 0.6, Math.cos(e.yaw) * 0.6, false);
        else this.hooks.damagePlayer(def.dmg, b.x, b.z);
      }
    }

    // ---- habilidades ----
    (def.abilities ?? []).forEach((ab, i) => this.ability(e, ab, i, target, tdist, env, dt));

    // ---- visual ----
    e.rig.root.position.set(b.x, b.y, b.z);
    e.rig.root.rotation.y = e.yaw;
    animate(e.rig, { t: e.anim, speed: Math.hypot(b.vx, b.vz), attack: e.atkAnim, windup: e.windup > 0 ? Math.min(1, e.windup / 0.6) : 0, dead: 0 });
    flash(e.rig, e.hurtT > 0 ? 0.55 : 0);
  }

  private teleportNear(e: Entity, env: Env): void {
    for (let t = 0; t < 8; t++) {
      const a = Math.random() * Math.PI * 2;
      const x = Math.floor(env.px + Math.cos(a) * 3);
      const z = Math.floor(env.pz + Math.sin(a) * 3);
      const sy = this.world.surfaceY(x, z);
      if (sy < 0) continue;
      e.body.x = x + 0.5;
      e.body.z = z + 0.5;
      e.body.y = sy + 1;
      e.body.vy = 0;
      return;
    }
  }

  private ability(e: Entity, ab: AbilityDef, i: number, target: { x: number; y: number; z: number; ent: Entity | null } | null, tdist: number, env: Env, dt: number): void {
    const b = e.body;
    if (ab.type === "stomp") {
      if (e.windup > 0) {
        e.windup += dt;
        if (e.windup >= ab.windup) {
          e.windup = 0;
          e.cds[i] = ab.cooldown;
          this.sfx.play("boss");
          for (let k = 0; k < 24; k++) {
            const a = (k / 24) * Math.PI * 2;
            this.fx.burst(b.x + Math.cos(a) * ab.radius * 0.7, b.y + 0.2, b.z + Math.sin(a) * ab.radius * 0.7, 0xb39a6a, 1, 2, 0.2);
          }
          if (env.alive && Math.hypot(env.px - b.x, env.pz - b.z) < ab.radius && Math.abs(env.py - b.y) < 2.2) this.hooks.damagePlayer(ab.dmg, b.x, b.z);
          this.aoeOnEntities(b.x, b.y, b.z, ab.radius, ab.dmg, (o) => o.ally, 6);
        }
      } else if (e.cds[i] <= 0 && target && tdist < ab.radius + 2.5) {
        e.windup = 0.001;
      }
      return;
    }
    if (!e.ally) return;
    if (e.cds[i] > 0) return;
    const hostiles = this.list.filter(isHostile);
    if (hostiles.length === 0) return;
    const near = (x: number, z: number, r: number) => hostiles.some((h) => Math.hypot(h.body.x - x, h.body.z - z) < r);
    const nearest = hostiles.reduce((a, c) => (Math.hypot(c.body.x - b.x, c.body.z - b.z) < Math.hypot(a.body.x - b.x, a.body.z - b.z) ? c : a));
    const nd = Math.hypot(nearest.body.x - b.x, nearest.body.z - b.z);

    switch (ab.type) {
      case "sling":
        if (nd <= ab.range) {
          const mult = nearest.def.behavior === "boss" ? ab.bossMult : 1;
          this.shoot(ab.shape ?? "stone", b.x, b.y + 1.5, b.z, nearest.body.x - b.x, nearest.body.y + nearest.body.h * 0.6 - (b.y + 1.5), nearest.body.z - b.z, ab.shape === "arrow" ? 28 : 30, ab.dmg * mult, ab.shape === "arrow" ? 8 : 3, "ally");
          e.atkAnim = 0.01;
          this.sfx.play("bow");
          e.cds[i] = ab.cooldown;
        }
        break;
      case "slam":
        if (nd <= ab.radius) {
          this.aoeOnEntities(b.x, b.y, b.z, ab.radius, ab.dmg, isHostile, 8);
          this.fx.burst(b.x, b.y + 0.3, b.z, 0xc9b27a, 16, 5, 0.18);
          e.atkAnim = 0.01;
          this.sfx.play("boss");
          e.cds[i] = ab.cooldown;
        }
        break;
      case "wave":
        if (near(b.x, b.z, ab.radius)) {
          for (const h of hostiles) {
            const dx = h.body.x - b.x;
            const dz = h.body.z - b.z;
            const d = Math.hypot(dx, dz);
            if (d > ab.radius) continue;
            h.kx += (dx / (d || 1)) * 2.2;
            h.kz += (dz / (d || 1)) * 2.2;
          }
          if (Math.hypot(env.px - b.x, env.pz - b.z) < ab.radius * 1.5) this.hooks.healPlayer(ab.heal);
          this.fx.burst(b.x, b.y + 1, b.z, 0x4aa3ff, 22, 6, 0.16);
          this.sfx.play("wave");
          e.cds[i] = ab.cooldown;
        }
        break;
      case "fire":
        if (nd <= ab.range) {
          const t = nearest.body;
          this.aoeOnEntities(t.x, t.y, t.z, ab.radius, ab.dmg, isHostile, 4);
          this.fx.burst(t.x, t.y + 0.8, t.z, 0xff7a1a, 24, 5, 0.2, 3);
          e.atkAnim = 0.01;
          this.sfx.play("fire");
          e.cds[i] = ab.cooldown;
        }
        break;
      case "calm":
        if (near(b.x, b.z, ab.radius)) {
          for (const h of hostiles) if (h.def.behavior !== "boss" && Math.hypot(h.body.x - b.x, h.body.z - b.z) < ab.radius) h.pacified = ab.seconds;
          this.fx.burst(b.x, b.y + 1.2, b.z, 0xb36bff, 20, 4, 0.14);
          this.sfx.play("wave");
          e.cds[i] = ab.cooldown;
        }
        break;
    }
  }

  dispose(): void {
    for (const e of [...this.list]) this.remove(e);
    for (const p of this.projs) p.mesh.removeFromParent();
    this.projs = [];
    this.arrowGeo.dispose();
    this.stoneGeo.dispose();
    this.arrowMat.dispose();
    this.stoneMat.dispose();
  }
}

/** Interseção raio × caixa (método das faixas). Devolve a distância ou null. */
function rayBox(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): number | null {
  let tmin = 0;
  let tmax = Infinity;
  const axes: [number, number, number, number][] = [
    [ox, dx, x0, x1],
    [oy, dy, y0, y1],
    [oz, dz, z0, z1],
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
    } else {
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}
