"use client";

import { useActionState, useEffect, useState } from "react";
import { cancelEventCheckIn, checkInToEvent } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";

export function EventCheckIn({
  eventId,
  checkedIn,
  count,
}: {
  eventId: string;
  checkedIn: boolean;
  count?: number;
}) {
  const [confirmState, confirmAction] = useActionState(checkInToEvent, null);
  const [cancelState, cancelAction] = useActionState(cancelEventCheckIn, null);
  const [editing, setEditing] = useState(false);

  // Otimista: reflete a ação mais recente na hora, antes do servidor
  // revalidar a página — e some assim que o `checkedIn` vindo do servidor
  // (prop) confirma a mudança, pra nunca ficar preso num estado antigo.
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  useEffect(() => setOptimistic(null), [checkedIn]);
  useEffect(() => {
    if (confirmState?.ok) setOptimistic(true);
  }, [confirmState]);
  useEffect(() => {
    if (cancelState?.ok) {
      setOptimistic(false);
      setEditing(false);
    }
  }, [cancelState]);

  const isCheckedIn = optimistic ?? checkedIn;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-3">
      {isCheckedIn ? (
        editing ? (
          <form action={cancelAction} className="flex items-center gap-2">
            <input type="hidden" name="event_id" value={eventId} />
            <SubmitBtn className="btn btn-ghost !py-1.5 !text-xs text-red-600" pendingLabel="Desmarcando…">
              Desmarcar presença
            </SubmitBtn>
            <button
              type="button"
              className="text-xs text-[var(--muted)] underline underline-offset-2"
              onClick={() => setEditing(false)}
            >
              cancelar
            </button>
          </form>
        ) : (
          <span className="flex items-center gap-2">
            <span className="chip border-emerald-200 bg-emerald-100 text-emerald-700">
              ✓ Presença confirmada
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--accent-strong)] underline underline-offset-2"
              onClick={() => setEditing(true)}
            >
              Editar
            </button>
          </span>
        )
      ) : (
        <form action={confirmAction}>
          <input type="hidden" name="event_id" value={eventId} />
          <SubmitBtn className="btn btn-soft !py-1.5 !text-xs" pendingLabel="Confirmando…">
            Confirmar presença
          </SubmitBtn>
        </form>
      )}
      {typeof count === "number" ? (
        <span className="text-xs text-[var(--muted)]">{count} confirmado(s)</span>
      ) : null}
      <Feedback state={confirmState?.error ? confirmState : cancelState?.error ? cancelState : null} />
    </div>
  );
}
