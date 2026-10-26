"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimQuest } from "@/lib/actions/babel";
import { CHEST_GEMS, CHEST_IDX, dailyQuests, questProgress } from "@/lib/babel/economy";
import type { EnglishState } from "@/lib/english/data.server";
import { IcoChest, IcoCheck, IcoGem } from "./icons";

// Missões do dia (3, renovam à meia-noite) e baú diário.
export function QuestsView({ state, userId }: { state: EnglishState; userId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const b = state.babel;
  const quests = dailyQuests(userId, b.dayStr);
  const claimed = b.today.claimed;
  const allClaimed = [0, 1, 2].every((i) => claimed.includes(i));
  const chestDone = claimed.includes(CHEST_IDX);

  const claim = (idx: number) =>
    start(async () => {
      const r = await claimQuest(idx);
      setMsg(r.error ?? `+${r.gems} gemas!`);
      router.refresh();
    });

  return (
    <div className="mt-4">
      <h1 className="text-2xl font-extrabold">Missões do dia</h1>
      <p className="bb-sub mt-1">Renovam à meia-noite. Complete as 3 e abra o baú.</p>
      {msg ? <p className="mt-3 rounded-2xl bg-[var(--bb-sel-bg)] px-4 py-2 text-sm font-extrabold text-[var(--bb-sel-ink)]">{msg}</p> : null}

      <div className="bb-card mt-4 p-4">
        <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--bb-mute)]">Meta diária</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="bb-bar">
            <i style={{ width: `${Math.min(100, Math.round((b.today.xp / b.goal) * 100))}%` }} />
          </div>
          <span className="text-sm font-extrabold tabular-nums">
            {Math.min(b.today.xp, b.goal)}/{b.goal} XP
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {quests.map((q, i) => {
          const prog = questProgress(q, b.today);
          const ok = prog >= q.target;
          const got = claimed.includes(i);
          return (
            <div key={q.id} className="bb-card p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold">{q.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="bb-bar !h-4">
                      <i style={{ width: `${Math.round((prog / q.target) * 100)}%`, background: ok ? "var(--bb-gold)" : undefined }} />
                    </div>
                    <span className="text-xs font-extrabold tabular-nums text-[var(--bb-mute)]">
                      {prog}/{q.target}
                    </span>
                  </div>
                </div>
                {got ? (
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bb-ok-bg)] text-[var(--bb-green)]">
                    <IcoCheck className="h-7 w-7" />
                  </span>
                ) : ok ? (
                  <button type="button" disabled={pending} onClick={() => claim(i)} className="bb-btn bb-btn-sm flex items-center gap-1">
                    <IcoGem className="h-5 w-5" />+{q.gems}
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-sm font-extrabold text-[var(--bb-blue)]">
                    <IcoGem className="h-5 w-5" />+{q.gems}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`bb-card mt-4 flex items-center gap-3 p-4 ${allClaimed ? "" : "opacity-70"}`}>
        <IcoChest className={`h-14 w-14 ${allClaimed && !chestDone ? "bb-pop" : ""}`} open={chestDone} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold">Baú do dia</p>
          <p className="bb-sub">{chestDone ? "Aberto hoje. Volte amanhã!" : allClaimed ? `Pronto! ${CHEST_GEMS} gemas dentro.` : "Resgate as 3 missões para abrir."}</p>
        </div>
        {allClaimed && !chestDone ? (
          <button type="button" disabled={pending} onClick={() => claim(CHEST_IDX)} className="bb-btn bb-btn-sm">
            Abrir
          </button>
        ) : null}
      </div>
    </div>
  );
}
