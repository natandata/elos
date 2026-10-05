"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { MATCH_TICKS, TICKS_PER_SEC, type GameState, type Side } from "@/lib/arena/core";

// Quem está na Arena agora (online), se está jogando, em qual arena, ganhando ou
// perdendo e quanto falta pra partida acabar. Tudo por presença do Realtime:
// cada jogador "anuncia" o próprio estado e o ranking só escuta (nada vai pro banco).

export type PresenceMode = "cpu" | "pvp" | "duo" | "tournament";
export type Presence = {
  s: "idle" | "playing";
  mode?: PresenceMode;
  arena?: number;
  /** quando a partida acaba (ms, relógio do aparelho de quem joga) */
  endsAt?: number;
  lead?: "win" | "lose" | "tie";
  crowns?: [number, number];
};

const EMPTY = new Map<string, Presence>();
let sb: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let subscribed = false;
let refs = 0;
let self: Presence = { s: "idle" };
let online = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function track() {
  if (channel && subscribed) void channel.track({ ...self });
}

export function setPresence(p: Presence) {
  self = p;
  track();
}

function join(userId: string) {
  if (refs++ > 0) return;
  sb = createClient();
  const ch = sb.channel("arena-presence", { config: { presence: { key: userId } } });
  channel = ch;
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState() as Record<string, Presence[]>;
    const next = new Map<string, Presence>();
    for (const [key, metas] of Object.entries(state)) {
      const list = metas ?? [];
      const pick = list.find((m) => m.s === "playing") ?? list[list.length - 1];
      if (pick) next.set(key, pick);
    }
    online = next;
    emit();
  });
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      subscribed = true;
      track();
    }
  });
}

function leave() {
  if (--refs > 0) return;
  const ch = channel;
  const client = sb;
  channel = null;
  sb = null;
  subscribed = false;
  online = EMPTY;
  self = { s: "idle" };
  emit();
  if (ch) {
    void ch.untrack();
    void client?.removeChannel(ch);
  }
}

type LiveDriver = { game: GameState; mySide: Side; arena: number };

/** Resumo da partida pra quem olha o ranking: placar (coroas, depois vida das torres) e tempo. */
function live(d: LiveDriver, mode: PresenceMode): Presence {
  const g = d.game;
  const me = d.mySide;
  const them = (1 - me) as Side;
  const hp = [0, 0];
  for (const e of g.entities) if (e.type === "tower" && e.hp > 0) hp[e.side] += e.hp;
  const cm = g.crowns[me];
  const ct = g.crowns[them];
  const lead = cm > ct ? "win" : cm < ct ? "lose" : hp[me] > hp[them] + 1 ? "win" : hp[them] > hp[me] + 1 ? "lose" : "tie";
  return { s: "playing", mode, arena: d.arena, lead, crowns: [cm, ct], endsAt: Date.now() + (Math.max(0, MATCH_TICKS - g.tick) / TICKS_PER_SEC) * 1000 };
}

/**
 * Entra na presença da Arena (fica "online") e, enquanto `playing`, anuncia a
 * partida em andamento a cada poucos segundos.
 */
export function useArenaPresence(userId: string, mode: PresenceMode, driver: LiveDriver | null | undefined, playing: boolean) {
  useEffect(() => {
    join(userId);
    return () => leave();
  }, [userId]);

  useEffect(() => {
    if (!playing || !driver) {
      setPresence({ s: "idle" });
      return;
    }
    const push = () => setPresence(live(driver, mode));
    push();
    const t = setInterval(push, 2500);
    return () => {
      clearInterval(t);
      setPresence({ s: "idle" });
    };
  }, [playing, driver, mode]);
}

/** Quem está online agora (chave = id do jogador). */
export function useOnlineMap(): Map<string, Presence> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => online,
    () => EMPTY,
  );
}

/** Relógio que atualiza a cada segundo (pra contagem regressiva). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
