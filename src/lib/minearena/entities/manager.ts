// Criaturas, heróis aliados, chefes e projéteis: IA, física, habilidades, spawn e drops.
import * as THREE from "three";
import { B } from "../blocks/blocks";
import type { Sound } from "../audio/audio";
import type { Particles } from "../particles/particles";
import { type Body, newBody, stepBody } from "../player/physics";
import { biomeAt } from "../world/worldgen";
import type { World } from "../world/world";
import { type AbilityDef, MOBS, MOB_BY_ID, type MobDef } from "./definitions";
import { type Rig, animate, buildModel, disposeRig, flash } from "./models";

/** Personagem da campanha (Modo História): não morre, não some e obedece ao roteiro. */
export interface StoryNpc {
  id: string;
  tag?: string;
  goto?: { x: number; z: number; speed: number } | null;
  /** "player" ou um ponto: o personagem se vira para lá quando está parado */
  face?: "player" | { x: number; z: number } | null;
  pose?: "bow" | "pray" | "wave" | "jump" | "kneel" | "point" | "idle" | null;
  poseT?: number;
  /** já chegou ao destino (para o roteiro esperar) */
  arrived?: boolean;
  /** fica parado onde está (animais já dentro da arca) */
  hold?: boolean;
  /** contornando um obstáculo alto (tronco, parede): segundos restantes e lado */
  detourT?: number;
  detourSide?: number;
}

export interface Entity {
  story?: StoryNpc;
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
  phase: number;
  love: number;
  breedCd: number;
  baby: boolean;
  growT: number;
  /** Montaria com sela / controle do cavaleiro / pavio (gafanhoto). */
  saddled: boolean;
  ctrl: { x: number; z: number; jump: boolean } | null;
  fuseT: number;
  /** Quem deu o último golpe ("host" ou id do jogador). */
  lastHit?: string;
  tx?: number;
  ty?: number;
  tz?: number;
  tyaw?: number;
  netSpeed?: number;
}

export interface ManagerHooks {
  /** `pid`: jogador remoto atingido (co-op); sem ele, é o jogador local. */
  damagePlayer(amount: number, fromX: number, fromZ: number, pid?: string): void;
  /** Co-op (convidado): avisa o anfitrião que acertou uma criatura. */
  netHit?(id: number, amount: number, kbx: number, kbz: number): void;
  /** Co-op (anfitrião): entrega o saque a quem deu o golpe final. */
  giveRemote?(pid: string, item: string, count: number): void;
  /** Co-op (anfitrião): eventos só visuais para os convidados. */
  net?(kind: string, data: Record<string, number>): void;
  healPlayer(n: number): void;
  /** Aplica um efeito (veneno…) no jogador local. */
  effect?(kind: string, secs: number): void;
  /** Explosão (gafanhoto). */
  explode?(x: number, y: number, z: number, r: number): void;
  give(item: string, count: number): void;
  /** Solta o saque no chão, onde a criatura caiu. */
  drop?(item: string, count: number, x: number, y: number, z: number): void;
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
  dim?: "overworld" | "geena";
  /** Outros jogadores da sala (co-op). */
  others?: { id: string; x: number; y: number; z: number }[];
  /** Distância (blocos) além da qual a criatura não é desenhada. */
  cull?: number;
  /** Máximo de criaturas vivas. */
  cap?: number;
  /** Multiplicador do intervalo de nascimento (maior = menos criaturas). */
  spawnMul?: number;
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
  owner: "player" | "ally" | "hostile";
  gravity: number;
  /** Só visual (co-op: quem simula é o anfitrião). */
  visual?: boolean;
}

interface Hazard {
  x: number;
  y: number;
  z: number;
  t: number;
  dmg: number;
  r: number;
  tick: number;
  visual?: boolean;
}

const isHostile = (e: Entity) => !e.dead && (e.def.behavior === "hostile" || e.def.behavior === "boss");
const SUPPORT_ABILITIES = new Set(["sling", "fire", "wave", "calm"]);

/** Poses simples dos personagens da campanha (sobre a animação normal do rig). */
function applyPose(e: Entity): void {
  const st = e.story;
  if (!st?.pose) return;
  const r = e.rig;
  const t = e.anim;
  switch (st.pose) {
    case "pray":
      if (r.armL) r.armL.rotation.x = -1.15;
      if (r.armR) r.armR.rotation.x = -1.15;
      r.head.rotation.x = 0.55;
      break;
    case "bow":
      r.head.rotation.x = 0.95;
      if (r.armL) r.armL.rotation.x = 0.2;
      if (r.armR) r.armR.rotation.x = 0.2;
      break;
    case "wave":
      if (r.armR) {
        r.armR.rotation.x = -2.6;
        r.armR.rotation.z = Math.sin(t * 9) * 0.5;
      }
      break;
    case "point":
      if (r.armR) r.armR.rotation.x = -1.5;
      break;
    case "jump":
      if (r.armL) r.armL.rotation.x = -2.8;
      if (r.armR) r.armR.rotation.x = -2.8;
      break;
    case "kneel":
      r.root.position.y -= 0.42;
      for (const l of [...r.legsA, ...r.legsB]) l.rotation.x = -1.35;
      r.head.rotation.x = 0.4;
      if (r.armL) r.armL.rotation.x = -0.9;
      if (r.armR) r.armR.rotation.x = -0.9;
      break;
  }
}

export class EntityManager {
  list: Entity[] = [];
  private projs: Proj[] = [];
  private hazards: Hazard[] = [];
  private playerPos = { x: 0, y: 0, z: 0 };
  /** Jogadores vivos (o local + os da sala) pra alvos e dano em área. */
  private players: { pid?: string; x: number; y: number; z: number }[] = [];
  /** Convidado: as criaturas são só "bonecos" que seguem o anfitrião. */
  clientMode = false;
  private fireGeo = new THREE.BoxGeometry(0.34, 0.34, 0.34);
  private fireMat = new THREE.MeshBasicMaterial({ color: 0xff8a1f });
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
      phase: 1,
      love: 0,
      breedCd: 0,
      baby: false,
      growT: 0,
      saddled: false,
      ctrl: null,
      fuseT: 0,
    };
    this.list.push(e);
    return e;
  }

  /** Filhote: metade do tamanho, cresce em 2 minutos. */
  spawnBaby(def: MobDef, x: number, y: number, z: number): Entity {
    const e = this.spawn(def, x, y, z);
    this.makeBaby(e);
    return e;
  }
  private makeBaby(e: Entity): void {
    e.baby = true;
    e.growT = 120;
    e.rig.root.scale.multiplyScalar(0.5);
    e.body.w *= 0.5;
    e.body.h *= 0.5;
    e.hp = e.maxHp = Math.ceil(e.maxHp / 2);
  }
  private grow(e: Entity): void {
    e.baby = false;
    e.rig.root.scale.multiplyScalar(2);
    e.body.w *= 2;
    e.body.h *= 2;
    e.hp = e.maxHp = e.def.hp;
  }

  /** Alimentar um animal: entra no cio (e acasala com outro) ou, se for filhote, cresce mais rápido. */
  feed(e: Entity, item: string): boolean {
    if (e.dead || !e.def.breeds || e.def.breeds !== item) return false;
    if (e.baby) {
      e.growT = Math.max(0, e.growT - 30);
      this.fx.burst(e.body.x, e.body.y + e.body.h + 0.2, e.body.z, 0x7cd37c, 6, 2, 0.1);
      return true;
    }
    if (e.love > 0 || e.breedCd > 0) return false;
    e.love = 20;
    this.fx.burst(e.body.x, e.body.y + e.body.h + 0.3, e.body.z, 0xff5a7a, 8, 2, 0.12);
    this.sfx.play("pickup");
    return true;
  }

  remove(e: Entity): void {
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
  hurt(e: Entity, amount: number, kbx: number, kbz: number, byPlayer: boolean, by?: string): boolean {
    if (e.story) return false;
    if (e.dead || e.invuln > 0) return false;
    if (this.clientMode) {
      if (e.def.behavior === "hero" && byPlayer) {
        this.hooks.say("Não ataque os heróis!");
        return false;
      }
      this.hooks.netHit?.(e.id, amount, kbx, kbz);
      e.hurtT = 0.3;
      e.invuln = 0.1;
      this.fx.burst(e.body.x, e.body.y + e.body.h * 0.6, e.body.z, 0xc23030, 8, 3, 0.1);
      this.sfx.play("hit");
      return true;
    }
    if (byPlayer) e.lastHit = by ?? "host";
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
    for (const l of e.baby ? [] : e.def.loot) {
      if (Math.random() > l.chance) continue;
      const n = l.min + Math.floor(Math.random() * (l.max - l.min + 1));
      if (n > 0) {
        if (e.lastHit && e.lastHit !== "host" && this.hooks.giveRemote) this.hooks.giveRemote(e.lastHit, l.item, n);
        else if (this.hooks.drop) this.hooks.drop(l.item, n, e.body.x, e.body.y + 0.5, e.body.z);
        else this.hooks.give(l.item, n);
      }
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
  shoot(shape: "arrow" | "stone" | "fire", ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, speed: number, dmg: number, gravity: number, owner: "player" | "ally" | "hostile", visual = false): void {
    const mesh = new THREE.Mesh(shape === "arrow" ? this.arrowGeo : shape === "fire" ? this.fireGeo : this.stoneGeo, shape === "arrow" ? this.arrowMat : shape === "fire" ? this.fireMat : this.stoneMat);
    mesh.position.set(ox, oy, oz);
    this.scene.add(mesh);
    const n = Math.hypot(dx, dy, dz) || 1;
    this.projs.push({ mesh, x: ox, y: oy, z: oz, vx: (dx / n) * speed, vy: (dy / n) * speed, vz: (dz / n) * speed, dmg, life: 4, owner, gravity, visual });
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
      if (p.owner === "hostile") {
        if (!p.visual) {
          for (const pp of this.players) {
            if (Math.hypot(p.x - pp.x, p.z - pp.z) < 0.9 && p.y > pp.y - 0.2 && p.y < pp.y + 2) {
              this.hooks.damagePlayer(p.dmg, p.x - p.vx * 0.1, p.z - p.vz * 0.1, pp.pid);
              this.fx.burst(p.x, p.y, p.z, 0xff8a1f, 10, 3, 0.16);
              p.life = 0;
              break;
            }
          }
        }
        if (Math.random() < 0.5) this.fx.burst(p.x, p.y, p.z, 0xff7a1a, 1, 0.5, 0.1, 0);
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
    // modo história: nada nasce sozinho (só os personagens do roteiro)
    if (env.spawnMul === 0) return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = (1.4 + Math.random() * 1.2) * (env.spawnMul ?? 1);
    const alive = this.list.filter((e) => !e.dead);
    if (alive.length >= (env.cap ?? (env.mobile ? 14 : 22))) return;
    const px = Math.floor(env.px);
    const pz = Math.floor(env.pz);
    const surf = this.world.surfaceY(px, pz);
    const geena = env.dim === "geena";
    const underground = geena || (surf > 0 && env.py < surf - 6);
    const night = env.daylight < 0.35;

    let x = 0;
    let y = 0;
    let z = 0;
    let found = false;
    if (underground && (geena || Math.random() < 0.7)) {
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

    const biome = geena ? "planicie" : biomeAt(this.seed, x, z);
    const present = new Map<string, number>();
    for (const e of alive) present.set(e.def.id, (present.get(e.def.id) ?? 0) + 1);
    const bossAlive = alive.some((e) => e.def.behavior === "boss");
    const heroes = alive.filter((e) => e.def.behavior === "hero").length;

    const pool: { def: MobDef; w: number }[] = [];
    for (const def of MOBS) {
      const r = def.spawn;
      if (!r) continue;
      if (!!r.dim !== geena) continue;
      if (!geena && underground && found && y < surf - 4 && !r.underground) continue;
      if (!geena && r.time === "night" && !(night || (underground && r.underground))) continue;
      if (!geena && r.time === "day" && night) continue;
      if (!geena && r.biomes && !r.biomes.includes(biome)) continue;
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
    this.playerPos = { x: env.px, y: env.py, z: env.pz };
    this.players = [];
    if (env.alive) this.players.push({ x: env.px, y: env.py, z: env.pz });
    for (const o of env.others ?? []) this.players.push({ pid: o.id, x: o.x, y: o.y, z: o.z });
    if (this.clientMode) {
      this.updateClient(dt, env);
      return;
    }
    this.spawnTick(dt, env);
    this.updateHazards(dt);
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
    e.love = Math.max(0, e.love - dt);
    e.breedCd = Math.max(0, e.breedCd - dt);
    if (e.baby) {
      e.growT -= dt;
      if (e.growT <= 0) this.grow(e);
    }
    if (e.love > 0 && !e.baby) {
      const mate = this.list.find((o) => o !== e && !o.dead && o.def === e.def && o.love > 0 && !o.baby && Math.hypot(o.body.x - e.body.x, o.body.z - e.body.z) < 4);
      if (mate) {
        e.love = mate.love = 0;
        e.breedCd = mate.breedCd = 60;
        this.fx.burst((e.body.x + mate.body.x) / 2, e.body.y + 1.2, (e.body.z + mate.body.z) / 2, 0xff5a7a, 14, 3, 0.14);
        this.spawnBaby(e.def, (e.body.x + mate.body.x) / 2, e.body.y + 0.1, (e.body.z + mate.body.z) / 2);
      }
    }
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
    if (e.story) {
      e.hp = e.maxHp;
      e.invuln = 1;
      // chunk ainda não carregado: espera parado (senão cairia pelo mundo)
      if (this.world.getBlock(Math.floor(b.x), 0, Math.floor(b.z)) === 0) return;
    }
    // longe demais: some (heróis aliados voltam pro lado do jogador)
    if (dPlayer > 70 && !e.ally && !e.story) {
      this.remove(e);
      return;
    }
    if (!e.story && isHostile(e) && def.behavior !== "boss" && env.daylight > 0.7 && !e.ally && b.y > 12 && Math.random() < dt * 0.15) {
      this.fx.burst(b.x, b.y + 1, b.z, 0xffd36a, 8, 2, 0.1);
      this.remove(e);
      return;
    }

    // ---- escolhe alvo ----
    let target: { x: number; y: number; z: number; ent: Entity | null; r: number; pid?: string } | null = null;
    let tdist = Infinity;
    if (e.story) {
      // personagens da campanha nunca escolhem alvo
    } else if (isHostile(e) && e.pacified <= 0) {
      for (const pl of this.players) {
        const d = Math.hypot(b.x - pl.x, b.z - pl.z);
        if (d <= def.chaseRange && d < tdist) {
          target = { x: pl.x, y: pl.y, z: pl.z, ent: null, r: 0.3, pid: pl.pid };
          tdist = d;
        }
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
    if (e.ctrl) {
      wantX = e.ctrl.x;
      wantZ = e.ctrl.z;
      speed = Math.hypot(wantX, wantZ) > 0.01 ? def.speed * 1.9 : 0;
      if (e.ctrl.jump && b.onGround) b.vy = 9.5;
    } else if (e.windup > 0 || e.fuseT > 0) {
      speed = 0;
    } else if (e.fleeT > 0 && env.alive) {
      toward(b.x - (env.px - b.x), b.z - (env.pz - b.z), def.speed * 1.6);
    } else if (e.story?.goto) {
      const g = e.story.goto;
      const dd = Math.hypot(g.x - b.x, g.z - b.z);
      if (dd < 0.9) {
        e.story.goto = null;
        e.story.arrived = true;
      } else {
        toward(g.x, g.z, g.speed);
        const st = e.story;
        if (st.detourT && st.detourT > 0) {
          st.detourT -= dt;
          const a = (st.detourSide ?? 1) * 1.3;
          const c = Math.cos(a);
          const s = Math.sin(a);
          const nx = wantX * c - wantZ * s;
          wantZ = wantX * s + wantZ * c;
          wantX = nx;
        }
      }
    } else if (e.story && (e.story.hold || def.behavior === "hero" || def.model.kind === "humanoid")) {
      // gente da campanha fica onde o roteiro a deixou (só os animais vagam)
      speed = 0;
    } else if (e.ally) {
      if (dPlayer > 30) {
        this.teleportNear(e, env);
      } else if (target && !supportHero && tdist > def.attackRange + target.r) {
        toward(target.x, target.z, def.speed * 1.2);
      } else if (dPlayer > 3.5) {
        toward(env.px, env.pz, def.speed * (dPlayer > 10 ? 1.8 : 1.15));
      }
    } else if (target) {
      const keep = def.keepDistance ?? 0;
      if (keep && tdist < keep - 2.5) toward(b.x - (target.x - b.x), b.z - (target.z - b.z), def.speed);
      else if (tdist > Math.max(def.attackRange + target.r - 0.2, keep)) toward(target.x, target.z, def.speed);
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

    // travado contra parede: tenta outro rumo (personagens da história só pulam mais alto, sem giro aleatório)
    if (speed > 0 && !e.story) {
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
    } else if (e.story?.face) {
      const f = e.story.face === "player" ? { x: env.px, z: env.pz } : e.story.face;
      const ty = Math.atan2(f.x - b.x, f.z - b.z);
      let dy = ty - e.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      e.yaw += dy * Math.min(1, dt * 8);
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
    if (def.climb && b.hitWall && speed > 0) b.vy = Math.max(b.vy, 4.5);
    else if (e.story && b.inWater && b.hitWall && speed > 0) b.vy = Math.max(b.vy, 6.5);
    else if (b.hitWall && b.onGround && speed > 0 && !e.ctrl) b.vy = e.story ? Math.max(8.2, this.stepUpSpeed(b, wantX, wantZ)) : 8.2;
    else if (b.hitWall && b.onGround && e.ctrl && speed > 0 && e.ctrl.jump) b.vy = 9.5;
    stepBody(this.world, b, dt);
    // andando por roteiro e batendo em algo que não dá para pular: contorna pelo lado
    if (e.story?.goto && b.hitWall && b.onGround && speed > 0 && !(e.story.detourT && e.story.detourT > 0) && this.stepUpSpeed(b, wantX, wantZ) === 0) {
      e.story.detourSide = -(e.story.detourSide ?? -1);
      e.story.detourT = 0.9;
    }
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
        else {
          this.hooks.damagePlayer(def.dmg, b.x, b.z, target.pid);
          if (def.effect && !target.pid) this.hooks.effect?.(def.effect.kind, def.effect.secs);
        }
      }
    }

    // ---- habilidades ----
    (def.abilities ?? []).forEach((ab, i) => this.ability(e, ab, i, target, tdist, env, dt));

    // ---- visual ----
    const shown = dPlayer < (env.cull ?? 60);
    if (e.rig.root.visible !== shown) e.rig.root.visible = shown;
    if (!shown) return;
    e.rig.root.position.set(b.x, b.y, b.z);
    e.rig.root.rotation.y = e.yaw;
    animate(e.rig, { t: e.anim, speed: Math.hypot(b.vx, b.vz), attack: e.atkAnim, windup: e.windup > 0 ? Math.min(1, e.windup / 0.6) : 0, dead: 0 });
    if (e.story?.pose && e.story.pose !== "idle") applyPose(e);
    flash(e.rig, e.hurtT > 0 ? 0.55 : 0);
  }

  /** Impulso de pulo para subir um degrau de até 3 blocos à frente (o terreno do mapa tem degraus de 2). */
  private stepUpSpeed(b: Body, wx: number, wz: number): number {
    const n = Math.hypot(wx, wz) || 1;
    const px = Math.floor(b.x + (wx / n) * 0.6);
    const pz = Math.floor(b.z + (wz / n) * 0.6);
    const y0 = Math.floor(b.y + 0.05);
    let h = 0;
    while (h < 4 && this.world.isSolid(px, y0 + h, pz)) h++;
    if (h === 0 || h >= 4) return 0;
    return Math.sqrt(2 * 26 * (h + 0.45));
  }

  private updateHazards(dt: number): void {
    for (const h of this.hazards) {
      h.t -= dt;
      h.tick -= dt;
      if (h.tick <= 0 && h.t > 0) {
        h.tick = 0.12;
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          this.fx.burst(h.x + Math.cos(a) * h.r, h.y + 0.15, h.z + Math.sin(a) * h.r, 0xff5a1a, 1, 0.3, 0.12, 0);
        }
      }
      if (h.t <= 0) {
        this.fx.burst(h.x, h.y + 0.6, h.z, 0xff8a1f, 22, 6, 0.22, 3);
        this.sfx.play("fire");
        if (!h.visual) for (const pl of this.players) if (Math.hypot(pl.x - h.x, pl.z - h.z) < h.r && Math.abs(pl.y - h.y) < 3) this.hooks.damagePlayer(h.dmg, h.x, h.z, pl.pid);
        this.aoeOnEntities(h.x, h.y, h.z, h.r, h.dmg, (o) => o.ally, 3);
      }
    }
    this.hazards = this.hazards.filter((h) => h.t > 0);
  }

  private teleportNear(e: Entity, env: Env): void {
    for (let t = 0; t < 8; t++) {
      const a = Math.random() * Math.PI * 2;
      const x = Math.floor(env.px + Math.cos(a) * 3);
      const z = Math.floor(env.pz + Math.sin(a) * 3);
      const sy = env.dim === "geena" ? Math.floor(env.py) - 1 : this.world.surfaceY(x, z);
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
    const frac = e.hp / e.maxHp;
    const phase = frac > 0.6 ? 1 : frac > 0.3 ? 2 : 3;
    if (e.def.behavior === "boss" && phase !== e.phase) {
      e.phase = phase;
      this.hooks.say(phase === 2 ? "Satanás invoca as trevas!" : "Satanás se enfurece! Resista!");
      this.sfx.play("boss");
    }
    if ("phase" in ab && ab.phase && phase < ab.phase) return;
    const cdMul = phase === 3 ? 0.6 : 1;
    if (ab.type === "bowshot") {
      if (e.cds[i] <= 0 && target && tdist <= ab.range) {
        e.cds[i] = ab.cooldown;
        e.atkAnim = 0.01;
        const sy = b.y + e.body.h * 0.75;
        const flat = Math.hypot(target.x - b.x, target.z - b.z);
        this.shoot("arrow", b.x, sy, b.z, target.x - b.x, target.y + 1.2 - sy + flat * 0.12, target.z - b.z, 22, ab.dmg, 8, "hostile");
        this.sfx.play("bow");
      }
      return;
    }
    if (ab.type === "explode") {
      if (e.fuseT <= 0) {
        if (target && !target.ent && tdist <= 2.6 && env.alive) {
          e.fuseT = ab.fuse;
          this.sfx.play("fire");
        }
      } else {
        e.fuseT -= dt;
        flash(e.rig, Math.floor(e.fuseT * 8) % 2 === 0 ? 0.9 : 0);
        if (!target || tdist > 6) {
          e.fuseT = 0;
          flash(e.rig, 0);
        } else if (e.fuseT <= 0) {
          this.hooks.explode?.(b.x, b.y + 0.5, b.z, ab.radius);
          this.remove(e);
        }
      }
      return;
    }
    if (ab.type === "firebolt") {
      if (e.cds[i] <= 0 && target && tdist <= ab.range) {
        e.cds[i] = ab.cooldown * cdMul;
        e.atkAnim = 0.01;
        const sy = b.y + e.body.h * 0.7;
        this.shoot("fire", b.x, sy, b.z, target.x - b.x, target.y + 1.1 - sy, target.z - b.z, 14, ab.dmg, 0, "hostile");
        this.hooks.net?.("proj", { x: +b.x.toFixed(1), y: +sy.toFixed(1), z: +b.z.toFixed(1), dx: +(target.x - b.x).toFixed(2), dy: +(target.y + 1.1 - sy).toFixed(2), dz: +(target.z - b.z).toFixed(2) });
        this.sfx.play("fire");
      }
      return;
    }
    if (ab.type === "summon") {
      if (e.cds[i] <= 0 && env.alive && this.list.filter((o) => !o.dead && o.def.id === ab.mob).length < ab.max) {
        e.cds[i] = ab.cooldown * cdMul;
        const md = MOB_BY_ID.get(ab.mob);
        if (md) {
          for (let k = 0; k < ab.count; k++) {
            const a = (k / ab.count) * Math.PI * 2 + Math.random();
            const sx = b.x + Math.cos(a) * 6;
            const sz = b.z + Math.sin(a) * 6;
            this.spawn(md, sx, b.y + 0.2, sz);
            this.fx.burst(sx, b.y + 1, sz, 0xff7a1a, 14, 4, 0.18);
          }
          this.hooks.say("Satanás invoca seus servos!");
          this.sfx.play("boss");
        }
      }
      return;
    }
    if (ab.type === "rain") {
      if (e.cds[i] <= 0 && env.alive) {
        e.cds[i] = ab.cooldown * cdMul;
        for (let k = 0; k < ab.count; k++) {
          const a = Math.random() * Math.PI * 2;
          const rr = k === 0 ? 0 : 2 + Math.random() * 7;
          const pl = this.players[k % Math.max(1, this.players.length)] ?? { x: env.px, y: env.py, z: env.pz };
          const hz = { x: pl.x + Math.cos(a) * rr, y: pl.y, z: pl.z + Math.sin(a) * rr, t: 1.4 + k * 0.12, dmg: ab.dmg, r: 2.4, tick: 0 };
          this.hazards.push(hz);
          this.hooks.net?.("haz", { x: +hz.x.toFixed(1), y: +hz.y.toFixed(1), z: +hz.z.toFixed(1), t: hz.t });
        }
        this.hooks.say("Chuva de fogo! Saia do círculo!");
      }
      return;
    }
    if (ab.type === "blink") {
      if (e.cds[i] <= 0 && env.alive && target) {
        e.cds[i] = ab.cooldown * cdMul;
        this.fx.burst(b.x, b.y + 2, b.z, 0x8a2be2, 24, 6, 0.2);
        const a = Math.random() * Math.PI * 2;
        b.x = env.px + Math.cos(a) * 6;
        b.z = env.pz + Math.sin(a) * 6;
        b.y = env.py + 0.2;
        b.vy = 0;
        this.fx.burst(b.x, b.y + 2, b.z, 0x8a2be2, 24, 6, 0.2);
        this.sfx.play("boss");
        for (const pl of this.players) if (Math.hypot(pl.x - b.x, pl.z - b.z) < 7) this.hooks.damagePlayer(ab.dmg, b.x, b.z, pl.pid);
      }
      return;
    }
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
          for (const pl of this.players) if (Math.hypot(pl.x - b.x, pl.z - b.z) < ab.radius && Math.abs(pl.y - b.y) < 2.2) this.hooks.damagePlayer(ab.dmg, b.x, b.z, pl.pid);
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

  // ---------- co-op ----------
  /** Anfitrião: fotografia compacta das criaturas perto de algum jogador. */
  snapshot(): (number | string)[][] {
    const out: (number | string)[][] = [];
    for (const e of this.list) {
      if (!this.players.some((p) => Math.hypot(p.x - e.body.x, p.z - e.body.z) < 90)) continue;
      const flags = (e.dead ? 1 : 0) | (e.baby ? 2 : 0) | (e.ally ? 4 : 0) | (e.atkAnim > 0 ? 8 : 0) | (e.windup > 0 ? 16 : 0);
      out.push([e.id, e.def.id, +e.body.x.toFixed(2), +e.body.y.toFixed(2), +e.body.z.toFixed(2), +e.yaw.toFixed(2), Math.round((e.hp / e.maxHp) * 100), flags]);
    }
    return out;
  }

  /** Convidado: cria, move e remove os "bonecos" conforme a fotografia do anfitrião. */
  applySnapshot(list: (number | string)[][]): void {
    const seen = new Set<number>();
    for (const r of list) {
      const id = r[0] as number;
      seen.add(id);
      let e = this.list.find((o) => o.id === id);
      const flags = r[7] as number;
      if (!e) {
        const def = MOB_BY_ID.get(r[1] as string);
        if (!def || (flags & 1)) continue;
        e = this.spawn(def, r[2] as number, r[3] as number, r[4] as number);
        e.id = id;
        if (flags & 2) this.makeBaby(e);
      }
      e.tx = r[2] as number;
      e.ty = r[3] as number;
      e.tz = r[4] as number;
      e.tyaw = r[5] as number;
      e.hp = ((r[6] as number) / 100) * e.maxHp;
      e.ally = !!(flags & 4);
      if (flags & 8) e.atkAnim = Math.max(e.atkAnim, 0.01);
      e.windup = flags & 16 ? 0.6 : 0;
      if ((flags & 1) && !e.dead) {
        e.dead = true;
        e.deadT = 0;
        this.sfx.play("death");
      }
    }
    for (const e of [...this.list]) if (!seen.has(e.id) && !e.dead) this.remove(e);
  }

  /** Eventos visuais do anfitrião (bola de fogo, chuva de fogo). */
  visualEvent(kind: string, d: Record<string, number>): void {
    if (kind === "proj") this.shoot("fire", d.x, d.y, d.z, d.dx, d.dy, d.dz, 14, 0, 0, "hostile", true);
    if (kind === "haz") this.hazards.push({ x: d.x, y: d.y, z: d.z, t: d.t, dmg: 0, r: 2.4, tick: 0, visual: true });
  }

  private updateClient(dt: number, env: Env): void {
    for (const e of [...this.list]) {
      e.anim += dt;
      e.hurtT = Math.max(0, e.hurtT - dt);
      e.invuln = Math.max(0, e.invuln - dt);
      if (e.atkAnim > 0) e.atkAnim = e.atkAnim + dt / 0.35 >= 1 ? 0 : e.atkAnim + dt / 0.35;
      if (e.dead) {
        e.deadT += dt;
        animate(e.rig, { t: e.anim, speed: 0, attack: 0, windup: 0, dead: e.deadT * 2 });
        if (e.deadT > 1.1) this.remove(e);
        continue;
      }
      const b = e.body;
      const k = Math.min(1, dt * 8);
      const ox = b.x;
      const oz = b.z;
      if (e.tx !== undefined) {
        b.x += (e.tx - b.x) * k;
        b.y += ((e.ty ?? b.y) - b.y) * k;
        b.z += ((e.tz ?? b.z) - b.z) * k;
      }
      if (e.tyaw !== undefined) {
        let dy = e.tyaw - e.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        e.yaw += dy * k;
      }
      const sp = Math.hypot(b.x - ox, b.z - oz) / Math.max(dt, 0.001);
      e.netSpeed = (e.netSpeed ?? 0) * 0.7 + sp * 0.3;
      const dP = Math.hypot(b.x - env.px, b.z - env.pz);
      const shown = dP < (env.cull ?? 60);
      if (e.rig.root.visible !== shown) e.rig.root.visible = shown;
      if (!shown) continue;
      e.rig.root.position.set(b.x, b.y, b.z);
      e.rig.root.rotation.y = e.yaw;
      animate(e.rig, { t: e.anim, speed: e.netSpeed, attack: e.atkAnim, windup: e.windup > 0 ? 0.6 : 0, dead: 0 });
      flash(e.rig, e.hurtT > 0 ? 0.55 : 0);
    }
    this.updateHazards(dt);
    this.updateProjectiles(dt);
  }

  dispose(): void {
    for (const e of [...this.list]) this.remove(e);
    for (const p of this.projs) p.mesh.removeFromParent();
    this.projs = [];
    this.hazards = [];
    this.fireGeo.dispose();
    this.fireMat.dispose();
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
