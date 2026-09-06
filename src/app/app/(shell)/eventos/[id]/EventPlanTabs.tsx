"use client";

import { useState } from "react";
import type { EventGuest, EventReminder, LiturgyItem, SetlistItem } from "@/lib/types";
import { LiturgyTab } from "./LiturgyTab";
import { RemindersTab } from "./RemindersTab";
import { GuestsTab } from "./GuestsTab";
import { SetlistTab } from "./SetlistTab";

type Tab = "liturgia" | "lembretes" | "convidados" | "repertorio";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "liturgia", label: "Liturgia", icon: "📋" },
  { key: "lembretes", label: "Lembretes", icon: "🔔" },
  { key: "convidados", label: "Convidados", icon: "🧑‍🤝‍🧑" },
  { key: "repertorio", label: "Repertório", icon: "🎵" },
];

export function EventPlanTabs({
  plannedEventId,
  isAdmin,
  liturgy,
  reminders,
  guests,
  setlist,
}: {
  plannedEventId: string;
  isAdmin: boolean;
  liturgy: LiturgyItem[];
  reminders: EventReminder[];
  guests: EventGuest[];
  setlist: SetlistItem[];
}) {
  const [tab, setTab] = useState<Tab>("liturgia");

  return (
    <div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] p-1.5">
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

      {tab === "liturgia" ? (
        <LiturgyTab plannedEventId={plannedEventId} items={liturgy} isAdmin={isAdmin} />
      ) : null}
      {tab === "lembretes" ? (
        <RemindersTab plannedEventId={plannedEventId} items={reminders} isAdmin={isAdmin} />
      ) : null}
      {tab === "convidados" ? (
        <GuestsTab plannedEventId={plannedEventId} items={guests} isAdmin={isAdmin} />
      ) : null}
      {tab === "repertorio" ? (
        <SetlistTab plannedEventId={plannedEventId} items={setlist} isAdmin={isAdmin} />
      ) : null}
    </div>
  );
}
