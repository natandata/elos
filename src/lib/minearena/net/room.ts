// Co-op por sala: canal de transmissão do Supabase Realtime (nada vai pro banco).
// O anfitrião manda no mundo; os convidados enviam seus blocos, posição e golpes.
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export const MAX_PLAYERS = 4;
export const LOBBY = "minearena-lobby";

export interface Peer {
  id: string;
  name: string;
}

export type NetMsg = { t: string; from: string; to?: string } & Record<string, unknown>;

export interface RoomInfo {
  hostId: string;
  hostName: string;
  name: string;
  players: number;
}

const roomTopic = (hostId: string) => `minearena-room:${hostId}`;

/** Salas abertas agora (presença do lobby): o anfitrião anuncia, todo mundo escuta. */
export function watchRooms(sb: SupabaseClient, myId: string, onChange: (rooms: RoomInfo[]) => void): () => void {
  const ch = sb.channel(LOBBY, { config: { presence: { key: `v-${myId}-${Math.random().toString(36).slice(2, 6)}` } } });
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState() as Record<string, RoomInfo[]>;
    const rooms: RoomInfo[] = [];
    for (const metas of Object.values(state)) for (const m of metas) if (m.hostId && m.hostId !== myId) rooms.push(m);
    onChange(rooms);
  });
  ch.subscribe();
  return () => void sb.removeChannel(ch);
}

/** Anuncia a sua sala no lobby (devolve a função de atualizar e a de fechar). */
export function announceRoom(sb: SupabaseClient, info: RoomInfo): { update: (info: RoomInfo) => void; close: () => void } {
  const ch = sb.channel(LOBBY, { config: { presence: { key: `h-${info.hostId}`, enabled: true } } });
  let ready = false;
  let current = info;
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      ready = true;
      void ch.track(current);
    }
  });
  return {
    update: (i) => {
      current = i;
      if (ready) void ch.track(i);
    },
    close: () => void sb.removeChannel(ch),
  };
}

export class RoomNet {
  private ch: RealtimeChannel;
  private handlers = new Map<string, (m: NetMsg) => void>();
  private lastSent = new Map<string, number>();
  /** Mensagens que chegaram antes de alguém registrar o tratador (ex.: lote de blocos logo após o aceite). */
  private early = new Map<string, NetMsg[]>();

  constructor(
    private sb: SupabaseClient,
    readonly me: Peer,
    readonly hostId: string,
    readonly role: "host" | "guest",
    topic?: string,
  ) {
    this.ch = sb.channel(topic ?? roomTopic(hostId), { config: { broadcast: { self: false } } });
    this.ch.on("broadcast", { event: "m" }, ({ payload }) => {
      const m = payload as NetMsg;
      if (!m || typeof m.t !== "string" || m.from === me.id) return;
      if (m.to && m.to !== me.id) return;
      const h = this.handlers.get(m.t);
      if (h) h(m);
      else {
        const q = this.early.get(m.t) ?? [];
        if (q.length < 200) q.push(m);
        this.early.set(m.t, q);
      }
    });
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 8000);
      this.ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          reject(new Error(status));
        }
      });
    });
  }

  on(t: string, fn: (m: NetMsg) => void): void {
    this.handlers.set(t, fn);
    const q = this.early.get(t);
    if (q) {
      this.early.delete(t);
      for (const m of q) fn(m);
    }
  }

  send(t: string, data: Record<string, unknown> = {}, to?: string): void {
    void this.ch.send({ type: "broadcast", event: "m", payload: { t, from: this.me.id, to, ...data } });
  }

  /** Envia no máximo uma vez a cada `ms` (posição e fotografias das criaturas). */
  sendEvery(t: string, ms: number, data: () => Record<string, unknown>): void {
    const now = performance.now();
    if (now - (this.lastSent.get(t) ?? 0) < ms) return;
    this.lastSent.set(t, now);
    this.send(t, data());
  }

  close(): void {
    try {
      this.send("bye");
    } catch {
      // saindo mesmo assim
    }
    void this.sb.removeChannel(this.ch);
  }
}

/** Pede pra entrar: espera o "welcome" (ou "full") do anfitrião. */
export async function joinRoom(
  sb: SupabaseClient,
  me: Peer,
  hostId: string,
): Promise<{ net: RoomNet; welcome: { seed: number; time: number; spawn: { x: number; y: number; z: number }; host: { x: number; y: number; z: number }; peers: Peer[]; lm?: { id: string; x: number; z: number; gy: number }[] } }> {
  const net = new RoomNet(sb, me, hostId, "guest");
  await net.connect();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      net.close();
      reject(new Error("A sala não respondeu. Ela pode ter fechado."));
    }, 8000);
    net.on("full", () => {
      clearTimeout(timer);
      net.close();
      reject(new Error("A sala está cheia."));
    });
    net.on("welcome", (m) => {
      clearTimeout(timer);
      resolve({ net, welcome: m as unknown as { seed: number; time: number; spawn: { x: number; y: number; z: number }; host: { x: number; y: number; z: number }; peers: Peer[]; lm?: { id: string; x: number; z: number; gy: number }[] } });
    });
    net.send("hello", { name: me.name });
  });
}
