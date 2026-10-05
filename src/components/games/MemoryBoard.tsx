"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardArt } from "@/components/arena/CardArt";
import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import { buildBoard, fmtMs } from "@/lib/games/memory";

const nowMs = () => Date.now();

export type MemoryResult = { turns: [number, number][]; ms: number };

/**
 * Tabuleiro do Jogo da Memória com as cartas da Arena.
 * Virar carta = giro 3D; par certo = brilho e "pulo"; par errado = tremida e as duas voltam.
 * `startedAt` (epoch ms) é o início do relógio (no duelo vem do servidor).
 */
export function MemoryBoard({
  seed,
  pairs,
  startedAt,
  onProgress,
  onComplete,
}: {
  seed: number;
  pairs: number;
  startedAt: number;
  onProgress?: (found: number) => void;
  onComplete: (r: MemoryResult) => void;
}) {
  const dense = pairs > 12; // 30+ cartas: 6 colunas e cartas menores
  const board = useMemo(() => buildBoard(seed, pairs), [seed, pairs]);
  const [up, setUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<number[]>([]);
  const [turnsCount, setTurnsCount] = useState(0);
  const [now, setNow] = useState(startedAt);
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  const turns = useRef<[number, number][]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setNow(nowMs()), 100);
    return () => clearInterval(t);
  }, [done]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const pick = useCallback(
    (i: number) => {
      if (lock.current || done || matched.has(i) || up.includes(i)) return;
      const next = [...up, i];
      setUp(next);
      if (next.length < 2) return;

      lock.current = true;
      const [a, b] = next;
      turns.current.push([a, b]);
      setTurnsCount(turns.current.length);

      if (board[a] === board[b]) {
        later(() => {
          const m = new Set(matched);
          m.add(a);
          m.add(b);
          setMatched(m);
          setUp([]);
          lock.current = false;
          onProgress?.(m.size / 2);
          if (m.size === board.length) {
            setDone(true);
            onComplete({ turns: turns.current, ms: nowMs() - startedAt });
          }
        }, 650);
      } else {
        later(() => setShake([a, b]), 450);
        later(() => {
          setUp([]);
          setShake([]);
          lock.current = false;
        }, 1000);
      }
    },
    [board, done, matched, onComplete, onProgress, startedAt, up],
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm font-black">
        <span className="rounded-full bg-[var(--card)] px-3 py-1 tabular-nums ring-1 ring-[var(--line)]">⏱ {fmtMs(Math.max(0, now - startedAt))}</span>
        <span className="rounded-full bg-[var(--card)] px-3 py-1 tabular-nums ring-1 ring-[var(--line)]">
          🃏 {matched.size / 2}/{pairs}
        </span>
        <span className="rounded-full bg-[var(--card)] px-3 py-1 tabular-nums ring-1 ring-[var(--line)]">🔄 {turnsCount}</span>
      </div>

      <div className={`grid ${dense ? "grid-cols-6 gap-1.5" : "grid-cols-4 gap-2"} [perspective:900px]`}>
        {board.map((key, i) => {
          const card = ARENA_CARD_BY_KEY.get(key);
          const faceUp = up.includes(i) || matched.has(i);
          const isMatched = matched.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              aria-label={faceUp && card ? card.name : "Carta virada"}
              className={`relative aspect-[3/4] select-none rounded-xl outline-none ${isMatched ? "mem-pop" : ""} ${shake.includes(i) ? "mem-shake" : ""}`}
            >
              <span
                className="absolute inset-0 block transition-transform duration-500 ease-out [transform-style:preserve-3d]"
                style={{ transform: faceUp ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                {/* costas */}
                <span className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-amber-300 bg-gradient-to-br from-indigo-600 via-violet-700 to-indigo-900 shadow-md [backface-visibility:hidden]">
                  <span className={`${dense ? "text-xl" : "text-3xl"} drop-shadow`} aria-hidden>
                    🛡️
                  </span>
                  {dense ? null : <span className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-amber-200">Arena</span>}
                </span>
                {/* frente */}
                <span
                  className={`absolute inset-0 flex flex-col items-center justify-between rounded-xl border-2 p-1 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    isMatched ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300" : "border-amber-300 bg-amber-50"
                  }`}
                >
                  <span className="flex min-h-0 flex-1 items-center">{card ? <CardArt card={card} className={dense ? "max-h-full h-9" : "max-h-full h-14"} /> : null}</span>
                  <span className={`w-full truncate text-center font-black ${dense ? "text-[7px]" : "text-[9px]"} leading-tight text-slate-800`}>{card?.name}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
