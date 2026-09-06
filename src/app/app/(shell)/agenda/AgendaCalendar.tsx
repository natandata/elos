"use client";

import { useMemo, useState } from "react";

export type CalendarEntry = { id: string; date: string; node: React.ReactNode };

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Visão de calendário mensal: dias com evento ganham uma bolinha; tocar num
 *  dia mostra os eventos daquele dia (já renderizados no servidor). */
export function AgendaCalendar({ entries }: { entries: CalendarEntry[] }) {
  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEntry[]>();
    entries.forEach((e) => {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    });
    return m;
  }, [entries]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(() => {
    const next = entries.find((e) => e.date >= todayStr);
    return (next ?? entries[0])?.date.slice(0, 7) ?? todayStr.slice(0, 7);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, mon - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelected(null);
  }

  const monthLabel = firstDay.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const selectedEntries = selected ? (byDate.get(selected) ?? []) : [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Mês anterior"
          className="btn btn-ghost !px-3 !py-1.5 !text-sm"
        >
          ‹
        </button>
        <p className="text-sm font-bold capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Próximo mês"
          className="btn btn-ghost !px-3 !py-1.5 !text-sm"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--muted)]">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const has = byDate.has(date);
          const isToday = date === todayStr;
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(isSelected ? null : date)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border text-sm transition ${
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)] font-bold text-[var(--accent-ink)]"
                  : isToday
                    ? "border-[var(--accent)] font-bold text-[var(--accent-strong)]"
                    : "border-transparent hover:bg-[var(--bg)]"
              }`}
            >
              {Number(date.slice(8, 10))}
              {has ? (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isSelected ? "bg-[var(--accent-ink)]" : "bg-[var(--accent)]"
                  }`}
                />
              ) : (
                <span className="h-1.5 w-1.5" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-[var(--line)] pt-4">
        {selected ? (
          selectedEntries.length > 0 ? (
            <div className="space-y-3">
              {selectedEntries.map((e) => (
                <div key={e.id}>{e.node}</div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Nenhum evento neste dia.</p>
          )
        ) : (
          <p className="text-sm text-[var(--muted)]">Toque num dia com • para ver os eventos.</p>
        )}
      </div>
    </div>
  );
}
