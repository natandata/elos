"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBabelGoal } from "@/lib/actions/babel";
import { GOALS, WEEK_LETTERS } from "@/lib/babel/economy";
import type { EnglishState } from "@/lib/english/data.server";
import { IcoBolt, IcoChat, IcoCheck, IcoFlame, IcoStar } from "./icons";

// Perfil do Babel: números da jornada, semana de ofensiva e escolha da meta diária.
export function ProfileView({ state, name }: { state: EnglishState; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [goal, setGoal] = useState(state.babel.goal);
  const b = state.babel;
  const stars = [...state.done.values()].reduce((a, n) => a + n, 0);
  const badges = [
    { title: "Fogo no Babel", sub: "Maior ofensiva", value: b.bestStreak, steps: [3, 7, 14, 30, 60, 100], icon: <IcoFlame className="h-9 w-9" /> },
    { title: "Mestre do XP", sub: "XP total", value: b.xpTotal, steps: [100, 500, 1000, 2500, 5000, 10000], icon: <IcoBolt className="h-9 w-9" /> },
    { title: "Colecionador", sub: "Estrelas", value: stars, steps: [3, 9, 18, 30, 45], icon: <IcoStar className="h-9 w-9 text-[var(--bb-gold)]" /> },
    { title: "Bate-papo", sub: "Conversas feitas", value: state.roleplayBest.size, steps: [1, 2, 3, 4], icon: <IcoChat className="h-9 w-9 text-[var(--bb-blue)]" /> },
  ].map((x) => {
    const lvl = x.steps.filter((n) => x.value >= n).length;
    const next = x.steps[lvl];
    return { ...x, lvl, next };
  });

  const pick = (xp: number) => {
    setGoal(xp);
    start(async () => {
      await setBabelGoal(xp);
      router.refresh();
    });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bb-green)] text-3xl font-black text-white">{name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1 className="text-2xl font-extrabold leading-tight">{name}</h1>
          <p className="bb-sub">Estudando inglês no Babel</p>
        </div>
      </div>

      <div className="bb-card mt-5 p-4">
        <p className="flex items-center gap-2 text-lg font-extrabold">
          <IcoFlame className="h-7 w-7" /> {state.streak} {state.streak === 1 ? "dia" : "dias"} de ofensiva
        </p>
        <div className="bb-week mt-3">
          {WEEK_LETTERS.map((l, i) => (
            <div key={i} className={`bb-day ${b.week[i] ? "on" : ""} ${i === b.dow ? "today" : ""}`}>
              <i>{b.week[i] ? <IcoCheck className="h-5 w-5" /> : null}</i>
              {l}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { icon: <IcoBolt className="h-7 w-7" />, v: b.xpTotal, l: "XP total" },
          { icon: <IcoFlame className="h-7 w-7" />, v: b.bestStreak, l: "Maior ofensiva" },
          { icon: <IcoStar className="h-7 w-7 text-[var(--bb-gold)]" />, v: stars, l: "Estrelas" },
          { icon: <IcoCheck className="h-7 w-7 text-[var(--bb-green)]" />, v: state.totalDone, l: "Lições feitas" },
        ].map((s) => (
          <div key={s.l} className="bb-card flex items-center gap-3 p-3">
            {s.icon}
            <div>
              <p className="text-xl font-extrabold leading-none">{s.v}</p>
              <p className="bb-sub text-xs">{s.l}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-xl font-extrabold">Conquistas</h2>
      <div className="grid gap-3">
        {badges.map((x) => (
          <div key={x.title} className="bb-card flex items-center gap-3 p-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--bb-soft)]">{x.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center justify-between text-base font-extrabold">
                {x.title}
                <span className="rounded-full bg-[var(--bb-gold)] px-2 py-0.5 text-xs font-black text-white">Nível {x.lvl}</span>
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="bb-bar !h-3">
                  <i style={{ width: `${x.next ? Math.round((x.value / x.next) * 100) : 100}%`, background: "var(--bb-gold)" }} />
                </div>
                <span className="text-xs font-extrabold tabular-nums text-[var(--bb-mute)]">{x.next ? `${x.value}/${x.next}` : "Máx."}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-xl font-extrabold">Meta diária</h2>
      <div className="grid gap-2">
        {GOALS.map((g) => (
          <button key={g.xp} type="button" disabled={pending} onClick={() => pick(g.xp)} className={`bb-opt flex items-center justify-between gap-3 ${goal === g.xp ? "bb-opt-sel" : ""}`}>
            <span>
              {g.label} <span className="bb-sub text-xs">· {g.hint}</span>
            </span>
            <span className="font-extrabold">{g.xp} XP</span>
          </button>
        ))}
      </div>
    </div>
  );
}
