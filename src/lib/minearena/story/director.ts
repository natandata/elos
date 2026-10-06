// Diretor do Modo História: conduz capítulos, missões, objetivos, cutscenes, diálogos, checkpoints e o marcador de objetivo.
// Fala com o jogo só pela interface `StoryHost` (assim o resto do MineArena não precisa saber da campanha).
import { B, BLOCKS } from "../blocks/blocks";
import type { Entity } from "../entities/manager";
import type { MobDef } from "../entities/definitions";
import type { World } from "../world/world";
import { ACH_BY_ID } from "./data/achievements";
import { CHAPTER_BY_ID, NEXT_CHAPTER } from "./data/chapters";
import { CUTSCENES } from "./data/cutscenes";
import { DIALOGUES } from "./data/dialogues";
import { STORY_MOBS } from "./data/mobs";
import { MISSION_BY_ID, MISSIONS_OF } from "./data/missions";
import { ARK, ARK_INSIDE, arkBlocks, arkDoorCells } from "./maps/noah";
import { EDEN_SITES } from "./maps/eden";
import { loadProgress, saveProgress } from "./progress";
import type { ChapterDef, CutStep, Cutscene, MapEnv, Mission, Objective, StoryHud, StoryMapDef, StoryProgress, StorySession, StoryUi, Vec3, Zone } from "./types";

export interface StoryHost {
  world: World;
  playerPos(): { x: number; y: number; z: number; yaw: number };
  setPlayer(x: number, y: number, z: number, yaw?: number): void;
  invCount(item: string): number;
  invRemove(item: string, n: number): void;
  invGive(item: string, n: number): void;
  spawnMob(def: MobDef, x: number, z: number): Entity;
  entities(): Entity[];
  removeEntity(e: Entity): void;
  camGet(): { pos: Vec3; look: Vec3 };
  shake(dur: number, power: number): void;
  setTime(t: number, lock: boolean): void;
  setWeather(w: "clear" | "rain" | "storm"): void;
  rainbow(on: boolean): void;
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
  ui: StoryUi = { dialogue: null, caption: null, cinematic: false, bars: false, fade: 0, fadeText: "", learn: null, chapterEnd: null, finale: false, history: [] };
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
    if (!fresh) {
      for (const n of this.session.npcs) this.spawnNpc(n.id, n.mob, n.x, n.z, n.tag, false);
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
      if (this.mission) this.enterMission(this.mission, false);
      return;
    }
    const first = MISSIONS_OF(this.session.chapterId)[0];
    this.mission = first;
    this.enterMission(first, true);
  }

  update(dt: number): void {
    this.clock += dt;
    this.retryT += dt;
    if (this.retryT > 0.5 && this.deferred.length > 0) {
      this.retryT = 0;
      const list = this.deferred;
      this.deferred = [];
      for (const d of list) this.spawnNpc(d.id, d.mob, d.x, d.z, d.tag, false);
    }
    this.stepTweens(dt);
    this.stepRunner(dt);
    this.stepLongEffects(dt);
    this.stepPaths();
    this.stepStuck(dt);
    this.stepEffects(dt);
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (!this.runner && !this.dlg && !this.ui.learn && !this.ui.chapterEnd && !this.ui.finale && this.mission && !this.busyMission) this.checkObjective(dt);
    this.emitT += dt;
    if (this.dirty && this.emitT > 0.04) {
      this.emitT = 0;
      this.dirty = false;
      this.host.ui({ ...this.ui, history: this.ui.history.slice(-40) });
    }
  }

  /** Cutscene ou diálogo ocupando a tela: o jogador não anda nem interage. */
  get blocking(): boolean {
    return !!this.runner || !!this.dlg || !!this.ui.learn || !!this.ui.chapterEnd || this.ui.finale;
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
      for (const s of m.spawn ?? []) this.spawnNpc(s.id ?? `${s.mob}_${this.npcs.size}`, s.mob, s.at.x, s.at.z, s.tag, true);
      for (const g of m.give ?? []) this.host.invGive(g.item, g.count);
      this.setCheckpoint();
      this.host.message(`Missão: ${m.title}`, "info");
      if (m.onStart) {
        this.busyMission = true;
        this.play(m.onStart, () => {
          this.busyMission = false;
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
    this.hudCache = null;
    if (this.session.objIndex >= m.objectives.length) this.completeMission(m);
    else {
      this.setCheckpoint();
      this.host.message("Objetivo concluído!", "good");
    }
    this.emit();
  }

  private completeMission(m: Mission): void {
    if (!this.session.done.includes(m.id)) this.session.done.push(m.id);
    for (const r of m.reward ?? []) this.host.invGive(r.item, r.count);
    this.host.sfx("quest");
    this.host.message(`Missão concluída: ${m.title}`, "rare");
    const next = m.next ? MISSION_BY_ID.get(m.next) : undefined;
    const go = () => {
      if (next) this.enterMission(next, true);
      else this.finishChapter();
    };
    this.mission = null;
    if (m.onComplete) {
      this.busyMission = true;
      this.play(m.onComplete, () => {
        this.busyMission = false;
        go();
      });
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
        if (z && inZone(z, p.x, p.z)) this.completeObjective();
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
          for (const k of [...this.flags]) if (k.startsWith(`near:${o.tag}:`)) this.flags.delete(k);
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

  private sendTo(e: Entity, pts: { x: number; z: number }[]): void {
    if (!e.story) return;
    this.paths.set(e.story.id, pts.slice(1));
    this.pathSpeed.set(e.story.id, 2.6);
    e.story.goto = { x: pts[0].x, z: pts[0].z, speed: 2.6 };
    e.story.arrived = false;
  }

  /** Altura do chão logo abaixo de `ref` (para não colocar quem está dentro da arca em cima do telhado). */
  private groundY(x: number, z: number, ref: number): number {
    const w = this.host.world;
    for (let y = Math.min(62, Math.floor(ref) + 3); y >= 0; y--) if (w.isSolid(Math.floor(x), y, Math.floor(z))) return y + 1.05;
    return ref;
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
          if (e.story.tag?.startsWith("pair:")) e.story.hold = true;
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
    if (e) this.host.message(`${e.def.name}: ${this.idleLine(npcId)}`, "info");
    return true;
  }

  private idleLine(id: string): string {
    const lines: Record<string, string> = {
      adao: "Deus nos deu este jardim para cuidar.",
      eva: "Cada flor aqui parece uma promessa.",
      abel: "As ovelhas conhecem a minha voz.",
      caim: "A terra pede suor, mas dá fruto.",
      noe: "Tudo como o Senhor mandou.",
      sem: "Meu pai confia em Deus. Eu também.",
    };
    return lines[id] ?? "…";
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

  onBlockPlaced(x: number, y: number, z: number): void {
    void y;
    const o = this.obj;
    if (o?.k !== "place") return;
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
  private deferred: { id: string; mob: string; x: number; z: number; tag?: string }[] = [];
  private retryT = 0;

  private spawnNpc(id: string, mob: string, x: number, z: number, tag: string | undefined, record: boolean): Entity | null {
    const def = STORY_MOBS[mob];
    if (!def) return null;
    if (record) this.session.npcs.push({ id, mob, x, z, tag });
    if (this.host.world.surfaceY(Math.floor(x), Math.floor(z)) < 0) {
      // o chão ainda não carregou: tenta de novo em instantes
      this.deferred.push({ id, mob, x, z, tag });
      return null;
    }
    const e = this.host.spawnMob(def, x, z);
    e.story = { id, tag, goto: null, face: tag?.startsWith("pair") || tag === "animal" || tag === "sheep" ? null : "player", pose: null };
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
  private play(id: string, then: (() => void) | null): void {
    const cut = CUTSCENES[id];
    if (!cut) return then?.();
    this.runner = { cut, i: 0, wait: null, skip: false, then };
    this.ui.cinematic = true;
    this.emit();
  }

  skipCutscene(): void {
    if (!this.runner) return;
    this.runner.skip = true;
    this.runner.wait = null;
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
        const mob = this.npcMobOf(s.npc);
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
        if (s.rainbow !== undefined) this.host.rainbow(s.rainbow);
        break;
      case "teleport": {
        if (s.target === "player") this.host.setPlayer(s.to.x, s.to.y, s.to.z, s.yaw);
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
        for (let k = 0; k < (s.count ?? 1); k++) this.spawnNpc(`${s.mob}_${this.npcs.size}`, s.mob, s.at.x + k, s.at.z, s.tag, true);
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
        else if (f.kind === "lightning") this.host.burst(x, y + Math.random() * 6, z, 0xdfe8ff, 6, 4, 0.2);
      }
    }
    this.effects = this.effects.filter((f) => f.left > 0);
  }

  // ------------------------------------------------------------------ chamadas especiais
  private longBusy = 0;
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
        this.setFlood(23, skip);
        this.arkLiftTarget = 0;
        if (skip) this.liftArkTo(0);
        else {
          this.longBusy++;
          r.wait = { kind: "long", left: 0 };
        }
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
      case "teleportOutsideArk":
        this.host.setPlayer(73.5, ARK.y0 + 1.05, 46, 0);
        break;
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
    if (skip) for (const [x, y, z, id] of cells) this.host.world.setBlock(x, y, z, id);
    else this.sealQueue = cells;
    this.session.flags.sealed = true;
  }

  private arkDoor(close: boolean): void {
    this.doorClosed = close;
    for (const [x, y, z] of arkDoorCells()) this.host.world.setBlock(x, y + this.arkLift, z, close ? B.planks : B.air);
    this.host.sfx("door");
  }

  private arkBuild(skip: boolean): void {
    const list = arkBlocks().filter(([x, y, z]) => !arkDoorCells().some((c) => c[0] === x && c[1] === y && c[2] === z));
    // do casco para cima: ordena por altura
    list.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    if (skip) {
      for (const [x, y, z, id] of list) this.host.world.setBlock(x, y, z, id);
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
    this.arkLiftTarget = Math.max(0, level - 25);
    if (skip) {
      this.floodLevel = level;
      this.session.env.flood = level;
      this.applyWater(level);
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
    for (const [x, y, z] of blocks) w.setBlock(x, y + lift, z, B.air);
    // o que ficou para trás volta a ser água se estiver abaixo da superfície
    this.arkLift += dy;
    for (const [x, y, z, id] of blocks) w.setBlock(x, y + this.arkLift, z, id);
    const p = this.host.playerPos();
    const inside = (x: number, y: number, z: number) => x >= ARK.x0 && x <= ARK.x1 && z >= ARK.z0 && z <= ARK.z1 && y >= ARK.y0 + lift && y <= ARK.y0 + lift + 12;
    if (inside(p.x, p.y, p.z)) this.host.setPlayer(p.x, p.y + dy, p.z, p.yaw);
    for (const e of this.npcs.values()) if (inside(e.body.x, e.body.y, e.body.z)) e.body.y += dy;
  }

  private flTimer = 0;
  private stepLongEffects(dt: number): void {
    // construção da arca
    if (this.arkBuildQueue.length > 0) {
      const n = Math.max(6, Math.ceil(this.arkBuildQueue.length / 110));
      for (let i = 0; i < n && this.arkBuildQueue.length > 0; i++) {
        const b = this.arkBuildQueue.shift()!;
        this.host.world.setBlock(b[0], b[1], b[2], b[3]);
        this.arkPlaced.push(b);
        if (i === 0 && Math.random() < 0.25) this.host.sfx("place");
      }
      if (this.arkBuildQueue.length === 0) {
        this.session.flags.arkBuilt = true;
        this.longBusy = Math.max(0, this.longBusy - 1);
      }
    }
    // portão que se fecha
    if (this.sealQueue.length > 0) {
      const n = Math.max(3, Math.ceil(this.sealQueue.length / 40));
      for (let i = 0; i < n && this.sealQueue.length > 0; i++) {
        const b = this.sealQueue.shift()!;
        this.host.world.setBlock(b[0], b[1], b[2], b[3]);
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
    this.pendingEnd = { chapter: ch.id, title: ch.title, unlockedBooks: newBooks, achievement: ach };
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
  hud(): { hud: StoryHud | null; target: Vec3 | null } {
    const o = this.obj;
    const m = this.mission;
    if (!o || !m || this.ui.cinematic) return { hud: null, target: null };
    const p = this.host.playerPos();
    const target = this.targetOf(o, p);
    const dist = target ? Math.round(Math.hypot(target.x - p.x, target.z - p.z)) : null;
    let progress: string | null = null;
    if (o.k === "collect" || o.k === "harvest" || o.k === "place" || o.k === "near" || o.k === "lead") progress = `${Math.min(this.session.progress, o.count)} / ${o.count}`;
    if (o.k === "wait") progress = `${this.session.progress} / ${o.seconds}s`;
    const hud: StoryHud = { chapter: this.chapter.title, mission: m.title, objective: o.text, progress, ref: m.ref ?? null, dist, wp: null };
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
      return e ? { ...n, x: fmt(e.body.x * 10) / 10, z: fmt(e.body.z * 10) / 10 } : n;
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

export function newSession(chapterId: string): StorySession {
  const first = MISSIONS_OF(chapterId)[0];
  return {
    chapterId,
    missionId: first?.id ?? "",
    objIndex: 0,
    progress: 0,
    flags: {},
    done: [],
    env: { fallen: false, flood: 0 },
    checkpoint: null,
    npcs: [],
    counters: {},
    history: [],
    finished: false,
  };
}
