"use client";

import { useActionState, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { Feedback, SubmitBtn } from "@/components/forms";
import { addLiturgyItem, deleteLiturgyItem, moveLiturgyItem } from "@/lib/actions/plannedEvents";
import type { LiturgyItem } from "@/lib/types";

function LiturgyRow({
  item,
  isFirst,
  isLast,
  plannedEventId,
  isAdmin,
}: {
  item: LiturgyItem;
  isFirst: boolean;
  isLast: boolean;
  plannedEventId: string;
  isAdmin: boolean;
}) {
  const [moveState, moveAction] = useActionState(moveLiturgyItem, null);
  const [deleteState, deleteAction] = useActionState(deleteLiturgyItem, null);

  return (
    <li className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-3">
      {isAdmin ? (
        <div className="flex flex-col gap-0.5 pt-0.5">
          <form action={moveAction}>
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="direction" value="up" />
            <button type="submit" disabled={isFirst} className="text-xs text-[var(--muted)] disabled:opacity-20">
              ▲
            </button>
          </form>
          <form action={moveAction}>
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="direction" value="down" />
            <button type="submit" disabled={isLast} className="text-xs text-[var(--muted)] disabled:opacity-20">
              ▼
            </button>
          </form>
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {item.time ? <span className="text-[var(--accent-strong)]">{item.time} · </span> : null}
          {item.title}
        </p>
        {item.responsible ? (
          <p className="text-xs text-[var(--muted)]">Responsável: {item.responsible}</p>
        ) : null}
        {item.notes ? <p className="mt-1 text-xs text-[var(--muted)]">{item.notes}</p> : null}
        <Feedback state={moveState?.error ? moveState : deleteState?.error ? deleteState : null} />
      </div>
      {isAdmin ? (
        <form action={deleteAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="planned_event_id" value={plannedEventId} />
          <button type="submit" className="text-xs text-red-600">
            Remover
          </button>
        </form>
      ) : null}
    </li>
  );
}

export function LiturgyTab({
  plannedEventId,
  items,
  isAdmin,
}: {
  plannedEventId: string;
  items: LiturgyItem[];
  isAdmin: boolean;
}) {
  const [state, action] = useActionState(addLiturgyItem, null);
  const [title, setTitle] = useState("");

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <Card>
          <p className="label">Adicionar item da liturgia</p>
          <form
            action={(fd) => {
              action(fd);
              setTitle("");
            }}
            className="mt-2 grid gap-2 sm:grid-cols-4"
          >
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <input name="time" className="input" placeholder="19h30" />
            <input
              name="title"
              className="input sm:col-span-2"
              placeholder="Ex.: Louvor, Oferta, Pregação…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input name="responsible" className="input" placeholder="Responsável (opcional)" />
            <input name="notes" className="input sm:col-span-4" placeholder="Observações (opcional)" />
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
        <EmptyState>Nenhum item na liturgia ainda.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <LiturgyRow
              key={item.id}
              item={item}
              isFirst={i === 0}
              isLast={i === items.length - 1}
              plannedEventId={plannedEventId}
              isAdmin={isAdmin}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
