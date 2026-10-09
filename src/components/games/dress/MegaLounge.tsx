"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BEAUTY, baseFromBeauty, cleanBeauty } from "@/lib/games/dress/beauty";
import { loungeChannel, type HallPos, type HallRoster } from "@/lib/games/dress/hall";
import type { Look } from "@/lib/games/dress/items";
import { fmtClock } from "@/lib/games/dress/rules";
import { createClient } from "@/lib/supabase/client";

const MallStore3D = dynamic(() => import("./MallStore3D").then((m) => m.MallStore3D), { ssr: false, loading: () => <p className="grid h-full place-items-center text-sm font-black text-purple-900">Abrindo o salão…</p> });
const noop = () => undefined;

type Who = { id: string; name: string; look: Look; beauty: unknown };
type PosMsg = { id: string; x: number; z: number; fx: 1 | -1; mv: number };

/** Última aparência que a jogadora montou num camarim (o salão de espera usa ela). */
function lastLook(): { look: Look; beauty: unknown } {
  try {
    const raw = localStorage.getItem("vh:last");
    if (raw) return JSON.parse(raw) as { look: Look; beauty: unknown };
  } catch {
    /* sem aparência salva */
  }
  return { look: {}, beauty: DEFAULT_BEAUTY };
}

/**
 * Salão de espera do Mega Desfile (nos 30 min antes): um salão com passarela e telão onde as jogadoras andam juntas
 * até o desfile começar. As posições vão por um canal leve (poucas mensagens por segundo) e só as 16 mais recentes aparecem.
 */
export function MegaLounge({ code, meId, meName, left, online, onLeave }: { code: string; meId: string; meName: string; left: number; online: { id: string; name: string }[]; onLeave: () => void }) {
  const sb = useMemo(() => createClient(), []);
  const mine = useMemo(() => lastLook(), []);
  const base = useMemo(() => baseFromBeauty(cleanBeauty(mine.beauty)), [mine]);
  const positions = useRef<Record<string, HallPos>>({});
  const rosterMap = useRef<Map<string, HallRoster>>(new Map());
  const [roster, setRoster] = useState<HallRoster[]>([]);
  const chRef = useRef<ReturnType<typeof sb.channel> | null>(null);
  const lastWho = useRef(0);
  const [list, setList] = useState(false);

  useEffect(() => {
    const ch = sb.channel(loungeChannel(code), { config: { broadcast: { self: false } } });
    const sendWho = () => {
      lastWho.current = Date.now();
      void ch.send({ type: "broadcast", event: "who", payload: { id: meId, name: meName, look: mine.look, beauty: mine.beauty } satisfies Who });
    };
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      const m = payload as PosMsg;
      if (!m?.id || m.id === meId) return;
      positions.current[m.id] = { x: m.x, z: m.z, fx: m.fx === -1 ? -1 : 1, mv: m.mv, t: Date.now() };
      // alguém que eu ainda não conheço: me apresento (no máximo 1 vez a cada 2 s)
      if (!rosterMap.current.has(m.id) && Date.now() - lastWho.current > 2000) sendWho();
    });
    ch.on("broadcast", { event: "who" }, ({ payload }) => {
      const w = payload as Who;
      if (!w?.id || w.id === meId) return;
      const prev = rosterMap.current.get(w.id);
      if (prev && JSON.stringify([prev.look, prev.beauty]) === JSON.stringify([w.look, w.beauty])) return;
      rosterMap.current.set(w.id, { id: w.id, name: w.name, look: w.look ?? {}, beauty: w.beauty });
      setRoster([...rosterMap.current.values()].slice(0, 16));
      if (Date.now() - lastWho.current > 2000) sendWho();
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") sendWho();
    });
    chRef.current = ch;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __lounge?: unknown }).__lounge = { positions: positions.current, roster: rosterMap.current };
    const again = setInterval(sendWho, 12000);
    // quem some do salão sai da lista
    const sweep = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, p] of Object.entries(positions.current)) {
        if (now - p.t > 20000) {
          delete positions.current[id];
          rosterMap.current.delete(id);
          changed = true;
        }
      }
      if (changed) setRoster([...rosterMap.current.values()].slice(0, 16));
    }, 5000);
    return () => {
      clearInterval(again);
      clearInterval(sweep);
      chRef.current = null;
      void sb.removeChannel(ch);
    };
  }, [sb, code, meId, meName, mine]);

  const sendPos = (p: { x: number; z: number; fx: 1 | -1; mv: number }) => {
    void chRef.current?.send({ type: "broadcast", event: "pos", payload: { id: meId, x: +p.x.toFixed(2), z: +p.z.toFixed(2), fx: p.fx, mv: +p.mv.toFixed(2) } satisfies PosMsg });
  };

  return (
    <div className="vh-room" data-mall="1">
      <div className="vh-room-3d">
        <MallStore3D lounge base={base} look={{ tunic: "tunic_simple", ...mine.look }} onEquip={noop} onStation={noop} onPos={sendPos} roster={roster} positions={positions} countdown={fmtClock(Math.ceil(left))} />
      </div>
      <div className="vh-room-top">
        <button type="button" className="vh-iconbtn" aria-label="Sair do salão" onClick={onLeave}>
          ✕
        </button>
        <div className="vh-theme">
          <small>Toda sexta · 19h</small>
          <b>🎆 Salão de espera do Mega</b>
        </div>
        <div className="vh-timer" role="timer" aria-label="Falta para o desfile">
          ⏱ {fmtClock(Math.ceil(left))}
        </div>
      </div>
      <div className="vh-spec-bar">
        <button type="button" className="vh-chip !px-3 !py-1 !text-[11px]" data-on={list} onClick={() => setList((v) => !v)}>
          👥 {online.length} no salão
        </button>
        <span className="px-2 text-[11px] font-bold text-purple-900">Quando o relógio zerar, você vai direto para o camarim!</span>
      </div>
      {list ? (
        <ul className="vh-panel vh-pop absolute left-2 top-28 z-[6] max-h-60 w-52 space-y-1 overflow-y-auto !p-2 text-sm font-bold text-amber-50">
          {online.map((p) => (
            <li key={p.id} className="truncate">
              {p.id === meId ? "⭐ Você" : p.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
