// Salas de Quem Desenha?: o mesmo anfitrião (host.ts) roda no aparelho de quem criou a sala e conversa com os outros
// pelo Supabase Realtime (canal de transmissão, nada vai para o banco). A sala de treino roda tudo no próprio aparelho.
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { QdHost, type Chat, type DrawOp, type PubState, type ToClient, type ToHost } from "./host";
import { type Settings } from "./rules";
import { type Category, type Level } from "./words";

export type Choice = { i: number; text: string; level: Level; category: Category };
export type RoomAd = { code: string; hostName: string; players: number; max: number; summary: string };

export type SessionEvents = {
  state: (s: PubState) => void;
  chat: (c: Chat) => void;
  choices: (w: Choice[]) => void;
  secret: (text: string) => void;
  /** desenho de outro jogador (ou o primeiro lote de uma sala em andamento) */
  op: (from: string, op: DrawOp) => void;
  canvas: (ops: DrawOp[]) => void;
  /** a sala fechou ou a conexão caiu */
  closed: (reason: string) => void;
};

export interface Session {
  readonly me: { id: string; name: string };
  readonly code: string;
  readonly isHost: boolean;
  send(msg: Exclude<ToHost, { t: "op" }>): void;
  sendOp(op: DrawOp): void;
  on<K extends keyof SessionEvents>(k: K, fn: SessionEvents[K]): void;
  /** salas locais e de anfitrião só começam a contar o tempo depois que a tela registrou os ouvintes */
  begin?(): void;
  close(): void;
}

type Listeners = { [K in keyof SessionEvents]?: SessionEvents[K] };

const LOBBY = "qd-lobby";
const roomTopic = (code: string) => `qd-room:${code}`;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

const summary = (s: Settings) => `${s.rounds} rodada${s.rounds > 1 ? "s" : ""} · ${s.drawSeconds}s`;

abstract class Base implements Session {
  protected ls: Listeners = {};
  abstract readonly isHost: boolean;
  constructor(
    readonly me: { id: string; name: string },
    readonly code: string,
  ) {}
  /** o último estado e o último desenho ficam guardados: quem registra o ouvinte depois ainda recebe */
  private buf: { state?: PubState; canvas?: DrawOp[] } = {};
  on<K extends keyof SessionEvents>(k: K, fn: SessionEvents[K]) {
    this.ls[k] = fn;
    if (k === "state" && this.buf.state) (fn as SessionEvents["state"])(this.buf.state);
    if (k === "canvas" && this.buf.canvas) (fn as SessionEvents["canvas"])(this.buf.canvas);
  }
  /** entrega ao cliente o que o anfitrião mandou */
  protected deliver(m: ToClient) {
    if (m.t === "state") this.buf.state = m.s;
    if (m.t === "canvas") this.buf.canvas = m.ops;
    if (m.t === "state") this.ls.state?.(m.s);
    else if (m.t === "chat") this.ls.chat?.(m.c);
    else if (m.t === "choices") this.ls.choices?.(m.words);
    else if (m.t === "secret") this.ls.secret?.(m.text);
    else if (m.t === "canvas") this.ls.canvas?.(m.ops);
    else if (m.t === "deny") this.ls.closed?.(m.reason);
  }
  abstract send(msg: Exclude<ToHost, { t: "op" }>): void;
  abstract sendOp(op: DrawOp): void;
  abstract close(): void;
}

// ---------------------------------------------------------------- treino: tudo neste aparelho
export class LocalSession extends Base {
  readonly isHost = true;
  private host: QdHost;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(me: { id: string; name: string }, settings: Partial<Settings>) {
    super(me, "TREINO");
    this.host = new QdHost("TREINO", me.id, me.name, (Date.now() ^ (Math.random() * 1e9)) >>> 0, (to, msg) => this.route(to, msg), settings);
  }

  private route(to: string | string[] | null, msg: ToClient) {
    const mine = to === null || to === this.me.id || (Array.isArray(to) && to.includes(this.me.id));
    if (mine) this.deliver(msg);
  }

  /** Começa a contar o tempo (chamado depois que a tela registrou os ouvintes). */
  begin() {
    if (this.timer) return;
    this.host.handle(this.me.id, { t: "hello", name: this.me.name });
    let last = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      this.host.tick(now - last);
      last = now;
    }, 100);
    this.host.tick(0);
  }

  send(msg: Exclude<ToHost, { t: "op" }>) {
    this.host.handle(this.me.id, msg);
    // quem age quer ver o resultado já: empurra o estado sem esperar o próximo relógio
    this.host.tick(0);
  }
  sendOp(op: DrawOp) {
    this.host.handle(this.me.id, { t: "op", ...op });
  }
  close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

// ---------------------------------------------------------------- sala de verdade: anfitrião e convidados
type Wire = { t: string; from: string; to?: string | string[] } & Record<string, unknown>;

class RealtimeBase extends Base {
  isHost = false;
  protected ch: RealtimeChannel;
  protected closedFlag = false;
  constructor(
    protected sb: SupabaseClient,
    me: { id: string; name: string },
    code: string,
  ) {
    super(me, code);
    this.ch = sb.channel(roomTopic(code), { config: { broadcast: { self: false } } });
  }
  protected wire(m: Record<string, unknown>) {
    void this.ch.send({ type: "broadcast", event: "m", payload: { ...m, from: this.me.id } });
  }
  protected subscribe(onWire: (m: Wire) => void): Promise<void> {
    this.ch.on("broadcast", { event: "m" }, ({ payload }) => {
      const m = payload as Wire;
      if (!m || typeof m.t !== "string" || typeof m.from !== "string" || m.from === this.me.id) return;
      if (m.to && (Array.isArray(m.to) ? !m.to.includes(this.me.id) : m.to !== this.me.id)) return;
      onWire(m);
    });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("A conexão demorou demais. Tente de novo.")), 9000);
      this.ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          reject(new Error("Sem conexão com o servidor de salas."));
        }
      });
    });
  }
  send(_msg: Exclude<ToHost, { t: "op" }>) {
    void _msg;
  }
  sendOp(_op: DrawOp) {
    void _op;
  }
  close() {
    this.closedFlag = true;
    void this.sb.removeChannel(this.ch);
  }
}

export class HostSession extends RealtimeBase {
  readonly isHost = true;
  private host!: QdHost;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ad: { update: (a: RoomAd) => void; close: () => void } | null = null;
  private lastAd = "";

  static async open(sb: SupabaseClient, me: { id: string; name: string }, settings: Partial<Settings>, publicRoom: boolean): Promise<HostSession> {
    // procura um código livre olhando o lobby (quem já usa um código aparece lá ou responde ao hello)
    const s = new HostSession(sb, me, newCode());
    s.host = new QdHost(s.code, me.id, me.name, (Date.now() ^ (Math.random() * 1e9)) >>> 0, (to, msg) => s.route(to, msg), settings);
    await s.subscribe((m) => s.onWire(m));
    if (publicRoom) s.ad = announce(sb, s.me.id);
    return s;
  }

  private route(to: string | string[] | null, msg: ToClient) {
    if (to === null || to === this.me.id || (Array.isArray(to) && to.includes(this.me.id))) this.deliver(msg);
    const others = to === null ? undefined : Array.isArray(to) ? to.filter((t) => t !== this.me.id) : to === this.me.id ? [] : [to];
    if (others && others.length === 0) return;
    this.wire({ ...msg, to: others });
    if (msg.t === "state") this.advertise(msg.s);
  }

  private advertise(s: PubState) {
    if (!this.ad) return;
    const open = s.phase === "lobby";
    const key = `${s.players.length}/${s.settings.maxPlayers}/${open}/${summary(s.settings)}`;
    if (key === this.lastAd) return;
    this.lastAd = key;
    // fora do lobby a sala some da lista (não dá para entrar no meio da partida)
    this.ad.update(open ? { code: this.code, hostName: this.me.name, players: s.players.length, max: s.settings.maxPlayers, summary: summary(s.settings) } : { code: "", hostName: "", players: 0, max: 0, summary: "" });
  }

  private onWire(m: Wire) {
    if (m.t === "op") {
      const { t: _t, from: _f, to: _to, ...rest } = m;
      void _t;
      void _f;
      void _to;
      this.host.handle(m.from, { t: "op", ...(rest as unknown as DrawOp) });
      this.ls.op?.(m.from, rest as unknown as DrawOp);
      return;
    }
    if (["hello", "ping", "bye", "guess", "pick", "again", "settings", "start"].includes(m.t)) {
      const { to: _to, ...msg } = m;
      void _to;
      this.host.handle(m.from, msg as unknown as ToHost);
    }
  }

  begin() {
    if (this.timer) return;
    this.host.handle(this.me.id, { t: "hello", name: this.me.name });
    let last = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      this.host.tick(now - last);
      last = now;
    }, 100);
    this.host.tick(0);
  }

  send(msg: Exclude<ToHost, { t: "op" }>) {
    this.host.handle(this.me.id, msg);
    this.host.tick(0);
  }
  sendOp(op: DrawOp) {
    this.host.handle(this.me.id, { t: "op", ...op });
    this.wire({ t: "op", ...op });
  }
  close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.ad?.close();
    // avisa os convidados antes de apagar o canal
    this.wire({ t: "closed", reason: "O anfitrião fechou a sala." });
    setTimeout(() => super.close(), 300);
  }
}

export class GuestSession extends RealtimeBase {
  readonly isHost = false;
  private timers: ReturnType<typeof setInterval>[] = [];
  private lastState = 0;

  /** Entra numa sala pelo código. Espera o anfitrião responder (ou desiste). */
  static async join(sb: SupabaseClient, me: { id: string; name: string }, code: string): Promise<GuestSession> {
    const s = new GuestSession(sb, me, code);
    let first: ((v: boolean) => void) | null = null;
    const got = new Promise<boolean>((r) => (first = r));
    let denied: string | null = null;
    await s.subscribe((m) => {
      if (m.from === undefined) return;
      if (m.t === "deny") denied = String(m.reason ?? "Não foi possível entrar.");
      else if (m.t === "closed") s.ls.closed?.(String(m.reason ?? "A sala fechou."));
      else if (m.t === "op") {
        const { t: _t, from: _f, to: _to, ...rest } = m;
        void _t;
        void _f;
        void _to;
        s.ls.op?.(m.from, rest as unknown as DrawOp);
      } else {
        if (m.t === "state") s.lastState = performance.now();
        s.deliver(m as unknown as ToClient);
      }
      if (m.t === "state" || m.t === "deny") first?.(m.t === "state");
    });
    // o anfitrião pode demorar a ouvir: repete o pedido a cada 1,5 s por até 9 s
    const asking = setInterval(() => s.wire({ t: "hello", name: me.name }), 1500);
    s.wire({ t: "hello", name: me.name });
    const ok = await Promise.race([got, new Promise<boolean>((r) => setTimeout(() => r(false), 9000))]);
    clearInterval(asking);
    if (!ok) {
      s.close();
      throw new Error(denied ?? "Sala não encontrada. Confira o código.");
    }
    s.lastState = performance.now();
    s.timers.push(setInterval(() => s.wire({ t: "ping" }), 4000));
    s.timers.push(
      setInterval(() => {
        if (!s.closedFlag && performance.now() - s.lastState > 14000) s.ls.closed?.("A conexão com a sala caiu.");
      }, 3000),
    );
    return s;
  }

  send(msg: Exclude<ToHost, { t: "op" }>) {
    this.wire({ ...msg });
  }
  sendOp(op: DrawOp) {
    this.wire({ t: "op", ...op });
  }
  close() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    try {
      this.wire({ t: "bye" });
    } catch {
      // saindo mesmo assim
    }
    super.close();
  }
}

// ---------------------------------------------------------------- lista de salas abertas
function announce(sb: SupabaseClient, hostId: string) {
  const ch = sb.channel(LOBBY, { config: { presence: { key: `h-${hostId}` } } });
  let ready = false;
  let current: RoomAd | null = null;
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      ready = true;
      if (current) void ch.track(current);
    }
  });
  return {
    update: (a: RoomAd) => {
      current = a;
      if (!ready) return;
      if (!a.code) void ch.untrack();
      else void ch.track(a);
    },
    close: () => void sb.removeChannel(ch),
  };
}

export function watchRooms(sb: SupabaseClient, onChange: (rooms: RoomAd[]) => void): () => void {
  const ch = sb.channel(LOBBY, { config: { presence: { key: `v-${Math.random().toString(36).slice(2, 8)}` } } });
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState() as Record<string, RoomAd[]>;
    const rooms: RoomAd[] = [];
    for (const metas of Object.values(state)) for (const m of metas) if (m.code && m.players < m.max) rooms.push(m);
    onChange(rooms);
  });
  ch.subscribe();
  return () => void sb.removeChannel(ch);
}
