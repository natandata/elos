// Diretor do Modo História: conduz capítulos, missões, objetivos, cutscenes, diálogos, checkpoints e o marcador de objetivo.
// Fala com o jogo só pela interface `StoryHost` (assim o resto do MineArena não precisa saber da campanha).
import { B, BLOCKS } from "../blocks/blocks";
import type { Entity } from "../entities/manager";
import type { MobDef } from "../entities/definitions";
import type { BlockSnap, World } from "../world/world";
import { ACH_BY_ID } from "./data/achievements";
import { CHAPTER_BY_ID, NEXT_CHAPTER } from "./data/chapters";
import { CUTSCENES } from "./data/cutscenes";
import { DIALOGUES } from "./data/dialogues";
import { STORY_MOBS } from "./data/mobs";
import { MISSION_BY_ID, MISSIONS_OF } from "./data/missions";
import { ARK, ARK_INSIDE, arkBlocks, arkDoorCells, noahColumn } from "./maps/noah";
import { EDEN_SITES } from "./maps/eden";
import { STRUCTS } from "./maps/structs";
import { SEA } from "./maps/exodus";
import { loadProgress, saveProgress } from "./progress";
import { PUZZLES } from "./data/puzzles";
import { RELICS, relicBearing } from "./data/relics";
import type { ChapterDef, CutStep, Cutscene, MapEnv, Mission, Objective, StoryHud, StoryMapDef, StoryProgress, StorySession, StoryUi, Vec3, Zone } from "./types";

export interface StoryHost {
  world: World;
  playerPos(): { x: number; y: number; z: number; yaw: number };
  setPlayer(x: number, y: number, z: number, yaw?: number): void;
  invCount(item: string): number;
  invRemove(item: string, n: number): void;
  invGive(item: string, n: number): void;
  spawnMob(def: MobDef, x: number, z: number, y?: number): Entity;
  entities(): Entity[];
  removeEntity(e: Entity): void;
  camGet(): { pos: Vec3; look: Vec3 };
  shake(dur: number, power: number): void;
  setTime(t: number, lock: boolean): void;
  setWeather(w: "clear" | "rain" | "storm"): void;
  rainbow(on: boolean): void;
  /** céu extremamente estrelado (cena das estrelas de Abraão) */
  starry(on: boolean): void;
  burst(x: number, y: number, z: number, color: number, n: number, speed: number, size: number): void;
  message(text: string, tone: "info" | "good" | "warn" | "rare"): void;
  ui(u: StoryUi): void;
  music(track: string): void;
  sfx(kind: string): void;
  saveNow(): void;
  /** o capítulo terminou e a tela final foi dispensada */
  exitToMenu(): void;
  startChapter(id: string): void;
}

type Runner = { cut: Cutscene; i: number; wait: { kind: string; left: number } | null; skip: boolean; then: (() => void) | null };

const ARARAT_LIFT = 16;
const fmt = (n: number) => Math.round(n);
const dist2 = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
const inZone = (z: Zone, x: number, zz: number) => dist2(x, zz, z.x, z.z) <= z.r;

const FALL_MAP = new Map<number, number>([
  [B.grass, B.dry_grass],
  [B.leaves, B.dry_leaves],
  [B.fruit_leaves, B.dry_leaves],
  [B.life_leaves, B.dry_leaves],
  [B.flower_red, B.air],
  [B.flower_yellow, B.air],
  [B.flower_blue, B.air],
  [B.lily, B.air],
  [B.tallgrass, B.air],
]);

export class StoryDirector {
  session: StorySession;
  progress: StoryProgress;
  ui: StoryUi = { dialogue: null, caption: null, cinematic: false, bars: false, fade: 0, fadeText: "", learn: null, chapterEnd: null, finale: false, puzzle: null, relic: null, history: [] };
  readonly chapter: ChapterDef;
  /** câmera da cutscene (null = câmera normal do jogador) */
  cine: { pos: Vec3; look: Vec3 } | null = null;
  private tween: { from: { pos: Vec3; look: Vec3 }; to: { pos: Vec3; look: Vec3 }; t: number; dur: number } | null = null;
  private fadeTween: { from: number; to: number; t: number; dur: number } | null = null;
  private runner: Runner | null = null;
  private dlg: { lines: { who: string; text: string; ref?: string }[]; i: number; onEnd: () => void } | null = null;
  private npcs = new Map<string, Entity>();
  private paths = new Map<string, { x: number; z: number }[]>();
  private pathSpeed = new Map<string, number>();
  private shakeT = 0;
  private clock = 0;
  private emitT = 0;
  private dirty = true;
  private hudCache: StoryHud | null = null;
  private nearT = 0;
  private raceT = 0;
  private timer = 0;
  private flags = new Set<string>();
  private mission: Mission | null = null;
  private busyMission = false;
  // estados dos efeitos longos
  private floodLevel = 0;
  private floodTarget = 0;
  private arkLift = 0;
  private arkLiftTarget = 0;
  private arkBuildQueue: [number, number, number, number][] = [];
  private arkPlaced: [number, number, number, number][] = [];
  private doorClosed = false;
  private sealQueue: [number, number, number, number][] = [];
  private effects: { kind: string; at: Vec3; left: number; t: number }[] = [];

  constructor(
    private host: StoryHost,
    readonly map: StoryMapDef,
    session: StorySession,
  ) {
    this.session = session;
    this.progress = loadProgress();
    this.chapter = CHAPTER_BY_ID.get(session.chapterId)!;
    this.session.history ??= [];
    this.ui.history = this.session.history;
    for (const [k, v] of Object.entries(session.flags)) if (v) this.flags.add(k);
    this.floodLevel = session.env.flood;
  }

  /** Ambiente (para o gerador de mapa): fica em `session.env`. */
  get env(): MapEnv {
    return this.session.env;
  }

  // ------------------------------------------------------------------ ciclo
  /** Chamado quando o mundo já carregou: recria personagens e (re)começa a missão atual. */
  begin(fresh: boolean): void {
    this.host.setTime(this.map.time, true);
    this.host.music(this.session.env.fallen ? "fall" : this.map.bgm);
    if (this.session.env.fallen) this.host.setWeather("clear");
    if (this.session.flags.hunt) {
      // caça à relíquia: sem missões, só explorar o mapa e cavar
      if (this.chapter.id === "queda" && !this.session.env.fallen) {
        this.session.env.fallen = true;
        this.host.world.replaceIds(FALL_MAP);
      }
      if (fresh) {
        const sp0 = this.standSpot(this.map.spawn.x + 0.5, this.map.spawn.z + 0.5);
        if (sp0) this.host.setPlayer(sp0.x, sp0.y, sp0.z, this.map.spawn.yaw);
        this.host.message("Procure a relíquia escondida deste capítulo. As dicas ficam no botão 🔍.", "info");
      }
      this.mission = null;
      return;
    }
    if (!fresh) {
      for (const n of this.session.npcs) this.spawnNpc(n.id, n.mob, n.x, n.z, n.tag, false, n.y);
      if (this.session.flags.arkBuilt) {
        this.arkPlaced = arkBlocks().filter(([x, y, z]) => !arkDoorCells().some((c) => c[0] === x && c[1] === y && c[2] === z));
        this.arkLift = this.session.counters.arkLift ?? 0;
        this.arkLiftTarget = this.arkLift;
        this.doorClosed = (this.session.counters.doorClosed ?? 0) === 1;
        this.floodTarget = this.floodLevel;
      }
      if (this.session.finished) {
        this.finishChapter();
        return;
      }
      this.mission = MISSION_BY_ID.get(this.session.missionId) ?? null;
      if (this.mission) this.resumeMission(this.mission);
      return;
    }
    // começa no chão (e não em cima de uma árvore que cresceu no ponto de partida)
    const sp = this.standSpot(this.map.spawn.x + 0.5, this.map.spawn.z + 0.5);
    if (sp) this.host.setPlayer(sp.x, sp.y, sp.z, this.map.spawn.yaw);
    const first = MISSIONS_OF(this.session.chapterId)[0];
    this.mission = first;
    this.enterMission(first, true);
  }

  /** Paredes invisíveis: até onde o jogador e os personagens podem ir. */
  limits(player = true): { x0: number; x1: number; z0: number; z1: number } {
    const m = this.map;
    let x1 = m.w - 1.2;
    if (player && this.session.flags.sealed && (this.chapter.id === "queda" || this.chapter.id === "eden")) x1 = Math.min(x1, EDEN_SITES.gate.x - 1.5);
    return { x0: 1.2, x1, z0: 1.2, z1: m.d - 1.2 };
  }

  private stepBounds(): void {
    const L = this.limits(false);
    for (const e of this.npcs.values()) {
      const b = e.body;
      if (b.x < L.x0 + 1) b.x = L.x0 + 1;
      else if (b.x > L.x1 - 1) b.x = L.x1 - 1;
      if (b.z < L.z0 + 1) b.z = L.z0 + 1;
      else if (b.z > L.z1 - 1) b.z = L.z1 - 1;
    }
  }

  /** Carregou um jogo salvo no meio de uma missão: refaz (já no final) a cena que tinha sido interrompida. */
  private resumeMission(m: Mission): void {
    if (this.session.objIndex >= m.objectives.length) {
      // salvou durante a cena de conclusão: os objetivos já estavam cumpridos
      this.completeMission(m, true);
      return;
    }
    this.enterMission(m, false);
    if (m.onStart && !this.session.flags[`start:${m.id}`]) {
      this.busyMission = true;
      this.play(
        m.onStart,
        () => {
          this.busyMission = false;
          this.session.flags[`start:${m.id}`] = true;
          this.setCheckpoint();
          this.host.saveNow();
        },
        true,
      );
    }
  }

  update(dt: number): void {
    this.clock += dt;
    this.retryT += dt;
    if (this.retryT > 0.5 && this.deferred.length > 0) {
      this.retryT = 0;
      const list = this.deferred;
      this.deferred = [];
      for (const d of list) this.spawnNpc(d.id, d.mob, d.x, d.z, d.tag, false, d.y);
    }
    this.stepTweens(dt);
    this.stepRunner(dt);
    this.stepLongEffects(dt);
    this.stepPaths();
    this.stepEscort(dt);
    this.stepStuck(dt);
    this.stepBounds();
    this.stepStorm(dt);
    this.stepTime(dt);
    this.stepEffects(dt);
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (!this.runner && !this.dlg && !this.ui.learn && !this.ui.chapterEnd && !this.ui.finale && !this.ui.puzzle && !this.ui.relic && this.mission && !this.busyMission) this.checkObjective(dt);
    this.stepRelic(dt);
    this.emitT += dt;
    if (this.dirty && this.emitT > 0.04) {
      this.emitT = 0;
      this.dirty = false;
      this.host.ui({ ...this.ui, history: this.ui.history.slice(-40) });
    }
  }

  /** Cutscene ou diálogo ocupando a tela: o jogador não anda nem interage. */
  get blocking(): boolean {
    return !!this.runner || !!this.dlg || !!this.ui.learn || !!this.ui.chapterEnd || this.ui.finale || !!this.ui.puzzle || !!this.ui.relic;
  }

  get shake(): number {
    return this.shakeT;
  }

  private emit(): void {
    this.dirty = true;
  }

  // ------------------------------------------------------------------ missões
  private enterMission(m: Mission, fresh: boolean): void {
    this.mission = m;
    if (fresh) {
      this.session.missionId = m.id;
      this.session.objIndex = 0;
      this.session.progress = 0;
      for (const s of m.spawn ?? []) this.spawnNpc(s.id ?? this.uid(s.mob), s.mob, s.at.x, s.at.z, s.tag, true, s.y);
      for (const g of m.give ?? []) this.host.invGive(g.item, g.count);
      this.setCheckpoint();
      this.host.message(`Missão: ${m.title}`, "info");
      if (m.onStart) {
        this.busyMission = true;
        this.play(m.onStart, () => {
          this.busyMission = false;
          this.session.flags[`start:${m.id}`] = true;
          this.setCheckpoint();
          this.host.saveNow();
        });
      } else this.host.saveNow();
    }
    this.hudCache = null;
    this.emit();
  }

  private get obj(): Objective | null {
    return this.mission?.objectives[this.session.objIndex] ?? null;
  }

  private setCheckpoint(): void {
    const p = this.host.playerPos();
    if (!this.mission) return;
    this.session.checkpoint = { missionId: this.mission.id, objIndex: this.session.objIndex, x: p.x, y: p.y, z: p.z, yaw: p.yaw };
  }

  respawnPoint(): { x: number; y: number; z: number; yaw: number } | null {
    const c = this.session.checkpoint;
    return c ? { x: c.x, y: c.y, z: c.z, yaw: c.yaw } : null;
  }

  private completeObjective(): void {
    const m = this.mission;
    if (!m) return;
    const o = this.obj;
    if (o?.k === "collect" && o.consume) this.host.invRemove(o.item, o.count);
    this.session.objIndex++;
    this.session.progress = 0;
    this.session.counters = {};
    this.raceT = 0;
    this.hudCache = null;
    if (this.session.objIndex >= m.objectives.length) this.completeMission(m);
    else {
      this.setCheckpoint();
      this.host.message("Objetivo concluído!", "good");
    }
    this.emit();
  }

  private completeMission(m: Mission, replay = false): void {
    const first = !this.session.done.includes(m.id);
    if (first) {
      this.session.done.push(m.id);
      for (const r of m.reward ?? []) this.host.invGive(r.item, r.count);
      this.host.sfx("quest");
      this.host.message(`Missão concluída: ${m.title}`, "rare");
    }
    const next = m.next ? MISSION_BY_ID.get(m.next) : undefined;
    const go = () => {
      if (next) this.enterMission(next, true);
      else this.finishChapter();
    };
    this.mission = null;
    if (m.onComplete) {
      this.busyMission = true;
      this.play(
        m.onComplete,
        () => {
          this.busyMission = false;
          go();
        },
        replay,
      );
    } else go();
  }

  // ------------------------------------------------------------------ objetivos
  private checkObjective(dt: number): void {
    const o = this.obj;
    const m = this.mission;
    if (!o || !m) return;
    const p = this.host.playerPos();
    switch (o.k) {
      case "reach": {
        const z = this.map.zones[o.zone];
        if (z && inZone(z, p.x, p.z)) {
          this.completeObjective();
          break;
        }
        // corrida contra o tempo (Mar Vermelho): se acabar, o jogador volta ao começo e tenta de novo
        if (o.limit) {
          this.raceT += dt;
          if (this.raceT >= o.limit) {
            this.raceT = 0;
            this.hudCache = null;
            if (o.failScene) this.play(o.failScene, null);
          }
        }
        break;
      }
      case "collect": {
        const n = Math.min(o.count, this.host.invCount(o.item));
        if (n !== this.session.progress) {
          this.session.progress = n;
          this.hudCache = null;
        }
        if (n >= o.count) this.completeObjective();
        break;
      }
      case "harvest":
      case "place":
        if (this.session.progress >= o.count) this.completeObjective();
        break;
      case "near": {
        this.nearT += dt;
        if (this.nearT < 0.25) break;
        this.nearT = 0;
        for (const e of this.host.entities()) {
          if (e.story?.tag !== o.tag || e.dead) continue;
          const key = `near:${o.tag}:${e.story.id}`;
          if (this.flags.has(key)) continue;
          if (dist2(e.body.x, e.body.z, p.x, p.z) <= o.dist) {
            this.flags.add(key);
            this.session.flags[key] = true;
            this.session.progress++;
            this.host.sfx("pickup");
            this.hudCache = null;
          }
        }
        if (this.session.progress >= o.count) {
          for (const k of [...this.flags]) {
            if (!k.startsWith(`near:${o.tag}:`)) continue;
            this.flags.delete(k);
            delete this.session.flags[k];
          }
          this.completeObjective();
        }
        break;
      }
      case "lead":
        this.stepLead(o, p);
        break;
      case "wait":
        this.timer += dt;
        this.session.progress = Math.floor(this.timer);
        if (this.timer >= o.seconds) {
          this.timer = 0;
          this.completeObjective();
        }
        break;
      case "event":
        if (this.flags.has(`ev:${o.event}`)) {
          this.flags.delete(`ev:${o.event}`);
          this.completeObjective();
        }
        break;
      case "puzzle":
        if (!this.flags.has(`pz:${o.puzzle}`)) {
          this.flags.add(`pz:${o.puzzle}`);
          this.openPuzzle();
        }
        break;
      case "talk":
        break;
    }
  }

  /** Guiar animais em pares: perto do jogador o par começa a andar até a arca; conta o par quando os dois entram. */
  private stepLead(o: Extract<Objective, { k: "lead" }>, p: { x: number; z: number }): void {
    const zone = this.map.zones[o.to];
    const groups = new Map<string, Entity[]>();
    for (const e of this.host.entities()) if (e.story?.tag?.startsWith(`${o.tag}:`) && !e.dead) groups.set(e.story.tag, [...(groups.get(e.story.tag) ?? []), e]);
    let done = 0;
    for (const [tag, list] of groups) {
      const key = `led:${tag}`;
      const inside = list.every((e) => inZone(zone, e.body.x, e.body.z));
      if (inside) {
        done++;
        continue;
      }
      if (!this.flags.has(key) && list.some((e) => dist2(e.body.x, e.body.z, p.x, p.z) <= o.near)) {
        this.flags.add(key);
        this.session.flags[key] = true;
        this.host.sfx("pickup");
        const n = Number(tag.split(":")[1]) || 1;
        list.forEach((e, k) => this.sendTo(e, [{ x: 92 + k, z: 46 }, { x: 73.5 + k * 0.8, z: 46 }, { x: 73.5 + k * 0.8, z: 54 }, { x: 62 + (n - 1) * 4.2 + k * 1.1, z: 55 + k * 1.4 }]));
      }
    }
    if (done !== this.session.progress) {
      this.session.progress = done;
      this.hudCache = null;
      if (done > 0) this.host.message(`${done} de ${o.count} pares a bordo`, "good");
    }
    if (done >= o.count) this.completeObjective();
  }

  private sendTo(e: Entity, pts: { x: number; z: number }[], speed = 2.6): void {
    if (!e.story) return;
    this.paths.set(e.story.id, pts.slice(1));
    this.pathSpeed.set(e.story.id, speed);
    e.story.goto = { x: pts[0].x, z: pts[0].z, speed };
    e.story.arrived = false;
  }

  /** Altura do chão logo abaixo de `ref` (para não colocar quem está dentro da arca em cima do telhado). */
  private groundY(x: number, z: number, ref: number): number {
    const w = this.host.world;
    for (let y = Math.min(62, Math.floor(ref) + 3); y >= 0; y--) if (w.isSolid(Math.floor(x), y, Math.floor(z))) return y + 1.05;
    return ref;
  }

  /** Onde pousar de verdade: o chão sob as copas, longe de troncos (nunca em cima de uma árvore). */
  private standSpot(x: number, z: number): { x: number; y: number; z: number } | null {
    const w = this.host.world;
    const fx = Math.floor(x);
    const fz = Math.floor(z);
    if (w.surfaceY(fx, fz) < 0) return null;
    const ground = (bx: number, bz: number): number => {
      for (let y = 62; y >= 1; y--) {
        if (!w.isSolid(bx, y, bz)) continue;
        const key = BLOCKS[w.getBlock(bx, y, bz)]?.key ?? "";
        if (key.includes("leaves") || key.includes("log")) continue;
        if (w.isSolid(bx, y + 1, bz) || w.isSolid(bx, y + 2, bz)) return -1;
        if (BLOCKS[w.getBlock(bx, y + 1, bz)]?.liquid) return -1;
        return y + 1.05;
      }
      return -1;
    };
    for (let r = 0; r <= 7; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const y = ground(fx + dx, fz + dz);
          if (y > 0) return { x: fx + dx + 0.5, y, z: fz + dz + 0.5 };
        }
      }
    }
    return null;
  }

  private escortT = 0;

  /** O querubim acompanha Adão e Eva rumo ao portão: anda logo atrás deles e, se ficar para trás, reaparece junto (num clarão). */
  private stepEscort(dt: number): void {
    if (!this.session.flags.escort) return;
    this.escortT += dt;
    if (this.escortT < 0.4) return;
    this.escortT = 0;
    const a = this.npcs.get("anjo");
    const lead = this.npcs.get("adao");
    if (!a?.story || !lead) return;
    const yaw = lead.yaw;
    const tx = lead.body.x - Math.sin(yaw) * 2.8 + Math.cos(yaw) * 1.6;
    const tz = lead.body.z - Math.cos(yaw) * 2.8 - Math.sin(yaw) * 1.6;
    const d = Math.hypot(tx - a.body.x, tz - a.body.z);
    if (d > 10) {
      this.host.burst(a.body.x, a.body.y + 1.5, a.body.z, 0xfff2b0, 14, 3, 0.16);
      a.body.x = tx;
      a.body.z = tz;
      a.body.y = this.groundY(tx, tz, lead.body.y + 1);
      a.body.vy = 0;
      this.host.burst(tx, a.body.y + 1.5, tz, 0xfff2b0, 14, 3, 0.16);
      a.story.goto = null;
    } else if (d > 1.4) a.story.goto = { x: tx, z: tz, speed: Math.min(4.2, 2.4 + d * 0.5) };
    else a.story.goto = null;
  }

  private stuck = new Map<string, { x: number; z: number; t: number }>();

  /** Quem anda por roteiro mas não sai do lugar por 3 s (obstáculo no caminho) é levado ao destino. */
  private stepStuck(dt: number): void {
    for (const e of this.npcs.values()) {
      const st = e.story;
      if (!st?.goto) {
        this.stuck.delete(st?.id ?? "");
        continue;
      }
      const m = this.stuck.get(st.id) ?? { x: e.body.x, z: e.body.z, t: 0 };
      if (Math.hypot(e.body.x - m.x, e.body.z - m.z) > 0.4) {
        m.x = e.body.x;
        m.z = e.body.z;
        m.t = 0;
      } else m.t += dt;
      if (m.t > 3) {
        const g = st.goto;
        this.host.burst(e.body.x, e.body.y + 1, e.body.z, 0xfff2b0, 8, 2, 0.1);
        e.body.x = g.x;
        e.body.z = g.z;
        e.body.y = this.groundY(g.x, g.z, e.body.y);
        e.body.vy = 0;
        st.goto = null;
        st.arrived = true;
        m.t = 0;
      }
      this.stuck.set(st.id, m);
    }
  }

  private stepPaths(): void {
    for (const [id, pts] of this.paths) {
      const e = this.npcs.get(id);
      if (!e?.story) {
        this.paths.delete(id);
        continue;
      }
      if (e.story.arrived || !e.story.goto) {
        const next = pts.shift();
        if (!next) {
          this.paths.delete(id);
          if (e.story.tag?.startsWith("pair:") || e.story.tag === "crowd" || e.story.tag === "hebreu" || e.story.tag === "exercito") e.story.hold = true;
        } else {
          e.story.goto = { x: next.x, z: next.z, speed: this.pathSpeed.get(id) ?? 2.6 };
          e.story.arrived = false;
        }
      }
    }
  }

  // ------------------------------------------------------------------ eventos do jogo
  onTalk(npcId: string): boolean {
    if (this.blocking) return true;
    const o = this.obj;
    if (o?.k === "talk" && o.npc === npcId) {
      this.startDialogue(o.dialogue, () => this.completeObjective());
      return true;
    }
    const e = this.npcs.get(npcId);
    const line = this.idleLine(npcId);
    if (e && line) this.host.message(`${e.def.name}: ${line}`, "info");
    return true;
  }

  private idleLine(id: string): string | null {
    const lines: Record<string, string> = {
      adao: "Deus nos deu este jardim para cuidar.",
      eva: "Cada flor aqui parece uma promessa.",
      abel: "As ovelhas conhecem a minha voz.",
      caim: "A terra pede suor, mas dá fruto.",
      noe: "Tudo como o Senhor mandou.",
      construtor: "Mais tijolos! A torre não vai se levantar sozinha.",
      abraao: "O Senhor prometeu, e eu creio.",
      sara: "Nada é difícil demais para o Senhor.",
      lo: "Seguimos o tio Abrão para onde Deus mandar.",
      isaque: "Meu pai Abraão me ensinou a confiar em Deus.",
      jaco: "O Senhor tem sido fiel comigo.",
      esau: "Um bom caçador nunca volta de mãos vazias.",
      raquel: "As ovelhas de meu pai estão bem cuidadas.",
      jose: "O Senhor está comigo, onde quer que eu esteja.",
      potifar: "Esse jovem hebreu faz prosperar tudo o que toca.",
      fara: "Há quem interprete sonhos neste reino?",
      sem: "Meu pai confia em Deus. Eu também.",
    };
    return lines[id] ?? null;
  }

  /** Antes de quebrar um bloco: devolve false se a área é protegida pela história. */
  allowBreak(x: number, y: number, z: number, id: number): boolean {
    void y;
    if (this.blocking) return false;
    const key = BLOCKS[id]?.key ?? "";
    if (this.chapter.id === "eden" || this.chapter.id === "queda") {
      const near = (s: { x: number; z: number }) => dist2(x, z, s.x, s.z) < 8;
      if (near(EDEN_SITES.knowledge) || near(EDEN_SITES.life)) {
        this.host.message(key.includes("leaves") ? "Esta árvore é especial: o Senhor pediu que ninguém a toque." : "Este lugar é do Senhor. Deixe como está.", "warn");
        return false;
      }
      if (x >= EDEN_SITES.gate.x - 1 && x <= EDEN_SITES.gate.x + 2 && Math.abs(z - EDEN_SITES.gate.z) <= 6) return false;
    }
    return true;
  }

  onBlockBroken(x: number, y: number, z: number, id: number): void {
    void y;
    const o = this.obj;
    if (o?.k !== "harvest") return;
    const key = BLOCKS[id]?.key ?? "";
    if (!o.block.includes(key)) return;
    // a árvore do conhecimento nunca conta como colheita
    if (dist2(x, z, EDEN_SITES.knowledge.x, EDEN_SITES.knowledge.z) < 8) return;
    this.session.progress++;
    this.hudCache = null;
    this.host.sfx("pickup");
  }

  onBlockPlaced(x: number, y: number, z: number, id: number): void {
    void y;
    const o = this.obj;
    if (o?.k !== "place") return;
    const key = BLOCKS[id]?.key ?? "";
    if (!new RegExp(o.match ?? "planks|log").test(key)) return;
    const zone = this.map.zones[o.zone];
    if (zone && inZone(zone, x, z)) {
      this.session.progress++;
      this.hudCache = null;
    }
  }

  fireEvent(name: string): void {
    this.flags.add(`ev:${name}`);
  }

  // ------------------------------------------------------------------ personagens
  /** Id novo e estável (vai para o jogo salvo) para quem não tem id fixo. */
  private uid(mob: string): string {
    return `${mob}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private deferred: { id: string; mob: string; x: number; z: number; tag?: string; y?: number }[] = [];
  private retryT = 0;

  private spawnNpc(id: string, mob: string, x: number, z: number, tag: string | undefined, record: boolean, y?: number): Entity | null {
    const def = STORY_MOBS[mob];
    if (!def) return null;
    const dup = this.npcs.get(id);
    if (dup) {
      this.host.removeEntity(dup);
      this.npcs.delete(id);
    }
    if (record) {
      this.session.npcs = this.session.npcs.filter((n) => n.id !== id);
      this.session.npcs.push({ id, mob, x, z, tag, y });
    }
    if (this.host.world.surfaceY(Math.floor(x), Math.floor(z)) < 0) {
      // o chão ainda não carregou: tenta de novo em instantes
      this.deferred.push({ id, mob, x, z, tag, y });
      return null;
    }
    const e = this.host.spawnMob(def, x, z, y);
    e.story = { id, tag, goto: null, face: tag?.startsWith("pair") || tag === "animal" || tag === "sheep" || tag === "rebanho" ? null : "player", pose: null };
    this.npcs.set(id, e);
    const ai = this.map.zones.arkInside;
    if (ai && tag?.startsWith("pair:") && inZone(ai, x, z)) e.story.hold = true;
    return e;
  }

  private removeNpc(id: string): void {
    const e = this.npcs.get(id);
    if (e) {
      this.host.burst(e.body.x, e.body.y + 1, e.body.z, 0xfff2b0, 14, 3, 0.14);
      this.host.removeEntity(e);
    }
    this.npcs.delete(id);
    this.session.npcs = this.session.npcs.filter((n) => n.id !== id);
  }

  private outfit(id: string, mob: string): void {
    const old = this.npcs.get(id);
    const def = STORY_MOBS[mob];
    if (!old || !def) return;
    const { x, z } = old.body;
    const tag = old.story?.tag;
    this.host.removeEntity(old);
    this.npcs.delete(id);
    const e = this.spawnNpc(id, mob, x, z, tag, false);
    if (e) {
      e.body.y = old.body.y;
      const rec = this.session.npcs.find((n) => n.id === id);
      if (rec) rec.mob = mob;
    }
    this.host.burst(x, old.body.y + 1, z, 0xfff2b0, 12, 3, 0.12);
  }

  // ------------------------------------------------------------------ diálogo
  private startDialogue(id: string, onEnd: () => void): void {
    const d = DIALOGUES[id];
    if (!d) return onEnd();
    this.dlg = { lines: d.lines, i: 0, onEnd };
    this.showLine();
  }

  private showLine(): void {
    if (!this.dlg) return;
    const l = this.dlg.lines[this.dlg.i];
    this.logLine(l.who, l.text);
    this.ui.dialogue = { who: l.who, text: l.text, ref: l.ref, index: this.dlg.i, total: this.dlg.lines.length, canSkipAll: true };
    this.emit();
  }

  private logLine(who: string, text: string): void {
    const h = this.session.history;
    if (h[h.length - 1]?.text === text) return;
    h.push({ who, text });
    if (h.length > 80) h.shift();
    this.ui.history = h;
  }

  /** Toque/clique/Enter: avança a fala atual. */
  advance(): void {
    if (this.ui.learn || this.ui.chapterEnd) return;
    if (this.runner?.wait?.kind === "say") {
      this.runner.wait = null;
      this.ui.dialogue = null;
      this.emit();
      return;
    }
    if (this.dlg) {
      this.dlg.i++;
      if (this.dlg.i >= this.dlg.lines.length) {
        const end = this.dlg.onEnd;
        this.dlg = null;
        this.ui.dialogue = null;
        this.emit();
        end();
      } else this.showLine();
    }
  }

  skipDialogue(): void {
    if (this.runner) return this.skipCutscene();
    if (this.dlg) {
      const end = this.dlg.onEnd;
      for (const l of this.dlg.lines.slice(this.dlg.i)) this.logLine(l.who, l.text);
      this.dlg = null;
      this.ui.dialogue = null;
      this.emit();
      end();
    }
  }

  // ------------------------------------------------------------------ cutscenes
  private play(id: string, then: (() => void) | null, skip = false): void {
    const cut = CUTSCENES[id];
    if (!cut) return then?.();
    this.runner = { cut, i: 0, wait: null, skip, then };
    this.ui.cinematic = true;
    this.emit();
  }

  skipCutscene(): void {
    if (!this.runner) return;
    this.runner.skip = true;
    this.runner.wait = null;
    this.flushLong();
    this.ui.dialogue = null;
    this.ui.caption = null;
    this.tween = null;
    this.emit();
  }

  private endCutscene(): void {
    const r = this.runner;
    this.runner = null;
    this.ui.cinematic = false;
    this.ui.dialogue = null;
    this.ui.caption = null;
    this.ui.bars = false;
    this.cine = null;
    this.tween = null;
    this.storm = false;
    this.setFade(0, 0.6, "");
    this.hudCache = null;
    this.emit();
    r?.then?.();
  }

  private stepRunner(dt: number): void {
    const r = this.runner;
    if (!r) return;
    if (r.wait) {
      if (r.wait.kind === "say") return;
      if (r.wait.kind === "time") r.wait.left -= dt;
      else if (r.wait.kind === "cam") {
        if (!this.tween) r.wait = null;
      } else if (r.wait.kind === "fade") {
        if (!this.fadeTween) r.wait = null;
      } else if (r.wait.kind === "go") {
        r.wait.left -= dt;
        const pend = [...this.npcs.values()].filter((e) => e.story?.goto || this.paths.has(e.story?.id ?? ""));
        if (pend.length === 0) r.wait = null;
        else if (r.wait.left <= 0) {
          // demorou demais (obstáculo no caminho): coloca no destino
          for (const e of pend) {
            const pts = this.paths.get(e.story!.id);
            const g = pts && pts.length > 0 ? pts[pts.length - 1] : e.story!.goto!;
            this.paths.delete(e.story!.id);
            e.body.x = g.x;
            e.body.z = g.z;
            e.body.y = this.groundY(g.x, g.z, e.body.y);
            e.story!.goto = null;
            e.story!.arrived = true;
          }
          r.wait = null;
        }
      } else if (r.wait.kind === "long") {
        if (this.longDone()) r.wait = null;
      }
      if (r.wait && r.wait.kind === "time" && r.wait.left <= 0) r.wait = null;
      if (r.wait) return;
    }
    let guard = 0;
    while (this.runner === r && !r.wait && guard++ < 64) {
      if (r.i >= r.cut.steps.length) return this.endCutscene();
      this.exec(r.cut.steps[r.i++], r);
    }
  }

  private exec(s: CutStep, r: Runner): void {
    const skip = r.skip;
    switch (s.t) {
      case "bars":
        this.ui.bars = s.on;
        this.emit();
        break;
      case "fade":
        this.setFade(s.to, skip ? 0 : s.dur, s.text ?? "");
        if (!skip && s.dur > 0.05) r.wait = { kind: "fade", left: 0 };
        break;
      case "camAt":
        this.cine = { pos: { ...s.pos }, look: { ...s.look } };
        this.tween = null;
        break;
      case "cam": {
        const from = this.cine ?? this.host.camGet();
        if (skip) {
          this.cine = { pos: { ...s.to }, look: { ...s.look } };
          break;
        }
        this.cine = { pos: { ...from.pos }, look: { ...from.look } };
        this.tween = { from: { pos: { ...from.pos }, look: { ...from.look } }, to: { pos: { ...s.to }, look: { ...s.look } }, t: 0, dur: Math.max(0.05, s.dur) };
        if (s.wait !== false) r.wait = { kind: "cam", left: 0 };
        break;
      }
      case "say":
        this.logLine(s.who, s.text);
        if (!skip) {
          this.ui.dialogue = { who: s.who, text: s.text, ref: s.ref, index: 0, total: 1, canSkipAll: true };
          r.wait = { kind: "say", left: 0 };
          this.emit();
        }
        break;
      case "caption":
        if (!skip) {
          this.ui.caption = { text: s.text, sub: s.sub };
          r.wait = { kind: "time", left: s.dur };
          this.emit();
          // limpa a legenda quando a espera acabar
          const rr = r;
          const clear = () => {
            if (this.runner === rr && this.ui.caption?.text === s.text) {
              this.ui.caption = null;
              this.emit();
            }
          };
          window.setTimeout(clear, s.dur * 1000 + 30);
        }
        break;
      case "wait":
        if (!skip) r.wait = { kind: "time", left: s.dur };
        break;
      case "npcEnter": {
        const mob = s.mob ?? this.npcMobOf(s.npc);
        this.spawnNpc(s.npc, mob, s.at.x, s.at.z, undefined, true);
        break;
      }
      case "npcGo": {
        const e = this.npcs.get(s.npc);
        if (!e?.story) break;
        if (skip) {
          e.body.x = s.to.x;
          e.body.z = s.to.z;
          e.body.y = this.groundY(s.to.x, s.to.z, e.body.y);
          break;
        }
        {
          const pts = [...(s.via ?? []), s.to];
          const sp = s.speed ?? 2;
          e.story.goto = { x: pts[0].x, z: pts[0].z, speed: sp };
          e.story.arrived = false;
          if (pts.length > 1) {
            this.paths.set(s.npc, pts.slice(1));
            this.pathSpeed.set(s.npc, sp);
          }
        }
        if (s.wait) r.wait = { kind: "go", left: 26 };
        break;
      }
      case "npcExit":
        this.removeNpc(s.npc);
        break;
      case "npcFace": {
        const e = this.npcs.get(s.npc);
        if (!e?.story) break;
        if (typeof s.target === "string") {
          if (s.target === "player") e.story.face = "player";
          else {
            const t = this.npcs.get(s.target);
            if (t) e.story.face = { x: t.body.x, z: t.body.z };
          }
        } else e.story.face = s.target;
        break;
      }
      case "pose": {
        const e = this.npcs.get(s.npc);
        if (!e?.story) break;
        e.story.pose = s.pose;
        if (s.dur) window.setTimeout(() => e.story && (e.story.pose = null), s.dur * 1000);
        break;
      }
      case "effect":
        this.effects.push({ kind: s.kind, at: s.at, left: skip ? 0.2 : (s.dur ?? 2), t: 0 });
        break;
      case "env":
        if (s.time !== undefined) this.host.setTime(s.time, s.lock ?? true);
        if (s.weather) this.host.setWeather(s.weather);
        if (s.weather === "clear") this.storm = false;
        if (s.rainbow !== undefined) this.host.rainbow(s.rainbow);
        break;
      case "teleport": {
        if (s.target === "player") {
          // y negativo = pousar no chão (se o chão ainda não carregou, de uma altura segura)
          if (s.to.y < 0) {
            const sp = this.standSpot(s.to.x, s.to.z);
            this.host.setPlayer(sp ? sp.x : s.to.x, sp ? sp.y : 40, sp ? sp.z : s.to.z, s.yaw);
          } else this.host.setPlayer(s.to.x, s.to.y, s.to.z, s.yaw);
        }
        else {
          const e = this.npcs.get(s.target);
          if (e) {
            e.body.x = s.to.x;
            e.body.y = s.to.y;
            e.body.z = s.to.z;
          }
        }
        break;
      }
      case "music":
        this.host.music(s.track);
        break;
      case "sfx":
        this.host.sfx(s.kind);
        break;
      case "spawn":
        for (let k = 0; k < (s.count ?? 1); k++) this.spawnNpc(`${s.mob}_${s.at.x}_${s.at.z}_${k}`, s.mob, s.at.x + k, s.at.z, s.tag, true);
        break;
      case "call":
        this.call(s.fn, s.arg, !!s.wait, r);
        break;
      case "fire":
        this.fireEvent(s.event);
        break;
      case "shake":
        if (!skip) {
          this.shakeT = s.dur;
          this.host.shake(s.dur, s.power);
        }
        break;
    }
  }

  private npcMobOf(id: string): string {
    return id === "eva" ? "eva" : id;
  }

  private stepTweens(dt: number): void {
    const tw = this.tween;
    if (tw && this.cine) {
      tw.t = Math.min(tw.dur, tw.t + dt);
      const k = tw.t / tw.dur;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const lerp = (a: number, b: number) => a + (b - a) * e;
      this.cine.pos = { x: lerp(tw.from.pos.x, tw.to.pos.x), y: lerp(tw.from.pos.y, tw.to.pos.y), z: lerp(tw.from.pos.z, tw.to.pos.z) };
      this.cine.look = { x: lerp(tw.from.look.x, tw.to.look.x), y: lerp(tw.from.look.y, tw.to.look.y), z: lerp(tw.from.look.z, tw.to.look.z) };
      if (tw.t >= tw.dur) this.tween = null;
    }
    const ft = this.fadeTween;
    if (ft) {
      ft.t = Math.min(ft.dur, ft.t + dt);
      this.ui.fade = ft.dur <= 0 ? ft.to : ft.from + (ft.to - ft.from) * (ft.t / ft.dur);
      this.emit();
      if (ft.t >= ft.dur) {
        this.ui.fade = ft.to;
        this.fadeTween = null;
      }
    }
  }

  private setFade(to: number, dur: number, text: string): void {
    this.ui.fadeText = text;
    if (dur <= 0) {
      this.ui.fade = to;
      this.fadeTween = null;
    } else this.fadeTween = { from: this.ui.fade, to, t: 0, dur };
    this.emit();
  }

  // ------------------------------------------------------------------ efeitos visuais simples
  private stepEffects(dt: number): void {
    for (const f of this.effects) {
      f.left -= dt;
      f.t += dt;
      if (f.t > 0.12) {
        f.t = 0;
        const { x, y, z } = f.at;
        const rnd = () => (Math.random() - 0.5) * 3;
        if (f.kind === "fire") this.host.burst(x + rnd() * 0.4, y + Math.random() * 2, z + rnd() * 0.4, Math.random() < 0.5 ? 0xff7a1a : 0xffd45a, 4, 2.5, 0.16);
        else if (f.kind === "sparkle" || f.kind === "glow") this.host.burst(x + rnd(), y + Math.random() * 3, z + rnd(), 0xfff2b0, 3, 1.2, 0.1);
        else if (f.kind === "holy" || f.kind === "light") this.host.burst(x + rnd() * 0.5, y + Math.random() * 5, z + rnd() * 0.5, 0xfffbe0, 5, 1.6, 0.14);
        else if (f.kind === "smoke") this.host.burst(x + rnd(), y + Math.random() * 2, z + rnd(), 0x6a6a6a, 3, 1, 0.2);
        else if (f.kind === "dust") this.host.burst(x + rnd() * 2, y + Math.random(), z + rnd() * 2, 0x9a8a60, 4, 1.8, 0.15);
        else if (f.kind === "tears") this.host.burst(x + (Math.random() - 0.5) * 0.4, y + 1.6, z + (Math.random() - 0.5) * 0.4, 0x9fd8ff, 2, 0.5, 0.07);
        else if (f.kind === "hail") this.host.burst(x + (Math.random() - 0.5) * 18, y + 8 + Math.random() * 6, z + (Math.random() - 0.5) * 18, 0xeaf4ff, 4, 1.5, 0.12);
        else if (f.kind === "locust") this.host.burst(x + (Math.random() - 0.5) * 20, y + Math.random() * 8, z + (Math.random() - 0.5) * 20, 0x5a4a1a, 5, 3, 0.1);
        else if (f.kind === "frog") this.host.burst(x + (Math.random() - 0.5) * 14, y + Math.random() * 0.6, z + (Math.random() - 0.5) * 14, 0x4fae3a, 3, 2, 0.14);
        else if (f.kind === "lightning") this.host.burst(x, y + Math.random() * 6, z, 0xdfe8ff, 6, 4, 0.2);
      }
    }
    this.effects = this.effects.filter((f) => f.left > 0);
  }

  // ------------------------------------------------------------------ chamadas especiais
  private longBusy = 0;
  private structQueue: [number, number, number, number][] = [];
  private structWait = false;

  /** Pular a cena: termina na hora o que estava acontecendo aos poucos (arca, portão, dilúvio). */
  private flushLong(): void {
    for (const [x, y, z, id] of this.arkBuildQueue) {
      this.host.world.setBlock(x, y, z, id, true);
      this.arkPlaced.push([x, y, z, id]);
    }
    if (this.arkBuildQueue.length > 0) this.session.flags.arkBuilt = true;
    this.arkBuildQueue = [];
    for (const [x, y, z, id] of this.sealQueue) this.host.world.setBlock(x, y, z, id, true);
    this.sealQueue = [];
    for (const [x, y, z, id] of this.structQueue) this.host.world.setBlock(x, y, z, id, true);
    this.structQueue = [];
    this.structWait = false;
    if (this.timeTw) {
      this.host.setTime(((this.timeTw.to % 1) + 1) % 1, true);
      this.timeTw = null;
      this.timeWait = false;
    }
    if (this.floodLevel !== this.floodTarget || this.arkLift !== this.arkLiftTarget) {
      const to = this.floodTarget;
      if (to > this.floodLevel) {
        this.floodLevel = to;
        this.applyWater(to);
      } else {
        this.floodLevel = to;
        this.drainAbove(to);
      }
      this.session.env.flood = to;
      this.liftArkTo(this.arkLiftTarget);
    }
    if (this.floodLevel > 23) this.crowdDrown(99);
    if (this.vegSnap || this.waterSnap) this.creationFinish();
    this.longBusy = 0;
  }
  private longDone(): boolean {
    return this.longBusy === 0;
  }

  private call(fn: string, arg: number | string | undefined, wait: boolean, r: Runner): void {
    const skip = r.skip;
    switch (fn) {
      case "holdCamera":
        this.cine ??= this.host.camGet();
        break;
      case "releaseCamera":
        this.cine = null;
        this.tween = null;
        break;
      case "fall":
        this.doFall();
        break;
      case "sealGate":
        this.sealGate(skip);
        if (wait && !skip) {
          this.longBusy++;
          r.wait = { kind: "long", left: 0 };
        }
        break;
      case "arkBuild":
        this.arkBuild(skip);
        if (!skip) {
          this.longBusy++;
          r.wait = { kind: "long", left: 0 };
        }
        break;
      case "arkDoor":
        this.arkDoor(arg === "close");
        break;
      case "flood":
        this.setFlood(Number(arg), skip);
        if (wait && !skip) {
          this.longBusy++;
          r.wait = { kind: "long", left: 0 };
        }
        break;
      case "drain":
        this.session.flags.ararat = true;
        this.buildAraratMountain();
        this.setFlood(23, skip);
        this.arkLiftTarget = this.restLift;
        if (skip) this.liftArkTo(this.restLift);
        else {
          this.longBusy++;
          r.wait = { kind: "long", left: 0 };
        }
        break;
      case "starry":
        this.host.starry(arg === "on");
        break;
      case "rainbow":
        this.host.rainbow(arg === "on");
        break;
      case "outfit": {
        const [id, mob] = String(arg).split(":");
        this.outfit(id, mob);
        break;
      }
      case "removeNpc":
        this.removeNpc(String(arg));
        break;
      case "teleportInsideArk": {
        const y = ARK.y0 + 1 + this.arkLift + 0.05;
        this.host.setPlayer(74.5, y, 56.5, Math.PI);
        for (const id of ["noe", "sem"]) {
          const e = this.npcs.get(id);
          if (e) {
            e.body.x = id === "noe" ? 72 : 77;
            e.body.z = 56;
            e.body.y = y;
          }
        }
        break;
      }
      case "teleportOutsideArk": {
        const gy = this.host.world.surfaceY(73, 49);
        this.host.setPlayer(73.5, (gy >= 0 ? gy + 1 : ARK.y0 + 1) + 0.05, 49.6, 0);
        break;
      }
      case "build": {
        const list = STRUCTS[String(arg)]?.() ?? [];
        if (skip) for (const [x, y, z, id] of list) this.host.world.setBlock(x, y, z, id, true);
        else {
          this.structQueue = list;
          if (wait) {
            this.longBusy++;
            this.structWait = true;
            r.wait = { kind: "long", left: 0 };
          }
        }
        break;
      }
      case "storm":
        this.storm = arg === "on";
        this.stormT = 0.5;
        break;
      case "crowd":
        this.crowdOn(skip);
        break;
      case "perchSerpent": {
        const e = this.npcs.get("serpente");
        if (e?.story) {
          const x = 80.5;
          const z = 60.5;
          e.body.x = x;
          e.body.z = z;
          e.body.y = this.groundY(x, z, 40);
          e.body.vy = 0;
          e.story.hold = true;
          e.story.face = { x: 78, z: 64 };
        }
        break;
      }
      case "holdAngels":
        for (const id of ["anjo_a", "anjo_b", "anjo_c"]) {
          const e = this.npcs.get(id);
          if (e?.story) e.story.hold = true;
        }
        break;
      case "creation":
        this.creation(String(arg), skip, r);
        break;
      case "time": {
        const [to, dur] = String(arg).split(":").map(Number);
        if (skip) {
          this.host.setTime(((to % 1) + 1) % 1, true);
          this.timeTw = null;
          this.lastTime = to;
          break;
        }
        this.timeTw = { from: this.lastTime, to, t: 0, dur: Math.max(0.1, dur || 4) };
        this.lastTime = to;
        if (wait) {
          this.timeWait = true;
          this.longBusy++;
          r.wait = { kind: "long", left: 0 };
        }
        break;
      }
      case "exile": {
        // o jardim é retirado da terra: sem água, sem folhas, sem grama verde
        const ids = new Map<number, number>();
        for (const w of [B.water, B.water_1, B.water_2, B.water_3, B.water_4, B.water_5, B.water_6, B.water_7]) ids.set(w, B.air);
        for (const l of [B.dry_leaves, B.leaves, B.fruit_leaves, B.life_leaves, B.tallgrass]) ids.set(l, B.air);
        ids.set(B.dry_grass, B.sand);
        ids.set(B.grass, B.sand);
        this.host.world.replaceIds(ids);
        this.session.flags.exiled = true;
        this.host.setTime(0.52, true);
        this.host.setWeather("rain");
        this.host.music("fall");
        this.host.shake(1.4, 0.25);
        this.host.sfx("rumble");
        break;
      }
      case "chase":
        for (const e of this.npcs.values()) if (e.story?.tag === String(arg)) this.sendTo(e, [{ x: SEA.x0 + 1 + Math.random() * (SEA.x1 - SEA.x0 - 2), z: SEA.z0 }, { x: SEA.x0 + 1 + Math.random() * (SEA.x1 - SEA.x0 - 2), z: SEA.z1 - 6 }], 3.9);
        break;
      case "nile": {
        const ids = new Map<number, number>();
        const wat = [B.water, B.water_1, B.water_2, B.water_3, B.water_4, B.water_5, B.water_6, B.water_7];
        if (arg === "red") for (const w of wat) ids.set(w, B.red_water);
        else ids.set(B.red_water, B.water);
        this.host.world.replaceIds(ids);
        break;
      }
      case "march":
        for (const e of this.npcs.values()) if (e.story?.tag === String(arg)) this.sendTo(e, [{ x: SEA.cx - 12 + Math.random() * 24, z: SEA.shoreN - 12 + Math.random() * 6 }], 3.2);
        break;
      case "marchSea":
        for (const e of this.npcs.values()) if (e.story?.tag === String(arg)) this.sendTo(e, [{ x: SEA.x0 + 1 + Math.random() * (SEA.x1 - SEA.x0 - 2), z: SEA.z0 }, { x: SEA.x0 + 1 + Math.random() * (SEA.x1 - SEA.x0 - 2), z: SEA.z0 + 50 }], 3.6);
        break;
      case "crossSea":
        for (const e of this.npcs.values()) {
          if (e.story?.tag !== "hebreu" && e.story?.id !== "moises" && e.story?.id !== "arao") continue;
          const x = SEA.x0 + 1 + Math.random() * (SEA.x1 - SEA.x0 - 2);
          this.sendTo(e, [{ x, z: SEA.z0 - 3 }, { x, z: SEA.z1 + 3 }, { x: SEA.cx - 10 + Math.random() * 20, z: SEA.shoreS }], 4.8);
        }
        break;
      case "arriveSea":
        // quem ainda está no corredor chega à outra margem antes de o mar se fechar
        for (const e of this.npcs.values()) {
          if (e.story?.tag !== "hebreu" && e.story?.id !== "moises" && e.story?.id !== "arao") continue;
          const x = SEA.cx - 10 + Math.random() * 20;
          const z = SEA.shoreS + Math.random() * 6;
          this.paths.delete(e.story.id);
          e.body.x = x;
          e.body.z = z;
          e.body.y = this.groundY(x, z, 30);
          e.body.vy = 0;
          e.story.goto = null;
          e.story.arrived = true;
          e.story.hold = true;
        }
        break;
      case "fell":
        this.session.env.fell = true;
        break;
      case "priestsIn":
        // os sacerdotes entram no Jordão com a arca e ficam no meio do leito seco
        for (const e of this.npcs.values()) {
          if (e.story?.tag !== "sacerdote") continue;
          const x = 59 + Math.random() * 10;
          this.sendTo(e, [{ x, z: 66 }, { x, z: 86 }], 3);
        }
        break;
      case "crossJordan":
        for (const e of this.npcs.values()) {
          const t = e.story?.tag;
          if (t !== "hebreu" && t !== "sacerdote" && e.story?.id !== "josue") continue;
          const x = 50 + Math.random() * 28;
          this.sendTo(e, [{ x, z: 66 }, { x, z: 112 }], 3.4);
        }
        break;
      case "arriveJordan":
        // quem ainda está no leito chega à outra margem antes de a água voltar
        for (const e of this.npcs.values()) {
          const t = e.story?.tag;
          if (t !== "hebreu" && t !== "sacerdote" && e.story?.id !== "josue") continue;
          const x = 50 + Math.random() * 28;
          const z = 106 + Math.random() * 8;
          this.paths.delete(e.story!.id);
          e.body.x = x;
          e.body.z = z;
          e.body.y = this.groundY(x, z, 30);
          e.body.vy = 0;
          e.story!.goto = null;
          e.story!.arrived = true;
          e.story!.hold = true;
        }
        break;
      case "removeTag":
        for (const [id, e] of [...this.npcs.entries()]) {
          if (e.story?.tag !== String(arg)) continue;
          this.host.burst(e.body.x, e.body.y + 0.5, e.body.z, 0x7fb6ff, 10, 3, 0.2);
          this.removeNpc(id);
        }
        this.host.sfx("splash");
        break;
      case "escort":
        this.session.flags.escort = String(arg) === "on";
        if (!this.session.flags.escort) {
          const a = this.npcs.get("anjo");
          if (a?.story) a.story.goto = null;
        }
        break;
      case "ensureNpc": {
        // "id:mob:x:z" — cria o personagem só se ele ainda não existir (jogos salvos no meio da cena)
        const [id, mob, x, z] = String(arg).split(":");
        if (!this.npcs.has(id)) this.spawnNpc(id, mob, Number(x), Number(z), undefined, true);
        break;
      }
      case "angelStay": {
        const e = this.npcs.get("anjo");
        if (e?.story) e.story.hold = true;
        break;
      }
    }
  }

  private doFall(): void {
    this.session.env.fallen = true;
    this.host.world.replaceIds(FALL_MAP);
    this.outfit("adao", "adao_folhas");
    this.outfit("eva", "eva_folhas");
    this.host.setTime(0.2, true);
    this.host.music("fall");
    this.host.sfx("rumble");
    this.host.shake(1.2, 0.2);
    this.session.flags.fallen = true;
    this.hudCache = null;
  }

  private sealGate(skip: boolean): void {
    const gx = EDEN_SITES.gate.x;
    const gz = EDEN_SITES.gate.z;
    const cells: [number, number, number, number][] = [];
    for (let y = 25; y <= 32; y++) for (let z = gz - 4; z <= gz + 4; z++) for (const x of [gx, gx + 1]) cells.push([x, y, z, y === 32 ? B.gold_block : B.limestone]);
    if (skip) for (const [x, y, z, id] of cells) this.host.world.setBlock(x, y, z, id, true);
    else this.sealQueue = cells;
    this.session.flags.sealed = true;
  }

  private arkDoor(close: boolean): void {
    this.doorClosed = close;
    for (const [x, y, z] of arkDoorCells()) this.host.world.setBlock(x, y + this.arkLift, z, close ? B.planks : B.air, true);
    this.host.sfx("door");
  }

  private arkBuild(skip: boolean): void {
    const list = arkBlocks().filter(([x, y, z]) => !arkDoorCells().some((c) => c[0] === x && c[1] === y && c[2] === z));
    // do casco para cima: ordena por altura
    list.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    if (skip) {
      for (const [x, y, z, id] of list) this.host.world.setBlock(x, y, z, id, true);
      this.arkPlaced = list;
      this.session.flags.arkBuilt = true;
      return;
    }
    this.arkBuildQueue = list;
    this.arkPlaced = [];
  }

  private setFlood(level: number, skip: boolean): void {
    if (this.floodLevel > 0 && this.floodLevel < 23) this.floodLevel = 23;
    if (this.floodLevel === 0 && level > 23) this.floodLevel = 23;
    this.floodTarget = level;
    this.arkLiftTarget = Math.max(this.restLift, level - 25);
    if (skip) {
      const down = level < this.floodLevel;
      if (level > 23) this.crowdDrown(99);
      this.floodLevel = level;
      this.session.env.flood = level;
      if (down) this.drainAbove(level);
      else this.applyWater(level);
      this.liftArkTo(this.arkLiftTarget);
    }
  }

  private applyWater(level: number): void {
    const lift = this.arkLift;
    const keep = (x: number, y: number, z: number) => x >= ARK_INSIDE.x0 && x <= ARK_INSIDE.x1 && z >= ARK_INSIDE.z0 && z <= ARK_INSIDE.z1 && y >= ARK_INSIDE.y0 + lift && y <= ARK_INSIDE.y1 + lift + 4;
    this.host.world.fillWater(level, keep);
  }

  private liftArkTo(n: number): void {
    while (this.arkLift < n) this.shiftArk(1);
    while (this.arkLift > n) this.shiftArk(-1);
  }

  /** Move a arca inteira 1 bloco (e quem está dentro). Usa a lista dos blocos já colocados. */
  private shiftArk(dy: number): void {
    const w = this.host.world;
    const doorCells = this.doorClosed ? arkDoorCells().map(([x, y, z]) => [x, y, z, B.planks] as [number, number, number, number]) : [];
    const blocks = [...this.arkPlaced, ...doorCells];
    const lift = this.arkLift;
    for (const [x, y, z] of blocks) w.setBlock(x, y + lift, z, B.air, true);
    // o que ficou para trás volta a ser água se estiver abaixo da superfície
    this.arkLift += dy;
    for (const [x, y, z, id] of blocks) w.setBlock(x, y + this.arkLift, z, id, true);
    const p = this.host.playerPos();
    const inside = (x: number, y: number, z: number) => x >= ARK.x0 && x <= ARK.x1 && z >= ARK.z0 && z <= ARK.z1 && y >= ARK.y0 + lift && y <= ARK.y0 + lift + 12;
    if (inside(p.x, p.y, p.z)) this.host.setPlayer(p.x, p.y + dy, p.z, p.yaw);
    for (const e of this.npcs.values()) if (inside(e.body.x, e.body.y, e.body.z)) e.body.y += dy;
  }

  // ---- a criação (Gênesis 1): vegetação some e brota, a água do começo baixa, o dia passa
  private vegSnap: BlockSnap | null = null;
  private waterSnap: BlockSnap | null = null;
  private growing = false;
  private growY = 0;
  private growT = 0;
  private timeTw: { from: number; to: number; t: number; dur: number } | null = null;
  private timeWait = false;
  private lastTime = 0.14;

  private creation(op: string, skip: boolean, r: Runner): void {
    const w = this.host.world;
    if (skip) return;
    if (op === "begin") {
      const veg = new Set<number>([B.leaves, B.fruit_leaves, B.life_leaves, B.dry_leaves, B.log, B.tallgrass, B.flower_red, B.flower_yellow, B.flower_blue, B.lily]);
      const water = new Set<number>([B.water, B.water_1, B.water_2, B.water_3, B.water_4, B.water_5, B.water_6, B.water_7]);
      this.vegSnap = w.snapshot((id) => veg.has(id), true);
      this.waterSnap = w.snapshot((id, y) => water.has(id) && y > 23, false);
      w.fillWater(41, () => false);
      this.floodLevel = 41;
      this.floodTarget = 41;
      this.session.env.flood = 41;
      this.host.setTime(0.75, true);
      this.lastTime = 0.75;
      this.host.setWeather("clear");
    } else if (op === "drain") {
      this.setFlood(23, false);
      this.longBusy++;
      r.wait = { kind: "long", left: 0 };
    } else if (op === "waters") {
      this.creationWaters();
    } else if (op === "grow") {
      if (!this.vegSnap) return;
      this.growing = true;
      this.growY = 22;
      this.growT = 0;
      this.longBusy++;
      r.wait = { kind: "long", left: 0 };
    }
  }

  private creationWaters(): void {
    if (this.waterSnap) {
      this.host.world.restoreUpTo(this.waterSnap, 99);
      this.waterSnap = null;
    }
    this.floodLevel = 0;
    this.floodTarget = 0;
    this.session.env.flood = 0;
  }

  /** Fecha o que a criação deixou em andamento (ao pular a cena): tudo volta ao lugar. */
  private creationFinish(): void {
    if (this.vegSnap) {
      this.host.world.restoreUpTo(this.vegSnap, 99);
      this.vegSnap = null;
    }
    this.growing = false;
    if (this.waterSnap || this.session.env.flood > 0) {
      const gone = new Map<number, number>();
      for (const i of [B.water, B.water_1, B.water_2, B.water_3, B.water_4, B.water_5, B.water_6, B.water_7]) gone.set(i, B.air);
      this.host.world.drainAbove(23, gone);
      this.creationWaters();
    }
  }

  private stepTime(dt: number): void {
    const tw = this.timeTw;
    if (!tw) return;
    tw.t = Math.min(tw.dur, tw.t + dt);
    const k = tw.t / tw.dur;
    const val = tw.from + (tw.to - tw.from) * k;
    this.host.setTime(((val % 1) + 1) % 1, true);
    if (tw.t >= tw.dur) {
      this.timeTw = null;
      if (this.timeWait) {
        this.timeWait = false;
        this.longBusy = Math.max(0, this.longBusy - 1);
      }
    }
  }

  // ---- tempestade, multidão e o monte Ararate (Noé)
  private storm = false;
  private stormT = 0;
  private crowd: string[] = [];

  private get restLift(): number {
    return this.session.flags.ararat ? ARARAT_LIFT : 0;
  }

  /** A arca repousa no cume de um monte: ele surge sob o casco enquanto a água baixa. */
  private buildAraratMountain(): void {
    const w = this.host.world;
    const top = ARK.y0 + ARARAT_LIFT - 1;
    const P = 2;
    for (let x = ARK.x0 - 16; x <= ARK.x1 + 16; x++) {
      for (let z = ARK.z0 - 16; z <= ARK.z1 + 16; z++) {
        const dx = Math.max(ARK.x0 - x, 0, x - ARK.x1);
        const dz = Math.max(ARK.z0 - z, 0, z - ARK.z1);
        const d = Math.hypot(dx, dz);
        const s = d <= P ? top : Math.round(top - (d - P) * 1.4);
        const g = noahColumn(x, z).h;
        if (s <= g) continue;
        for (let y = g + 1; y <= s; y++) w.setBlock(x, y, z, y === s ? (s >= top - 4 ? B.snow : B.stone) : B.stone, true);
        for (let y = s + 1; y <= s + 10; y++) {
          const id = w.getBlock(x, y, z);
          if (id !== B.air && !(BLOCKS[id]?.key ?? "").startsWith("water")) w.setBlock(x, y, z, B.air, true);
        }
      }
    }
  }

  private crowdOn(skip: boolean): void {
    const mobs = ["povo_a", "povo_b", "povo_c", "povo_d"];
    for (let i = 0; i < 44; i++) {
      const id = `povo_${i}`;
      const x = 60 + Math.random() * 28;
      const z = 26 + Math.random() * 12;
      const e = this.spawnNpc(id, mobs[i % 4], x, z, "crowd", false);
      if (!e?.story) continue;
      this.crowd.push(id);
      e.story.face = { x: 73.5, z: ARK.z0 };
      if (!skip) {
        const tx = 66 + Math.random() * 15;
        const tz = 44 + Math.random() * 4;
        e.story.goto = { x: tx, z: tz, speed: 3.2 + Math.random() * 1.2 };
        e.story.arrived = false;
        this.paths.set(id, []);
      }
    }
  }

  /** Conforme a água sobe, a multidão do lado de fora é levada. */
  private crowdDrown(level: number): void {
    if (this.crowd.length === 0) return;
    const n = level >= 35 ? this.crowd.length : level < 25 ? 0 : Math.ceil(this.crowd.length / Math.max(1, 35 - level));
    for (let i = 0; i < n && this.crowd.length > 0; i++) {
      const id = this.crowd.shift()!;
      const e = this.npcs.get(id);
      if (e) this.host.burst(e.body.x, e.body.y + 0.5, e.body.z, 0x7fb6ff, 14, 3.5, 0.2);
      this.removeNpc(id);
    }
    if (n > 0) this.host.sfx("splash");
  }

  private stepStorm(dt: number): void {
    if (!this.storm) return;
    this.stormT -= dt;
    if (this.stormT > 0) return;
    this.stormT = 2 + Math.random() * 4;
    const p = this.host.playerPos();
    const x = p.x + (Math.random() - 0.5) * 70;
    const z = p.z + (Math.random() - 0.5) * 70;
    for (let y = 24; y < 70; y += 3) this.host.burst(x + (Math.random() - 0.5), y, z, 0xeaf0ff, 6, 5, 0.3);
    this.host.setTime(0.5, true);
    window.setTimeout(() => this.storm && this.host.setTime(0.3, true), 110);
    window.setTimeout(() => this.storm && this.host.setTime(0.5, true), 200);
    window.setTimeout(() => this.storm && this.host.setTime(0.3, true), 280);
    window.setTimeout(() => this.host.sfx("thunder"), 250 + Math.random() * 500);
    this.host.shake(0.5, 0.15);
  }

  private flTimer = 0;
  private stepLongEffects(dt: number): void {
    // construção da arca
    if (this.arkBuildQueue.length > 0) {
      const n = Math.max(6, Math.ceil(this.arkBuildQueue.length / 110));
      for (let i = 0; i < n && this.arkBuildQueue.length > 0; i++) {
        const b = this.arkBuildQueue.shift()!;
        this.host.world.setBlock(b[0], b[1], b[2], b[3], true);
        this.arkPlaced.push(b);
        if (i === 0 && Math.random() < 0.25) this.host.sfx("place");
      }
      if (this.arkBuildQueue.length === 0) {
        this.session.flags.arkBuilt = true;
        this.longBusy = Math.max(0, this.longBusy - 1);
      }
    }
    // a vegetação brota de baixo para cima (criação)
    if (this.growing && this.vegSnap) {
      this.growT += dt;
      if (this.growT >= 0.1) {
        this.growT = 0;
        this.growY++;
        this.host.world.restoreUpTo(this.vegSnap, this.growY);
        if (this.growY >= 70) {
          this.vegSnap = null;
          this.growing = false;
          this.longBusy = Math.max(0, this.longBusy - 1);
        }
      }
    }
    // construções de cena (torre de Babel, escada de Jacó...)
    if (this.structQueue.length > 0) {
      const n = Math.max(8, Math.ceil(this.structQueue.length / 150));
      for (let i = 0; i < n && this.structQueue.length > 0; i++) {
        const b = this.structQueue.shift()!;
        this.host.world.setBlock(b[0], b[1], b[2], b[3], true);
      }
      if (this.structQueue.length === 0 && this.structWait) {
        this.structWait = false;
        this.longBusy = Math.max(0, this.longBusy - 1);
      }
    }
    // portão que se fecha
    if (this.sealQueue.length > 0) {
      const n = Math.max(3, Math.ceil(this.sealQueue.length / 40));
      for (let i = 0; i < n && this.sealQueue.length > 0; i++) {
        const b = this.sealQueue.shift()!;
        this.host.world.setBlock(b[0], b[1], b[2], b[3], true);
      }
    }
    // água subindo/descendo, e a arca subindo junto
    if (this.floodLevel !== this.floodTarget || this.arkLift !== this.arkLiftTarget) {
      this.flTimer += dt;
      if (this.flTimer >= 0.4) {
        this.flTimer = 0;
        if (this.floodLevel < this.floodTarget) {
          this.floodLevel++;
          this.applyWater(this.floodLevel);
          this.crowdDrown(this.floodLevel);
        } else if (this.floodLevel > this.floodTarget) {
          this.floodLevel--;
          this.drainAbove(this.floodLevel);
        }
        this.session.env.flood = this.floodLevel;
        if (this.arkLift < this.arkLiftTarget) this.shiftArk(1);
        else if (this.arkLift > this.arkLiftTarget) this.shiftArk(-1);
        if (this.floodLevel === this.floodTarget && this.arkLift === this.arkLiftTarget) this.longBusy = Math.max(0, this.longBusy - 1);
      }
    }
  }

  private drainAbove(level: number): void {
    const ids = new Map<number, number>();
    for (const k of ["water", "water_1", "water_2", "water_3", "water_4", "water_5", "water_6", "water_7"] as const) ids.set(B[k], B.air);
    this.host.world.drainAbove(level, ids);
  }

  // ------------------------------------------------------------------ fim de capítulo
  private finishChapter(): void {
    this.session.finished = true;
    const ch = this.chapter;
    const pr = this.progress;
    if (!pr.completed.includes(ch.id)) pr.completed.push(ch.id);
    const newBooks: string[] = [];
    for (const b of ch.unlocksBooks) {
      if (pr.books.includes(b)) continue;
      pr.books.push(b);
      newBooks.push(b);
    }
    let ach: string | undefined;
    if (ch.achievement && !pr.achievements.includes(ch.achievement)) {
      pr.achievements.push(ch.achievement);
      ach = ch.achievement;
    }
    pr.current = null;
    saveProgress(pr);
    this.host.saveNow();
    this.host.music("learn");
    this.ui.chapterEnd = null;
    this.ui.learn = ch.learn ?? null;
    this.session.flags.chapterDone = true;
    this.pendingEnd = { chapter: ch.id, title: ch.title, unlockedBooks: newBooks, achievement: ach, puzzle: pr.puzzles.includes(ch.id), relic: RELICS[ch.id] ? (pr.relics.includes(ch.id) ? "found" : "missing") : "none" };
    if (!ch.learn) this.dismissLearn();
    this.emit();
  }

  private pendingEnd: StoryUi["chapterEnd"] = null;

  /** Botão CONTINUAR da tela "Você aprendeu". */
  dismissLearn(): void {
    this.ui.learn = null;
    this.ui.chapterEnd = this.pendingEnd;
    this.emit();
  }

  /** Botão da tela de fim de capítulo: próximo capítulo ou volta ao menu. */
  continueAfterChapter(): void {
    const next = NEXT_CHAPTER(this.chapter.id);
    this.ui.chapterEnd = null;
    this.emit();
    if (next?.built) this.host.startChapter(next.id);
    else this.host.exitToMenu();
  }

  achievementName(id: string): string {
    return ACH_BY_ID.get(id)?.name ?? id;
  }

  // ------------------------------------------------------------------ HUD / marcador
  /** Texto e marcador do objetivo atual (a posição na tela é calculada pelo jogo). */
  // ------------------------------------------------------------------ desafios e relíquias
  openPuzzle(): void {
    const o = this.obj;
    if (o?.k !== "puzzle") return;
    const def = PUZZLES[o.puzzle];
    if (!def) return;
    this.ui.puzzle = def;
    this.emit();
  }

  /** O jogador acertou o desafio. */
  puzzleSolved(): void {
    const o = this.obj;
    this.ui.puzzle = null;
    if (o?.k !== "puzzle") return this.emit();
    if (!this.progress.puzzles.includes(this.chapter.id)) this.progress.puzzles.push(this.chapter.id);
    saveProgress(this.progress);
    this.session.flags.pzDone = true;
    this.host.sfx("quest");
    this.host.message("Desafio resolvido!", "rare");
    this.completeObjective();
  }

  /** O jogador desistiu do desafio (depois de muitas tentativas): segue a história sem a marca de desafio resolvido. */
  puzzleSkip(): void {
    this.ui.puzzle = null;
    if (this.obj?.k === "puzzle") {
      this.session.flags.pzSkip = true;
      this.completeObjective();
    } else this.emit();
  }

  puzzleClose(): void {
    this.ui.puzzle = null;
    this.emit();
  }

  /** Dicas liberadas pelo tempo jogado no capítulo. */
  help(): { has: boolean; found: boolean; hunt: boolean; hints: string[]; nextIn: number | null; puzzle: "none" | "pending" | "solved" | "skipped" } {
    const r = RELICS[this.chapter.id];
    const hunt = !!this.session.flags.hunt;
    const t = this.session.playT ?? 0;
    const unlock = hunt ? [0, 45, 90] : [0, 180, 360];
    const zone = r ? this.map.zones[r.near.zone] : undefined;
    const all = r ? [r.hints[0], r.hints[1], zone ? relicBearing(r, zone) : "Procure no mapa, com atenção ao brilho no chão."] : [];
    const hints = all.filter((_, i) => t >= unlock[i]);
    const next = unlock.find((u) => t < u);
    const hasPz = !!PUZZLES[this.chapter.id];
    const puzzle = !hasPz ? "none" : this.progress.puzzles.includes(this.chapter.id) || this.session.flags.pzDone ? "solved" : this.session.flags.pzSkip ? "skipped" : "pending";
    return { has: !!r, found: !!this.session.relic || this.progress.relics.includes(this.chapter.id), hunt, hints, nextIn: next === undefined ? null : Math.ceil(next - t), puzzle };
  }

  dismissRelic(): void {
    const hunt = this.ui.relic?.hunt;
    this.ui.relic = null;
    this.emit();
    if (hunt) this.host.exitToMenu();
  }

  private relicT = 0;
  private relicCell(): { x: number; y: number; z: number } | null {
    if (this.session.relicCell) return this.session.relicCell;
    const r = RELICS[this.chapter.id];
    if (!r) return null;
    if (!this.host.world.hasChunkAt(r.x, r.z)) return null;
    const sy = this.host.world.surfaceY(r.x, r.z);
    if (sy < 0) return null;
    this.session.relicCell = { x: r.x, y: sy - 1, z: r.z };
    return this.session.relicCell;
  }

  /** Tempo de jogo (libera dicas), brilho no chão e coleta da relíquia (só depois de cavar a tampa). */
  private stepRelic(dt: number): void {
    const r = RELICS[this.chapter.id];
    if (!r || this.session.relic) return;
    if (!this.blocking && !this.busyMission) this.session.playT = (this.session.playT ?? 0) + dt;
    this.relicT -= dt;
    if (this.relicT > 0 || this.ui.cinematic) return;
    this.relicT = 0.5;
    const p = this.host.playerPos();
    const d = Math.hypot(p.x - (r.x + 0.5), p.z - (r.z + 0.5));
    if (d > 60) return;
    const cell = this.relicCell();
    if (!cell) return;
    const open = !this.host.world.isSolid(cell.x, cell.y + 1, cell.z);
    if (d < 20 && !open) this.host.burst(cell.x + 0.5, cell.y + 2.4, cell.z + 0.5, 0xfff2b0, 3, 0.7, 0.1);
    if (open && Math.hypot(p.x - (cell.x + 0.5), p.z - (cell.z + 0.5)) < 1.7 && Math.abs(p.y - (cell.y + 0.5)) < 2.6) this.collectRelic();
  }

  private collectRelic(): void {
    const r = RELICS[this.chapter.id];
    if (!r || this.session.relic) return;
    this.session.relic = true;
    if (!this.progress.relics.includes(this.chapter.id)) this.progress.relics.push(this.chapter.id);
    saveProgress(this.progress);
    this.host.sfx("quest");
    this.ui.relic = { name: r.name, emoji: r.emoji, desc: r.desc, hunt: !!this.session.flags.hunt };
    this.emit();
    this.host.saveNow();
  }

  hud(): { hud: StoryHud | null; target: Vec3 | null } {
    const o = this.obj;
    const m = this.mission;
    if (this.session.flags.hunt && !this.ui.cinematic) {
      return { hud: { chapter: this.chapter.title, mission: "Relíquia escondida", objective: "Procure a relíquia deste capítulo. Abra as dicas (🔍) e cave onde o chão brilhar de leve.", progress: null, ref: null, dist: null, puzzle: false, wp: null }, target: null };
    }
    if (!o || !m || this.ui.cinematic) return { hud: null, target: null };
    const p = this.host.playerPos();
    const target = this.targetOf(o, p);
    const dist = target ? Math.round(Math.hypot(target.x - p.x, target.z - p.z)) : null;
    let progress: string | null = null;
    if (o.k === "collect" || o.k === "harvest" || o.k === "place" || o.k === "near" || o.k === "lead") progress = `${Math.min(this.session.progress, o.count)} / ${o.count}`;
    if (o.k === "wait") progress = `${this.session.progress} / ${o.seconds}s`;
    if (o.k === "reach" && o.limit) progress = `⏱ ${Math.max(0, Math.ceil(o.limit - this.raceT))} s`;
    const hud: StoryHud = { chapter: this.chapter.title, mission: m.title, objective: o.text, progress, ref: m.ref ?? null, dist, puzzle: o.k === "puzzle", wp: null };
    return { hud, target };
  }

  private targetOf(o: Objective, p: { x: number; z: number }): Vec3 | null {
    const zc = (id?: string) => {
      const z = id ? this.map.zones[id] : undefined;
      return z ? { x: z.x, y: this.host.world.surfaceY(z.x, z.z) + 2, z: z.z } : null;
    };
    switch (o.k) {
      case "reach":
        return zc(o.zone);
      case "talk": {
        const e = this.npcs.get(o.npc);
        return e ? { x: e.body.x, y: e.body.y + 2.4, z: e.body.z } : null;
      }
      case "collect":
      case "harvest":
        return zc(o.at);
      case "place":
        return zc(o.zone);
      case "near":
      case "lead": {
        let best: Entity | null = null;
        let bd = Infinity;
        for (const e of this.npcs.values()) {
          if (!e.story?.tag?.startsWith(o.tag)) continue;
          if (o.k === "near" && this.flags.has(`near:${o.tag}:${e.story.id}`)) continue;
          if (o.k === "lead" && this.map.zones[o.to] && inZone(this.map.zones[o.to], e.body.x, e.body.z)) continue;
          const d = dist2(e.body.x, e.body.z, p.x, p.z);
          if (d < bd) {
            best = e;
            bd = d;
          }
        }
        return best ? { x: best.body.x, y: best.body.y + 2, z: best.body.z } : null;
      }
      case "event":
        return o.target?.zone ? zc(o.target.zone) : null;
      default:
        return null;
    }
  }

  export(): StorySession {
    // posições atuais dos personagens
    this.session.npcs = this.session.npcs.map((n) => {
      const e = this.npcs.get(n.id);
      return e ? { ...n, x: fmt(e.body.x * 10) / 10, z: fmt(e.body.z * 10) / 10, y: n.y === undefined ? undefined : fmt(e.body.y * 10) / 10 } : n;
    });
    this.session.env.flood = this.floodLevel;
    this.session.counters = { ...this.session.counters, arkLift: this.arkLift, doorClosed: this.doorClosed ? 1 : 0 };
    return this.session;
  }

  dispose(): void {
    this.effects = [];
    this.runner = null;
  }
}

export function newSession(chapterId: string, hunt = false): StorySession {
  const first = MISSIONS_OF(chapterId)[0];
  return {
    chapterId,
    missionId: hunt ? "" : (first?.id ?? ""),
    objIndex: 0,
    progress: 0,
    flags: hunt ? { hunt: true } : {},
    done: [],
    env: { fallen: false, flood: 0 },
    checkpoint: null,
    npcs: [],
    counters: {},
    history: [],
    finished: false,
  };
}
