// Motor do MINEARENA: laço do jogo, jogador, mineração, construção, combate, save e ponte com a interface.
import * as THREE from "three";
import { B, BLOCKS, type BlockKey, FLUID_MAX, blockDef, breakInfo, fluidId, isFluid } from "./blocks/blocks";
import { FluidSim } from "./world/fluids";
import { AUTOSAVE_S, DAY_SECONDS, PLAYER, REACH, RENDER_DISTANCE } from "./config/config";
import { Sound } from "./audio/audio";
import { MOB_BY_ID } from "./entities/definitions";
import { EntityManager, type Entity } from "./entities/manager";
import { HOTBAR, Inventory, type Stack } from "./items/inventory";
import { RARITY_COLOR, itemDef } from "./items/items";
import { Particles } from "./particles/particles";
import { type Body, inLava, newBody, stepBody } from "./player/physics";
import { type SavedContainer, type WorldSave, putWorld } from "./save/save";
import { FUEL, SMELT, SMELT_TIME } from "./crafting/smelting";
import { rollLoot } from "./structures/loot";
import { STRUCTURE_BY_ID, structuresNear } from "./structures/structures";
import { type Settings, DEFAULT_SETTINGS } from "./config/settings";
import { BLOCK_TILES, type TileName } from "./blocks/tiles";
import { cachedTile, createCracks } from "./textures/atlas";
import { canvasPixels, spritePixels } from "./textures/sprites";
import { Sky } from "./world/sky";
import { World } from "./world/world";
import { BIOME_NAME, biomeAt, findSpawn } from "./world/worldgen";
import { RECIPES, type Recipe } from "./crafting/recipes";

export interface HudState {
  health: number;
  hunger: number;
  armor: number;
  hotbar: Stack[];
  selected: number;
  heldName: string | null;
  heldColor: string;
  time: number;
  phase: string;
  biome: string;
  target: string | null;
  mining: number;
  boss: { name: string; hp: number; max: number } | null;
  loading: boolean;
  alive: boolean;
  hurt: number;
  allies: string[];
  coords: string;
  /** 0–1: escurecimento da tela ao dormir. */
  fade: number;
}

export interface DialogInfo {
  name: string;
  title: string;
  portrait?: string;
  emoji?: string;
  line: string;
  verse: string;
  gifts: string[];
  recruited: boolean;
}

export interface GameCallbacks {
  onHud(s: HudState): void;
  onMessage(text: string, tone: "info" | "good" | "warn" | "rare"): void;
  onDialog(d: DialogInfo | null): void;
  onOpenCrafting(): void;
  onOpenContainer(kind: "chest" | "furnace"): void;
  onPauseRequest(): void;
}

export interface Input {
  moveX: number;
  moveY: number;
  jump: boolean;
  sprint: boolean;
  mine: boolean;
  use: boolean;
  lookDX: number;
  lookDY: number;
}

export interface GameOptions {
  mobile: boolean;
  settings?: Settings;
}

const rarityTone = (r: string): "info" | "good" | "rare" => (r === "comum" ? "info" : r === "incomum" ? "good" : "rare");

export class MineArena {
  readonly inventory = new Inventory();
  readonly input: Input = { moveX: 0, moveY: 0, jump: false, sprint: false, mine: false, use: false, lookDX: 0, lookDY: 0 };
  readonly mobile: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private fluids: FluidSim;
  private sky: Sky;
  private particles: Particles;
  private entities: EntityManager;
  private sfx = new Sound();
  private body: Body;
  private yaw = 0;
  private pitch = 0;
  private health: number = PLAYER.maxHealth;
  private hunger: number = PLAYER.maxHunger;
  private alive = true;
  private invuln = 0;
  private hurtFlash = 0;
  private regenT = 0;
  private starveT = 0;
  private fallV = 0;
  private time = 0.06;
  private playedSeconds = 0;
  private kills = 0;
  private discoveries = new Set<string>();
  private heroesMet = new Set<string>();
  private spawn: { x: number; y: number; z: number };
  private lastBiome = "";
  private biomeT = 0;
  private radius: number;
  private sens = 1;
  private invertY = false;
  private showCoords = false;
  private ready = false;
  private paused = false;
  private uiOpen = false;
  private running = false;
  private raf = 0;
  private last = 0;
  private hudT = 0;
  private saveT = 0;
  private tutorial = 0;
  private stepT = 0;
  // mineração
  private mineKey = "";
  private mineProgress = 0;
  private mineSfxT = 0;
  private atkCd = 0;
  private useCd = 0;
  private prevUse = false;
  private swing = 0;
  private targetName: string | null = null;
  private sel: THREE.Mesh;
  private selLines: THREE.LineSegments;
  private hand = new THREE.Group();
  private handKey = "";
  private handTex = new Map<TileName, THREE.CanvasTexture>();
  private cracks: THREE.CanvasTexture[];
  private dialogEnt: Entity | null = null;
  private cleanup: (() => void)[] = [];
  private containers = new Map<string, SavedContainer>();
  private openKey: string | null = null;
  private spawned = new Set<string>();
  private crops = new Map<string, number>();
  private cropT = 0;
  private sleepT = 0;
  private furnaceT = 0;
  private id: string;
  private name: string;
  private createdAt: number;

  constructor(
    private canvas: HTMLCanvasElement,
    save: WorldSave,
    private cb: GameCallbacks,
    opts: GameOptions,
  ) {
    this.mobile = opts.mobile;
    this.id = save.id;
    this.name = save.name;
    this.createdAt = save.createdAt;
    this.radius = this.mobile ? RENDER_DISTANCE.mobile : RENDER_DISTANCE.desktop;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.mobile, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2));
    this.camera = new THREE.PerspectiveCamera(this.mobile ? 70 : 75, 1, 0.08, (this.radius + 2) * 16);
    this.scene.add(this.camera);

    this.world = new World(save.seed, this.scene);
    this.world.loadMods(save.mods);
    this.fluids = new FluidSim(this.world);
    this.world.onChange = (x, y, z) => this.fluids.poke(x, y, z);
    const far = this.radius * 16 - 6;
    this.sky = new Sky(this.scene, far, [this.world.matO, this.world.matT]);
    this.particles = new Particles(this.scene);
    this.entities = new EntityManager(this.scene, this.world, this.particles, this.sfx, this.hooks(), save.seed);

    this.spawn = save.spawn ?? findSpawn(save.seed);
    this.body = newBody(save.player?.x ?? this.spawn.x, save.player?.y ?? this.spawn.y, save.player?.z ?? this.spawn.z, PLAYER.w, PLAYER.h);
    this.yaw = save.player?.yaw ?? 0;
    this.pitch = save.player?.pitch ?? 0;
    this.health = save.player?.health ?? PLAYER.maxHealth;
    this.hunger = save.player?.hunger ?? PLAYER.maxHunger;
    if (this.health <= 0) this.health = PLAYER.maxHealth;
    this.time = save.time ?? 0.06;
    this.playedSeconds = save.playedSeconds ?? 0;
    this.kills = save.kills ?? 0;
    save.discoveries?.forEach((d) => this.discoveries.add(d));
    save.heroesMet?.forEach((d) => this.heroesMet.add(d));
    for (const [k, c] of Object.entries(save.containers ?? {})) this.containers.set(k, c);
    save.spawned?.forEach((d) => this.spawned.add(d));
    for (const [k, v] of Object.entries(save.crops ?? {})) this.crops.set(k, v);
    this.inventory.load(save.inventory);
    if (this.playedSeconds < 5 && this.inventory.slots.every((s) => !s)) {
      this.inventory.add("bread", 4);
    }

    const selGeo = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    this.cracks = createCracks();
    this.sel = new THREE.Mesh(selGeo, new THREE.MeshBasicMaterial({ map: this.cracks[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.selLines = new THREE.LineSegments(new THREE.EdgesGeometry(selGeo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    this.sel.visible = false;
    this.selLines.visible = false;
    this.scene.add(this.sel, this.selLines);
    this.camera.add(this.hand);
    this.hand.position.set(0.36, -0.3, -0.55);

    this.bindEvents();
    this.inventory.subscribe(() => this.rebuildHand());
    this.rebuildHand();
    this.applySettings(opts.settings ?? DEFAULT_SETTINGS);
  }

  // ---------- ciclo de vida ----------
  start(): void {
    this.running = true;
    this.last = performance.now();
    this.resize();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  setPaused(p: boolean): void {
    this.paused = p;
    if (p && document.pointerLockElement) document.exitPointerLock();
  }
  setUiOpen(open: boolean): void {
    this.uiOpen = open;
    this.input.mine = false;
    this.input.use = false;
    if (open && document.pointerLockElement) document.exitPointerLock();
  }
  /** Controles de toque. */
  setMove(x: number, y: number): void {
    this.input.moveX = x;
    this.input.moveY = y;
  }
  setHold(key: "mine" | "use" | "jump" | "sprint", on: boolean): void {
    this.input[key] = on;
  }
  addLook(dx: number, dy: number): void {
    this.input.lookDX += dx * this.sens;
    this.input.lookDY += dy * this.sens;
  }
  setMuted(m: boolean): void {
    this.sfx.muted = m;
  }
  /** Aplica as opções do jogador (campo de visão, distância, sensibilidade, som, gráficos). */
  applySettings(s: Settings): void {
    this.camera.fov = s.fov || (this.mobile ? 70 : 75);
    this.camera.updateProjectionMatrix();
    this.setRenderDistance(s.distance || (this.mobile ? RENDER_DISTANCE.mobile : RENDER_DISTANCE.desktop));
    this.sens = s.sensitivity / 100;
    this.invertY = s.invertY;
    this.sfx.volume = s.volume / 100;
    this.sky.setClouds(s.clouds);
    this.particles.enabled = s.particles;
    this.showCoords = s.coords;
  }
  setRenderDistance(r: number): void {
    this.radius = r;
    this.camera.far = (r + 2) * 16;
    this.camera.updateProjectionMatrix();
    const fog = this.scene.fog as THREE.Fog;
    fog.near = r * 16 * 0.45;
    fog.far = r * 16 - 6;
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  snapshot(): WorldSave {
    return {
      id: this.id,
      name: this.name,
      seed: this.world.seed,
      createdAt: this.createdAt,
      updatedAt: Date.now(),
      playedSeconds: this.playedSeconds,
      time: this.time,
      player: { x: this.body.x, y: this.body.y, z: this.body.z, yaw: this.yaw, pitch: this.pitch, health: this.health, hunger: this.hunger },
      spawn: this.spawn,
      inventory: JSON.parse(JSON.stringify(this.inventory.toJSON())),
      mods: this.world.exportMods(),
      discoveries: [...this.discoveries],
      heroesMet: [...this.heroesMet],
      kills: this.kills,
      containers: Object.fromEntries(this.containers),
      spawned: [...this.spawned],
      crops: Object.fromEntries(this.crops),
    };
  }
  async saveNow(): Promise<void> {
    if (!this.ready) return;
    await putWorld(this.snapshot());
  }

  async dispose(): Promise<void> {
    this.running = false;
    cancelAnimationFrame(this.raf);
    await this.saveNow();
    this.cleanup.forEach((f) => f());
    if (document.pointerLockElement) document.exitPointerLock();
    this.entities.dispose();
    this.particles.dispose();
    this.sky.dispose();
    this.world.dispose();
    this.sfx.dispose();
    this.cracks.forEach((t) => t.dispose());
    this.handTex.forEach((t) => t.dispose());
    this.sel.geometry.dispose();
    (this.sel.material as THREE.Material).dispose();
    this.selLines.geometry.dispose();
    (this.selLines.material as THREE.Material).dispose();
    this.hand.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
    });
    this.renderer.dispose();
  }

  // ---------- entrada ----------
  private bindEvents(): void {
    const on = <K extends keyof WindowEventMap>(t: K, fn: (e: WindowEventMap[K]) => void) => {
      window.addEventListener(t, fn);
      this.cleanup.push(() => window.removeEventListener(t, fn));
    };
    const keys = new Set<string>();
    const sync = () => {
      if (!this.mobile) {
        this.input.moveY = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
        this.input.moveX = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
        this.input.jump = keys.has("Space");
        this.input.sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
      }
    };
    on("keydown", (e) => {
      if (this.uiOpen || this.paused) return;
      if (e.code.startsWith("Digit") && e.code !== "Digit0") this.inventory.select(Number(e.code.slice(5)) - 1);
      keys.add(e.code);
      sync();
      if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
    });
    on("keyup", (e) => {
      keys.delete(e.code);
      sync();
    });
    on("blur", () => {
      keys.clear();
      sync();
    });
    on("mousemove", (e) => {
      if (document.pointerLockElement === this.canvas) {
        this.input.lookDX += e.movementX * 0.0022 * this.sens;
        this.input.lookDY += e.movementY * 0.0022 * this.sens;
      }
    });
    on("mousedown", (e) => {
      if (this.mobile || this.uiOpen || this.paused) return;
      if (document.pointerLockElement !== this.canvas) {
        void this.canvas.requestPointerLock?.();
        return;
      }
      if (e.button === 0) this.input.mine = true;
      if (e.button === 2) this.input.use = true;
    });
    on("mouseup", (e) => {
      if (e.button === 0) this.input.mine = false;
      if (e.button === 2) this.input.use = false;
    });
    on("wheel", (e) => {
      if (!this.uiOpen && !this.paused) this.inventory.select(this.inventory.selected + (e.deltaY > 0 ? 1 : -1));
    });
    on("resize", () => this.resize());
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.canvas);
    this.cleanup.push(() => ro.disconnect());
    const ctx = (e: Event) => e.preventDefault();
    this.canvas.addEventListener("contextmenu", ctx);
    this.cleanup.push(() => this.canvas.removeEventListener("contextmenu", ctx));
    const lock = () => {
      if (!document.pointerLockElement && this.alive && !this.uiOpen && !this.paused && this.running && this.ready && !this.mobile) this.cb.onPauseRequest();
    };
    document.addEventListener("pointerlockchange", lock);
    this.cleanup.push(() => document.removeEventListener("pointerlockchange", lock));
    const vis = () => {
      if (document.hidden) void this.saveNow();
    };
    document.addEventListener("visibilitychange", vis);
    this.cleanup.push(() => document.removeEventListener("visibilitychange", vis));
  }

  // ---------- ganchos das criaturas ----------
  private hooks() {
    return {
      damagePlayer: (amount: number, fx: number, fz: number) => this.damagePlayer(amount, fx, fz),
      healPlayer: (n: number) => {
        this.health = Math.min(PLAYER.maxHealth, this.health + n);
      },
      give: (item: string, count: number) => this.give(item, count),
      say: (text: string) => this.cb.onMessage(text, "warn"),
      onKill: () => {
        this.kills++;
      },
    };
  }

  private give(item: string, count: number): void {
    const def = itemDef(item);
    if (!def) return;
    const left = this.inventory.add(item, count);
    const got = count - left;
    if (got > 0) {
      this.sfx.play("pickup");
      this.cb.onMessage(`+${got} ${def.name}`, rarityTone(def.rarity));
    }
    if (left > 0) this.cb.onMessage("Mochila cheia!", "warn");
  }

  private damagePlayer(amount: number, fx: number, fz: number): void {
    if (!this.alive || this.invuln > 0) return;
    const taken = amount * (1 - Math.min(0.8, this.inventory.armorDefense() * 0.04));
    this.health -= taken;
    this.invuln = 0.5;
    this.hurtFlash = 1;
    this.sfx.play("hurt");
    const dx = this.body.x - fx;
    const dz = this.body.z - fz;
    const n = Math.hypot(dx, dz) || 1;
    this.body.vx += (dx / n) * 6;
    this.body.vz += (dz / n) * 6;
    this.body.vy = Math.max(this.body.vy, 4);
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.sfx.play("death");
      this.input.mine = false;
      this.input.use = false;
      if (document.pointerLockElement) document.exitPointerLock();
      void this.saveNow();
    }
  }

  respawn(): void {
    this.body.x = this.spawn.x;
    this.body.y = this.spawn.y;
    this.body.z = this.spawn.z;
    this.body.vx = this.body.vy = this.body.vz = 0;
    this.health = PLAYER.maxHealth;
    this.hunger = 14;
    this.alive = true;
    this.invuln = 3;
    this.paused = false;
    this.uiOpen = false;
    this.input.mine = false;
    this.input.use = false;
    this.ready = false;
    this.cb.onMessage("Você renasceu no ponto de partida. Seus itens foram mantidos.", "info");
  }

  // ---------- laço ----------
  private frame(dt: number): void {
    if (!this.paused) this.tick(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private tick(dt: number): void {
    const b = this.body;
    this.world.update(b.x, b.z, this.radius, this.ready ? 5 : 16);
    if (!this.ready) {
      if (this.world.readyAround(b.x, b.z, 2)) {
        this.ready = true;
        const sx = Math.floor(b.x);
        const sz = Math.floor(b.z);
        if (this.world.isSolid(sx, Math.floor(b.y), sz) || this.world.isSolid(sx, Math.floor(b.y + 1), sz)) {
          const sy = this.world.surfaceY(sx, sz);
          if (sy >= 0) b.y = sy + 1.05;
        }
        this.syncCamera();
      }
      this.emitHud(dt, true);
      return;
    }

    this.playedSeconds += dt;
    this.time = (this.time + dt / DAY_SECONDS) % 1;
    this.sky.update(this.time, this.camera.position);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.useCd = Math.max(0, this.useCd - dt);
    this.swing = Math.max(0, this.swing - dt * 3.2);

    this.look();
    if (this.alive) {
      this.movePlayer(dt);
      this.survival(dt);
      this.interact(dt);
    }
    this.syncCamera();

    this.entities.update(dt, { px: b.x, py: b.y, pz: b.z, alive: this.alive, daylight: this.sky.daylight, mobile: this.mobile });
    this.particles.update(dt);
    this.tickFurnaces(dt);
    this.tickCrops(dt);
    this.fluids.update(dt);
    if (this.sleepT > 0) {
      const prev = this.sleepT;
      this.sleepT = Math.max(0, this.sleepT - dt);
      if (prev > 1.4 && this.sleepT <= 1.4) {
        this.time = 0.02;
        this.health = PLAYER.maxHealth;
        this.hunger = Math.max(4, this.hunger - 3);
        this.cb.onMessage("Bom dia! Você acordou descansado.", "good");
      }
    }
    this.exploration(dt);
    this.tutorialTick();
    this.animateHand();

    this.saveT += dt;
    if (this.saveT >= AUTOSAVE_S) {
      this.saveT = 0;
      void this.saveNow();
    }
    this.emitHud(dt, false);
  }

  private look(): void {
    if (this.uiOpen) {
      this.input.lookDX = this.input.lookDY = 0;
      return;
    }
    this.yaw -= this.input.lookDX;
    this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - this.input.lookDY * (this.invertY ? -1 : 1)));
    this.input.lookDX = 0;
    this.input.lookDY = 0;
  }

  private syncCamera(): void {
    const b = this.body;
    this.camera.position.set(b.x, b.y + PLAYER.eye, b.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  private movePlayer(dt: number): void {
    const b = this.body;
    const blocked = this.uiOpen || this.paused || this.sleepT > 0;
    const mx = blocked ? 0 : this.input.moveX;
    const my = blocked ? 0 : this.input.moveY;
    const len = Math.hypot(mx, my);
    const sprint = !blocked && this.input.sprint && my > 0;
    const sp = (sprint ? PLAYER.sprint : PLAYER.walk) * (b.inWater ? 0.55 : 1);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const nx = len > 1 ? mx / len : mx;
    const ny = len > 1 ? my / len : my;
    // frente = -Z da câmera
    const wx = nx * cos - ny * sin;
    const wz = -nx * sin - ny * cos;
    const k = Math.min(1, dt * (b.onGround ? 12 : 4));
    b.vx += (wx * sp - b.vx) * k;
    b.vz += (wz * sp - b.vz) * k;

    const jump = !blocked && this.input.jump;
    if (b.inWater) {
      b.vy += (jump ? 30 : -10) * dt;
      b.vy = Math.max(-3, Math.min(3.2, b.vy));
    } else {
      if (jump && b.onGround) {
        b.vy = PLAYER.jump;
        this.fallV = 0;
      }
      b.vy = Math.max(-34, b.vy - PLAYER.gravity * dt);
    }
    const vyBefore = b.vy;
    stepBody(this.world, b, dt);
    if (b.onGround) {
      if (this.fallV < -14 && !b.inWater) {
        const dmg = Math.floor((-this.fallV - 13) * 0.55);
        if (dmg > 0) this.damagePlayer(dmg, b.x, b.z);
      }
      this.fallV = 0;
    } else {
      this.fallV = Math.min(this.fallV, vyBefore);
    }
    if (b.inWater) this.fallV = 0;

    if (b.onGround && len > 0.1) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = sprint ? 0.28 : 0.42;
        this.sfx.play("step");
      }
    }
    this.hunger = Math.max(0, this.hunger - Math.hypot(b.vx, b.vz) * dt * (sprint ? 0.012 : 0.006));
    if (inLava(this.world, b) && this.invuln <= 0) this.damagePlayer(4, b.x + 0.01, b.z);
    if (b.y < -20) this.damagePlayer(100, b.x, b.z);
  }

  private survival(dt: number): void {
    if (this.hunger >= 16 && this.health < PLAYER.maxHealth) {
      this.regenT += dt;
      if (this.regenT >= 3) {
        this.regenT = 0;
        this.health = Math.min(PLAYER.maxHealth, this.health + 1);
      }
    } else this.regenT = 0;
    if (this.hunger <= 0.01) {
      this.starveT += dt;
      if (this.starveT >= 4) {
        this.starveT = 0;
        if (this.health > 1) this.health -= 1;
      }
    } else this.starveT = 0;
  }

  // ---------- mineração, combate e uso ----------
  private heldDef() {
    const h = this.inventory.held();
    return h ? itemDef(h.item) : undefined;
  }

  private interact(dt: number): void {
    const blocked = this.uiOpen || this.paused || this.sleepT > 0;
    const eye = this.camera.position;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const hit = this.world.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, REACH);
    const held = this.heldDef();
    const wReach = held?.weapon?.reach ?? 2.9;
    const ePick = this.entities.pick(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, Math.max(wReach, 3.6));
    this.targetName = hit ? blockDef(hit.id).name : null;

    // marcador do bloco mirado
    if (hit && !blocked) {
      this.sel.visible = this.selLines.visible = true;
      this.sel.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      this.selLines.position.copy(this.sel.position);
    } else this.sel.visible = this.selLines.visible = false;

    // ---- atacar / minerar ----
    if (!blocked && this.input.mine) {
      const entityFirst = ePick && ePick.dist <= wReach && (!hit || ePick.dist < hit.dist) && ePick.e.def.behavior !== "hero";
      if (entityFirst && ePick) {
        this.mineProgress = 0;
        this.mineKey = "";
        if (this.atkCd <= 0) this.attack(ePick.e, dir);
      } else if (hit) {
        const def = BLOCKS[hit.id];
        const tool = held?.tool;
        const info = breakInfo(def, tool?.type ?? "hand", tool?.tier ?? 0, tool?.speed ?? 1);
        const key = `${hit.x},${hit.y},${hit.z}`;
        if (key !== this.mineKey) {
          this.mineKey = key;
          this.mineProgress = 0;
        }
        if (Number.isFinite(info.time)) {
          this.mineProgress += dt / info.time;
          this.swing = Math.max(this.swing, 0.55);
          this.mineSfxT -= dt;
          if (this.mineSfxT <= 0) {
            this.mineSfxT = 0.22;
            this.sfx.play("place");
            this.particles.burst(hit.x + 0.5 + hit.nx * 0.5, hit.y + 0.5 + hit.ny * 0.5, hit.z + 0.5 + hit.nz * 0.5, def.top, 2, 1.5, 0.08, 1);
          }
          if (this.mineProgress >= 1) {
            this.breakBlock(hit.x, hit.y, hit.z, info.harvest);
            this.mineProgress = 0;
            this.mineKey = "";
          }
        } else this.mineProgress = 0;
      } else {
        this.mineProgress = 0;
        this.mineKey = "";
      }
    } else {
      this.mineProgress = 0;
      this.mineKey = "";
    }
    (this.sel.material as THREE.MeshBasicMaterial).map = this.cracks[Math.min(9, Math.floor(this.mineProgress * 10))];
    this.sel.visible = this.selLines.visible && this.mineProgress > 0.03;

    // ---- usar (colocar, comer, atirar, conversar) ----
    if (!blocked && this.input.use) {
      if (!this.prevUse || this.useCd <= 0) this.useAction(hit, ePick, dir, !this.prevUse);
    }
    this.prevUse = this.input.use && !blocked;
  }

  private attack(e: Entity, dir: THREE.Vector3): void {
    const held = this.heldDef();
    const w = held?.weapon;
    let dmg = w?.dmg ?? 1;
    const crit = !this.body.onGround && this.body.vy < -1;
    if (crit) dmg *= 1.5;
    this.atkCd = w?.cooldown ?? 0.45;
    this.swing = 1;
    if (this.entities.hurt(e, dmg, dir.x, dir.z, true)) {
      if (crit) {
        this.particles.burst(e.body.x, e.body.y + e.body.h * 0.7, e.body.z, 0xffd36a, 10, 4, 0.12);
        this.cb.onMessage("Golpe crítico!", "good");
      }
    }
  }

  private breakBlock(x: number, y: number, z: number, harvest: boolean): void {
    const id = this.world.getBlock(x, y, z);
    const def = blockDef(id);
    if (id === B.chest || id === B.furnace || id === B.furnace_lit) this.spillContainer(x, y, z, id);
    this.world.setBlock(x, y, z, B.air);
    this.crops.delete(`${x},${y},${z}`);
    if (blockDef(this.world.getBlock(x, y + 1, z)).shape === "cross") this.breakBlock(x, y + 1, z, true);
    this.sfx.play("break");
    this.particles.burst(x + 0.5, y + 0.5, z + 0.5, def.top, 12, 4, 0.14);
    this.hunger = Math.max(0, this.hunger - 0.012);
    if (!harvest) return;
    for (const l of def.loot) {
      if (Math.random() > l.chance) continue;
      const n = l.min + Math.floor(Math.random() * (l.max - l.min + 1));
      if (n > 0) this.give(l.item, n);
    }
  }

  private useAction(hit: ReturnType<World["raycast"]>, ePick: { e: Entity; dist: number } | null, dir: THREE.Vector3, edge: boolean): void {
    this.useCd = 0.28;
    // 1) conversar com herói
    if (edge && ePick && ePick.e.def.behavior === "hero" && ePick.dist <= 4) {
      this.openDialog(ePick.e);
      return;
    }
    // 1b) baú e fornalha
    if (edge && hit && (hit.id === B.chest || hit.id === B.furnace || hit.id === B.furnace_lit)) {
      this.openContainer(hit.x, hit.y, hit.z, hit.id);
      return;
    }
    // 1c) cama
    if (edge && hit && hit.id === B.bed) {
      this.useBed(hit.x, hit.y, hit.z);
      return;
    }
    // 2) bancada
    if (edge && hit && hit.id === B.crafting_table) {
      this.cb.onOpenCrafting();
      return;
    }
    const held = this.heldDef();
    if (!held) return;
    // alimentar animal (reprodução)
    if (edge && ePick && ePick.dist <= 4 && this.entities.feed(ePick.e, held.key)) {
      this.inventory.consumeHeld(1);
      this.useCd = 0.4;
      return;
    }
    // balde: pega e solta fluido
    if (held.key === "bucket") {
      const e0 = this.camera.position;
      const lh = this.world.raycast(e0.x, e0.y, e0.z, dir.x, dir.y, dir.z, REACH, true);
      const fk = lh ? BLOCKS[lh.id].fluid : undefined;
      if (lh && fk && BLOCKS[lh.id].level === FLUID_MAX[fk]) {
        this.world.setBlock(lh.x, lh.y, lh.z, B.air);
        this.inventory.slots[this.inventory.selected] = { item: fk === "water" ? "bucket_water" : "bucket_lava", count: 1 };
        this.inventory.changed();
        this.sfx.play("place");
        this.swing = 1;
      }
      return;
    }
    if (held.key === "bucket_water" || held.key === "bucket_lava") {
      if (hit) {
        const kind = held.key === "bucket_water" ? "water" : "lava";
        const plant = blockDef(hit.id).shape === "cross";
        const bx = plant ? hit.x : hit.x + hit.nx;
        const by = plant ? hit.y : hit.y + hit.ny;
        const bz = plant ? hit.z : hit.z + hit.nz;
        const cur = this.world.getBlock(bx, by, bz);
        if (cur === B.air || BLOCKS[cur].shape === "cross" || (BLOCKS[cur].fluid && BLOCKS[cur].level !== FLUID_MAX[BLOCKS[cur].fluid!])) {
          this.world.setBlock(bx, by, bz, fluidId(kind, FLUID_MAX[kind]));
          this.inventory.slots[this.inventory.selected] = { item: "bucket", count: 1 };
          this.inventory.changed();
          this.sfx.play("place");
          this.swing = 1;
        }
      }
      return;
    }
    // mirando numa planta, enxada e sementes valem pro chão embaixo dela
    const onPlant = !!hit && blockDef(hit.id).shape === "cross";
    const tgt = hit && onPlant ? { x: hit.x, y: hit.y - 1, z: hit.z, id: this.world.getBlock(hit.x, hit.y - 1, hit.z) } : hit;
    // arar a terra com a enxada
    if (held.tool?.type === "hoe" && tgt && (tgt.id === B.grass || tgt.id === B.dirt)) {
      const above = this.world.getBlock(tgt.x, tgt.y + 1, tgt.z);
      if (above === B.air || blockDef(above).shape === "cross") {
        if (above !== B.air) this.world.setBlock(tgt.x, tgt.y + 1, tgt.z, B.air);
        this.world.setBlock(tgt.x, tgt.y, tgt.z, B.farmland);
        this.sfx.play("place");
        this.swing = 1;
        return;
      }
    }
    // plantar sementes
    if (held.key === "seeds" && tgt && tgt.id === B.farmland && (this.world.getBlock(tgt.x, tgt.y + 1, tgt.z) === B.air || onPlant)) {
      this.world.setBlock(tgt.x, tgt.y + 1, tgt.z, B.wheat_0);
      this.crops.set(`${tgt.x},${tgt.y + 1},${tgt.z}`, 0);
      this.inventory.consumeHeld(1);
      this.sfx.play("place");
      return;
    }
    const eye = this.camera.position;
    // 3) arco / funda
    if (held.ranged) {
      if (this.atkCd > 0) return;
      const r = held.ranged;
      if (!this.inventory.remove(r.ammo, 1)) {
        this.cb.onMessage(`Sem munição (${itemDef(r.ammo)?.name ?? r.ammo}).`, "warn");
        return;
      }
      this.atkCd = r.cooldown;
      this.swing = 1;
      this.sfx.play("bow");
      this.entities.shoot(r.shape, eye.x + dir.x * 0.5, eye.y + dir.y * 0.5 - 0.1, eye.z + dir.z * 0.5, dir.x, dir.y, dir.z, r.speed, r.dmg, r.gravity, "player");
      return;
    }
    // 4) comer
    if (held.food) {
      if (this.hunger >= PLAYER.maxHunger - 0.5 && this.health >= PLAYER.maxHealth) return;
      this.hunger = Math.min(PLAYER.maxHunger, this.hunger + held.food.hunger);
      this.health = Math.min(PLAYER.maxHealth, this.health + held.food.heal);
      this.inventory.consumeHeld(1);
      this.sfx.play("eat");
      this.useCd = 0.6;
      return;
    }
    // 5) colocar bloco
    if (held.block !== undefined && hit) {
      const px = onPlant ? hit.x : hit.x + hit.nx;
      const py = onPlant ? hit.y : hit.y + hit.ny;
      const pz = onPlant ? hit.z : hit.z + hit.nz;
      const cur = this.world.getBlock(px, py, pz);
      if (cur !== B.air && !blockDef(cur).liquid && blockDef(cur).shape !== "cross") return;
      const b = this.body;
      const r = PLAYER.w / 2;
      if (blockDef(held.block).solid && px + 1 > b.x - r && px < b.x + r && pz + 1 > b.z - r && pz < b.z + r && py + 1 > b.y && py < b.y + PLAYER.h) return;
      this.world.setBlock(px, py, pz, held.block);
      this.inventory.consumeHeld(1);
      this.sfx.play("place");
      this.swing = 0.8;
    }
  }

  // ---------- cama e plantações ----------
  private useBed(x: number, y: number, z: number): void {
    this.spawn = { x: x + 0.5, y: y + 1.1, z: z + 0.5 };
    if (this.sky.daylight >= 0.35) {
      this.cb.onMessage("Ponto de renascimento definido. Só dá pra dormir à noite.", "info");
      return;
    }
    const enemy = this.entities.list.some((e) => !e.dead && (e.def.behavior === "hostile" || e.def.behavior === "boss") && Math.hypot(e.body.x - this.body.x, e.body.z - this.body.z) < 14);
    if (enemy) {
      this.cb.onMessage("Não dá pra dormir: há inimigos por perto.", "warn");
      return;
    }
    this.sleepT = 2.8;
    this.sfx.play("ui");
    this.cb.onMessage("Dormindo… 💤  Ponto de renascimento definido.", "info");
  }

  private hydrated(x: number, y: number, z: number): boolean {
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) if (isFluid(this.world.getBlock(x + dx, y, z + dz), "water")) return true;
    return false;
  }

  private tickCrops(dt: number): void {
    this.cropT -= dt;
    if (this.cropT > 0) return;
    this.cropT = 1;
    for (const [key, t] of this.crops) {
      const [x, y, z] = key.split(",").map(Number);
      if (!this.world.hasChunkAt(x, z)) {
        this.crops.set(key, t + 0.5);
        continue;
      }
      const id = this.world.getBlock(x, y, z);
      if (id < B.wheat_0 || id >= B.wheat_3) {
        this.crops.delete(key);
        continue;
      }
      const next = t + (this.hydrated(x, y - 1, z) ? 2 : 1);
      if (next >= 40) {
        this.world.setBlock(x, y, z, id + 1);
        if (id + 1 === B.wheat_3) this.crops.delete(key);
        else this.crops.set(key, 0);
      } else this.crops.set(key, next);
    }
  }

  // ---------- baús e fornalhas ----------
  private containerAt(x: number, y: number, z: number, id: number): SavedContainer {
    const key = `${x},${y},${z}`;
    let c = this.containers.get(key);
    if (!c) {
      if (id === B.chest) {
        const table = this.world.lootChests.get(key);
        c = { kind: "chest", slots: table ? rollLoot(table, this.world.seed, x, y, z) : Array.from({ length: 27 }, () => null), burn: 0, burnMax: 0, cook: 0 };
      } else c = { kind: "furnace", slots: [null, null, null], burn: 0, burnMax: 0, cook: 0 };
      this.containers.set(key, c);
    }
    return c;
  }

  private openContainer(x: number, y: number, z: number, id: number): void {
    const c = this.containerAt(x, y, z, id);
    this.openKey = `${x},${y},${z}`;
    this.inventory.ext = {
      slots: c.slots,
      accepts: (i, s) => {
        if (!s || c.kind === "chest") return true;
        if (i === 2) return false;
        if (i === 1) return FUEL[s.item] !== undefined;
        return SMELT[s.item] !== undefined;
      },
    };
    this.sfx.play("ui");
    this.setUiOpen(true);
    this.cb.onOpenContainer(c.kind);
  }

  closeContainer(): void {
    this.inventory.ext = null;
    this.openKey = null;
    this.inventory.changed();
  }

  /** Progresso da fornalha aberta (pra interface). */
  furnaceInfo(): { burn: number; burnMax: number; cook: number } | null {
    const c = this.openKey ? this.containers.get(this.openKey) : null;
    return c && c.kind === "furnace" ? { burn: c.burn, burnMax: c.burnMax, cook: c.cook / SMELT_TIME } : null;
  }

  private spillContainer(x: number, y: number, z: number, id: number): void {
    const key = `${x},${y},${z}`;
    const c = this.containerAt(x, y, z, id);
    for (const s of c.slots) if (s) this.give(s.item, s.count);
    if (id === B.chest) this.give("chest", 1);
    this.containers.delete(key);
    this.world.lootChests.delete(key);
  }

  private tickFurnaces(dt: number): void {
    this.furnaceT -= dt;
    const sync = this.furnaceT <= 0;
    if (sync) this.furnaceT = 0.5;
    for (const [key, c] of this.containers) {
      if (c.kind !== "furnace") continue;
      const inp = c.slots[0];
      const res = inp ? SMELT[inp.item] : undefined;
      const out = c.slots[2];
      const maxOut = res ? (itemDef(res)?.maxStack ?? 64) : 64;
      const canOut = !!res && (!out || (out.item === res && out.count < maxOut));
      if (c.burn > 0) c.burn = Math.max(0, c.burn - dt);
      const fuel = c.slots[1];
      if (c.burn <= 0 && canOut && fuel && FUEL[fuel.item] !== undefined) {
        c.burn = c.burnMax = FUEL[fuel.item];
        fuel.count -= 1;
        if (fuel.count <= 0) c.slots[1] = null;
      }
      if (c.burn > 0 && canOut && inp && res) {
        c.cook += dt;
        if (c.cook >= SMELT_TIME) {
          c.cook = 0;
          inp.count -= 1;
          if (inp.count <= 0) c.slots[0] = null;
          if (out) out.count += 1;
          else c.slots[2] = { item: res, count: 1 };
        }
      } else if (c.cook > 0) c.cook = Math.max(0, c.cook - dt * 2);
      if (sync) {
        const [x, y, z] = key.split(",").map(Number);
        if (this.world.hasChunkAt(x, z)) {
          const cur = this.world.getBlock(x, y, z);
          const want = c.burn > 0 ? B.furnace_lit : B.furnace;
          if ((cur === B.furnace || cur === B.furnace_lit) && cur !== want) this.world.setBlock(x, y, z, want);
        }
      }
    }
  }

  // ---------- heróis ----------
  private openDialog(e: Entity): void {
    const def = e.def;
    const gifts: string[] = [];
    if (!e.gifted) {
      e.gifted = true;
      for (const g of def.gift ?? []) {
        this.give(g.item, g.count);
        gifts.push(`${g.count}× ${itemDef(g.item)?.name ?? g.item}`);
      }
    }
    this.heroesMet.add(def.id);
    this.dialogEnt = e;
    this.setUiOpen(true);
    const lines = def.lines ?? ["A paz do Senhor."];
    this.cb.onDialog({ name: def.name, title: def.title ?? "", portrait: def.portrait, emoji: def.emoji, line: lines[Math.floor(Math.random() * lines.length)], verse: def.verse ?? "", gifts, recruited: e.ally });
  }

  dialogAct(act: "follow" | "stay" | "close"): void {
    const e = this.dialogEnt;
    if (e && act === "follow") {
      const r = this.entities.recruit(e);
      this.cb.onMessage(r.message || "Não foi possível.", r.ok ? "good" : "warn");
    }
    if (e && act === "stay") {
      this.entities.dismiss(e);
      this.cb.onMessage(`${e.def.name} ficará por aqui.`, "info");
    }
    this.dialogEnt = null;
    this.cb.onDialog(null);
    this.setUiOpen(false);
  }

  // ---------- fabricação ----------
  nearStation(): boolean {
    const b = this.body;
    const x0 = Math.floor(b.x);
    const y0 = Math.floor(b.y);
    const z0 = Math.floor(b.z);
    for (let x = x0 - 4; x <= x0 + 4; x++) for (let y = y0 - 2; y <= y0 + 3; y++) for (let z = z0 - 4; z <= z0 + 4; z++) if (this.world.getBlock(x, y, z) === B.crafting_table) return true;
    return false;
  }
  canCraft(r: Recipe): boolean {
    if (r.station === "bancada" && !this.nearStation()) return false;
    return r.ingredients.every((i) => this.inventory.count(i.item) >= i.count);
  }
  craft(r: Recipe): boolean {
    if (!this.canCraft(r)) return false;
    for (const i of r.ingredients) this.inventory.remove(i.item, i.count);
    const left = this.inventory.add(r.result.item, r.result.count);
    if (left > 0) this.cb.onMessage("Mochila cheia!", "warn");
    this.sfx.play("pickup");
    return true;
  }
  recipes(): Recipe[] {
    return RECIPES;
  }

  // ---------- mundo e história ----------
  private exploration(dt: number): void {
    this.biomeT -= dt;
    if (this.biomeT > 0) return;
    this.biomeT = 1;
    const biome = biomeAt(this.world.seed, this.body.x, this.body.z);
    if (biome !== this.lastBiome) {
      this.lastBiome = biome;
      const name = BIOME_NAME[biome];
      if (!this.discoveries.has(biome)) {
        this.discoveries.add(biome);
        this.cb.onMessage(`✦ Descoberta: ${name}`, "rare");
      } else this.cb.onMessage(name, "info");
    }
    for (const sp of structuresNear(this.world.seed, this.body.x, this.body.z, 70)) {
      const def = STRUCTURE_BY_ID[sp.id];
      const d = Math.hypot(sp.ox - this.body.x, sp.oz - this.body.z);
      if (d < 38 && !this.discoveries.has("s:" + sp.key)) {
        this.discoveries.add("s:" + sp.key);
        this.cb.onMessage(`✦ Descoberta: ${def.name}`, "rare");
      }
      if (d < 46 && !this.spawned.has(sp.key) && this.world.hasChunkAt(sp.ox, sp.oz)) {
        this.spawned.add(sp.key);
        for (const r of def.residents) {
          const md = MOB_BY_ID.get(r.mob);
          if (md) this.entities.spawn(md, sp.ox + r.dx + 0.5, sp.gy + 1.05, sp.oz + r.dz + 0.5);
        }
      }
    }
    for (const e of this.entities.list) {
      if (e.def.behavior === "hero" && !this.heroesMet.has(e.def.id) && Math.hypot(e.body.x - this.body.x, e.body.z - this.body.z) < 14) {
        this.heroesMet.add(e.def.id);
        this.cb.onMessage(`✦ Você avistou ${e.def.name}! Chegue perto e use 🖐 pra conversar.`, "rare");
      }
      if (e.def.behavior === "boss" && !e.dead && !this.discoveries.has("boss:" + e.def.id) && Math.hypot(e.body.x - this.body.x, e.body.z - this.body.z) < 30) {
        this.discoveries.add("boss:" + e.def.id);
        this.cb.onMessage(`⚠ ${e.def.name} se aproxima!`, "warn");
        this.sfx.play("boss");
      }
    }
  }

  private tutorialTick(): void {
    const steps: [number, string][] = [
      [1.5, "Bem-vindo ao MINEARENA. Construa. Explore. Enfrente."],
      [7, "Segure ⛏ (ou o clique esquerdo) pra quebrar blocos. Comece por uma árvore."],
      [16, "Abra a 🎒 mochila pra fabricar. Uma Bancada libera ferramentas melhores."],
      [27, "Cuidado com a noite: criaturas hostis aparecem. Procure heróis de dia!"],
    ];
    if (this.playedSeconds > 90 || this.tutorial >= steps.length) return;
    const [t, msg] = steps[this.tutorial];
    if (this.playedSeconds >= t) {
      this.tutorial++;
      this.cb.onMessage(msg, "info");
    }
  }

  // ---------- mão (primeira pessoa) ----------
  private tileTex(name: TileName): THREE.CanvasTexture {
    let t = this.handTex.get(name);
    if (!t) {
      t = new THREE.CanvasTexture(cachedTile(name));
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.colorSpace = THREE.SRGBColorSpace;
      this.handTex.set(name, t);
    }
    return t;
  }

  private rebuildHand(): void {
    const held = this.inventory.held();
    const key = held ? held.item : "";
    if (key === this.handKey) return;
    this.handKey = key;
    this.hand.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
    this.hand.clear();
    this.hand.rotation.set(0, 0, 0);
    const def = held ? itemDef(held.item) : undefined;
    if (!def) {
      // braço nu
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xc58a5a }));
      arm.position.set(0, 0, -0.1);
      this.hand.add(arm);
    } else if (def.block !== undefined && BLOCKS[def.block].shape === "cross") {
      const tn = BLOCK_TILES[BLOCKS[def.block].key as BlockKey][1];
      const px = canvasPixels(cachedTile(tn));
      const geo = new THREE.BoxGeometry(1 / 16, 1 / 16, 1 / 16);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, px.length));
      const m4 = new THREE.Matrix4();
      px.forEach((p, i) => {
        m4.makeTranslation((p.x - 7.5) / 16, (7.5 - p.y) / 16, 0);
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, new THREE.Color().setRGB(p.r, p.g, p.b, THREE.SRGBColorSpace));
      });
      mesh.scale.setScalar(0.5);
      mesh.rotation.set(0, -0.5, 0.15);
      this.hand.add(mesh);
    } else if (def.block !== undefined) {
      const tiles = BLOCK_TILES[BLOCKS[def.block].key as BlockKey];
      const order: TileName[] = [tiles[1], tiles[1], tiles[0], tiles[2], tiles[1], tiles[1]];
      const mats = order.map((n) => new THREE.MeshBasicMaterial({ map: this.tileTex(n), alphaTest: 0.5, transparent: false }));
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), mats);
      cube.rotation.set(0.2, 0.7, 0);
      this.hand.add(cube);
    } else {
      const px = spritePixels(def.key);
      if (px.length > 0) {
        const geo = new THREE.BoxGeometry(1 / 16, 1 / 16, 1.6 / 16);
        const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), px.length);
        const m4 = new THREE.Matrix4();
        px.forEach((p, i) => {
          m4.makeTranslation((p.x - 7.5) / 16, (7.5 - p.y) / 16, 0);
          mesh.setMatrixAt(i, m4);
          mesh.setColorAt(i, new THREE.Color().setRGB(p.r, p.g, p.b, THREE.SRGBColorSpace));
        });
        mesh.scale.setScalar(0.52);
        mesh.rotation.set(0, -0.5, 0.15);
        this.hand.add(mesh);
      }
    }
  }

  private animateHand(): void {
    const p = this.swing;
    this.hand.rotation.x = -Math.sin(p * Math.PI) * 0.9;
    this.hand.position.set(0.36, -0.3 - Math.sin(p * Math.PI) * 0.05, -0.55 - Math.sin(p * Math.PI) * 0.1);
  }

  // ---------- HUD ----------
  private emitHud(dt: number, loading: boolean): void {
    this.hudT -= dt;
    if (this.hudT > 0) return;
    this.hudT = 0.1;
    const t = this.time;
    const sunH = Math.sin(t * Math.PI * 2);
    const phase = sunH > 0.5 ? "Dia" : sunH > 0 ? (t < 0.25 ? "Amanhecer" : "Entardecer") : "Noite";
    const boss = this.entities.bossNear(this.body.x, this.body.z);
    const held = this.heldDef();
    const slots = this.inventory.slots.slice(0, HOTBAR).map((s) => (s ? { ...s } : null));
    this.cb.onHud({
      health: Math.ceil(this.health),
      hunger: Math.ceil(this.hunger),
      armor: this.inventory.armorDefense(),
      hotbar: slots,
      selected: this.inventory.selected,
      heldName: held?.name ?? null,
      heldColor: held ? RARITY_COLOR[held.rarity] : "#fff",
      time: t,
      phase,
      biome: BIOME_NAME[this.lastBiome as keyof typeof BIOME_NAME] ?? "",
      target: this.targetName,
      mining: this.mineProgress,
      boss: boss ? { name: boss.def.name, hp: Math.max(0, boss.hp), max: boss.maxHp } : null,
      loading,
      alive: this.alive,
      hurt: this.hurtFlash,
      allies: this.entities.list.filter((e) => e.ally && !e.dead).map((e) => e.def.name),
      fade: this.sleepT > 0 ? Math.max(0, Math.min(1, 1 - Math.abs(this.sleepT - 1.4) / 1.4)) : 0,
      coords: !this.showCoords ? "" : `${Math.floor(this.body.x)}, ${Math.floor(this.body.y)}, ${Math.floor(this.body.z)}`,
    });
  }
}

export { MOB_BY_ID };
