// O "anfitrião" de uma sala de Quem Desenha?: a máquina de estados da partida, sem tela e sem rede.
// Quem cria a sala roda isto; os outros jogadores só mandam pedidos (entrar, palpitar, desenhar) e recebem o estado.
// O relógio é interno (`tick(dt)`), então dá para testar uma partida inteira em milissegundos.
import { BOT_NAMES } from "./bots";
import { CHOOSE_SECONDS, DEFAULT_SETTINGS, MIN_PLAYERS, REVEAL_SECONDS, cleanSettings, drawChoices, drawerPoints, guessPoints, hintsShown, judgeGuess, maskOf, type Settings } from "./rules";
import { WORDS, type Category, type Level, type Word } from "./words";

export type Phase = "lobby" | "choosing" | "drawing" | "reveal" | "end";

export type PlayerPub = {
  id: string;
  name: string;
  score: number;
  /** pontos ganhos na vez atual */
  gain: number;
  guessed: boolean;
  bot: boolean;
  connected: boolean;
  /** quantos desenhos já fez e quantos palpites certos na partida */
  drawings: number;
  guesses: number;
  /** vitórias seguidas dentro da partida: acertos em sequência */
  streak: number;
};

export type PubState = {
  v: 1;
  code: string;
  hostId: string;
  phase: Phase;
  settings: Settings;
  players: PlayerPub[];
  turn: number;
  totalTurns: number;
  round: number;
  drawerId: string | null;
  /** traços da palavra (só durante o desenho) */
  mask: string | null;
  hints: string[];
  category: Category | null;
  level: Level | null;
  /** palavra, só na revelação e no fim da vez */
  word: string | null;
  /** milissegundos que faltam na fase e o total dela */
  leftMs: number;
  totalMs: number;
  /** quem acertou, na ordem (para a revelação) */
  order: string[];
};

export type Chat = { id: number; kind: "guess" | "hit" | "near" | "sys"; name?: string; text: string };

/** Pedidos que os jogadores mandam ao anfitrião. */
export type ToHost =
  | { t: "hello"; name: string }
  | { t: "ping" }
  | { t: "bye" }
  | { t: "settings"; settings: Partial<Settings> }
  | { t: "start" }
  | { t: "pick"; i: number }
  | { t: "guess"; text: string }
  | { t: "again" }
  | ({ t: "op" } & DrawOp);

/** Operações de desenho (coordenadas de 0 a 1 numa tela 4:3). */
export type DrawOp = { k: "s"; c: string; w: number; x: number; y: number } | { k: "p"; p: number[] } | { k: "e" } | { k: "u" } | { k: "c" };

/** O que o anfitrião devolve. `to` é decidido por quem envia (todos, uma pessoa ou várias). */
export type ToClient =
  | { t: "state"; s: PubState }
  | { t: "choices"; words: { i: number; text: string; level: Level; category: Category }[] }
  | { t: "secret"; text: string }
  | { t: "chat"; c: Chat }
  | { t: "canvas"; ops: DrawOp[] }
  | { t: "deny"; reason: string };

export type Send = (to: string | string[] | null, msg: ToClient) => void;

const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Slot = PlayerPub & { lastSeen: number; guessedAt: number; botSkill: number; botAt: number; botSays: number };

const MAX_OPS = 2500;
const GONE_MS = 20_000;
const HEARTBEAT_MS = 3000;
const NAME_MAX = 18;
const GUESS_MAX = 40;

export class QdHost {
  phase: Phase = "lobby";
  settings: Settings;
  private slots: Slot[] = [];
  private rand: () => number;
  private clock = 0;
  private phaseEnd = 0;
  private phaseStart = 0;
  private turn = -1;
  private totalTurns = 0;
  private drawOrder: string[] = [];
  private drawerId: string | null = null;
  private word: Word | null = null;
  private choices: Word[] = [];
  private used = new Set<string>();
  private ops: DrawOp[] = [];
  private hintsOut = 0;
  private correct = 0;
  private hitOrder: string[] = [];
  private chatId = 1;
  private dirty = true;
  private lastBeat = 0;
  private strokeCount = 0;
  private revealWord: string | null = null;

  constructor(
    readonly code: string,
    readonly hostId: string,
    hostName: string,
    seed: number,
    private send: Send,
    settings: Partial<Settings> = {},
  ) {
    this.rand = rng(seed ^ 0x51ed270b);
    this.settings = cleanSettings({ ...DEFAULT_SETTINGS, ...settings });
    this.addPlayer(hostId, hostName, false);
    this.syncBots();
  }

  // ---------------------------------------------------------------- consultas
  get players(): PlayerPub[] {
    return this.slots;
  }
  private humans(): Slot[] {
    return this.slots.filter((p) => !p.bot);
  }
  private present(): Slot[] {
    return this.slots.filter((p) => p.connected);
  }
  private slot(id: string | null): Slot | undefined {
    return id ? this.slots.find((p) => p.id === id) : undefined;
  }
  get currentWord(): Word | null {
    return this.word;
  }
  get drawer(): string | null {
    return this.drawerId;
  }
  get opLog(): readonly DrawOp[] {
    return this.ops;
  }

  snapshot(): PubState {
    const drawing = this.phase === "drawing";
    const total = this.phaseEnd - this.phaseStart;
    return {
      v: 1,
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      settings: this.settings,
      players: this.slots.map((p) => ({ id: p.id, name: p.name, score: p.score, gain: p.gain, guessed: p.guessed, bot: p.bot, connected: p.connected, drawings: p.drawings, guesses: p.guesses, streak: p.streak })),
      turn: Math.max(0, this.turn),
      totalTurns: this.totalTurns,
      round: this.totalTurns && this.drawOrder.length ? Math.floor(Math.max(0, this.turn) / this.drawOrder.length) + 1 : 0,
      drawerId: this.drawerId,
      mask: drawing && this.word ? maskOf(this.word.text) : null,
      hints: drawing && this.word ? this.word.hints.slice(0, this.hintsOut) : [],
      category: this.word && drawing ? this.word.category : null,
      level: this.word && (drawing || this.phase === "reveal") ? this.word.level : null,
      word: this.phase === "reveal" ? this.revealWord : null,
      leftMs: this.phase === "lobby" || this.phase === "end" ? 0 : Math.max(0, this.phaseEnd - this.clock),
      totalMs: this.phase === "lobby" || this.phase === "end" ? 0 : total,
      order: this.hitOrder,
    };
  }

  // ---------------------------------------------------------------- jogadores
  private addPlayer(id: string, name: string, bot: boolean): Slot {
    const p: Slot = { id, name: name.trim().slice(0, NAME_MAX) || "Jogador", score: 0, gain: 0, guessed: false, bot, connected: true, drawings: 0, guesses: 0, streak: 0, lastSeen: this.clock, guessedAt: 0, botSkill: 0.4 + this.rand() * 0.5, botAt: 0, botSays: 0 };
    this.slots.push(p);
    this.dirty = true;
    return p;
  }

  private syncBots() {
    if (this.phase !== "lobby") return;
    const want = this.settings.bots;
    let have = this.slots.filter((p) => p.bot).length;
    while (have > want) {
      const i = this.slots.map((p) => p.bot).lastIndexOf(true);
      this.slots.splice(i, 1);
      have--;
    }
    const names = BOT_NAMES.filter((n) => !this.slots.some((p) => p.name === n));
    while (have < want && this.slots.length < this.settings.maxPlayers) {
      this.addPlayer(`bot-${have + 1}-${Math.floor(this.rand() * 1e6)}`, names.splice(Math.floor(this.rand() * names.length), 1)[0] ?? `Robô ${have + 1}`, true);
      have++;
    }
    this.dirty = true;
  }

  private sys(text: string, to: string | string[] | null = null) {
    this.send(to, { t: "chat", c: { id: this.chatId++, kind: "sys", text } });
  }

  // ---------------------------------------------------------------- entrada de pedidos
  handle(from: string, msg: ToHost) {
    const p = this.slot(from);
    if (msg.t === "hello") {
      if (p) {
        // voltou (ou clicou duas vezes): só atualiza
        p.connected = true;
        p.lastSeen = this.clock;
        this.dirty = true;
        this.send(from, { t: "canvas", ops: this.ops });
        return;
      }
      if (this.phase !== "lobby") return this.send(from, { t: "deny", reason: "A partida já começou. Espere a próxima." });
      if (this.slots.length >= this.settings.maxPlayers) return this.send(from, { t: "deny", reason: "A sala está cheia." });
      const n = this.addPlayer(from, String(msg.name ?? ""), false);
      this.sys(`${n.name} entrou na sala.`);
      return;
    }
    if (!p) return;
    p.lastSeen = this.clock;
    switch (msg.t) {
      case "ping":
        break;
      case "bye":
        this.leave(p);
        break;
      case "settings":
        if (from === this.hostId && this.phase === "lobby") {
          this.settings = cleanSettings({ ...this.settings, ...msg.settings });
          this.syncBots();
          this.dirty = true;
        }
        break;
      case "start":
        if (from === this.hostId && this.phase === "lobby") this.start();
        break;
      case "again":
        if (from === this.hostId && this.phase === "end") this.reset();
        break;
      case "pick":
        if (this.phase === "choosing" && from === this.drawerId && Number.isInteger(msg.i) && this.choices[msg.i]) this.beginDrawing(this.choices[msg.i]);
        break;
      case "guess":
        if (this.phase === "drawing") this.guess(p, String(msg.text ?? ""));
        break;
      case "op":
        if (this.phase === "drawing" && from === this.drawerId) this.record(msg);
        break;
    }
  }

  private leave(p: Slot) {
    if (this.phase === "lobby") {
      this.slots.splice(this.slots.indexOf(p), 1);
      this.sys(`${p.name} saiu.`);
      this.dirty = true;
      return;
    }
    p.connected = false;
    this.sys(`${p.name} saiu da partida.`);
    this.dirty = true;
    this.afterLeave(p);
  }

  private afterLeave(p: Slot) {
    if (this.phase === "choosing" && p.id === this.drawerId) this.toReveal(`${p.name} saiu, a vez foi pulada.`, true);
    else if (this.phase === "drawing") {
      if (p.id === this.drawerId) this.toReveal(`${p.name} saiu, a vez foi pulada.`, true);
      else this.maybeAllGuessed();
    }
    if (this.humans().filter((h) => h.connected).length === 0 && this.phase !== "end") this.phase = "end";
  }

  // ---------------------------------------------------------------- partida
  private start() {
    const humans = this.humans().filter((h) => h.connected);
    if (this.present().length < MIN_PLAYERS) return this.sys(`Precisa de pelo menos ${MIN_PLAYERS} jogadores.`, this.hostId);
    this.drawOrder = humans.map((h) => h.id);
    this.totalTurns = this.drawOrder.length * this.settings.rounds;
    this.turn = -1;
    this.used.clear();
    for (const p of this.slots) {
      p.score = 0;
      p.gain = 0;
      p.drawings = 0;
      p.guesses = 0;
      p.streak = 0;
    }
    this.sys("A partida começou!");
    this.nextTurn();
  }

  private reset() {
    this.phase = "lobby";
    this.turn = -1;
    this.drawerId = null;
    this.word = null;
    this.ops = [];
    for (const p of this.slots) {
      p.score = 0;
      p.gain = 0;
      p.guessed = false;
      p.drawings = 0;
      p.guesses = 0;
      p.streak = 0;
    }
    this.slots = this.slots.filter((p) => p.connected);
    this.syncBots();
    this.dirty = true;
  }

  private nextTurn() {
    this.turn++;
    // quem saiu não desenha: pula a vez
    while (this.turn < this.totalTurns && !this.slot(this.drawOrder[this.turn % this.drawOrder.length])?.connected) this.turn++;
    if (this.turn >= this.totalTurns || this.present().length < MIN_PLAYERS) return this.finish();
    this.drawerId = this.drawOrder[this.turn % this.drawOrder.length];
    this.word = null;
    this.revealWord = null;
    this.ops = [];
    this.strokeCount = 0;
    this.hitOrder = [];
    this.correct = 0;
    this.hintsOut = 0;
    for (const p of this.slots) {
      p.guessed = false;
      p.gain = 0;
    }
    this.choices = drawChoices(this.rand, this.settings, this.used);
    this.phase = "choosing";
    this.phaseStart = this.clock;
    this.phaseEnd = this.clock + CHOOSE_SECONDS * 1000;
    this.send(this.drawerId, { t: "choices", words: this.choices.map((w, i) => ({ i, text: w.text, level: w.level, category: w.category })) });
    this.send(null, { t: "canvas", ops: [] });
    this.dirty = true;
  }

  private beginDrawing(w: Word) {
    this.word = w;
    this.used.add(w.id);
    this.phase = "drawing";
    this.phaseStart = this.clock;
    this.phaseEnd = this.clock + this.settings.drawSeconds * 1000;
    this.send(this.drawerId, { t: "secret", text: w.text });
    for (const p of this.slots) {
      if (!p.bot) continue;
      // o computador acerta com chance e hora próprias: palavras fáceis saem antes
      const ease = w.level === "facil" ? 0.9 : w.level === "medio" ? 0.65 : 0.4;
      const chance = Math.min(0.95, ease * (0.55 + p.botSkill * 0.6));
      p.botAt = this.rand() < chance ? this.clock + this.settings.drawSeconds * 1000 * (0.18 + this.rand() * (0.62 - p.botSkill * 0.25)) : Infinity;
      p.botSays = this.clock + 4000 + this.rand() * 8000;
    }
    this.dirty = true;
  }

  private record(op: DrawOp) {
    if (this.ops.length >= MAX_OPS) return;
    const clean = cleanOp(op);
    if (!clean) return;
    if (clean.k === "s") this.strokeCount++;
    if (clean.k === "c") {
      this.ops = [];
      this.strokeCount = 0;
    }
    this.ops.push(clean);
  }

  private guess(p: Slot, raw: string) {
    if (p.id === this.drawerId || !p.connected) return;
    const text = raw.trim().slice(0, GUESS_MAX);
    if (!text || !this.word) return;
    // quem já acertou conversa só com quem também acertou (e com o desenhista): ninguém entrega a resposta
    if (p.guessed) {
      const circle = this.slots.filter((o) => o.guessed || o.id === this.drawerId).map((o) => o.id);
      return this.send(circle, { t: "chat", c: { id: this.chatId++, kind: "guess", name: p.name, text } });
    }
    const r = judgeGuess(this.word, text);
    if (r === "certo") return this.hit(p);
    if (r === "quase") this.send(p.id, { t: "chat", c: { id: this.chatId++, kind: "near", text: "Está quase! Confira a escrita." } });
    this.send(null, { t: "chat", c: { id: this.chatId++, kind: "guess", name: p.name, text } });
  }

  private hit(p: Slot) {
    const total = this.phaseEnd - this.phaseStart;
    const elapsed = this.clock - this.phaseStart;
    const pts = guessPoints(elapsed, total, this.hintsOut);
    p.guessed = true;
    p.score += pts;
    p.gain = pts;
    p.guesses++;
    p.streak++;
    this.correct++;
    this.hitOrder.push(p.id);
    this.send(null, { t: "chat", c: { id: this.chatId++, kind: "hit", name: p.name, text: `${p.name} acertou! +${pts}` } });
    this.dirty = true;
    this.maybeAllGuessed();
  }

  private maybeAllGuessed() {
    if (this.phase !== "drawing") return;
    const guessers = this.present().filter((p) => p.id !== this.drawerId);
    if (guessers.length > 0 && guessers.every((p) => p.guessed)) this.toReveal("Todo mundo acertou!");
  }

  private toReveal(note: string, skipped = false) {
    const d = this.slot(this.drawerId);
    if (d && !skipped) {
      const guessers = this.present().filter((p) => p.id !== d.id).length;
      const pts = drawerPoints(this.correct, guessers);
      d.score += pts;
      d.gain = pts;
      d.drawings++;
    }
    for (const p of this.slots) if (!p.guessed && p.id !== this.drawerId) p.streak = 0;
    this.revealWord = this.word?.text ?? null;
    this.phase = "reveal";
    this.phaseStart = this.clock;
    this.phaseEnd = this.clock + REVEAL_SECONDS * 1000;
    if (this.word) this.sys(`${note} A resposta era: ${this.word.text}.`);
    else this.sys(note);
    this.dirty = true;
  }

  private finish() {
    this.phase = "end";
    this.drawerId = null;
    this.word = null;
    this.dirty = true;
    this.send(null, { t: "canvas", ops: [] });
  }

  /** Ranking final, do maior para o menor placar (empates dividem a colocação). */
  ranking(): (PlayerPub & { place: number })[] {
    const list = [...this.slots].sort((a, b) => b.score - a.score);
    let place = 0;
    let last = Infinity;
    return list.map((p, i) => {
      if (p.score < last) {
        place = i + 1;
        last = p.score;
      }
      return { ...p, place };
    });
  }

  // ---------------------------------------------------------------- tempo
  tick(dtMs: number) {
    this.clock += Math.max(0, Math.min(dtMs, 1000));
    // quem sumiu há muito tempo sai (a internet caiu ou fechou a aba)
    for (const p of this.slots) if (!p.bot && p.connected && p.id !== this.hostId && this.clock - p.lastSeen > GONE_MS) this.leave(p);

    if (this.phase === "choosing" && this.clock >= this.phaseEnd) this.beginDrawing(this.choices[Math.floor(this.rand() * this.choices.length)]);
    else if (this.phase === "drawing") {
      const total = this.phaseEnd - this.phaseStart;
      const shown = hintsShown(this.clock - this.phaseStart, total);
      if (shown > this.hintsOut) {
        this.hintsOut = shown;
        this.dirty = true;
      }
      this.tickBots();
      if (this.phase === "drawing" && this.clock >= this.phaseEnd) this.toReveal(this.correct ? "Fim do tempo!" : "Ninguém acertou.");
    } else if (this.phase === "reveal" && this.clock >= this.phaseEnd) this.nextTurn();

    if (this.dirty || this.clock - this.lastBeat >= HEARTBEAT_MS) {
      this.dirty = false;
      this.lastBeat = this.clock;
      this.send(null, { t: "state", s: this.snapshot() });
    }
  }

  private tickBots() {
    if (!this.word) return;
    for (const p of this.slots) {
      if (!p.bot || p.guessed || p.id === this.drawerId) continue;
      // o computador só entende o desenho depois de ver alguns traços
      if (this.clock >= p.botAt && this.strokeCount >= 3) {
        p.botAt = Infinity;
        this.hit(p);
        if (this.phase !== "drawing") return;
      } else if (this.clock >= p.botSays && this.strokeCount >= 1) {
        // palpites errados para dar vida à sala
        p.botSays = this.clock + 5000 + this.rand() * 9000;
        const w = WORDS[Math.floor(this.rand() * WORDS.length)];
        if (w.id !== this.word.id) this.send(null, { t: "chat", c: { id: this.chatId++, kind: "guess", name: p.name, text: w.text } });
      }
    }
  }
}

/** Limpa uma operação de desenho vinda da rede: números no intervalo, cor válida, tamanho do lote limitado. */
export function cleanOp(op: DrawOp): DrawOp | null {
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1, Math.round(v * 1000) / 1000)) : 0);
  switch (op?.k) {
    case "s":
      return { k: "s", c: typeof op.c === "string" && /^#[0-9a-fA-F]{6}$/.test(op.c) ? op.c : "#111111", w: Math.max(1, Math.min(40, Math.round(Number(op.w) || 4))), x: n(op.x), y: n(op.y) };
    case "p":
      return Array.isArray(op.p) ? { k: "p", p: op.p.slice(0, 80).map(n) } : null;
    case "e":
    case "u":
    case "c":
      return { k: op.k };
    default:
      return null;
  }
}

