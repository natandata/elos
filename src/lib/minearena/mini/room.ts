// Salas dos minigames: anúncio no lobby (presença) e a sala em si (anfitrião manda; convidados entram pelo "hello").
import type { SupabaseClient } from "@supabase/supabase-js";
import { type NetMsg, type Peer, RoomNet } from "../net/room";
import { MINI_BY_ID, type MiniGame, type MiniPlayer } from "./types";

export const MINI_LOBBY = "minearena-mini-lobby";
export const miniTopic = (hostId: string) => `minearena-mini:${hostId}`;

export interface MiniRoomInfo {
  hostId: string;
  hostName: string;
  game: MiniGame;
  players: number;
  max: number;
  started: boolean;
}

/** Salas abertas agora (presença do lobby dos minigames). */
export function watchMiniRooms(sb: SupabaseClient, myId: string, onChange: (rooms: MiniRoomInfo[]) => void): () => Promise<void> {
  const ch = sb.channel(MINI_LOBBY, { config: { presence: { key: `v-${myId}-${Math.random().toString(36).slice(2, 6)}` } } });
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState() as Record<string, MiniRoomInfo[]>;
    const rooms: MiniRoomInfo[] = [];
    for (const metas of Object.values(state)) for (const m of metas) if (m.hostId && m.hostId !== myId && !m.started) rooms.push(m);
    onChange(rooms);
  });
  ch.subscribe();
  return async () => {
    await sb.removeChannel(ch);
  };
}

export interface StartInfo {
  game: MiniGame;
  seed: number;
  theme: number;
  players: MiniPlayer[];
}

export interface RoomCb {
  onRoster: (list: MiniPlayer[]) => void;
  onStart: (s: StartInfo) => void;
  onClosed: (why: string) => void;
}

/**
 * A sala de espera. O anfitrião cria (`host`), os convidados entram (`join`). Depois do `start`, a mesma conexão (`net`)
 * segue para a partida.
 */
export class MiniRoom {
  readonly net: RoomNet;
  private list: MiniPlayer[];
  private ann: { update: (i: MiniRoomInfo) => void; close: () => Promise<void> } | null = null;
  private started = false;
  private closed = false;

  private constructor(
    private sb: SupabaseClient,
    readonly me: Peer,
    readonly hostId: string,
    readonly role: "host" | "guest",
    public game: MiniGame,
    private cb: RoomCb,
  ) {
    this.net = new RoomNet(sb, me, hostId, role, miniTopic(hostId));
    this.list = role === "host" ? [{ id: me.id, name: me.name }] : [];
  }

  static async host(sb: SupabaseClient, me: Peer, game: MiniGame, cb: RoomCb): Promise<MiniRoom> {
    const r = new MiniRoom(sb, me, me.id, "host", game, cb);
    await r.net.connect();
    r.wireHost();
    r.announce();
    cb.onRoster(r.list);
    return r;
  }

  static async join(sb: SupabaseClient, me: Peer, info: MiniRoomInfo, cb: RoomCb): Promise<MiniRoom> {
    const r = new MiniRoom(sb, me, info.hostId, "guest", info.game, cb);
    await r.net.connect();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        r.net.close();
        reject(new Error("A sala não respondeu. Ela pode ter fechado."));
      }, 8000);
      r.net.on("full", () => {
        clearTimeout(timer);
        r.net.close();
        reject(new Error("A sala está cheia."));
      });
      r.net.on("started", () => {
        clearTimeout(timer);
        r.net.close();
        reject(new Error("A partida já começou."));
      });
      r.net.on("welcome", (m) => {
        clearTimeout(timer);
        r.game = m.game as MiniGame;
        r.list = m.list as MiniPlayer[];
        resolve();
      });
      r.net.send("hello", { name: me.name });
    });
    r.wireGuest();
    cb.onRoster(r.list);
    return r;
  }

  get players(): MiniPlayer[] {
    return this.list;
  }

  private info(): MiniRoomInfo {
    return { hostId: this.hostId, hostName: this.me.name, game: this.game, players: this.list.length, max: MINI_BY_ID.get(this.game)?.max ?? 8, started: this.started };
  }

  private announce(): void {
    const ch = this.sb.channel(MINI_LOBBY, { config: { presence: { key: `h-${this.hostId}`, enabled: true } } });
    let ready = false;
    let cur = this.info();
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ready = true;
        void ch.track(cur);
      }
    });
    this.ann = {
      update: (i) => {
        cur = i;
        if (ready) void ch.track(i);
      },
      close: async () => {
        await this.sb.removeChannel(ch);
      },
    };
  }

  private sync(): void {
    this.cb.onRoster(this.list);
    this.net.send("roster", { list: this.list });
    this.ann?.update(this.info());
  }

  private wireHost(): void {
    const max = MINI_BY_ID.get(this.game)?.max ?? 8;
    this.net.on("hello", (m: NetMsg) => {
      if (this.started) return this.net.send("started", {}, m.from);
      if (!this.list.some((p) => p.id === m.from) && this.list.length >= max) return this.net.send("full", {}, m.from);
      if (!this.list.some((p) => p.id === m.from)) this.list.push({ id: m.from, name: String(m.name ?? "Jogador").slice(0, 24) });
      this.net.send("welcome", { game: this.game, list: this.list }, m.from);
      this.sync();
    });
    this.net.on("bye", (m: NetMsg) => {
      if (this.started) return;
      this.list = this.list.filter((p) => p.id !== m.from);
      this.sync();
    });
  }

  private wireGuest(): void {
    this.net.on("roster", (m: NetMsg) => {
      this.list = m.list as MiniPlayer[];
      this.cb.onRoster(this.list);
    });
    this.net.on("start", (m: NetMsg) => {
      this.started = true;
      this.cb.onStart({ game: m.game as MiniGame, seed: Number(m.seed), theme: Number(m.theme) || 0, players: m.players as MiniPlayer[] });
    });
    this.net.on("bye", (m: NetMsg) => {
      if (m.from === this.hostId && !this.started && !this.closed) {
        this.closed = true;
        this.cb.onClosed("O anfitrião fechou a sala.");
      }
    });
  }

  /** Anfitrião: começa a partida (a lista de jogadores fica fixa). */
  start(): StartInfo | null {
    if (this.role !== "host" || this.started) return null;
    const info: StartInfo = { game: this.game, seed: Math.floor(Math.random() * 2 ** 30), theme: Math.floor(Math.random() * 1000), players: [...this.list] };
    this.started = true;
    this.ann?.update(this.info());
    void this.ann?.close();
    this.ann = null;
    this.net.send("start", { ...info });
    this.cb.onStart(info);
    return info;
  }

  /** Sai da sala de espera (a conexão só é fechada se a partida não começou). */
  async leave(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const ann = this.ann;
    this.ann = null;
    if (!this.started) this.net.close();
    await ann?.close();
  }
}
