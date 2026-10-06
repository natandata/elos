import { SPECIES, FEEDS, PENS } from "../data/items";
import { CustomerManager } from "../systems/customers";
import { EventManager } from "../systems/events";
import { drainPerSecond, patienceState } from "../systems/patience";
import { feedsLeft, makeRequest, mostUrgent, needsFeed, readyToPlace, wantsPen } from "../systems/requests";
import { ResourceManager } from "../systems/resources";
import { BONUS, RATING_LABEL, SATISFACTION, rate, starsFor } from "../systems/score";
import { makeRng } from "./rng";
import type { ChallengeMode, FeedId, Floater, LevelDef, PenId, Rating, Request, SpeciesId, Status } from "./types";

export type StationRef = { type: "feed"; id: FeedId } | { type: "pen"; id: PenId };
export type ActionResult = { ok: boolean; text: string; tone: "good" | "bad" | "info" };
export type SoundKind = "arrive" | "ok" | "err" | "reward" | "refill" | "tick" | "win" | "lose" | "event" | "select";

export type Result = {
  won: boolean;
  score: number;
  stars: number;
  satisfaction: number;
  served: number;
  abandoned: number;
  waste: number;
  stockLeft: number;
  timeLeft: number;
  mode: "campaign" | ChallengeMode;
  perfects: number;
};

export type TutorialHint = { text: string; target: string } | null;

/** Uma partida de uma fase. Lógica pura (sem DOM): a interface só lê o estado e envia ações. */
export class RushLevel {
  readonly def: LevelDef;
  readonly mode: "campaign" | ChallengeMode;
  readonly timeLimit: number;
  readonly maxAbandon: number;
  status: Status = "playing";
  t = 0;
  /** relógio que sempre corre (até durante o tutorial), usado nos avisos flutuantes */
  clock = 0;
  score = 0;
  served = 0;
  abandoned = 0;
  waste = 0;
  perfects = 0;
  /** posições fixas da fila (null = vaga livre) */
  slots: (Request | null)[];
  selected: number | null = null;
  placed: Record<PenId, SpeciesId[]> = { pasture: [], stable: [], cages: [], aviary: [] };
  servedSpecies = new Set<SpeciesId>();
  floaters: Floater[] = [];
  rev = 0;
  result: Result | null = null;
  /** dá para o jogador acompanhar quem chegou por último (para animar) */
  lastArrivalId = -1;
  /** pedidos atendidos em sequência sem perder nenhum, nesta partida */
  streak = 0;
  bestStreak = 0;
  tut: { step: number; refillShown: boolean } | null;
  private onSound?: (k: SoundKind, species?: SpeciesId) => void;

  /** Liga (ou desliga, com undefined) o som da partida. */
  setSound(fn?: (k: SoundKind, species?: SpeciesId) => void): void {
    this.onSound = fn;
  }

  readonly resources: ResourceManager;
  private customers: CustomerManager;
  private eventsMgr: EventManager;
  private ratings: Rating[] = [];
  private nextId = 1;
  private nextFloat = 1;
  private rng: () => number;
  private tickLeft = 0;

  constructor(def: LevelDef, opts: { seed?: number; mode?: "campaign" | ChallengeMode; tutorial?: boolean } = {}) {
    this.def = def;
    this.mode = opts.mode ?? "campaign";
    this.rng = makeRng(opts.seed ?? 1);
    this.timeLimit = def.timeLimit;
    this.maxAbandon = def.maxAbandon;
    this.slots = Array.from({ length: def.queueCap }, () => null);
    this.resources = new ResourceManager(def.feeds, def.stock);
    this.customers = new CustomerManager(def.schedule, def.generator, this.rng);
    this.eventsMgr = new EventManager(def.events);
    this.tut = opts.tutorial && this.mode === "campaign" ? { step: 0, refillShown: false } : null;
  }

  // ---------- leitura ----------
  get queue(): Request[] {
    return this.slots.filter((r): r is Request => !!r);
  }
  get timeLeft(): number {
    return Math.max(0, this.timeLimit - this.t);
  }
  get satisfaction(): number {
    if (this.ratings.length === 0) return 100;
    return Math.round(this.ratings.reduce((a, r) => a + SATISFACTION[r], 0) / this.ratings.length);
  }
  get banner(): string | null {
    return this.eventsMgr.banner?.text ?? null;
  }
  get storm(): boolean {
    return this.eventsMgr.storm;
  }
  get frozen(): boolean {
    return !!this.tut && this.tut.step < 3;
  }
  get waitingOutside(): number {
    return this.customers.waiting.length;
  }

  hint(): TutorialHint {
    const tut = this.tut;
    if (!tut) return null;
    const r = this.queue[0];
    if (tut.step === 0) return { text: "1. Chegou um pedido! Toque no cartão para selecioná-lo.", target: "card" };
    if (tut.step === 1 && r) {
      const f = r.needs.find((n) => n.kind === "feed");
      if (f && f.kind === "feed") return { text: `2. O par está com fome. Toque no alimento certo: ${FEEDS[f.id].emoji} ${FEEDS[f.id].name}.`, target: `feed:${f.id}` };
    }
    if (tut.step === 2 && r) {
      const p = wantsPen(r);
      if (p) return { text: `3. Agora leve o par ao lugar certo: ${PENS[p].emoji} ${PENS[p].name}.`, target: `pen:${p}` };
    }
    if (tut.step === 3) return { text: "4. Dois pedidos ao mesmo tempo! Atenda primeiro o mais impaciente (😠).", target: "card" };
    if (tut.step === 4 && !tut.refillShown) {
      const low = (Object.entries(this.resources.stock) as [FeedId, { n: number }][]).find(([, s]) => s.n <= 1);
      if (low) return { text: `Está acabando! Toque em ↻ para reabastecer ${FEEDS[low[0]].name}.`, target: `refill:${low[0]}` };
    }
    return null;
  }

  // ---------- laço ----------
  update(dtRaw: number): void {
    if (this.status !== "playing") return;
    const dt = Math.min(dtRaw, 0.1);
    this.rev++;
    this.clock += dt;
    this.floaters = this.floaters.filter((f) => this.clock - f.at < 1.4);

    this.resources.update(dt).forEach(() => this.onSound?.("refill"));
    if (this.frozen) {
      this.customers.update(this.t);
      this.seat();
      return;
    }
    this.t += dt;
    this.customers.update(this.t);

    for (const ev of this.eventsMgr.update(this.t, dt)) {
      this.onSound?.("event");
      if (ev.kind === "crowd") this.customers.pullForward(2);
      if (ev.kind === "restless") {
        const calm = this.queue.filter((r) => !r.restless);
        if (calm.length) calm[Math.floor(this.rng() * calm.length)].restless = true;
      }
    }
    this.seat();

    for (let i = 0; i < this.slots.length; i++) {
      const r = this.slots[i];
      if (!r) continue;
      r.patience -= drainPerSecond(SPECIES[r.species].patience, { storm: this.eventsMgr.storm, restless: r.restless }) * dt;
      if (r.patience <= 0) this.abandon(i, r);
    }

    // aviso sonoro de pressa quando alguém está impaciente
    this.tickLeft -= dt;
    if (this.tickLeft <= 0) {
      this.tickLeft = 1.4;
      if (this.queue.some((r) => patienceState(r.patience) === "impatient")) this.onSound?.("tick");
    }

    if (this.abandoned >= this.maxAbandon) return this.finish(false);
    if (this.timeLimit > 0 && this.t >= this.timeLimit) return this.finish(true);
    if (this.mode === "campaign" && this.customers.exhausted && this.queue.length === 0) this.finish(true);
  }

  private seat(): void {
    while (this.customers.waiting.length > 0) {
      if (this.tut && this.tut.step < 3 && this.queue.length >= 1) break;
      const free = this.slots.indexOf(null);
      if (free < 0) break;
      const a = this.customers.take();
      if (!a) break;
      const r = makeRequest(this.nextId++, a.species, this.t, !!a.guided && !!this.tut);
      this.slots[free] = r;
      this.lastArrivalId = r.id;
      this.onSound?.("arrive", a.species);
      if (this.tut?.step === 3 && this.queue.length === 1 && r.species === "dove") r.patience = 0.5;
    }
  }

  private abandon(i: number, r: Request): void {
    this.slots[i] = null;
    if (this.selected === r.id) this.selected = null;
    this.abandoned++;
    this.streak = 0;
    this.ratings.push("failed");
    this.float(`${RATING_LABEL.failed}: ${SPECIES[r.species].emoji} foi embora`, "bad", i);
    this.onSound?.("err");
  }

  // ---------- ações do jogador ----------
  select(id: number | null): void {
    if (this.status !== "playing") return;
    if (id !== null && !this.queue.some((r) => r.id === id)) return;
    this.selected = this.selected === id ? null : id;
    if (this.selected !== null) {
      this.onSound?.("select");
      if (this.tut?.step === 0) this.tut.step = 1;
    }
    this.rev++;
  }

  private find(id: number | null): Request | null {
    return id === null ? null : (this.queue.find((r) => r.id === id) ?? null);
  }

  private slotOf(r: Request): number {
    return this.slots.indexOf(r);
  }

  /** Alimentar (caixa de alimento) ou levar ao cercado. `forId` é o pedido arrastado até a estação; senão usa o selecionado, ou o mais urgente. */
  press(st: StationRef, forId?: number): ActionResult {
    if (this.status !== "playing") return { ok: false, text: "", tone: "info" };
    this.rev++;
    const target = this.find(forId ?? null) ?? this.find(this.selected);
    return st.type === "feed" ? this.feed(st.id, target) : this.place(st.id, target);
  }

  private feed(f: FeedId, target: Request | null): ActionResult {
    const name = `${FEEDS[f].emoji} ${FEEDS[f].name}`;
    let r = target;
    if (r && !needsFeed(r, f)) return this.mistake(r, `${SPECIES[r.species].emoji} não come ${FEEDS[f].name}.`);
    if (!r) r = mostUrgent(this.queue, (q) => needsFeed(q, f));
    if (!r) return this.say(`Ninguém precisa de ${name} agora.`, "info");
    if (this.resources.busy(f)) return this.say(`${FEEDS[f].name}: reabastecendo…`, "info");
    if (!this.resources.take(f)) return this.say(`Acabou ${FEEDS[f].name}! Toque em ↻ para reabastecer.`, "bad");
    r.needs = r.needs.filter((n) => !(n.kind === "feed" && n.id === f));
    r.restless = false;
    this.onSound?.("ok", r.species);
    this.float(`${name} ✓`, "good", this.slotOf(r));
    if (this.tut?.step === 1 && feedsLeft(r) === 0) this.tut.step = 2;
    return { ok: true, text: "", tone: "good" };
  }

  private place(p: PenId, target: Request | null): ActionResult {
    let r = target;
    if (r) {
      if (feedsLeft(r) > 0) return this.say("Falta alimentar o par antes de levar.", "info");
      if (wantsPen(r) !== p) return this.mistake(r, `${PENS[p].name} não é o lugar de ${SPECIES[r.species].plural}.`);
    } else {
      r = mostUrgent(this.queue, (q) => readyToPlace(q) && wantsPen(q) === p);
      if (!r) return this.say("Nenhum par pronto para este lugar.", "info");
    }
    this.complete(r, p);
    return { ok: true, text: "", tone: "good" };
  }

  private mistake(r: Request, text: string): ActionResult {
    this.waste++;
    r.patience = Math.max(0.02, r.patience - 0.07);
    this.float("Errou!", "bad", this.slotOf(r));
    this.onSound?.("err");
    return { ok: false, text, tone: "bad" };
  }

  private say(text: string, tone: "bad" | "info"): ActionResult {
    this.float(text, tone);
    if (tone === "bad") this.onSound?.("err");
    return { ok: false, text, tone };
  }

  private complete(r: Request, p: PenId): void {
    const slot = this.slotOf(r);
    const rating = rate(r.patience);
    const bonus = BONUS[rating];
    this.score += r.reward + bonus;
    this.ratings.push(rating);
    this.served++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (rating === "perfect") this.perfects++;
    this.placed[p].push(r.species);
    this.servedSpecies.add(r.species);
    this.slots[slot] = null;
    if (this.selected === r.id) this.selected = null;
    this.float(`${RATING_LABEL[rating]}! +${r.reward}${bonus ? ` +${bonus}` : ""}`, rating === "late" ? "info" : "good", slot);
    this.onSound?.("reward", r.species);
    if (this.tut) {
      if (this.tut.step === 2) {
        this.tut.step = 3;
        this.customers.pullForward(1);
      } else if (this.tut.step === 3 && this.served >= 3) this.tut.step = 4;
      else if (this.tut.step === 4 && this.served >= 5) this.tut = null;
    }
  }

  refill(f: FeedId): ActionResult {
    if (this.status !== "playing") return { ok: false, text: "", tone: "info" };
    this.rev++;
    if (this.resources.stock[f] && this.resources.stock[f].n >= 8) return this.say(`${FEEDS[f].name} já está cheio.`, "info");
    if (!this.resources.startRefill(f)) return this.say(`${FEEDS[f].name}: já reabastecendo…`, "info");
    if (this.tut) this.tut.refillShown = true;
    this.onSound?.("select");
    return { ok: true, text: "", tone: "good" };
  }

  private float(text: string, tone: Floater["tone"], slot?: number): void {
    this.floaters.push({ id: this.nextFloat++, text, tone, at: this.clock, slot: slot !== undefined && slot >= 0 ? slot : undefined });
    if (this.floaters.length > 8) this.floaters.shift();
  }

  // ---------- fim ----------
  private finish(won: boolean): void {
    if (this.status !== "playing") return;
    let w = won;
    let score = this.score;
    if (this.mode === "campaign") w = won && this.score >= this.def.targetScore;
    else {
      w = true;
      score = this.served;
    }
    const stars =
      this.mode === "campaign"
        ? starsFor({ won: w, score: this.score, target: this.def.targetScore, satisfaction: this.satisfaction, waste: this.waste + this.resources.overflow, abandoned: this.abandoned })
        : 0;
    this.status = w ? "won" : "lost";
    this.result = {
      won: w,
      score,
      stars,
      satisfaction: this.satisfaction,
      served: this.served,
      abandoned: this.abandoned,
      waste: this.waste + this.resources.overflow,
      stockLeft: this.resources.total(),
      timeLeft: Math.round(this.timeLeft),
      mode: this.mode,
      perfects: this.perfects,
    };
    this.onSound?.(w ? "win" : "lose");
    this.rev++;
  }
}
