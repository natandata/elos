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
    <li>
      <Card className="!p-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--accent-soft)] text-sm font-black text-[var(--accent-strong)]">
            🎵
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{item.song_title}</p>
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-xs text-[var(--accent-strong)] underline"
              >
                {item.link}
              </a>
            ) : null}
            {item.notes ? <p className="mt-1 text-xs text-[var(--muted)]">{item.notes}</p> : null}
            <Feedback state={moveState?.error ? moveState : deleteState?.error ? deleteState : null} />
          </div>
          {isAdmin ? (
            <div className="flex shrink-0 items-center gap-1">
              <div className="mr-1 flex flex-col">
                <form action={moveAction}>
                  <input type="hidden" name="planned_event_id" value={plannedEventId} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    disabled={isFirst}
                    aria-label="Mover pra cima"
                    className="flex h-4 w-5 items-center justify-center text-[10px] text-[var(--muted)] disabled:opacity-20"
                  >
                    ▲
                  </button>
                </form>
                <form action={moveAction}>
                  <input type="hidden" name="planned_event_id" value={plannedEventId} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={isLast}
                    aria-label="Mover pra baixo"
                    className="flex h-4 w-5 items-center justify-center text-[10px] text-[var(--muted)] disabled:opacity-20"
                  >
                    ▼
                  </button>
                </form>
              </div>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="planned_event_id" value={plannedEventId} />
                <button
                  type="submit"
                  aria-label="Remover"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-red-50"
                >
                  🗑️
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </Card>
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
            <div>
              <label className="label !text-[11px]">Música</label>
              <input
                name="song_title"
                className="input"
                placeholder="Nome da música"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label !text-[11px]">Link</label>
              <input name="link" className="input" placeholder="Playlist/vídeo — opcional" />
            </div>
            <div>
              <label className="label !text-[11px]">Tom / observação</label>
              <input name="notes" className="input" placeholder="Opcional" />
            </div>
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
