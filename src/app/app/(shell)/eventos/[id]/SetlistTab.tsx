"use client";

import { useActionState, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { Feedback, SubmitBtn } from "@/components/forms";
import { addSetlistItem, deleteSetlistItem, moveSetlistItem } from "@/lib/actions/plannedEvents";
import type { SetlistItem } from "@/lib/types";

function SetlistRow({
  item,
  isFirst,
  isLast,
  plannedEventId,
  isAdmin,
}: {
  item: SetlistItem;
  isFirst: boolean;
  isLast: boolean;
  plannedEventId: string;
  isAdmin: boolean;
}) {
  const [moveState, moveAction] = useActionState(moveSetlistItem, null);
  const [deleteState, deleteAction] = useActionState(deleteSetlistItem, null);

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
        <p className="text-sm font-bold">{item.song_title}</p>
        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent-strong)] underline break-all"
          >
            {item.link}
          </a>
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

export function SetlistTab({
  plannedEventId,
  items,
  isAdmin,
}: {
  plannedEventId: string;
  items: SetlistItem[];
  isAdmin: boolean;
}) {
  const [state, action] = useActionState(addSetlistItem, null);
  const [songTitle, setSongTitle] = useState("");

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <Card>
          <p className="label">Adicionar música</p>
          <form
            action={(fd) => {
              action(fd);
              setSongTitle("");
            }}
            className="mt-2 grid gap-2 sm:grid-cols-3"
          >
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <input
              name="song_title"
              className="input"
              placeholder="Nome da música"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
            />
            <input name="link" className="input" placeholder="Link (playlist/vídeo) — opcional" />
            <input name="notes" className="input" placeholder="Tom / observação (opcional)" />
            <div className="sm:col-span-3">
              <SubmitBtn className="btn btn-primary !py-2 !text-sm" disabled={!songTitle.trim()}>
                Adicionar
              </SubmitBtn>
              <Feedback state={state} />
            </div>
          </form>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState>Nenhuma música no repertório ainda.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <SetlistRow
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
