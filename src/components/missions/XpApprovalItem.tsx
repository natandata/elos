"use client";

import { useActionState } from "react";
import { reviewMissionXp } from "@/lib/actions/missions";
import { Feedback, SubmitBtn } from "@/components/forms";

export type PendingXp = {
  missionId: string;
  title: string;
  leaderName: string;
  currentXp: number;
  requestedXp: number;
};

/** Admin: um líder pediu 2 a 3 XP numa missão (o limite direto dele é 1 XP). */
export function XpApprovalItem({ item }: { item: PendingXp }) {
  const [state, action] = useActionState(reviewMissionXp, null);
  return (
    <div className="card border-amber-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{item.title}</p>
          <p className="text-xs text-[var(--muted)]">
            {item.leaderName} pediu <b>{item.requestedXp} XP</b> (hoje vale {item.currentXp} XP)
          </p>
        </div>
        <span className="chip border-amber-200 bg-amber-100 text-amber-800">{item.requestedXp} XP pedidos</span>
      </div>
      <div className="mt-3 space-y-2">
        <Feedback state={state} />
        <div className="flex gap-2">
          <form action={action} className="flex-1">
            <input type="hidden" name="id" value={item.missionId} />
            <input type="hidden" name="approve" value="true" />
            <SubmitBtn className="btn btn-primary w-full !py-2 !text-sm" pendingLabel="Aprovando…">
              Aprovar {item.requestedXp} XP
            </SubmitBtn>
          </form>
          <form action={action}>
            <input type="hidden" name="id" value={item.missionId} />
            <input type="hidden" name="approve" value="false" />
            <SubmitBtn className="btn btn-ghost !py-2 !text-sm" pendingLabel="Recusando…">
              Manter {item.currentXp} XP
            </SubmitBtn>
          </form>
        </div>
      </div>
    </div>
  );
}
