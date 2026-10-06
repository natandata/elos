"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { MAX_PLAYERS, type RoomInfo, watchRooms } from "@/lib/minearena/net/room";

/** Salas co-op abertas agora: qualquer jogador pode entrar (até 4 por sala). */
export function CoopLobby({ sb, myId, busy, error, onJoin, onBack }: { sb: SupabaseClient; myId: string; busy: boolean; error: string | null; onJoin: (r: RoomInfo) => void; onBack: () => void }) {
  const [rooms, setRooms] = useState<RoomInfo[] | null>(null);

  useEffect(() => {
    const stop = watchRooms(sb, myId, setRooms);
    return stop;
  }, [sb, myId]);

  return (
    <div className="ma-load">
      <h2 className="ma-lobby-title">👥 Salas co-op</h2>
      {error ? <p className="ma-lobby-error">{error}</p> : null}
      {rooms === null ? (
        <p className="ma-lobby-empty">Procurando salas…</p>
      ) : rooms.length === 0 ? (
        <p className="ma-lobby-empty">Nenhuma sala aberta agora. Peça a um colega pra abrir uma pelo menu de pausa (👥 Abrir sala).</p>
      ) : (
        <ul>
          {rooms.map((r) => (
            <li key={r.hostId}>
              <button type="button" className="ma-world" disabled={busy || r.players >= MAX_PLAYERS} onClick={() => onJoin(r)}>
                <b>{r.name}</b>
                <small>
                  de {r.hostName} · {r.players}/{MAX_PLAYERS} jogadores {r.players >= MAX_PLAYERS ? "· cheia" : ""}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="ma-btn ma-btn-dark" onClick={onBack}>
        Voltar
      </button>
    </div>
  );
}
