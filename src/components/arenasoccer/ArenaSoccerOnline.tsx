"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SoccerNet } from "@/lib/arenasoccer/net";
import { createClient } from "@/lib/supabase/client";
import { ArenaSoccerGame, type MatchResult } from "./ArenaSoccerGame";

type OpenRoom = { id: string; host: string; color: string; since: string };
type Playing = { net: SoccerNet; roomId: string };

const EVENTS = ["snap", "inp", "hello", "skip"] as const;

/** Salas do ArenaSoccer online: crie uma sala ou entre numa aberta, de qualquer Elo. A partida é 1 contra 1. */
export function ArenaSoccerOnline({ color, myName, onFinish, onBack }: { color: string; myName: string; onFinish: (r: MatchResult) => void; onBack: () => void }) {
  const [sb] = useState(() => createClient());
  const [rooms, setRooms] = useState<OpenRoom[]>([]);
  const [mine, setMine] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chRef = useRef<RealtimeChannel | null>(null);
  const roomRef = useRef<string | null>(null);
  const aliveRef = useRef(true);

  /** Abre o canal da sala e entrega o "net" que o jogo usa. */
  const openNet = useCallback(
    async (roomId: string, role: "host" | "guest", oppName: string, hostColor: string): Promise<SoccerNet | null> => {
      const handlers = new Map<string, Set<(p: unknown) => void>>();
      const ch = sb.channel(`soccer:${roomId}`, { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "*" }, (m: { event: string; payload: unknown }) => handlers.get(m.event)?.forEach((f) => f(m.payload)));
      const ok = await new Promise<boolean>((resolve) => {
        const timer = window.setTimeout(() => resolve(false), 10_000);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            window.clearTimeout(timer);
            resolve(true);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            window.clearTimeout(timer);
            resolve(false);
          }
        });
      });
      if (!ok) {
        void sb.removeChannel(ch);
        return null;
      }
      chRef.current = ch;
      return {
        role,
        myName,
        oppName,
        hostColor,
        send: (event, payload) => void ch.send({ type: "broadcast", event, payload }),
        on: (event, fn) => {
          const set = handlers.get(event) ?? new Set();
          set.add(fn);
          handlers.set(event, set);
          return () => set.delete(fn);
        },
      };
    },
    [sb, myName],
  );

  const leave = useCallback(
    (status: "finished" | "cancelled") => {
      const id = roomRef.current;
      roomRef.current = null;
      if (id) void sb.rpc("soccer_room_close", { p_room: id, p_status: status });
      if (chRef.current) void sb.removeChannel(chRef.current);
      chRef.current = null;
    },
    [sb],
  );

  // lista de salas abertas
  useEffect(() => {
    if (playing) return;
    let stop = false;
    const load = async () => {
      const { data } = await sb.rpc("soccer_rooms_open");
      if (!stop) setRooms(Array.isArray(data) ? (data as OpenRoom[]) : []);
    };
    void load();
    const t = window.setInterval(load, 4000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [sb, playing]);

  // quem criou a sala espera alguém entrar
  useEffect(() => {
    if (!mine || playing) return;
    let stop = false;
    const t = window.setInterval(async () => {
      const { data } = await sb.rpc("soccer_room_state", { p_room: mine });
      const st = data as { status?: string; guest?: string } | null;
      if (stop || !st) return;
      if (st.status === "playing") {
        stop = true;
        window.clearInterval(t);
        const net = await openNet(mine, "host", st.guest ?? "Adversário", color);
        if (!aliveRef.current) return;
        if (!net) {
          setError("Não foi possível conectar. Tente de novo.");
          leave("cancelled");
          setMine(null);
          return;
        }
        setPlaying({ net, roomId: mine });
      } else if (st.status !== "open") {
        stop = true;
        window.clearInterval(t);
        setMine(null);
      }
    }, 2000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [mine, playing, sb, openNet, color, leave]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      leave("cancelled");
    };
  }, [leave]);

  async function create() {
    setBusy(true);
    setError(null);
    const { data, error: e } = await sb.rpc("soccer_room_create", { p_color: color });
    setBusy(false);
    const r = data as { id?: string; error?: string } | null;
    if (e || !r?.id) {
      setError(r?.error ?? "Não foi possível criar a sala.");
      return;
    }
    roomRef.current = r.id;
    setMine(r.id);
  }

  async function cancel() {
    leave("cancelled");
    setMine(null);
  }

  async function join(id: string) {
    setBusy(true);
    setError(null);
    const { data } = await sb.rpc("soccer_room_join", { p_room: id });
    const r = data as { id?: string; host?: string; color?: string; error?: string } | null;
    if (!r?.id) {
      setBusy(false);
      setError(r?.error ?? "Essa sala já não está disponível.");
      return;
    }
    roomRef.current = r.id;
    const net = await openNet(r.id, "guest", r.host ?? "Adversário", r.color ?? "#3b82f6");
    setBusy(false);
    if (!net) {
      setError("Não foi possível conectar. Tente de novo.");
      leave("cancelled");
      return;
    }
    setPlaying({ net, roomId: r.id });
  }

  if (playing) {
    return (
      <ArenaSoccerGame
        mode="1v1"
        level="normal"
        color={color}
        net={playing.net}
        onFinish={(r) => {
          onFinish(r);
          leave("finished");
        }}
        onExit={() => {
          leave("cancelled");
          setPlaying(null);
          setMine(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <p className="text-lg font-black">🌐 Online · 1 contra 1</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Jogue contra outro jogador, de qualquer Elo. Vence quem chegar a 3 gols ou tiver mais gols em 3 minutos; empatou, gol de ouro. Você joga com a cor que escolheu (o adversário recebe a cor mais diferente da sua).</p>
        {mine ? (
          <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-center">
            <p className="font-black">Sala criada. Esperando um adversário…</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Deixe esta tela aberta. A sala some depois de 10 minutos sem ninguém entrar.</p>
            <button type="button" onClick={cancel} className="btn btn-ghost mt-3 w-full">
              Cancelar sala
            </button>
          </div>
        ) : (
          <button type="button" onClick={create} disabled={busy} className="btn btn-primary mt-3 w-full !py-3 disabled:opacity-60">
            ➕ Criar sala
          </button>
        )}
        {error ? <p className="mt-2 text-center text-xs font-semibold text-rose-600">{error}</p> : null}
      </section>

      <section className="card p-4">
        <p className="mb-2 text-sm font-black">Salas abertas ({rooms.length})</p>
        {rooms.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">Nenhuma sala aberta agora. Crie uma e chame alguém!</p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-[var(--line)] p-2.5">
                <i className="inline-block h-6 w-6 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="min-w-0 flex-1 truncate font-bold">{r.host}</span>
                <button type="button" onClick={() => join(r.id)} disabled={busy || !!mine} className="btn btn-primary !px-4 !py-1.5 !text-sm disabled:opacity-50">
                  Entrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        ← Voltar
      </button>
    </div>
  );
}

export const SOCCER_NET_EVENTS = EVENTS;
