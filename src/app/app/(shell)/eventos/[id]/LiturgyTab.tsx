"use client";

import { useActionState, useEffect, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { Feedback, SubmitBtn } from "@/components/forms";
import {
  addLiturgyItem,
  deleteLiturgyItem,
  moveLiturgyItem,
  updateLiturgyItem,
} from "@/lib/actions/plannedEvents";
import type { LiturgyItem } from "@/lib/types";

/** "15:00" (do <input type="time">) -> "15h00", igual o resto do app fala
 *  horário — sem isso a pessoa digitava "1500" num campo de texto livre. */
function formatTimeLabel(time: string | null): string | null {
  if (!time) return null;
  return time.slice(0, 5).replace(":", "h");
}

function LiturgyEditForm({
  item,
  plannedEventId,
  onDone,
}: {
  item: LiturgyItem;
  plannedEventId: string;
  onDone: () => void;
}) {
  const [state, action] = useActionState(updateLiturgyItem, null);

  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-4">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="planned_event_id" value={plannedEventId} />
      <input name="time" type="time" className="input" defaultValue={item.time ?? ""} />
      <input name="title" className="input sm:col-span-2" defaultValue={item.title} required />
      <input name="responsible" className="input" placeholder="Responsável" defaultValue={item.responsible ?? ""} />
      <input
        name="notes"
        className="input sm:col-span-4"
        placeholder="Observações"
        defaultValue={item.notes ?? ""}
      />
      <div className="flex gap-2 sm:col-span-4">
        <SubmitBtn className="btn btn-primary !py-1.5 !text-xs">Salvar</SubmitBtn>
        <button type="button" className="btn btn-ghost !py-1.5 !text-xs" onClick={onDone}>
          Cancelar
        </button>
      </div>
      <div className="sm:col-span-4">
        <Feedback state={state} />
      </div>
    </form>
  );
}

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
  const [editing, setEditing] = useState(false);
  const [moveState, moveAction] = useActionState(moveLiturgyItem, null);
  const [deleteState, deleteAction] = useActionState(deleteLiturgyItem, null);

  if (editing) {
    return (
      <li className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
        <LiturgyEditForm item={item} plannedEventId={plannedEventId} onDone={() => setEditing(false)} />
      </li>
    );
  }

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
          {item.time ? <span className="text-[var(--accent-strong)]">{formatTimeLabel(item.time)} · </span> : null}
          {item.title}
        </p>
        {item.responsible ? (
          <p className="text-xs text-[var(--muted)]">Responsável: {item.responsible}</p>
        ) : null}
        {item.notes ? <p className="mt-1 text-xs text-[var(--muted)]">{item.notes}</p> : null}
        <Feedback state={moveState?.error ? moveState : deleteState?.error ? deleteState : null} />
      </div>
      {isAdmin ? (
        <div className="flex shrink-0 gap-2">
          <button type="button" className="text-xs font-semibold text-[var(--accent-strong)]" onClick={() => setEditing(true)}>
            Editar
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <button type="submit" className="text-xs text-red-600">
              Remover
            </button>
          </form>
        </div>
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
            <input name="time" type="time" className="input" />
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
