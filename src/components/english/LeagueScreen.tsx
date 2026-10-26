"use client";

import { useEffect, useState } from "react";
import { TIERS, weekEndMs, zones } from "@/lib/babel/league";
import type { LeagueView } from "@/lib/babel/league.server";
import { IcoBolt, IcoShield } from "./icons";

function left(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d} d ${h} h` : `${h} h ${m % 60} min`;
}

// Liga semanal: divisão, contagem regressiva, zona de promoção/rebaixamento e a tabela do grupo.
export function LeagueScreen({ league }: { league: LeagueView }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const t = TIERS[league.tier - 1];
  const size = league.standings.length;
  const { promote: PROMOTE, demoteFrom } = zones(size);
  const last = league.last;

  return (
    <div className="mt-4">
      <div className="text-center">
        <IcoShield className="mx-auto h-20 w-20" />
        <h1 className="mt-1 text-2xl font-extrabold" style={{ color: t.color }}>
          Liga {t.name}
        </h1>
        <p className="bb-sub mt-1">
          {size > 1 ? `Os ${PROMOTE} primeiros sobem de divisão.` : "Você é o primeiro da sua liga. Chame mais amigos para disputar!"}{now ? ` Termina em ${left(weekEndMs(league.monday) - now)}.` : ""}
        </p>
        <div className="mt-3 flex justify-center gap-1.5" aria-label={`Divisão ${league.tier} de 10`}>
          {TIERS.map((x, i) => (
            <span key={x.name} className="h-3 w-3 rounded-full" style={{ background: i < league.tier ? x.color : "var(--bb-line)" }} />
          ))}
        </div>
      </div>

      {last ? (
        <p className={`mt-4 rounded-2xl px-4 py-2 text-center text-sm font-extrabold ${last.result === "promoted" ? "bg-[var(--bb-ok-bg)] text-[var(--bb-ok-ink)]" : last.result === "demoted" ? "bg-[var(--bb-bad-bg)] text-[var(--bb-bad-ink)]" : "bg-[var(--bb-sel-bg)] text-[var(--bb-sel-ink)]"}`}>
          Semana passada: {last.rank}º lugar. {last.result === "promoted" ? "Você subiu de liga!" : last.result === "demoted" ? "Você desceu de liga." : "Você ficou na mesma liga."}
        </p>
      ) : null}

      <ol className="mt-5 overflow-hidden rounded-2xl border-2 border-[var(--bb-line)]">
        {league.standings.map((s, i) => {
          const rank = i + 1;
          const promo = rank <= PROMOTE;
          const demo = rank >= demoteFrom && demoteFrom <= size && league.tier > 1;
          return (
            <li key={s.id}>
              {rank === PROMOTE + 1 && PROMOTE < size ? <p className="border-y-2 border-[var(--bb-line)] bg-[var(--bb-soft)] py-1 text-center text-[11px] font-extrabold uppercase tracking-widest text-[var(--bb-green)]">▲ Zona de promoção ▲</p> : null}
              {rank === demoteFrom && demoteFrom <= size && league.tier > 1 ? <p className="border-y-2 border-[var(--bb-line)] bg-[var(--bb-soft)] py-1 text-center text-[11px] font-extrabold uppercase tracking-widest text-[var(--bb-red)]">▼ Zona de rebaixamento ▼</p> : null}
              <div className={`flex items-center gap-3 px-3 py-2.5 ${s.me ? "bg-[var(--bb-sel-bg)]" : ""}`}>
                <span className={`w-6 text-center text-base font-extrabold ${promo ? "text-[var(--bb-green)]" : demo ? "text-[var(--bb-red)]" : "text-[var(--bb-mute)]"}`}>{rank}</span>
                {s.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-black text-white" style={{ background: ["#58cc02", "#1cb0f6", "#ff9600", "#ce82ff", "#ff4b4b", "#2fbf71"][(s.name.charCodeAt(0) + s.name.length) % 6] }}>
                    {s.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-base font-extrabold">{s.me ? "Você" : s.name}</span>
                <span className="flex items-center gap-1 text-sm font-extrabold tabular-nums text-[var(--bb-mute)]">
                  {s.xp}
                  <IcoBolt className="h-4 w-4" />
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="bb-sub mt-3 text-center text-xs">O XP da semana é o que você ganha em lições, conversas e treinos de segunda a domingo.</p>
    </div>
  );
}
