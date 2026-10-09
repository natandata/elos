"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import type { Peer } from "@/lib/minearena/net/room";
import { MiniRoom, type MiniRoomInfo, type StartInfo, watchMiniRooms } from "@/lib/minearena/mini/room";
import { MINI_BY_ID, MINI_GAMES, type MiniGame, type MiniPlayer } from "@/lib/minearena/mini/types";

export type MiniLaunch = StartInfo & { room: MiniRoom; solo: boolean };

/** Minigames: escolher o jogo, achar ou criar sala, esperar os outros e começar. */
export function MiniMenu({ sb, me, free, onStart, onBack }: { sb: SupabaseClient; me: Peer; free: boolean; onStart: (l: MiniLaunch) => void; onBack: () => void }) {
  const [game, setGame] = useState<MiniGame | null>(null);
  const [rooms, setRooms] = useState<MiniRoomInfo[] | null>(null);
  const [room, setRoom] = useState<MiniRoom | null>(null);
  const [roster, setRoster] = useState<MiniPlayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<MiniRoom | null>(null);
  const startedRef = useRef(false);
  const stopRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!game || room) return;
    const stop = watchMiniRooms(sb, me.id, (all) => setRooms(all.filter((r) => r.game === game)));
    stopRef.current = stop;
    return () => {
      void stop();
      stopRef.current = null;
      setRooms(null);
    };
  }, [sb, me.id, game, room]);

  useEffect(
    () => () => {
      // sair da tela sem começar: fecha a sala
      if (!startedRef.current) roomRef.current?.leave();
    },
    [],
  );

  const cb = {
    onRoster: (list: MiniPlayer[]) => setRoster([...list]),
    onStart: (info: StartInfo) => {
      const r = roomRef.current;
      if (!r) return;
      startedRef.current = true;
      onStart({ ...info, room: r, solo: info.players.length < 2 });
    },
    onClosed: (why: string) => {
      roomRef.current = null;
      setRoom(null);
      setError(why);
    },
  };

  async function create(g: MiniGame) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // o canal do lobby precisa estar livre antes de anunciar a sala (mesmo nome de canal)
      await stopRef.current?.();
      const r = await MiniRoom.host(sb, me, g, cb);
      roomRef.current = r;
      setRoom(r);
    } catch {
      setError("Não consegui abrir a sala. Verifique a conexão.");
    }
    setBusy(false);
  }

  async function join(info: MiniRoomInfo) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await MiniRoom.join(sb, me, info, cb);
      roomRef.current = r;
      setRoom(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar na sala.");
    }
    setBusy(false);
  }

  async function leave() {
    const r = roomRef.current;
    roomRef.current = null;
    await r?.leave();
    setRoom(null);
    setRoster([]);
  }

  const info = game ? MINI_BY_ID.get(game) : null;

  // ---------------------------------------------------------------- sala de espera
  if (room && info) {
    const host = room.role === "host";
    const enough = roster.length >= info.min;
    const canStart = host && (enough || (free && roster.length >= 1));
    return (
      <div className="ma-load ma-mini">
        <h2 className="ma-lobby-title">
          {info.emoji} {info.name}
        </h2>
        <p className="ma-lobby-empty">
          Sala de espera · {roster.length}/{info.max} jogadores (mínimo {info.min})
        </p>
        <ul className="ma-mini-roster">
          {roster.map((p) => (
            <li key={p.id}>
              {p.id === room.hostId ? "👑 " : "🧑 "}
              {p.name}
              {p.id === me.id ? " (você)" : ""}
            </li>
          ))}
        </ul>
        {!enough ? <p className="ma-lobby-empty">Chame os colegas: eles entram pela lista de salas do {info.name}.</p> : null}
        {host ? (
          <button type="button" className="ma-btn" disabled={!canStart} onClick={() => room.start()}>
            {enough ? "▶ COMEÇAR A PARTIDA" : free && roster.length >= 1 ? (roster.length === 1 ? "▶ Testar sozinho (admin)" : `▶ Começar com ${roster.length} (admin)`) : `Faltam ${info.min - roster.length} jogador(es)`}
          </button>
        ) : (
          <p className="ma-lobby-empty">Esperando o anfitrião começar…</p>
        )}
        {error ? <p className="ma-lobby-error">{error}</p> : null}
        <button type="button" className="ma-btn ma-btn-dark" onClick={() => void leave()}>
          Sair da sala
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- salas de um jogo
  if (game && info) {
    return (
      <div className="ma-load ma-mini">
        <h2 className="ma-lobby-title">
          {info.emoji} {info.name}
        </h2>
        <p className="ma-lobby-empty">{info.tagline}</p>
        <ul className="ma-mini-how">
          {info.how.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <button type="button" className="ma-btn" disabled={busy} onClick={() => void create(game)}>
          ➕ Criar sala ({info.min} a {info.max} jogadores)
        </button>
        {error ? <p className="ma-lobby-error">{error}</p> : null}
        <h3 className="ma-mini-sub">Salas abertas</h3>
        {rooms === null ? (
          <p className="ma-lobby-empty">Procurando salas…</p>
        ) : rooms.length === 0 ? (
          <p className="ma-lobby-empty">Nenhuma sala aberta agora. Crie uma e chame os colegas!</p>
        ) : (
          <ul>
            {rooms.map((r) => (
              <li key={r.hostId}>
                <button type="button" className="ma-world" disabled={busy || r.players >= r.max} onClick={() => void join(r)}>
                  <b>Sala de {r.hostName}</b>
                  <small>
                    {r.players}/{r.max} jogadores {r.players >= r.max ? "· cheia" : ""}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="ma-btn ma-btn-dark"
          onClick={() => {
            setGame(null);
            setError(null);
          }}
        >
          Voltar
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- escolher o jogo
  return (
    <div className="ma-load ma-mini">
      <h2 className="ma-lobby-title">🎮 Minigames</h2>
      <p className="ma-lobby-empty">Partidas online com os colegas. Escolha um jogo:</p>
      <ul>
        {MINI_GAMES.map((g) => (
          <li key={g.id}>
            <button type="button" className="ma-world" onClick={() => setGame(g.id)}>
              <b>
                {g.emoji} {g.name}
              </b>
              <small>
                {g.tagline} · {g.min} a {g.max} jogadores
              </small>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="ma-btn ma-btn-dark" onClick={onBack}>
        Voltar
      </button>
    </div>
  );
}
