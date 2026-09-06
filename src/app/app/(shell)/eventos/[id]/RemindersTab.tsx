"use client";

import { useActionState, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { Feedback, SubmitBtn } from "@/components/forms";
import { addReminder, deleteReminder, toggleReminder } from "@/lib/actions/plannedEvents";
import { formatDate, type EventReminder } from "@/lib/types";

function ReminderRow({
  item,
  plannedEventId,
  isAdmin,
}: {
  item: EventReminder;
  plannedEventId: string;
  isAdmin: boolean;
}) {
  const [toggleState, toggleAction] = useActionState(toggleReminder, null);
  const [deleteState, deleteAction] = useActionState(deleteReminder, null);
  const overdue = !item.done && item.remind_at && item.remind_at < new Date().toISOString().slice(0, 10);

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
        item.done
          ? "border-emerald-200 bg-emerald-50"
          : overdue
            ? "border-red-200 bg-red-50"
            : "border-[var(--line)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${item.done ? "text-emerald-800 line-through" : ""}`}>{item.title}</p>
        {item.remind_at ? (
          <p className={`text-xs ${overdue ? "font-bold text-red-700" : "text-[var(--muted)]"}`}>
            {overdue ? "Venceu em " : "Até "}
            {formatDate(item.remind_at)}
          </p>
        ) : null}
        <Feedback state={toggleState?.error ? toggleState : deleteState?.error ? deleteState : null} />
      </div>
      {isAdmin ? (
        <div className="flex shrink-0 gap-2">
          <form action={toggleAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <input type="hidden" name="done" value={String(!item.done)} />
            <button type="submit" className="btn btn-ghost !px-2.5 !py-1 !text-xs">
              {item.done ? "Reabrir" : "Feito"}
            </button>
          </form>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <button type="submit" className="btn btn-ghost !px-2.5 !py-1 !text-xs text-red-600">
              Remover
            </button>
          </form>
        </div>
      ) : null}
    </li>
  );
}

export function RemindersTab({
  plannedEventId,
  items,
  isAdmin,
}: {
  plannedEventId: string;
  items: EventReminder[];
  isAdmin: boolean;
}) {
  const [state, action] = useActionState(addReminder, null);
  const [title, setTitle] = useState("");

  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <Card>
          <p className="label">Novo lembrete de solicitação</p>
          <form
            action={(fd) => {
              action(fd);
              setTitle("");
            }}
            className="mt-2 grid gap-2 sm:grid-cols-4"
          >
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <input
              name="title"
              className="input sm:col-span-3"
              placeholder="Ex.: Solicitar projetor, confirmar som…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input name="remind_at" type="date" className="input" />
            <div className="sm:col-span-4">
              <SubmitBtn className="btn btn-primary !py-2 !text-sm" disabled={!title.trim()}>
                Adicionar
              </SubmitBtn>
              <Feedback state={state} />
            </div>
          </form>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState>Nenhum lembrete ainda.</EmptyState>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 ? (
            <ul className="space-y-2">
              {pending.map((item) => (
                <ReminderRow key={item.id} item={item} plannedEventId={plannedEventId} isAdmin={isAdmin} />
              ))}
            </ul>
          ) : null}
          {done.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                Resolvidos
              </p>
              <ul className="space-y-2">
                {done.map((item) => (
                  <ReminderRow key={item.id} item={item} plannedEventId={plannedEventId} isAdmin={isAdmin} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
