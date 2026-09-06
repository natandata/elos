"use client";

import { useActionState, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { Feedback, SubmitBtn } from "@/components/forms";
import { addGuest, deleteGuest, updateGuestStatus } from "@/lib/actions/plannedEvents";
import { GUEST_STATUS_LABEL, GUEST_STATUS_TONE, type EventGuest, type GuestStatus } from "@/lib/types";

const STATUSES: GuestStatus[] = ["suggested", "invited", "confirmed", "declined"];

function GuestRow({
  item,
  plannedEventId,
  isAdmin,
}: {
  item: EventGuest;
  plannedEventId: string;
  isAdmin: boolean;
}) {
  const [statusState, statusAction] = useActionState(updateGuestStatus, null);
  const [deleteState, deleteAction] = useActionState(deleteGuest, null);

  const initials = item.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

  return (
    <li>
      <Card className="!p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--accent-soft)] text-xs font-black text-[var(--accent-strong)]">
              {initials || "?"}
            </span>
            <div className="min-w-0">
              <p className="font-bold">{item.name}</p>
              {item.role_or_reason ? (
                <p className="text-xs text-[var(--muted)]">{item.role_or_reason}</p>
              ) : null}
              {item.contact ? <p className="text-xs text-[var(--muted)]">{item.contact}</p> : null}
            </div>
          </div>
          <span className={`chip shrink-0 ${GUEST_STATUS_TONE[item.status]}`}>{GUEST_STATUS_LABEL[item.status]}</span>
        </div>

      {isAdmin ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <form action={statusAction} className="flex items-center gap-1.5">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <select
              name="status"
              defaultValue={item.status}
              onChange={(e) => e.target.form?.requestSubmit()}
              className="input !w-auto !py-1 !text-xs"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {GUEST_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </form>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <button
              type="submit"
              aria-label="Remover"
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-red-100"
            >
              🗑️
            </button>
          </form>
          <Feedback state={statusState?.error ? statusState : deleteState?.error ? deleteState : null} />
        </div>
      ) : null}
      </Card>
    </li>
  );
}

export function GuestsTab({
  plannedEventId,
  items,
  isAdmin,
}: {
  plannedEventId: string;
  items: EventGuest[];
  isAdmin: boolean;
}) {
  const [state, action] = useActionState(addGuest, null);
  const [name, setName] = useState("");

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <Card>
          <p className="label">Novo convidado possível</p>
          <form
            action={(fd) => {
              action(fd);
              setName("");
            }}
            className="mt-2 grid gap-2 sm:grid-cols-3"
          >
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <input
              name="name"
              className="input"
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input name="role_or_reason" className="input" placeholder="Ex.: pregador convidado" />
            <input name="contact" className="input" placeholder="Contato (opcional)" />
            <div className="sm:col-span-3">
              <SubmitBtn className="btn btn-primary !py-2 !text-sm" disabled={!name.trim()}>
                Adicionar
              </SubmitBtn>
              <Feedback state={state} />
            </div>
          </form>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState>Nenhum convidado sugerido ainda.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <GuestRow key={item.id} item={item} plannedEventId={plannedEventId} isAdmin={isAdmin} />
          ))}
        </ul>
      )}
    </div>
  );
}
