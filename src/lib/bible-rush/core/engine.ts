import { FEEDS, SPECIES } from "../data/items";
import { CustomerManager } from "../systems/customers";
import { EventManager } from "../systems/events";
import { drainPerSecond, patienceState } from "../systems/patience";
import { makeRequest } from "../systems/requests";
import { BONUS, RATING_LABEL, SATISFACTION, rate, starsFor } from "../systems/score";
import { makeRng } from "./rng";
import type { ChallengeMode, FeedId, Floater, LevelDef, Rating, Request, SpeciesId, Status } from "./types";

export type ActionResult = { ok: boolean; text: string; tone: "good" | "bad" | "info" };
export type SoundKind = "arrive" | "ok" | "err" | "reward" | "tick" | "win" | "lose" | "event" | "select" | "cook" | "ready" | "burn";

/** Uma vaga numa estação (forno, grelha, prensa): vazia, cozinhando, no ponto ou queimada. */
export type Cell = { state: "empty" | "cooking" | "ready" | "burnt"; age: number };

export type Result = {
  won: boolean;
  score: number;
  stars: number;
  satisfaction: number;
  served: number;
  abandoned: number;
  waste: number;
  timeLeft: number;
  mode: "campaign" | ChallengeMode;
  perfects: number;
};

export type TutorialHint = { text: string; target: string } | null;

/**
 * Uma partida de uma fase, no estilo "barraca de comida": os pares chegam com pedidos, o jogador prepara os pratos
 * nas estações (que têm ponto e podem queimar), põe na bandeja e serve. Lógica pura (sem DOM): a interface só lê o estado e envia ações.
 */
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
  /** pratos queimados ou jogados fora */
  waste = 0;
  perfects = 0;
  /** posições fixas da fila (null = vaga livre) */
  slots: (Request | null)[];
  /** vagas de cada estação que cozinha (o celeiro não tem) */
  cells: Partial<Record<FeedId, Cell[]>> = {};
  /** pratos prontos esperando para servir */
  plate: FeedId[] = [];
  /** pares que já embarcaram na arca (só para mostrar) */
  placed: SpeciesId[] = [];
  servedSpecies = new Set<SpeciesId>();
  floaters: Floater[] = [];
  rev = 0;
  result: Result | null = null;
  /** dá para o jogador acompanhar quem chegou por último (para animar) */
  lastArrivalId = -1;
  /** pedidos atendidos em sequência sem perder nenhum, nesta partida */
  streak = 0;
  bestStreak = 0;
  tut: { step: number } | null;
  private onSound?: (k: SoundKind, species?: SpeciesId) => void;

  /** Liga (ou desliga, com undefined) o som da partida. */
  setSound(fn?: (k: SoundKind, species?: SpeciesId) => void): void {
    this.onSound = fn;
  }

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
    for (const f of def.feeds) {
      const st = FEEDS[f].station;
      if (st.kind !== "direct") this.cells[f] = Array.from({ length: st.slots }, () => ({ state: "empty", age: 0 }));
    }
    this.customers = new CustomerManager(def.schedule, def.generator, this.rng);
    this.eventsMgr = new EventManager(def.events);
    this.tut = opts.tutorial && this.mode === "campaign" ? { step: 0 } : null;
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
  /** durante o tutorial a paciência e o relógio da fase ficam parados (o forno continua) */
  get frozen(): boolean {
    return !!this.tut;
  }
  get waitingOutside(): number {
    return this.customers.waiting.length;
  }
  /** quanto falta (0 a 1) para o prato da vaga ficar pronto, ou quanto sobra antes de queimar quando já está pronto */
  progress(feed: FeedId, idx: number): number {
    const c = this.cells[feed]?.[idx];
    const st = FEEDS[feed].station;
    if (!c || c.state === "empty") return 0;
    if (c.state === "cooking") return Math.min(1, c.age / st.cookTime);
    if (c.state === "ready") return st.burnAfter > 0 ? Math.max(0, 1 - (c.age - st.cookTime) / st.burnAfter) : 1;
    return 0;
  }

  hint(): TutorialHint {
    const tut = this.tut;
    if (!tut) return null;
    if (tut.step === 0) return { text: "1. A ovelha pediu 🌾 Feno. Toque no Celeiro para pôr o feno na bandeja.", target: "slot:hay" };
    if (tut.step === 1) return { text: "2. Com o prato na bandeja, toque na ovelha para servir.", target: "card" };
    if (tut.step === 2) return { text: "3. A pomba quer 🥖 Pão de grãos. Toque num espaço vazio do forno para assar.", target: "slot:grain" };
    if (tut.step === 3) return { text: "4. Quando o pão ficar no ponto (✓ verde), toque nele antes de queimar!", target: "ready:grain" };
    if (tut.step === 4) return { text: "5. Agora sirva a pomba.", target: "card" };
    return null;
  }

  // ---------- laço ----------
  update(dtRaw: number): void {
    if (this.status !== "playing") return;
    const dt = Math.min(dtRaw, 0.1);
    this.rev++;
    this.clock += dt;
    this.floaters = this.floaters.filter((f) => this.clock - f.at < 1.4);
    this.cook(dt);

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

  /** Faz o forno, a grelha e a prensa andarem: cozinha, fica no ponto e (forno e grelha) queima se esquecer. */
  private cook(dt: number): void {
    for (const f of this.def.feeds) {
      const cells = this.cells[f];
      if (!cells) continue;
      const st = FEEDS[f].station;
      for (const c of cells) {
        if (c.state === "cooking") {
          c.age += dt;
          if (c.age >= st.cookTime) {
            c.state = "ready";
            this.onSound?.("ready");
          }
        } else if (c.state === "ready" && st.burnAfter > 0) {
          c.age += dt;
          if (c.age >= st.cookTime + st.burnAfter) {
            c.state = "burnt";
            this.waste++;
            this.float(`${FEEDS[f].emoji} queimou!`, "bad");
            this.onSound?.("burn");
          }
        }
      }
    }
  }

  private seat(): void {
    while (this.customers.waiting.length > 0) {
      if (this.tut && this.queue.length >= 1) break;
      const free = this.slots.indexOf(null);
      if (free < 0) break;
      const a = this.customers.take();
      if (!a) break;
      const r = makeRequest(this.nextId++, a.species, this.t, !!a.guided && !!this.tut);
      this.slots[free] = r;
      this.lastArrivalId = r.id;
      this.onSound?.("arrive", a.species);
    }
  }

  private abandon(i: number, r: Request): void {
    this.slots[i] = null;
    this.abandoned++;
    this.streak = 0;
    this.ratings.push("failed");
    this.float(`${RATING_LABEL.failed}: ${SPECIES[r.species].emoji} foi embora`, "bad", i);
    this.onSound?.("err");
  }

  // ---------- ações do jogador ----------
  private find(id: number): Request | null {
    return this.queue.find((r) => r.id === id) ?? null;
  }

  /** Toque numa estação: pega o prato do celeiro, começa a assar numa vaga vazia, tira o que está no ponto ou joga fora o queimado. */
  tapStation(feed: FeedId, idx: number): ActionResult {
    if (this.status !== "playing") return { ok: false, text: "", tone: "info" };
    this.rev++;
    const def = FEEDS[feed];
    if (def.station.kind === "direct") return this.toPlate(feed);
    const c = this.cells[feed]?.[idx];
    if (!c) return { ok: false, text: "", tone: "info" };
    if (c.state === "empty") {
      c.state = "cooking";
      c.age = 0;
      this.onSound?.("cook");
      if (this.tut?.step === 2 && feed === "grain") this.tut.step = 3;
      return { ok: true, text: "", tone: "good" };
    }
    if (c.state === "cooking") return this.say(`${def.emoji} ${def.name} ainda não está no ponto.`, "info");
    if (c.state === "burnt") {
      c.state = "empty";
      c.age = 0;
      this.onSound?.("select");
      return this.say("Jogado fora.", "info");
    }
    // pronto: vai para a bandeja
    const r = this.toPlate(feed);
    if (r.ok) {
      c.state = "empty";
      c.age = 0;
    }
    return r;
  }

  private toPlate(feed: FeedId): ActionResult {
    if (this.plate.length >= this.def.plateMax) return this.say("Bandeja cheia! Sirva alguém ou jogue um prato fora (toque nele).", "bad");
    this.plate.push(feed);
    this.onSound?.("select");
    if (this.tut) {
      if (this.tut.step === 0 && feed === "hay") this.tut.step = 1;
      else if (this.tut.step === 3 && feed === "grain") this.tut.step = 4;
    }
    return { ok: true, text: "", tone: "good" };
  }

  /** Toque num prato da bandeja: joga fora. */
  discard(idx: number): ActionResult {
    if (this.status !== "playing" || idx < 0 || idx >= this.plate.length) return { ok: false, text: "", tone: "info" };
    this.rev++;
    const f = this.plate.splice(idx, 1)[0];
    this.waste++;
    this.onSound?.("select");
    return this.say(`${FEEDS[f].emoji} jogado fora.`, "info");
  }

  /** Toque num par da fila: entrega tudo o que ele pediu e que está na bandeja. */
  serve(id: number): ActionResult {
    if (this.status !== "playing") return { ok: false, text: "", tone: "info" };
    this.rev++;
    const r = this.find(id);
    if (!r) return { ok: false, text: "", tone: "info" };
    const slot = this.slots.indexOf(r);
    const given: FeedId[] = [];
    for (const f of [...r.needs]) {
      const i = this.plate.indexOf(f);
      if (i < 0) continue;
      this.plate.splice(i, 1);
      r.needs.splice(r.needs.indexOf(f), 1);
      given.push(f);
    }
    if (given.length === 0) {
      const want = r.needs.map((f) => FEEDS[f].emoji).join(" ");
      return this.say(`${SPECIES[r.species].emoji} quer ${want}. Não tem na bandeja.`, "info");
    }
    this.onSound?.("ok", r.species);
    if (r.needs.length > 0) {
      this.float(`${given.map((f) => FEEDS[f].emoji).join("")} ✓ falta mais`, "good", slot);
      return { ok: true, text: "", tone: "good" };
    }
    this.complete(r, slot);
    return { ok: true, text: "", tone: "good" };
  }

  private say(text: string, tone: "bad" | "info"): ActionResult {
    this.float(text, tone);
    if (tone === "bad") this.onSound?.("err");
    return { ok: false, text, tone };
  }

  private complete(r: Request, slot: number): void {
    const rating = rate(r.patience);
    const bonus = BONUS[rating];
    this.score += r.reward + bonus;
    this.ratings.push(rating);
    this.served++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (rating === "perfect") this.perfects++;
    this.placed.push(r.species);
    this.servedSpecies.add(r.species);
    this.slots[slot] = null;
    this.float(`${RATING_LABEL[rating]}! +${r.reward}${bonus ? ` +${bonus}` : ""}`, rating === "late" ? "info" : "good", slot);
    this.onSound?.("reward", r.species);
    if (this.tut) {
      if (this.tut.step === 1) this.tut.step = 2;
      else if (this.tut.step === 4) this.tut = null;
    }
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
        ? starsFor({ won: w, score: this.score, target: this.def.targetScore, satisfaction: this.satisfaction, waste: this.waste, abandoned: this.abandoned })
        : 0;
    this.status = w ? "won" : "lost";
    this.result = {
      won: w,
      score,
      stars,
      satisfaction: this.satisfaction,
      served: this.served,
      abandoned: this.abandoned,
      waste: this.waste,
      timeLeft: Math.round(this.timeLeft),
      mode: this.mode,
      perfects: this.perfects,
    };
    this.onSound?.(w ? "win" : "lose");
    this.rev++;
  }
}
