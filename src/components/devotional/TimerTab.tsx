"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";

const PRESETS = [5, 10, 15];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/** Temporizador simples pra focar no devocional sem distração — sem alarme
 *  sonoro (o app pode estar em segundo plano); avisa visualmente ao zerar. */
export function TimerTab() {
  const [minutes, setMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          setDone(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function selectPreset(m: number) {
    setMinutes(m);
    setSecondsLeft(m * 60);
    setRunning(false);
    setDone(false);
  }

  function toggle() {
    if (done) {
      setSecondsLeft(minutes * 60);
      setDone(false);
    }
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setDone(false);
    setSecondsLeft(minutes * 60);
  }

  const progress = 1 - secondsLeft / (minutes * 60);

  return (
    <Card className="flex flex-col items-center gap-5 py-8 text-center">
      <div className="flex gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => selectPreset(m)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              minutes === m
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>

      <div
        className="relative flex h-48 w-48 items-center justify-center rounded-full border-8"
        style={{
          borderColor: done ? "var(--accent)" : "var(--line)",
          background: `conic-gradient(var(--accent) ${progress * 360}deg, transparent 0deg)`,
        }}
      >
        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-[var(--card)]">
          <span className="text-3xl font-black tabular-nums">{formatClock(secondsLeft)}</span>
          {done ? <span className="mt-1 text-xs font-bold text-[var(--accent-strong)]">Tempo! 🙏</span> : null}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={toggle} className="btn btn-primary !px-8">
          {running ? "Pausar" : done ? "Recomeçar" : "Começar"}
        </button>
        <button type="button" onClick={reset} className="btn btn-ghost">
          Zerar
        </button>
      </div>
    </Card>
  );
}
