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
import { LITURGY_TYPE_META, type LiturgyItem, type LiturgyItemType } from "@/lib/types";

const TYPE_OPTIONS = Object.entries(LITURGY_TYPE_META) as [LiturgyItemType, { label: string; icon: string }][];

/** "15:00" (do <input type="time">) -> "15h00", igual o resto do app fala
 *  horário — sem isso a pessoa digitava "1500" num campo de texto livre. */
function formatTimeLabel(time: string | null): string | null {
  if (!time) return null;
  return time.slice(0, 5).replace(":", "h");
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function LiturgyFields({ item }: { item?: LiturgyItem }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:col-span-4 sm:grid-cols-4">
        <div>
          <label className="label !text-[11px]">Horário</label>
          <input name="time" type="time" className="input" defaultValue={item?.time ?? ""} />
        </div>
        <div>
          <label className="label !text-[11px]">Duração (min)</label>
          <input
            name="duration_minutes"
            type="number"
            min={1}
            className="input"
            placeholder="ex.: 20"
            defaultValue={item?.duration_minutes ?? ""}
          />
        </div>
        <div className="col-span-2">
          <label className="label !text-[11px]">Tipo</label>
          <select name="item_type" className="input" defaultValue={item?.item_type ?? "outro"}>
            {TYPE_OPTIONS.map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.icon} {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="sm:col-span-4">
        <label className="label !text-[11px]">Título</label>
        <input name="title" className="input" placeholder="Ex.: Louvor de abertura" defaultValue={item?.title ?? ""} required />
      </div>
      <div className="sm:col-span-2">
        <label className="label !text-[11px]">Responsável</label>
        <input name="responsible" className="input" placeholder="Opcional" defaultValue={item?.responsible ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label !text-[11px]">Observações</label>
        <input name="notes" className="input" placeholder="Opcional" defaultValue={item?.notes ?? ""} />
      </div>
    </>
  );
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
    <form action={action} className="grid gap-2.5 sm:grid-cols-4">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="planned_event_id" value={plannedEventId} />
      <LiturgyFields item={item} />
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
  isLastOfAll,
  plannedEventId,
  isAdmin,
}: {
  item: LiturgyItem;
  isFirst: boolean;
  isLast: boolean;
  isLastOfAll: boolean;
  plannedEventId: string;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [moveState, moveAction] = useActionState(moveLiturgyItem, null);
  const [deleteState, deleteAction] = useActionState(deleteLiturgyItem, null);
  const meta = LITURGY_TYPE_META[item.item_type];

  return (
    <li className="relative flex gap-3 pb-5">
      {!isLastOfAll ? (
        <span className="absolute left-[19px] top-10 h-[calc(100%-2rem)] w-px bg-[var(--line)]" aria-hidden />
      ) : null}
      <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--accent-soft)] text-lg">
        {meta.icon}
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <Card className="!p-3">
            <LiturgyEditForm item={item} plannedEventId={plannedEventId} onDone={() => setEditing(false)} />
          </Card>
        ) : (
          <Card className="!p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {item.time ? (
                    <span className="text-sm font-black tabular-nums text-[var(--accent-strong)]">
                      {formatTimeLabel(item.time)}
                    </span>
                  ) : null}
                  <span className="chip border-[var(--line)] text-[var(--muted)]">{meta.label}</span>
                  {item.duration_minutes ? (
                    <span className="text-xs text-[var(--muted)]">· {formatDuration(item.duration_minutes)}</span>
                  ) : null}
                </div>
                <p className="mt-1 font-bold">{item.title}</p>
                {item.responsible ? (
                  <p className="text-xs text-[var(--muted)]">Responsável: {item.responsible}</p>
                ) : null}
                {item.notes ? <p className="mt-1 text-xs text-[var(--muted)]">{item.notes}</p> : null}
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
                  <button
                    type="button"
                    aria-label="Editar"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-[var(--bg)]"
                    onClick={() => setEditing(true)}
                  >
                    ✏️
                  </button>
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
            <Feedback state={moveState?.error ? moveState : deleteState?.error ? deleteState : null} />
          </Card>
        )}
      </div>
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
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (state?.ok) setAdding(false);
  }, [state]);

  const totalMinutes = items.reduce((sum, i) => sum + (i.duration_minutes ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          {items.length} {items.length === 1 ? "item" : "itens"}
          {totalMinutes > 0 ? ` · duração estimada: ${formatDuration(totalMinutes)}` : ""}
        </p>
        {isAdmin && !adding ? (
          <button type="button" className="btn btn-primary !py-1.5 !text-xs" onClick={() => setAdding(true)}>
            + Adicionar item
          </button>
        ) : null}
      </div>

      {isAdmin && adding ? (
        <Card>
          <p className="label">Novo item da liturgia</p>
          <form action={action} className="mt-2 grid gap-2.5 sm:grid-cols-4">
            <input type="hidden" name="planned_event_id" value={plannedEventId} />
            <LiturgyFields />
            <div className="flex items-center gap-2 sm:col-span-4">
              <SubmitBtn className="btn btn-primary !py-2 !text-sm">Adicionar</SubmitBtn>
              <button type="button" className="btn btn-ghost !py-2 !text-sm" onClick={() => setAdding(false)}>
                Cancelar
              </button>
            </div>
            <div className="sm:col-span-4">
              <Feedback state={state} />
            </div>
          </form>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState>Nenhum item na liturgia ainda.</EmptyState>
      ) : (
        <ul>
          {items.map((item, i) => (
            <LiturgyRow
              key={item.id}
              item={item}
              isFirst={i === 0}
              isLast={i === items.length - 1}
              isLastOfAll={i === items.length - 1}
              plannedEventId={plannedEventId}
              isAdmin={isAdmin}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
