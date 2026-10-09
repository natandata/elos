"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BEAUTY, baseFromBeauty } from "@/lib/games/dress/beauty";
import { hallChannel, type HallMsg, type HallPos, type HallRoster } from "@/lib/games/dress/hall";
import { firstName, type RoomPlayer } from "@/lib/games/dress/live";
import { fmtClock } from "@/lib/games/dress/rules";
import type { BibleTheme } from "@/lib/games/dress/themes";
import { createClient } from "@/lib/supabase/client";

const MallStore3D = dynamic(() => import("./MallStore3D").then((m) => m.MallStore3D), { ssr: false, loading: () => <p className="grid h-full place-items-center text-sm font-black text-purple-900">Abrindo a loja…</p> });

const BASE = baseFromBeauty(DEFAULT_BEAUTY);
const noop = () => undefined;

/**
 * Plateia no salão: a espectadora anda de câmera livre (joystick) ou segue uma jogadora e vê as modelos se vestindo.
 * Ela é invisível: nada que ela faz chega às jogadoras, só um aviso discreto de que alguém está assistindo.
 */
export function SpectatorHall({ code, round, theme, left, players, onExit }: { code: string; round: number; theme: BibleTheme; left: number; players: RoomPlayer[]; onExit: () => void }) {
  const sb = useMemo(() => createClient(), []);
  const positions = useRef<Record<string, HallPos>>({});
  const rosterMap = useRef<Map<string, HallRoster>>(new Map());
  const [roster, setRoster] = useState<HallRoster[]>([]);
  const [follow, setFollow] = useState<string | null>(null);

  useEffect(() => {
    const ch = sb.channel(hallChannel(code, round), { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      const m = payload as HallMsg;
      if (!m?.id) return;
      positions.current[m.id] = { x: m.x, z: m.z, fx: m.fx === -1 ? -1 : 1, mv: m.mv, t: Date.now() };
      const prev = rosterMap.current.get(m.id);
      const same = prev && prev.name === m.name && JSON.stringify(prev.look) === JSON.stringify(m.look) && JSON.stringify(prev.beauty) === JSON.stringify(m.beauty);
      if (!same) {
        rosterMap.current.set(m.id, { id: m.id, name: m.name, look: m.look ?? {}, beauty: m.beauty });
        setRoster([...rosterMap.current.values()]);
      }
    });
    ch.subscribe((status) => {
      if (process.env.NODE_ENV !== "production") (window as unknown as { __hall?: unknown }).__hall = { status, pos: positions.current };
    });
    return () => {
      void sb.removeChannel(ch);
    };
  }, [sb, code, round]);

  const done = players.filter((p) => p.eligible && p.ready).length;
  const total = players.filter((p) => p.eligible).length;

  return (
    <div className="vh-room" data-mall="1">
      <div className="vh-room-3d">
        <MallStore3D base={BASE} look={{}} onEquip={noop} onStation={noop} spectate roster={roster} positions={positions} follow={follow} />
      </div>
      <div className="vh-room-top">
        <button type="button" className="vh-iconbtn" aria-label="Sair da plateia" onClick={onExit}>
          ✕
        </button>
        <div className="vh-theme">
          <small>👀 Você está assistindo · só as jogadoras sabem que tem plateia</small>
          <b>{theme.name}</b>
        </div>
        <div className="vh-timer" data-low={left <= 30} role="timer" aria-label="Tempo restante">
          ⏱ {fmtClock(left)}
        </div>
      </div>
      <div className="vh-spec-bar">
        <button type="button" className="vh-chip !px-3 !py-1 !text-[11px]" data-on={follow === null} onClick={() => setFollow(null)}>
          🎥 Câmera livre
        </button>
        {roster.map((p) => (
          <button key={p.id} type="button" className="vh-chip !px-3 !py-1 !text-[11px]" data-on={follow === p.id} onClick={() => setFollow(follow === p.id ? null : p.id)}>
            {firstName(p.name).split(" ")[0]}
          </button>
        ))}
        {roster.length === 0 ? <span className="px-2 text-[11px] font-bold text-purple-900">As modelos aparecem aqui assim que começarem a andar…</span> : null}
        <span className="ml-auto rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-black text-amber-100">
          {done}/{total} prontas
        </span>
      </div>
    </div>
  );
}
