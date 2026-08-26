"use client";

import { useActionState } from "react";
import { submitAssignment } from "@/lib/actions/missions";
import { SubmitBtn } from "@/components/forms";

export function SubmitMissionButton({ assignmentId }: { assignmentId: string }) {
  const [state, action] = useActionState(submitAssignment, null);

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      {state?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <SubmitBtn className="btn btn-primary w-full !py-2 !text-sm" pendingLabel="Enviando…">
        Enviar para aprovação
      </SubmitBtn>
    </form>
  );
}
