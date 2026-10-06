// Motor do MINEARENA: laço do jogo, jogador, mineração, construção, combate, save e ponte com a interface.
import * as THREE from "three";
import { B, BLOCKS, type BlockKey, FLUID_MAX, blockDef, breakInfo, fluidId, isFluid } from "./blocks/blocks";
import { FluidSim } from "./world/fluids";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_PLAYERS, type NetMsg, type Peer, RoomNet, announceRoom } from "./net/room";
import { RemotePlayers } from "./net/remote";
import { AUTOSAVE_S, DAY_SECONDS, PLAYER, REACH, RENDER_DISTANCE } from "./config/config";
import { Sound } from "./audio/audio";
import { MOB_BY_ID } from "./entities/definitions";
import { EntityManager, type Entity } from "./entities/manager";
import { type EnchantKey, ENCHANT_BY_KEY, ROMAN, applyWear, durabilityLeft, enchantCost, enchantLevel, enchantsFor, maxDurability, repair, repairMaterial, repairNeeded } from "./items/enchant";
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
import { ARENA, FORTRESS_RESIDENTS, GEENA_ARRIVAL, fortressesNear } from "./world/geena";
import type { MobDef } from "./entities/definitions";
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
  /** Co-op: papel e nomes de quem está na sala. */
  coop: { role: "host" | "guest"; names: string[] } | null;
  /** 0–1: escurecimento da tela ao dormir ou atravessar o portal. */
  fade: number;
  fadeText: string;
  /** Escudo na mão esquerda e se está erguido. */
  offhand: Stack;
  guarding: boolean;
  /** Cabeça dentro de água ou lava (tinge a tela). */
  submerged: "water" | "lava" | null;
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
  closeOnly?: boolean;
}

export interface GameCallbacks {
  onHud(s: HudState): void;
  onMessage(text: string, tone: "info" | "good" | "warn" | "rare"): void;
  onDialog(d: DialogInfo | null): void;
  onOpenCrafting(): void;
  onOpenContainer(kind: "chest" | "furnace" | "altar"): void;
  onPauseRequest(): void;
  /** Co-op: a sala acabou (anfitrião saiu ou conexão caiu). */
  onRoomEnded(reason: string): void;
}

export interface Input {
  moveX: number;
  moveY: number;
  jump: boolean;
  sprint: boolean;
  mine: boolean;
  use: boolean;
  /** Escudo erguido (tecla F ou botão de toque). */
  guard: boolean;
  lookDX: number;
  lookDY: number;
}

export interface GameOptions {
  mobile: boolean;
  settings?: Settings;
  /** Co-op: quem sou eu, o cliente do Supabase e (convidado) a sala já conectada. */
  me?: Peer;
  sb?: SupabaseClient;
  net?: RoomNet;
}

const rarityTone = (r: string): "info" | "good" | "rare" => (r === "comum" ? "info" : r === "incomum" ? "good" : "rare");

export class MineArena {
  readonly inventory = new Inventory();
  readonly input: Input = { moveX: 0, moveY: 0, jump: false, sprint: false, mine: false, use: false, guard: false, lookDX: 0, lookDY: 0 };
  readonly mobile: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private role: "solo" | "host" | "guest" = "solo";
  private net: RoomNet | null = null;
  private me: Peer | null = null;
  private sb: SupabaseClient | null = null;
  private remotes: RemotePlayers;
  private peers = new Map<string, string>();
  private ann: { update: (i: { hostId: string; hostName: string; name: string; players: number }) => void; close: () => void } | null = null;
  private worldName = "";
  private netLast = { x: 0, y: 0, z: 0, yaw: 0, t: 0 };
  private quality = 1;
  private adaptive = true;
  private adaptStep = 0;
  private fpsAcc = 0;
  private fpsN = 0;
  private diffMul = 1;
  private spawnMul = 1;
  private cullDist = 40;
  private entCap = 14;
  private lastSig = "";
  private lastSigAt = 0;
  private dimension: "overworld" | "geena" = "overworld";
  private baseSeed = 0;
  private overMods: Record<string, number[]> = {};
  private geenaMods: Record<string, number[]> = {};
  private satanDefeated = false;
  private portalReturn: { x: number; y: number; z: number } | null = null;
  private portalT = 0;
  private portalCd = 0;
  private pendingAllies: MobDef[] = [];
  private geenaSpawned = new Set<string>();
  private fluids: FluidSim;
  private sky: Sky;
  private particles: Particles;
  private entities: EntityManager;
  private sfx = new Sound();
  private body: Body;
  private yaw = 0;
  guarding = false;
  private pitch = 0;
  private health: number = PLAYER.maxHealth;
  private hunger: number = PLAYER.maxHunger;
  private alive = true;
  private invuln = 0;
  private hurtFlash = 0;
  private hurtRoll = 0;
  private bobT = 0;
  private bobAmt = 0;
  private bobOn = true;
  private ambT = 6;
  private musT = 8;
  private submerged: "water" | "lava" | null = null;
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

    this.baseSeed = save.seed;
    this.dimension = save.dimension ?? "overworld";
    this.overMods = save.mods ?? {};
    this.geenaMods = save.modsGeena ?? {};
    this.satanDefeated = save.satanDefeated ?? false;
    this.portalReturn = save.portalReturn ?? null;
    this.world = new World(this.dimension === "geena" ? save.seed + 99991 : save.seed, this.scene, this.dimension);
    this.world.loadMods(this.dimension === "geena" ? this.geenaMods : this.overMods);
    this.fluids = new FluidSim(this.world);
    this.world.onChange = (x, y, z) => this.fluids.poke(x, y, z);
    const far = this.radius * 16 - 6;
    this.sky = new Sky(this.scene, far, [this.world.matO, this.world.matT]);
    if (this.dimension === "geena") this.sky.setFire(true);
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
    this.remotes = new RemotePlayers(this.scene);
    this.me = opts.me ?? null;
    this.sb = opts.sb ?? null;
    this.worldName = save.name;
    if (opts.net) {
      this.role = "guest";
      this.net = opts.net;
      this.entities.clientMode = true;
      this.attachNet();
    }
  }

  // ---------- ciclo de vida ----------
  start(): void {
    this.running = true;
    this.last = performance.now();
    this.resize();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const raw = (now - this.last) / 1000;
      const dt = Math.min(0.05, raw);
      this.last = now;
      this.frame(dt);
      this.sample(raw);
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
  setHold(key: "mine" | "use" | "jump" | "sprint" | "guard", on: boolean): void {
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
    const q = s.quality >= 0 ? s.quality : this.mobile ? 1 : 2;
    this.quality = q;
    this.adaptive = s.quality === -1;
    this.adaptStep = 0;
    const pr = this.mobile ? [1, 1.25, 1.5][q] : [1, 1.5, 2][q];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pr));
    this.resize();
    this.world.setAO(q >= 1);
    this.cullDist = [28, 40, 56][q];
    this.entCap = [8, 14, 22][q];
    this.diffMul = [0.7, 1, 1.35][s.difficulty];
    this.spawnMul = [1.5, 1, 0.8][s.difficulty];
    this.setRenderDistance(s.distance || (this.mobile ? [3, RENDER_DISTANCE.mobile, 5][q] : [4, RENDER_DISTANCE.desktop, 8][q]));
    this.sens = s.sensitivity / 100;
    this.invertY = s.invertY;
    this.sfx.volume = s.volume / 100;
    this.sfx.musicOn = s.music;
    this.bobOn = s.bob;
    this.cloudsOn = s.clouds;
    this.sky.setClouds(s.clouds);
    this.particles.enabled = s.particles;
    this.showCoords = s.coords;
  }
  /** Monitora o desempenho: se ficar abaixo de ~26 fps, simplifica os gráficos (só no modo automático). */
  private sample(raw: number): void {
    if (!this.ready || this.paused || raw > 0.5) {
      this.fpsAcc = 0;
      this.fpsN = 0;
      return;
    }
    this.fpsAcc += raw;
    this.fpsN++;
    if (this.fpsAcc < 3) return;
    const fps = this.fpsN / this.fpsAcc;
    this.fpsAcc = 0;
    this.fpsN = 0;
    if (!this.adaptive || fps >= 26) return;
    this.adaptStep++;
    if (this.adaptStep === 1) {
      this.world.setAO(false);
      this.cb.onMessage("Ajustei os gráficos pra ficar mais fluido (Opções → Gráficos).", "info");
    } else if (this.adaptStep === 2) {
      this.renderer.setPixelRatio(1);
      this.resize();
    } else if (this.radius > 2) this.setRenderDistance(this.radius - 1);
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
      seed: this.baseSeed,
      createdAt: this.createdAt,
      updatedAt: Date.now(),
      playedSeconds: this.playedSeconds,
      time: this.time,
      player: { x: this.body.x, y: this.body.y, z: this.body.z, yaw: this.yaw, pitch: this.pitch, health: this.health, hunger: this.hunger },
      spawn: this.spawn,
      inventory: JSON.parse(JSON.stringify(this.inventory.toJSON())),
      mods: this.dimension === "overworld" ? this.world.exportMods() : this.overMods,
      modsGeena: this.dimension === "geena" ? this.world.exportMods() : this.geenaMods,
      dimension: this.dimension,
      satanDefeated: this.satanDefeated,
      portalReturn: this.portalReturn ?? undefined,
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
    const snap = this.snapshot();
    if (this.role === "guest") {
      // convidado: guarda só o personagem (mochila, vida), nunca o mundo do anfitrião
      await putWorld({ ...snap, id: "visitante", name: "Visitante", mods: {}, modsGeena: {}, containers: {}, crops: {}, spawned: [] });
      return;
    }
    await putWorld(snap);
  }

  async dispose(): Promise<void> {
    this.running = false;
    cancelAnimationFrame(this.raf);
    await this.saveNow();
    // o convidado só fecha a conexão ao sair de verdade (quem fecha é a tela, que também sobrevive a remontagens)
    if (this.role !== "guest") this.closeRoom(true);
    this.remotes.dispose();
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
        this.input.guard = keys.has("KeyF");
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
      damagePlayer: (amount: number, fx: number, fz: number, pid?: string) => {
        if (pid && this.net) this.net.send("dmg", { amount, fx, fz }, pid);
        else this.damagePlayer(amount, fx, fz);
      },
      netHit: (id: number, amount: number, kx: number, kz: number) => this.net?.send("hit", { id, amount, kx, kz }),
      giveRemote: (pid: string, item: string, count: number) => this.net?.send("loot", { item, count }, pid),
      net: (kind: string, data: Record<string, number>) => {
        if (this.role === "host") this.net?.send("fx", { k: kind, d: data });
      },
      healPlayer: (n: number) => {
        this.health = Math.min(PLAYER.maxHealth, this.health + n);
      },
      give: (item: string, count: number) => this.give(item, count),
      say: (text: string) => this.cb.onMessage(text, "warn"),
      onKill: (def: MobDef) => {
        this.kills++;
        if (def.id === "satanas") this.onSatanDefeated();
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

  private damagePlayer(amount: number, fx: number, fz: number, blockable = true): void {
    if (!this.alive || this.invuln > 0) return;
    let kb = 6;
    let flash = 1;
    const shield = this.inventory.offhand;
    if (blockable && this.guarding && shield) {
      const dx = fx - this.body.x;
      const dz = fz - this.body.z;
      const n = Math.hypot(dx, dz);
      // só segura o que vem de frente (dentro de ~160°)
      if (n > 0.5 && (dx * -Math.sin(this.yaw) + dz * -Math.cos(this.yaw)) / n > 0.17) {
        const block = itemDef(shield.item)?.shield?.block ?? 0.7;
        const raw = amount;
        amount *= 1 - block;
        kb = 1.5;
        flash = 0.35;
        this.sfx.play("place");
        this.particles.burst(this.body.x - Math.sin(this.yaw) * 0.8, this.body.y + 1.1, this.body.z - Math.cos(this.yaw) * 0.8, 0xffe9a8, 6, 3, 0.1);
        if (applyWear(shield, Math.max(1, Math.round(raw / 2)))) {
          this.inventory.offhand = null;
          this.sfx.play("break");
          this.cb.onMessage("Seu escudo quebrou!", "warn");
        }
        this.inventory.changed();
      }
    }
    const taken = amount * (1 - Math.min(0.7, this.inventory.armorDefense() * 0.035)) * this.diffMul;
    if (taken > 0.4) this.wearArmor();
    this.health -= taken;
    this.invuln = 0.5;
    this.hurtFlash = flash;
    this.hurtRoll = (Math.sign((fx - this.body.x) * Math.cos(this.yaw) - (fz - this.body.z) * Math.sin(this.yaw)) || 1) * 0.1 * flash;
    this.sfx.play("hurt");
    const dx = this.body.x - fx;
    const dz = this.body.z - fz;
    const n = Math.hypot(dx, dz) || 1;
    this.body.vx += (dx / n) * kb;
    this.body.vz += (dz / n) * kb;
    this.body.vy = Math.max(this.body.vy, kb > 3 ? 4 : 2);
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
    if (this.dimension === "geena") {
      this.switchDimension("overworld", this.spawn);
    }
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
    this.world.update(b.x, b.z, this.radius, this.ready ? (this.mobile ? 3 : 6) : 16, this.ready ? (this.mobile ? 2 : 4) : 99);
    if (!this.ready) {
      if (this.world.readyAround(b.x, b.z, 2)) {
        this.ready = true;
        const sx = Math.floor(b.x);
        const sz = Math.floor(b.z);
        if (this.world.isSolid(sx, Math.floor(b.y), sz) || this.world.isSolid(sx, Math.floor(b.y + 1), sz)) {
          if (this.dimension === "geena") {
            for (let y = Math.floor(b.y); y < 60; y++) {
              if (!this.world.isSolid(sx, y, sz) && !this.world.isSolid(sx, y + 1, sz)) {
                b.y = y + 0.05;
                break;
              }
            }
          } else {
            const sy = this.world.surfaceY(sx, sz);
            if (sy >= 0) b.y = sy + 1.05;
          }
        }
        for (const d of this.pendingAllies) {
          const e = this.entities.spawn(d, b.x + 1.5, b.y + 0.2, b.z + 1.5);
          e.ally = true;
        }
        this.pendingAllies = [];
        this.syncCamera();
      }
      this.emitHud(dt, true);
      return;
    }

    this.playedSeconds += dt;
    this.time = (this.time + dt / DAY_SECONDS) % 1;
    if (this.dimension === "geena") this.sky.updateFire();
    else this.sky.update(this.time, this.camera.position);
    this.portalCd = Math.max(0, this.portalCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2);
    this.hurtRoll *= Math.max(0, 1 - dt * 6);
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

    this.entities.update(dt, { px: b.x, py: b.y, pz: b.z, alive: this.alive, daylight: this.sky.daylight, mobile: this.mobile, dim: this.dimension, others: this.role === "solo" ? undefined : this.remotes.positions(), cull: this.cullDist, cap: this.entCap, spawnMul: this.spawnMul * (this.dimension === "geena" ? 1.5 : 1) });
    this.particles.update(dt);
    this.tickFurnaces(dt);
    this.tickCrops(dt);
    if (this.role !== "guest") this.fluids.update(dt);
    this.netTick(dt);
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
    this.portalTick(dt);
    this.geenaTick();
    this.exploration(dt);
    this.ambience(dt);
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
    const speed = Math.hypot(b.vx, b.vz);
    this.bobAmt = this.bobOn && b.onGround && !this.uiOpen && !this.paused ? Math.min(1, speed / PLAYER.walk) : 0;
    this.camera.position.set(b.x, b.y + PLAYER.eye + Math.sin(this.bobT * 2) * 0.035 * this.bobAmt, b.z);
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.bobT) * 0.008 * this.bobAmt + this.hurtRoll, "YXZ");
    // debaixo d'água (ou de lava): neblina curta e tela tingida
    const eye = BLOCKS[this.world.getBlock(Math.floor(this.camera.position.x), Math.floor(this.camera.position.y), Math.floor(this.camera.position.z))]?.fluid ?? null;
    if (eye !== this.submerged) {
      const was = this.submerged;
      this.submerged = eye;
      const fog = this.scene.fog as THREE.Fog;
      if (eye) {
        fog.near = eye === "water" ? 0.5 : 0.1;
        fog.far = eye === "water" ? 24 : 5;
        if (!was) this.sfx.ambient("splash");
      } else this.setRenderDistance(this.radius);
    }
  }

  private movePlayer(dt: number): void {
    const b = this.body;
    const blocked = this.uiOpen || this.paused || this.sleepT > 0;
    const mx = blocked ? 0 : this.input.moveX;
    const my = blocked ? 0 : this.input.moveY;
    const len = Math.hypot(mx, my);
    this.updateGuard();
    const sprint = !blocked && !this.guarding && this.input.sprint && my > 0;
    const sp = (sprint ? PLAYER.sprint : PLAYER.walk) * (b.inWater ? 0.55 : 1) * (this.guarding ? 0.6 : 1);
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
      // na superfície, encostado na margem: pula pra fora da água
      if (jump && b.hitWall && !isFluid(this.world.getBlock(Math.floor(b.x), Math.floor(b.y + 1.1), Math.floor(b.z)))) b.vy = PLAYER.jump;
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
        if (dmg > 0) this.damagePlayer(dmg, b.x, b.z, false);
      }
      else if (this.fallV < -7) this.sfx.step(blockDef(this.world.getBlock(Math.floor(b.x), Math.floor(b.y - 0.1), Math.floor(b.z))).sound, true);
      this.fallV = 0;
    } else {
      this.fallV = Math.min(this.fallV, vyBefore);
    }
    if (b.inWater) this.fallV = 0;

    if (b.onGround && len > 0.1) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = sprint ? 0.28 : 0.42;
        if (b.inWater) this.sfx.ambient("splash");
        else this.sfx.step(blockDef(this.world.getBlock(Math.floor(b.x), Math.floor(b.y - 0.1), Math.floor(b.z))).sound);
      }
    }
    if (b.onGround) this.bobT += Math.hypot(b.vx, b.vz) * dt * 1.7;
    this.hunger = Math.max(0, this.hunger - Math.hypot(b.vx, b.vz) * dt * (sprint ? 0.012 : 0.006));
    if (inLava(this.world, b) && this.invuln <= 0) this.damagePlayer(3, b.x + 0.01, b.z, false);
    if (b.y < -20) this.damagePlayer(100, b.x, b.z, false);
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
    if (!blocked && !this.guarding && this.input.mine) {
      const entityFirst = ePick && ePick.dist <= wReach && (!hit || ePick.dist < hit.dist) && ePick.e.def.behavior !== "hero";
      if (entityFirst && ePick) {
        this.mineProgress = 0;
        this.mineKey = "";
        if (this.atkCd <= 0) this.attack(ePick.e, dir);
      } else if (hit) {
        const def = BLOCKS[hit.id];
        const tool = held?.tool;
        const heldStack = this.inventory.held();
        const info = breakInfo(def, tool?.type ?? "hand", tool?.tier ?? 0, (tool?.speed ?? 1) * (1 + 0.3 * enchantLevel(heldStack, "zelo")));
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
            this.breakBlock(hit.x, hit.y, hit.z, info.harvest, enchantLevel(heldStack, "abundancia"));
            if (tool && def.hardness > 0.2) this.wearHeld(1);
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
    const hs = this.inventory.held();
    let dmg = (w?.dmg ?? 1) + enchantLevel(hs, "fio") * 1.5 + (e.def.evil ? enchantLevel(hs, "combate") * 3 : 0);
    const crit = !this.body.onGround && this.body.vy < -1;
    if (crit) dmg *= 1.5;
    if (e.def.evil && held?.key === "sword_spirit") dmg *= 1.6;
    this.atkCd = w?.cooldown ?? 0.45;
    this.swing = 1;
    const landed = this.entities.hurt(e, dmg, dir.x, dir.z, true);
    if (w && held?.durability) this.wearHeld(held.tool ? 2 : 1);
    if (landed) {
      if (crit) {
        this.particles.burst(e.body.x, e.body.y + e.body.h * 0.7, e.body.z, 0xffd36a, 10, 4, 0.12);
        this.cb.onMessage("Golpe crítico!", "good");
      }
    }
  }

  private breakBlock(x: number, y: number, z: number, harvest: boolean, fortune = 0): void {
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
      let n = l.min + Math.floor(Math.random() * (l.max - l.min + 1));
      if (fortune > 0 && n > 0 && itemDef(l.item)?.kind === "material") n *= Math.max(1, Math.floor(Math.random() * (fortune + 2)));
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
    // 1c') altar do ferreiro: consertar e abençoar
    if (edge && hit && hit.id === B.altar) {
      this.cb.onOpenContainer("altar");
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
    // escudo na mão principal: vai pra mão esquerda (troca se já houver um)
    if (edge && held.shield) {
      const cur = this.inventory.offhand;
      this.inventory.offhand = this.inventory.held();
      this.inventory.slots[this.inventory.selected] = cur;
      this.inventory.changed();
      this.sfx.play("pickup");
      this.cb.onMessage("Escudo na mão esquerda. Segure F (ou o botão 🛡) pra se proteger.", "info");
      return;
    }
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
    // acender o portal do Abismo com o tição do altar
    if (held.key === "ember_brand" && hit && hit.id === B.obsidian) {
      if (this.role !== "solo") {
        this.cb.onMessage("O portal do Abismo só funciona no modo solo.", "warn");
        return;
      }
      if (this.tryLightPortal(hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz)) {
        this.sfx.play("fire");
        this.cb.onMessage("O portal do Abismo se abriu…", "rare");
      } else this.cb.onMessage("A moldura de obsidiana precisa estar fechada.", "warn");
      return;
    }
    // arar a terra com a enxada
    if (held.tool?.type === "hoe" && tgt && (tgt.id === B.grass || tgt.id === B.dirt)) {
      const above = this.world.getBlock(tgt.x, tgt.y + 1, tgt.z);
      if (above === B.air || blockDef(above).shape === "cross") {
        if (above !== B.air) this.world.setBlock(tgt.x, tgt.y + 1, tgt.z, B.air);
        this.world.setBlock(tgt.x, tgt.y, tgt.z, B.farmland);
        this.sfx.play("place");
        this.swing = 1;
        this.wearHeld(1);
        return;
      }
    }
    // plantar sementes
    if (held.key === "seeds" && tgt && tgt.id === B.farmland && (this.world.getBlock(tgt.x, tgt.y + 1, tgt.z) === B.air || onPlant)) {
      this.world.setBlock(tgt.x, tgt.y + 1, tgt.z, B.wheat_0);
      this.crops.set(`${tgt.x},${tgt.y + 1},${tgt.z}`, 0);
      if (this.role === "guest") this.net?.send("crop", { x: tgt.x, y: tgt.y + 1, z: tgt.z });
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
      this.entities.shoot(r.shape, eye.x + dir.x * 0.5, eye.y + dir.y * 0.5 - 0.1, eye.z + dir.z * 0.5, dir.x, dir.y, dir.z, r.speed, r.dmg * (1 + 0.2 * enchantLevel(this.inventory.held(), "certeira")), r.gravity, "player");
      this.wearHeld(1);
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

  // ---------- dimensão de fogo (Geena) ----------
  /** Tenta acender a moldura de obsidiana: preenche o vão com o portal do Abismo. */
  private tryLightPortal(sx: number, sy: number, sz: number): boolean {
    if (this.world.getBlock(sx, sy, sz) !== B.air) return false;
    for (const axis of ["x", "z"] as const) {
      const cells: [number, number, number][] = [];
      const seen = new Set<string>([`${sx},${sy},${sz}`]);
      const queue: [number, number, number][] = [[sx, sy, sz]];
      let ok = true;
      while (queue.length && ok) {
        const [x, y, z] = queue.shift()!;
        cells.push([x, y, z]);
        if (cells.length > 21) {
          ok = false;
          break;
        }
        const nbs: [number, number, number][] = axis === "x" ? [[x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]] : [[x, y + 1, z], [x, y - 1, z], [x + 1, y, z], [x - 1, y, z]];
        for (const n of nbs) {
          const k = `${n[0]},${n[1]},${n[2]}`;
          if (seen.has(k)) continue;
          const id = this.world.getBlock(n[0], n[1], n[2]);
          if (id === B.air) {
            seen.add(k);
            queue.push(n);
          } else if (id !== B.obsidian) ok = false;
        }
      }
      if (ok && cells.length >= 2) {
        for (const [x, y, z] of cells) this.world.setBlock(x, y, z, B.portal);
        return true;
      }
    }
    return false;
  }

  private portalTick(dt: number): void {
    if (this.role !== "solo") return;
    const b = this.body;
    const inPortal = this.world.getBlock(Math.floor(b.x), Math.floor(b.y + 0.3), Math.floor(b.z)) === B.portal || this.world.getBlock(Math.floor(b.x), Math.floor(b.y + 1.2), Math.floor(b.z)) === B.portal;
    if (!inPortal || this.portalCd > 0 || !this.alive) {
      this.portalT = Math.max(0, this.portalT - dt * 2);
      return;
    }
    this.portalT += dt;
    if (this.portalT >= 2.4) {
      this.portalT = 0;
      if (this.dimension === "overworld") {
        this.portalReturn = { x: b.x, y: b.y, z: b.z };
        this.switchDimension("geena", { x: GEENA_ARRIVAL.x + 0.5, y: GEENA_ARRIVAL.floorY + 1, z: GEENA_ARRIVAL.z + 0.5 });
        this.cb.onMessage("Você desceu a Geena, o Vale de Hinom. “Ainda que eu ande pelo vale da sombra da morte, não temerei mal nenhum.” — Sl 23.4", "rare");
      } else {
        this.switchDimension("overworld", this.portalReturn ?? this.spawn);
        this.cb.onMessage("Você voltou à luz.", "good");
      }
    }
  }

  /** Troca de dimensão: salva os blocos da atual, recria o mundo, as criaturas e leva os aliados. */
  private switchDimension(dim: "overworld" | "geena", pos: { x: number; y: number; z: number }): void {
    if (dim === this.dimension) return;
    this.pendingAllies = this.entities.list.filter((e) => e.ally && !e.dead).map((e) => e.def);
    const cur = this.world.exportMods();
    if (this.dimension === "overworld") this.overMods = cur;
    else this.geenaMods = cur;
    this.entities.dispose();
    this.world.dispose();
    this.dimension = dim;
    this.world = new World(dim === "geena" ? this.baseSeed + 99991 : this.baseSeed, this.scene, dim);
    this.world.loadMods(dim === "geena" ? this.geenaMods : this.overMods);
    this.fluids = new FluidSim(this.world);
    this.world.onChange = (x, y, z) => this.fluids.poke(x, y, z);
    this.sky.setMaterials([this.world.matO, this.world.matT]);
    this.sky.setFire(dim === "geena");
    this.setClouds();
    this.world.setAO(this.quality >= 1 && this.adaptStep === 0);
    this.entities = new EntityManager(this.scene, this.world, this.particles, this.sfx, this.hooks(), this.baseSeed);
    this.body.x = pos.x;
    this.body.y = pos.y;
    this.body.z = pos.z;
    this.body.vx = this.body.vy = this.body.vz = 0;
    this.ready = false;
    this.portalCd = 5;
    this.lastBiome = "";
    this.sfx.play("boss");
    void this.saveNow();
  }

  private cloudsOn = true;
  private setClouds(): void {
    this.sky.setClouds(this.cloudsOn);
  }

  /** Geena: moradores das fortalezas e o despertar do Adversário no trono. */
  private geenaTick(): void {
    if (this.dimension !== "geena") return;
    const b = this.body;
    for (const f of fortressesNear(this.world.seed, b.x, b.z, 60)) {
      if (this.geenaSpawned.has(f.key) || !this.world.hasChunkAt(f.ox, f.oz)) continue;
      this.geenaSpawned.add(f.key);
      this.cb.onMessage("✦ Descoberta: Fortaleza de Hinom", "rare");
      const md = MOB_BY_ID.get("demonio");
      if (md) for (const r of FORTRESS_RESIDENTS) this.entities.spawn(md, f.ox + r.dx + 0.5, f.gy + 1.05, f.oz + r.dz + 0.5);
    }
    const d = Math.hypot(b.x - ARENA.x, b.z - ARENA.z);
    if (!this.satanDefeated && d < 42 && this.world.hasChunkAt(ARENA.x, ARENA.z) && !this.entities.list.some((e) => e.def.id === "satanas" && !e.dead)) {
      const sd = MOB_BY_ID.get("satanas");
      if (sd) {
        this.entities.spawn(sd, ARENA.x + 6.5, ARENA.floorY + 1.05, ARENA.z + 0.5);
        this.cb.onMessage("⚠ Satanás, o Adversário, ergue-se do trono! Resista e vença com a fé.", "warn");
        this.sfx.play("boss");
      }
    }
  }

  /** Vitória sobre o Adversário: a arca do trono guarda a Armadura de Deus. */
  private onSatanDefeated(): void {
    this.satanDefeated = true;
    const rewards: { item: string; count: number }[] = [
      { item: "helmet_god", count: 1 },
      { item: "chest_god", count: 1 },
      { item: "legs_god", count: 1 },
      { item: "boots_god", count: 1 },
      { item: "sword_spirit", count: 1 },
      { item: "shield_faith", count: 1 },
      { item: "gold_ingot", count: 16 },
      { item: "sapphire", count: 12 },
      { item: "ember_shard", count: 16 },
      { item: "cooked_meat", count: 16 },
    ];
    const cx = ARENA.x;
    const cy = ARENA.floorY + 2;
    const cz = ARENA.z;
    this.world.setBlock(cx, cy, cz, B.chest);
    const slots: SavedContainer["slots"] = Array.from({ length: 27 }, () => null);
    rewards.forEach((r, i) => (slots[i] = { ...r }));
    this.containers.set(this.ckey(cx, cy, cz), { kind: "chest", slots, burn: 0, burnMax: 0, cook: 0 });
    this.particles.burst(cx + 0.5, cy + 1, cz + 0.5, 0xffd66b, 60, 9, 0.22, 4);
    this.sfx.play("pickup");
    this.cb.onMessage("✦ O Adversário foi vencido! A arca do trono guarda a Armadura de Deus.", "rare");
    this.cb.onDialog({
      name: "Vitória!",
      title: "O Adversário foi vencido",
      emoji: "🕊️",
      line: "Sujeitai-vos, portanto, a Deus; mas resisti ao diabo, e ele fugirá de vós. — Tg 4.7",
      verse: "Eles o venceram por causa do sangue do Cordeiro e por causa da palavra do testemunho. — Ap 12.11",
      gifts: ["Armadura de Deus (Ef 6.13-17)", "Espada do Espírito"],
      recruited: false,
      closeOnly: true,
    });
    this.setUiOpen(true);
    void this.saveNow();
  }

  // ---------- co-op (multijogador) ----------
  get coopRole(): "solo" | "host" | "guest" {
    return this.role;
  }

  /** Solo → anfitrião: abre uma sala e anuncia no lobby. */
  async openRoom(): Promise<boolean> {
    if (this.role !== "solo" || !this.me || !this.sb) return false;
    if (this.dimension !== "overworld") {
      this.cb.onMessage("Abra a sala no mundo normal (saia de Geena primeiro).", "warn");
      return false;
    }
    const net = new RoomNet(this.sb, this.me, this.me.id, "host");
    try {
      await net.connect();
    } catch {
      this.cb.onMessage("Não consegui abrir a sala. Verifique a conexão.", "warn");
      return false;
    }
    this.net = net;
    this.role = "host";
    this.attachNet();
    this.ann = announceRoom(this.sb, { hostId: this.me.id, hostName: this.me.name, name: this.worldName, players: 1 });
    this.cb.onMessage("Sala aberta! Colegas já podem entrar pela Sala de Jogos.", "good");
    return true;
  }

  /** Fecha a sala (anfitrião) ou sai dela (convidado). */
  closeRoom(silent = false): void {
    if (this.role === "solo") return;
    const was = this.role;
    this.ann?.close();
    this.ann = null;
    this.net?.close();
    this.net = null;
    this.role = "solo";
    this.entities.clientMode = false;
    this.world.onLocalSet = null;
    for (const id of [...this.remotes.list.keys()]) this.remotes.remove(id);
    this.peers.clear();
    if (!silent) this.cb.onMessage(was === "host" ? "Sala fechada." : "Você saiu da sala.", "info");
  }

  sendChat(text: string): void {
    const t = text.trim().slice(0, 140);
    if (!t || !this.net) return;
    this.net.send("chat", { text: t, name: this.me?.name ?? "Jogador" });
    this.cb.onMessage(`Você: ${t}`, "info");
  }

  private announceCount(): void {
    if (this.role === "host" && this.ann && this.me) this.ann.update({ hostId: this.me.id, hostName: this.me.name, name: this.worldName, players: 1 + this.remotes.list.size });
  }

  private broadcastPeers(): void {
    if (this.role !== "host" || !this.net || !this.me) return;
    const list = [{ id: this.me.id, name: this.me.name }, ...[...this.peers].map(([id, name]) => ({ id, name }))];
    this.net.send("peers", { list });
  }

  private applyMods(batch: [number, number[]][]): void {
    for (const [k, flat] of batch) {
      const cx = k >> 16;
      const cz = (k << 16) >> 16;
      for (let i = 0; i + 1 < flat.length; i += 2) {
        const idx = flat[i];
        this.world.setBlockRemote(cx * 16 + (idx & 15), idx >> 8, cz * 16 + ((idx >> 4) & 15), flat[i + 1]);
      }
    }
  }

  private attachNet(): void {
    const net = this.net;
    if (!net) return;
    // blocos que eu altero (jogador ou simulação do anfitrião) vão pra todos
    this.world.onLocalSet = (x, y, z, id) => net.send("blk", { x, y, z, id });
    net.on("blk", (m) => this.world.setBlockRemote(m.x as number, m.y as number, m.z as number, m.id as number));
    net.on("pos", (m) => {
      if (!this.remotes.list.has(m.from)) this.remotes.add(m.from, this.peers.get(m.from) ?? "Jogador", m.x as number, m.y as number, m.z as number);
      this.remotes.setTarget(m.from, m.x as number, m.y as number, m.z as number, m.yaw as number);
    });
    net.on("chat", (m) => this.cb.onMessage(`${m.name as string}: ${m.text as string}`, "info"));
    net.on("bye", (m) => this.onPeerLeft(m));
    if (this.role === "host") {
      net.on("hello", (m) => this.onHello(m));
      net.on("hit", (m) => {
        const e = this.entities.list.find((o) => o.id === (m.id as number));
        if (e) this.entities.hurt(e, m.amount as number, m.kx as number, m.kz as number, true, m.from);
      });
      net.on("crop", (m) => this.crops.set(`${m.x as number},${m.y as number},${m.z as number}`, 0));
    } else {
      net.on("ents", (m) => this.entities.applySnapshot(m.l as (number | string)[][]));
      net.on("time", (m) => {
        this.time = m.v as number;
      });
      net.on("dmg", (m) => this.damagePlayer(m.amount as number, m.fx as number, m.fz as number));
      net.on("loot", (m) => this.give(m.item as string, m.count as number));
      net.on("fx", (m) => this.entities.visualEvent(m.k as string, m.d as Record<string, number>));
      net.on("mods", (m) => this.applyMods(m.c as [number, number[]][]));
      net.on("peers", (m) => {
        const list = m.list as Peer[];
        this.peers.clear();
        for (const p of list) if (p.id !== this.me?.id) this.peers.set(p.id, p.name);
        for (const [id, name] of this.peers) if (!this.remotes.list.has(id)) this.remotes.add(id, name, this.body.x, this.body.y, this.body.z);
        for (const id of [...this.remotes.list.keys()]) if (!this.peers.has(id)) this.remotes.remove(id);
      });
    }
  }

  private onHello(m: NetMsg): void {
    const net = this.net;
    if (!net || !this.me) return;
    if (this.remotes.list.size + 1 >= MAX_PLAYERS && !this.peers.has(m.from)) {
      net.send("full", {}, m.from);
      return;
    }
    const name = String(m.name ?? "Jogador").slice(0, 24);
    this.peers.set(m.from, name);
    if (!this.remotes.list.has(m.from)) this.remotes.add(m.from, name, this.body.x, this.body.y, this.body.z);
    net.send("welcome", { seed: this.baseSeed, time: this.time, spawn: this.spawn, host: { x: this.body.x, y: this.body.y, z: this.body.z }, peers: [{ id: this.me.id, name: this.me.name }] }, m.from);
    // blocos já alterados: manda em lotes pequenos
    const mods = this.world.exportMods();
    let batch: [number, number[]][] = [];
    let size = 0;
    for (const [k, flat] of Object.entries(mods)) {
      batch.push([Number(k), flat]);
      size += flat.length;
      if (size > 2400) {
        net.send("mods", { c: batch }, m.from);
        batch = [];
        size = 0;
      }
    }
    if (batch.length) net.send("mods", { c: batch }, m.from);
    this.broadcastPeers();
    this.announceCount();
    this.cb.onMessage(`${name} entrou na sala.`, "good");
  }

  private onPeerLeft(m: NetMsg): void {
    if (this.role === "guest" && m.from === this.net?.hostId) {
      this.cb.onRoomEnded("O anfitrião fechou a sala.");
      return;
    }
    const name = this.peers.get(m.from);
    this.peers.delete(m.from);
    this.remotes.remove(m.from);
    if (name) this.cb.onMessage(`${name} saiu da sala.`, "info");
    if (this.role === "host") {
      this.broadcastPeers();
      this.announceCount();
    }
  }

  /** A cada quadro: manda a minha posição e (anfitrião) as criaturas e a hora; move os outros jogadores. */
  private netTick(dt: number): void {
    this.remotes.update(dt);
    const net = this.net;
    if (!net || this.role === "solo") return;
    const b = this.body;
    // economiza mensagens: só manda a posição quando ela muda (ou a cada 2 s, como sinal de vida)
    const now = performance.now();
    const moved = Math.hypot(b.x - this.netLast.x, b.y - this.netLast.y, b.z - this.netLast.z) > 0.08 || Math.abs(this.yaw - this.netLast.yaw) > 0.05;
    if ((moved && now - this.netLast.t > 300) || now - this.netLast.t > 2000) {
      this.netLast = { x: b.x, y: b.y, z: b.z, yaw: this.yaw, t: now };
      net.send("pos", { x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), yaw: +this.yaw.toFixed(2) });
    }
    if (this.role === "host") {
      net.sendEvery("ents", 420, () => ({ l: this.entities.snapshot() }));
      net.sendEvery("time", 3000, () => ({ v: this.time }));
    }
  }

  // ---------- cama e plantações ----------
  private useBed(x: number, y: number, z: number): void {
    if (this.dimension === "geena") {
      this.cb.onMessage("Não há descanso em Geena.", "warn");
      return;
    }
    this.spawn = { x: x + 0.5, y: y + 1.1, z: z + 0.5 };
    if (this.sky.daylight >= 0.35) {
      this.cb.onMessage("Ponto de renascimento definido. Só dá pra dormir à noite.", "info");
      return;
    }
    if (this.role === "guest") {
      this.cb.onMessage("Ponto de renascimento definido. Só o anfitrião pula a noite.", "info");
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
    if (this.dimension !== "overworld" || this.role === "guest") return;
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
  private ckey(x: number, y: number, z: number): string {
    return `${this.dimension === "geena" ? "g:" : ""}${x},${y},${z}`;
  }

  private containerAt(x: number, y: number, z: number, id: number): SavedContainer {
    const key = this.ckey(x, y, z);
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
    this.openKey = this.ckey(x, y, z);
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
    const key = this.ckey(x, y, z);
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
      if (c.kind !== "furnace" || key.startsWith("g:") !== (this.dimension === "geena")) continue;
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
      if (sync && this.role !== "guest") {
        const [x, y, z] = key.replace("g:", "").split(",").map(Number);
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
    if (e && act === "follow" && this.role === "guest") {
      this.cb.onMessage("Só o anfitrião recruta heróis.", "warn");
    } else if (e && act === "follow") {
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

  // ---------- desgaste, escudo e altar ----------
  private updateGuard(): void {
    const sd = this.inventory.offhand ? itemDef(this.inventory.offhand.item) : undefined;
    const h = this.heldDef();
    const okHeld = !h || h.kind === "weapon" || (h.kind === "tool" && !!h.tool && h.tool.type !== "hoe");
    this.guarding = !!sd?.shield && this.alive && !this.uiOpen && !this.paused && this.sleepT <= 0 && (this.input.guard || (this.input.use && okHeld));
  }

  /** Gasta `n` usos do item da mão; se quebrar, some da barra. */
  private wearHeld(n = 1): void {
    const s = this.inventory.held();
    if (!s || !itemDef(s.item)?.durability) return;
    const name = itemDef(s.item)?.name ?? s.item;
    if (applyWear(s, n)) {
      this.inventory.slots[this.inventory.selected] = null;
      this.sfx.play("break");
      this.cb.onMessage(`${name} quebrou!`, "warn");
    } else if (durabilityLeft(s) === Math.max(3, Math.floor(maxDurability(s.item) * 0.1))) {
      this.cb.onMessage(`${name} está quase quebrando. Conserte no altar do ferreiro.`, "warn");
    }
    this.inventory.changed();
  }

  private wearArmor(): void {
    for (let i = 0; i < 4; i++) {
      const s = this.inventory.armor[i];
      if (!s) continue;
      if (applyWear(s, 1)) {
        this.inventory.armor[i] = null;
        this.sfx.play("break");
        this.cb.onMessage(`${itemDef(s.item)?.name ?? "Armadura"} quebrou!`, "warn");
      }
    }
    this.inventory.changed();
  }

  /** Itens da mochila, armadura e mão esquerda que o altar pode consertar ou abençoar. */
  altarEntries(): { slot: number; stack: NonNullable<Stack> }[] {
    const out: { slot: number; stack: NonNullable<Stack> }[] = [];
    for (const i of [...Array.from({ length: 36 }, (_, k) => k), 100, 101, 102, 103, 104]) {
      const s = this.inventory.getSlot(i);
      if (s && (itemDef(s.item)?.durability || enchantsFor(s).length)) out.push({ slot: i, stack: s });
    }
    return out;
  }

  repairItem(slot: number): boolean {
    const s = this.inventory.getSlot(slot);
    if (!s || repairNeeded(s) <= 0) return false;
    const mat = repairMaterial(s.item);
    if (!mat || !this.inventory.remove(mat, 1)) return false;
    repair(s, 1);
    this.inventory.changed();
    this.sfx.play("pickup");
    return true;
  }

  enchantItem(slot: number, key: EnchantKey): boolean {
    const s = this.inventory.getSlot(slot);
    if (!s || !enchantsFor(s).some((e) => e.key === key)) return false;
    const cost = enchantCost(s, key);
    if (!cost.every((c) => this.inventory.count(c.item) >= c.count)) return false;
    for (const c of cost) this.inventory.remove(c.item, c.count);
    const lvl = enchantLevel(s, key) + 1;
    s.ench = { ...s.ench, [key]: lvl };
    this.inventory.changed();
    this.sfx.play("pickup");
    this.cb.onMessage(`${itemDef(s.item)?.name} recebeu ${ENCHANT_BY_KEY[key].name} ${ROMAN[lvl]}`, "rare");
    return true;
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
    if (this.dimension === "geena") {
      this.lastBiome = "geena";
      return;
    }
    const biome = biomeAt(this.world.seed, this.body.x, this.body.z);
    if (biome !== this.lastBiome) {
      this.lastBiome = biome;
      const name = BIOME_NAME[biome];
      if (!this.discoveries.has(biome)) {
        this.discoveries.add(biome);
        this.cb.onMessage(`✦ Descoberta: ${name}`, "rare");
      } else this.cb.onMessage(name, "info");
    }
    if (this.role === "guest") return;
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
    this.hand.position.set(0.36 + Math.sin(this.bobT) * 0.014 * this.bobAmt, -0.3 - Math.sin(p * Math.PI) * 0.05 - Math.abs(Math.sin(this.bobT)) * 0.015 * this.bobAmt, -0.55 - Math.sin(p * Math.PI) * 0.1);
  }

  // ---------- ambiente sonoro e música ----------
  private ambience(dt: number): void {
    if (this.paused || !this.alive) return;
    this.ambT -= dt;
    if (this.ambT <= 0) {
      this.ambT = 5 + Math.random() * 9;
      const b = this.body;
      if (this.dimension === "geena") this.sfx.ambient(Math.random() < 0.6 ? "crackle" : "rumble");
      else {
        let covered = false;
        for (let y = Math.floor(b.y) + 3; y <= Math.floor(b.y) + 14 && !covered; y++) covered = !!BLOCKS[this.world.getBlock(Math.floor(b.x), y, Math.floor(b.z))]?.opaque;
        const night = Math.sin(this.time * Math.PI * 2) <= 0;
        if (covered) this.sfx.ambient(Math.random() < 0.7 ? "drip" : "rumble");
        else if (night) this.sfx.ambient("cricket");
        else this.sfx.ambient(this.lastBiome !== "deserto" && Math.random() < 0.6 ? "bird" : "wind");
      }
    }
    // harpa: frases curtas em escala pentatônica, mais lentas e graves à noite
    if (this.dimension !== "geena") {
      this.musT -= dt;
      if (this.musT <= 0) {
        const night = Math.sin(this.time * Math.PI * 2) <= 0;
        this.musT = (night ? 12 : 7) + Math.random() * 9;
        const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25];
        const n = 3 + Math.floor(Math.random() * 3);
        let idx = Math.floor(Math.random() * scale.length);
        for (let i = 0; i < n; i++) {
          idx = Math.max(0, Math.min(scale.length - 1, idx + Math.floor(Math.random() * 3) - 1));
          this.sfx.harp(scale[idx] * (night ? 0.5 : 1), i * 0.55, night ? 0.035 : 0.05);
        }
      }
    }
  }

  // ---------- HUD ----------
  private emitHud(dt: number, loading: boolean): void {
    this.hudT -= dt;
    if (this.hudT > 0) return;
    this.hudT = 0.12;
    const t = this.time;
    const sunH = Math.sin(t * Math.PI * 2);
    const phase = this.dimension === "geena" ? "Geena" : sunH > 0.5 ? "Dia" : sunH > 0 ? (t < 0.25 ? "Amanhecer" : "Entardecer") : "Noite";
    const boss = this.entities.bossNear(this.body.x, this.body.z);
    const held = this.heldDef();
    const slots = this.inventory.slots.slice(0, HOTBAR).map((s) => (s ? { ...s } : null));
    const state: HudState = {
      health: Math.ceil(this.health),
      hunger: Math.ceil(this.hunger),
      armor: this.inventory.armorDefense(),
      hotbar: slots,
      selected: this.inventory.selected,
      heldName: held?.name ?? null,
      heldColor: held ? RARITY_COLOR[held.rarity] : "#fff",
      time: t,
      phase,
      biome: this.dimension === "geena" ? "Geena — Vale de Hinom" : (BIOME_NAME[this.lastBiome as keyof typeof BIOME_NAME] ?? ""),
      target: this.targetName,
      mining: this.mineProgress,
      boss: boss ? { name: boss.def.name, hp: Math.max(0, boss.hp), max: boss.maxHp } : null,
      loading,
      alive: this.alive,
      hurt: this.hurtFlash,
      allies: this.entities.list.filter((e) => e.ally && !e.dead).map((e) => e.def.name),
      fadeText: this.sleepT <= 0 && this.portalT > 0 ? "🔥 Atravessando o portal…" : "💤 Dormindo…",
      fade: Math.max(this.sleepT > 0 ? Math.max(0, Math.min(1, 1 - Math.abs(this.sleepT - 1.4) / 1.4)) : 0, Math.min(0.85, this.portalT / 2.4)),
      offhand: this.inventory.offhand ? { ...this.inventory.offhand } : null,
      guarding: this.guarding,
      submerged: this.submerged,
      coop: this.role === "solo" ? null : { role: this.role, names: [this.me?.name ?? "Você", ...[...this.remotes.list.values()].map((p) => p.name)] },
      coords: !this.showCoords ? "" : `${Math.floor(this.body.x)}, ${Math.floor(this.body.y)}, ${Math.floor(this.body.z)}`,
    };
    // só avisa a interface quando algo visível mudou (evita redesenhar o HUD à toa)
    const sig = JSON.stringify({ ...state, time: Math.round(state.time * 100), mining: Math.round(state.mining * 10), hurt: Math.round(state.hurt * 10), fade: Math.round(state.fade * 20) });
    const nowT = this.playedSeconds;
    if (sig === this.lastSig && nowT - this.lastSigAt < 2) return;
    this.lastSig = sig;
    this.lastSigAt = nowT;
    this.cb.onHud(state);
  }
}

export { MOB_BY_ID };
