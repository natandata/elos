"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import {
  DEVOTIONAL_MILESTONES,
  type DevotionalEntry,
  type DevotionalFavorite,
  type PrayerRequest,
} from "@/lib/types";
import { DiaryTab } from "./DiaryTab";
import { PrayerTab } from "./PrayerTab";
import { FavoritesTab } from "./FavoritesTab";
import { TimerTab } from "./TimerTab";

const BADGE_META: Record<number, { title: string; icon: string }> = {
  7: { title: "Constância", icon: "📖" },
  15: { title: "Firmeza", icon: "🕊️" },
  30: { title: "Raiz Profunda", icon: "🌳" },
  90: { title: "Perseverança", icon: "⭐" },
};

type Tab = "diario" | "oracao" | "favoritos" | "timer";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "diario", label: "Diário", icon: "📝" },
  { key: "oracao", label: "Oração", icon: "🙏" },
  { key: "favoritos", label: "Favoritos", icon: "⭐" },
  { key: "timer", label: "Timer", icon: "⏱️" },
];

export function DevotionalWorkspace({
  today,
  todayEntry,
  entries,
  prayers,
  favorites,
  earnedBadges,
  devotionalStreak,
  currentUserId,
}: {
  today: string;
  todayEntry: DevotionalEntry | null;
  entries: DevotionalEntry[];
  prayers: PrayerRequest[];
  favorites: DevotionalFavorite[];
  earnedBadges: string[];
  devotionalStreak: number;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>("diario");
  const nextMilestone = DEVOTIONAL_MILESTONES.find((m) => m > devotionalStreak);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🔥
          </span>
          <div>
            <p className="text-lg font-black">
              {devotionalStreak} {devotionalStreak === 1 ? "dia seguido" : "dias seguidos"}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {nextMilestone
                ? `Faltam ${nextMilestone - devotionalStreak} dia(s) pro selo "${BADGE_META[nextMilestone].title}"`
                : "Todos os selos de ofensiva conquistados!"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {DEVOTIONAL_MILESTONES.map((m) => {
            const earned = earnedBadges.includes(`devotional_${m}`);
            return (
              <span
                key={m}
                title={`${BADGE_META[m].title} — ${m} dias`}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg ${
                  earned
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] opacity-30 grayscale"
                }`}
              >
                {BADGE_META[m].icon}
              </span>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "text-[var(--muted)] hover:bg-[var(--bg)]"
            }`}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "diario" ? (
        <DiaryTab today={today} todayEntry={todayEntry} entries={entries} />
      ) : null}
      {tab === "oracao" ? <PrayerTab prayers={prayers} currentUserId={currentUserId} /> : null}
      {tab === "favoritos" ? <FavoritesTab favorites={favorites} /> : null}
      {tab === "timer" ? <TimerTab /> : null}
    </div>
  );
}
