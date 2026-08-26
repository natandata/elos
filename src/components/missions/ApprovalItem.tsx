"use client";

import { useActionState, useState } from "react";
import { reviewAssignment } from "@/lib/actions/missions";
import { Feedback, SubmitBtn } from "@/components/forms";
import { formatDateTime } from "@/lib/types";

export type PendingReview = {
  assignmentId: string;
  criaName: string;
  missionTitle: string;
  description: string | null;
  xp: number;
  submittedAt: string | null;
};

export function ApprovalItem({ item }: { item: PendingReview }) {
  const [state, action] = useActionState(reviewAssignment, null);
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{item.missionTitle}</p>
          <p className="text-xs text-[var(--muted)]">
            {item.criaName} · enviada em {formatDateTime(item.submittedAt)}
          </p>
        </div>
        <span className="chip bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          {item.xp} XP
        </span>
      </div>

      {item.description ? (
        <p className="mt-2 text-sm text-[var(--muted)]">{item.description}</p>
      ) : null}

      <div className="mt-3 space-y-2">
        <Feedback state={state} />

        {rejecting ? (
          <form action={action} className="space-y-2">
            <input type="hidden" name="assignment_id" value={item.assignmentId} />
            <input type="hidden" name="approve" value="false" />
            <textarea
              name="reason"
              rows={2}
              className="input"
              placeholder="Justificativa (opcional)"
            />
            <div className="flex gap-2">
              <SubmitBtn className="btn btn-ghost flex-1 !py-2 !text-sm" pendingLabel="Enviando…">
                Confirmar recusa
              </SubmitBtn>
              <button
                type="button"
                className="btn btn-ghost !py-2 !text-sm"
                onClick={() => setRejecting(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2">
            <form action={action} className="flex-1">
              <input type="hidden" name="assignment_id" value={item.assignmentId} />
              <input type="hidden" name="approve" value="true" />
              <SubmitBtn className="btn btn-primary w-full !py-2 !text-sm" pendingLabel="Aprovando…">
                Aprovar
              </SubmitBtn>
            </form>
            <button
              type="button"
              className="btn btn-ghost !py-2 !text-sm"
              onClick={() => setRejecting(true)}
            >
              Recusar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
