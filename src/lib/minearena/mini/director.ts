// Diretor das partidas dos minigames. Todo mundo roda o mesmo diretor; o anfitrião manda nas fases (largada, zona, votação, fim)
// e cada jogador avisa a própria eliminação. Mensagens: ph (fase), zone, died, vote, end, refill, rdy (ver `attach`).
import type { RoomNet, NetMsg, Peer } from "../net/room";
import { MINI_BY_ID, THEMES, type MiniHud, type MiniMap, type MiniPlayer, type MiniResult } from "./types";

/** O que o diretor pede ao motor (implementado por MineArena). */
export interface MiniEngine {
  isReady(): boolean;
  playerPos(): { x: number; y: number; z: number };
  teleport(x: number, y: number, z: number, yaw: number, pitch?: number): void;
  setFrozen(on: boolean): void;
  setSpectator(on: boolean): void;
  setBuildMode(on: boolean): void;
  removeCages(cages: MiniMap["cages"]): void;
  refillChests(salt: number): void;
  damageSelf(amount: number): void;
  removeRemote(id: string): void;
  setZoneVisual(r: number | null): void;
  say(text: string, tone: "info" | "good" | "warn" | "rare"): void;
  play(kind: "ui" | "pickup" | "hurt" | "death"): void;
  hud(h: MiniHud): void;
  dropEverything(): void;
}

export const BUILD_SECS = 300;
const COUNTDOWN = 10;
const JUDGE_SECS = 14;
const END_SECS = 25;
const READY_TIMEOUT = 30;
const REFILL_AT = 240;

type Phase = "wait" | "countdown" | "play" | "judge" | "end";

export class MiniDirector {
  phase: Phase = "wait";
  private deadline = 0;
  private alive = new Set<string>();
  private order: string[] = []; // eliminados, na ordem
  private names = new Map<string, string>();
  private kills = new Map<string, number>();
  private readyIds = new Set<string>();
  private left = new Set<string>();
  private feed: { id: number; text: string; until: number }[] = [];
  private feedId = 0;
  private spectating = false;
  private myKills = 0;
  private theme: string | null;
  private result: MiniResult | null = null;
  private announce: string | null = null;
  private hudT = 0;
  private now = 0;
  private startAt = 0;
  // zona
  private zone = { r: 0, from: 0, to: 0, t0: 0, dur: 0, dmg: 0, shrinking: false, nextAt: 0, started: false };
  private outsideT = 0;
  private outside = false;
  // host
  private hostPlayAt = 0;
  private hostStage = -1;
  private hostStageAt = 0;
  private refilled = false;
  private judgeIdx = -1;
  private judgeAt = 0;
  private votes = new Map<string, Map<string, number>>(); // alvo -> (votante -> nota)
  private myVote: number | null = null;
  private judging: { owner: string; idx: number } | null = null;
  private endAt = 0;
  private exitCalled = false;

  constructor(
    private eng: MiniEngine,
    private net: RoomNet,
    readonly map: MiniMap,
    private players: MiniPlayer[],
    private me: Peer,
    private role: "host" | "guest",
    themeIdx: number,
    private onExit: (why?: string) => void,
    private solo = false,
  ) {
    this.theme = map.game === "build" ? THEMES[themeIdx % THEMES.length] : null;
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.alive.add(p.id);
    }
    this.zone.r = map.limit;
    this.attach();
  }

  get index(): number {
    return Math.max(0, this.players.findIndex((p) => p.id === this.me.id));
  }
  get spawn() {
    return this.map.spawns[this.index % this.map.spawns.length];
  }
  get frozen(): boolean {
    return this.phase === "wait" || this.phase === "countdown" || this.phase === "judge" || this.phase === "end";
  }
  /** Pode tomar dano de outros jogadores/zona? */
  get vulnerable(): boolean {
    return this.phase === "play" && !this.spectating && this.map.game !== "build";
  }
  get isSpectating(): boolean {
    return this.spectating;
  }
  get game() {
    return this.map.game;
  }

  // ------------------------------------------------------------------ rede
  private attach(): void {
    const net = this.net;
    net.on("rdy", (m) => {
      this.readyIds.add(m.from);
    });
    net.on("ph", (m) => this.onPhase(m));
    net.on("zone", (m) => this.onZone(m));
    net.on("dead", (m) => this.onDead(String(m.id), m.by ? String(m.by) : undefined, true));
    net.on("refill", (m) => {
      this.eng.refillChests(Number(m.salt) || 1);
      this.eng.say("Os baús foram reabastecidos!", "rare");
    });
    net.on("end", (m) => this.onEnd(m));
    net.on("bye", (m) => this.onLeft(m.from));
    if (this.role === "host") {
      net.on("vote", (m) => {
        const to = String(m.target);
        if (!this.names.has(to) || to === m.from || this.judging?.owner !== to) return;
        const stars = Math.max(1, Math.min(5, Math.round(Number(m.stars) || 0)));
        const v = this.votes.get(to) ?? new Map<string, number>();
        v.set(m.from, stars);
        this.votes.set(to, v);
      });
    }
  }

  private broadcast(t: string, data: Record<string, unknown> = {}): void {
    this.net.send(t, data);
  }

  private onLeft(id: string): void {
    if (!this.names.has(id) || this.left.has(id)) return;
    if (id === this.net.hostId && this.role === "guest" && this.phase !== "end") {
      if (!this.exitCalled) {
        this.exitCalled = true;
        this.onExit("O anfitrião saiu da partida.");
      }
      return;
    }
    this.left.add(id);
    this.onDead(id, undefined, false, true);
  }

  private onPhase(m: NetMsg): void {
    const phase = m.phase as Phase;
    this.phase = phase;
    this.deadline = this.now + (Number(m.dur) || 0);
    if (phase === "countdown") {
      const sp = this.spawn;
      this.eng.teleport(sp.x, sp.y, sp.z, sp.yaw, 0);
      this.eng.setFrozen(true);
      this.announce = null;
    } else if (phase === "play") {
      this.eng.setFrozen(false);
      this.startAt = this.now;
      if (this.map.cages.length) this.eng.removeCages(this.map.cages);
      if (this.map.game === "build") {
        this.eng.setBuildMode(true);
        this.eng.say(`Tema: ${this.theme}. Mãos à obra!`, "rare");
      } else this.eng.say("Que comecem os jogos! Boa sorte.", "rare");
      this.eng.play("ui");
    } else if (phase === "judge") {
      const owner = String(m.owner);
      this.judging = { owner, idx: Number(m.idx) || 0 };
      this.myVote = null;
      this.viewPlot(owner);
    }
  }

  private viewPlot(owner: string): void {
    const i = this.players.findIndex((p) => p.id === owner);
    const pl = this.map.plots[i];
    if (!pl) return;
    this.eng.setBuildMode(true);
    this.eng.setFrozen(true);
    const cx = (pl.x0 + pl.x1) / 2 + 0.5;
    this.eng.teleport(cx, pl.floorY + 15, pl.z1 + 9, 0, -0.6);
  }

  private onZone(m: NetMsg): void {
    const z = this.zone;
    z.started = true;
    z.from = Number(m.r0);
    z.to = Number(m.r1);
    z.dur = Number(m.dur) || 0;
    z.t0 = this.now;
    z.dmg = Number(m.dmg) || 1;
    z.shrinking = z.dur > 0 && z.from !== z.to;
    if (!z.shrinking) z.r = z.to;
    z.nextAt = m.nextIn != null && Number(m.nextIn) >= 0 ? this.now + Number(m.nextIn) : 0;
    if (z.shrinking) this.eng.say("A zona segura está diminuindo!", "warn");
  }

  private onDead(id: string, by: string | undefined, fromNet: boolean, left = false): void {
    if (!this.alive.has(id)) return;
    if (this.phase === "play") {
      this.alive.delete(id);
      this.order.push(id);
      if (by && by !== id) this.kills.set(by, (this.kills.get(by) ?? 0) + 1);
      if (by === this.me.id && by !== id) {
        this.myKills++;
        this.eng.play("pickup");
      }
    } else this.alive.delete(id);
    const who = this.names.get(id) ?? "Alguém";
    const killer = by && by !== id ? this.names.get(by) : null;
    const text = left ? `${who} saiu da partida.` : killer ? `${killer} eliminou ${who}.` : `${who} foi eliminado.`;
    this.pushFeed(text);
    if (id !== this.me.id) this.eng.removeRemote(id);
    void fromNet;
  }

  private pushFeed(text: string): void {
    this.feed.push({ id: ++this.feedId, text, until: this.now + 7 });
    this.feed = this.feed.slice(-4);
  }

  /** O jogador local morreu (vida zerada ou queda no vazio). `by` = último a ferir. */
  localDied(by?: string): void {
    if (this.spectating || this.phase !== "play") return;
    this.broadcast("dead", { id: this.me.id, by });
    this.onDead(this.me.id, by, false);
    this.eng.dropEverything();
    this.spectating = true;
    this.eng.setSpectator(true);
    this.eng.play("death");
    this.eng.say("Você foi eliminado. Agora você assiste à partida.", "warn");
    if (this.role === "host") this.checkWin();
  }

  /** Pode mexer neste bloco agora? (regras de cada minigame) */
  canEdit(x: number, y: number, z: number): boolean {
    if (this.spectating || this.phase !== "play") return false;
    if (this.map.game !== "build") return y > 1 && y < 63;
    const p = this.map.plots[this.index];
    return !!p && x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && y > p.floorY && y <= p.ceilY;
  }

  /** Nota de 1 a 5 na construção em julgamento. */
  vote(stars: number): void {
    if (this.phase !== "judge" || !this.judging || this.judging.owner === this.me.id || this.myVote != null) return;
    this.myVote = stars;
    this.eng.play("ui");
    if (this.role === "host") {
      const v = this.votes.get(this.judging.owner) ?? new Map<string, number>();
      v.set(this.me.id, stars);
      this.votes.set(this.judging.owner, v);
    } else this.net.send("vote", { target: this.judging.owner, stars }, this.net.hostId);
  }

  // ------------------------------------------------------------------ fim
  private onEnd(m: NetMsg): void {
    const ranks = (m.ranks as MiniResult["ranks"]) ?? [];
    const mine = ranks.find((r) => r.id === this.me.id);
    this.result = { title: String(m.title ?? "Fim de jogo"), ranks, mePlace: mine?.place ?? ranks.length };
    this.phase = "end";
    this.deadline = this.now + END_SECS;
    this.endAt = this.now + END_SECS;
    this.eng.setFrozen(true);
    this.eng.setZoneVisual(null);
    this.eng.play(mine?.place === 1 ? "pickup" : "ui");
  }

  private finish(winner: string | null, title: string, notes?: Map<string, string>): void {
    // host: monta a classificação e avisa todos
    const ranked: string[] = [];
    if (winner) ranked.push(winner);
    for (const id of [...this.order].reverse()) if (!ranked.includes(id)) ranked.push(id);
    for (const p of this.players) if (!ranked.includes(p.id)) ranked.push(p.id);
    const ranks = ranked.map((id, i) => ({ id, name: this.names.get(id) ?? "?", place: i + 1, note: notes?.get(id) ?? (this.kills.get(id) ? `${this.kills.get(id)} abate${this.kills.get(id) === 1 ? "" : "s"}` : "") }));
    const msg = { title, ranks };
    this.broadcast("end", msg);
    this.onEnd({ t: "end", from: this.me.id, ...msg } as NetMsg);
  }

  private checkWin(): void {
    if (this.role !== "host" || this.phase !== "play" || this.map.game === "build") return;
    const need = this.solo || this.players.length < 2 ? 0 : 1;
    if (this.alive.size <= need && (this.players.length > 1 || this.alive.size === 0)) {
      const winner = [...this.alive][0] ?? null;
      this.finish(winner, winner ? `${this.names.get(winner)} venceu!` : "Ninguém sobreviveu");
    }
  }

  private judgeResult(): void {
    const avg = new Map<string, number>();
    const notes = new Map<string, string>();
    for (const p of this.players) {
      const v = [...(this.votes.get(p.id)?.values() ?? [])];
      const a = v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
      avg.set(p.id, a);
      notes.set(p.id, v.length ? `${a.toFixed(2)} ★ · ${v.length} voto${v.length === 1 ? "" : "s"}` : "sem votos");
    }
    const sorted = [...this.players].sort((a, b) => (avg.get(b.id) ?? 0) - (avg.get(a.id) ?? 0));
    this.order = sorted.map((p) => p.id).reverse();
    const top = sorted[0];
    this.finish(top.id, `${top.name} venceu com “${this.theme}”!`, notes);
  }

  // ------------------------------------------------------------------ laço
  update(dt: number): void {
    this.now += dt;
    if (this.eng.isReady() && !this.readySent) {
      this.readySent = true;
      this.readyIds.add(this.me.id);
      this.net.send("rdy", {});
      this.announce = this.role === "host" ? "Esperando todo mundo carregar o mapa…" : "Esperando a partida começar…";
      const sp = this.spawn;
      this.eng.teleport(sp.x, sp.y, sp.z, sp.yaw, 0);
      this.eng.setFrozen(true);
    }
    if (this.role === "host") this.hostTick();
    // zona
    const z = this.zone;
    if (z.started && z.shrinking) {
      const k = Math.min(1, (this.now - z.t0) / Math.max(0.1, z.dur));
      z.r = z.from + (z.to - z.from) * k;
      if (k >= 1) {
        z.shrinking = false;
        z.r = z.to;
      }
    }
    if (this.map.game !== "build" && this.phase === "play") this.eng.setZoneVisual(z.started && z.r < this.map.limit - 0.5 ? z.r : null);
    // fora da zona / no vazio
    if (this.phase === "play" && !this.spectating && this.map.game !== "build") {
      const p = this.eng.playerPos();
      const d = Math.hypot(p.x - this.map.center.x, p.z - this.map.center.z);
      this.outside = z.started && d > z.r;
      if (this.outside) {
        this.outsideT += dt;
        if (this.outsideT >= 1) {
          this.outsideT = 0;
          this.eng.damageSelf(z.dmg);
        }
      } else this.outsideT = 0;
      if (p.y < this.map.voidY) this.localDied(this.lastHitBy());
    } else this.outside = false;
    // fim automático depois do aviso
    if (this.phase === "end" && this.now >= this.endAt && !this.exitCalled) {
      this.exitCalled = true;
      this.onExit();
    }
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.2;
      this.publish();
    }
  }

  private readySent = false;
  private lastHit: { id: string; t: number } | null = null;
  noteHit(id: string): void {
    this.lastHit = { id, t: this.now };
  }
  lastHitBy(): string | undefined {
    return this.lastHit && this.now - this.lastHit.t < 8 ? this.lastHit.id : undefined;
  }

  private hostTick(): void {
    const t = this.now;
    if (this.phase === "wait") {
      const all = this.players.every((p) => this.readyIds.has(p.id) || this.left.has(p.id));
      if (this.readySent && (all || t > READY_TIMEOUT)) {
        this.broadcast("ph", { phase: "countdown", dur: COUNTDOWN });
        this.onPhase({ t: "ph", from: this.me.id, phase: "countdown", dur: COUNTDOWN } as NetMsg);
        this.hostPlayAt = t + COUNTDOWN;
      }
    } else if (this.phase === "countdown" && t >= this.hostPlayAt) {
      const dur = this.map.game === "build" ? BUILD_SECS : 0;
      this.broadcast("ph", { phase: "play", dur });
      this.onPhase({ t: "ph", from: this.me.id, phase: "play", dur } as NetMsg);
      this.hostPlayAt = t;
      this.hostStage = -1;
      if (this.map.zone.length) {
        this.hostStageAt = t + this.map.zone[0].wait;
        const m = { r0: this.map.limit, r1: this.map.limit, dur: 0, dmg: 0, nextIn: this.map.zone[0].wait };
        this.broadcast("zone", m);
        this.onZone({ t: "zone", from: this.me.id, ...m } as NetMsg);
      }
    } else if (this.phase === "play") {
      if (this.map.game === "build") {
        if (t >= this.hostPlayAt + BUILD_SECS) this.startJudge();
      } else {
        const zs = this.map.zone;
        if (this.hostStage + 1 < zs.length && t >= this.hostStageAt) {
          const k = this.hostStage + 1;
          const st = zs[k];
          const from = k === 0 ? this.map.limit : zs[k - 1].r;
          const nextWait = k + 1 < zs.length ? zs[k + 1].wait : -1;
          const m = { r0: from, r1: st.r, dur: st.shrink, dmg: st.dmg, nextIn: nextWait >= 0 ? st.shrink + nextWait : -1 };
          this.broadcast("zone", m);
          this.onZone({ t: "zone", from: this.me.id, ...m } as NetMsg);
          this.hostStage = k;
          this.hostStageAt = t + st.shrink + (k + 1 < zs.length ? zs[k + 1].wait : 1e9);
        }
        if (this.map.game === "skywars" && !this.refilled && t >= this.hostPlayAt + REFILL_AT) {
          this.refilled = true;
          this.broadcast("refill", { salt: 7 });
          this.eng.refillChests(7);
          this.eng.say("Os baús foram reabastecidos!", "rare");
        }
        this.checkWin();
      }
    } else if (this.phase === "judge" && t >= this.judgeAt) {
      if (this.judgeIdx + 1 < this.players.length) this.nextJudge();
      else this.judgeResult();
    }
  }

  private startJudge(): void {
    this.judgeIdx = -1;
    this.nextJudge();
  }
  private nextJudge(): void {
    this.judgeIdx++;
    const owner = this.players[this.judgeIdx].id;
    this.judgeAt = this.now + JUDGE_SECS;
    const m = { phase: "judge", dur: JUDGE_SECS, owner, idx: this.judgeIdx };
    this.broadcast("ph", m);
    this.onPhase({ t: "ph", from: this.me.id, ...m } as NetMsg);
  }

  private publish(): void {
    const z = this.zone;
    const info = MINI_BY_ID.get(this.map.game);
    void info;
    const judging = this.judging && this.phase === "judge" ? { name: this.names.get(this.judging.owner) ?? "?", mine: this.judging.owner === this.me.id, idx: this.judging.idx + 1, of: this.players.length, voted: this.myVote } : null;
    this.eng.hud({
      game: this.map.game,
      phase: this.phase === "wait" ? "countdown" : this.phase,
      left: Math.max(0, Math.ceil(this.deadline - this.now)),
      alive: this.alive.size,
      total: this.players.length,
      spectating: this.spectating,
      zone: z.started && this.map.game !== "build" ? { r: Math.round(z.r), target: Math.round(z.to), shrinking: z.shrinking, nextIn: z.nextAt > 0 ? Math.max(0, Math.round(z.nextAt - this.now)) : -1 } : null,
      outside: this.outside,
      kills: this.myKills,
      theme: this.theme,
      judging,
      feed: this.feed.filter((f) => f.until > this.now).map((f) => ({ id: f.id, text: f.text })),
      result: this.result,
      announce: this.phase === "wait" ? this.announce : null,
    });
  }
}
