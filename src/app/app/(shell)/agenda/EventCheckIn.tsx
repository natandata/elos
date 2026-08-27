"use client";

import { useActionState } from "react";
import { checkInToEvent } from "@/lib/actions/admin";
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
  const [state, action] = useActionState(checkInToEvent, null);

  return (
    <div className="mt-3 flex items-center gap-3 border-t border-[var(--line)] pt-3">
      {checkedIn || state?.ok ? (
        <span className="chip border-emerald-200 bg-emerald-100 text-emerald-700">
          ✓ Presença confirmada
        </span>
      ) : (
        <form action={action}>
          <input type="hidden" name="event_id" value={eventId} />
          <SubmitBtn className="btn btn-soft !py-1.5 !text-xs" pendingLabel="Confirmando…">
            Confirmar presença
          </SubmitBtn>
        </form>
      )}
      {typeof count === "number" ? (
        <span className="text-xs text-[var(--muted)]">{count} confirmado(s)</span>
      ) : null}
      <Feedback state={state?.error ? state : null} />
    </div>
  );
}
