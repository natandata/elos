"use client";

import { useActionState, useState } from "react";
import { withdrawAssignment } from "@/lib/actions/missions";
import { SubmitBtn } from "@/components/forms";

/** Desfaz um envio feito sem querer — só existe enquanto aguarda avaliação. */
export function WithdrawMissionButton({ assignmentId }: { assignmentId: string }) {
  const [state, action] = useActionState(withdrawAssignment, null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-3 space-y-2">
      {state?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {confirming ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="assignment_id" value={assignmentId} />
          <p className="text-sm">Retirar essa missão do envio? Ela volta pra “Para fazer”.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-ghost !py-2 !text-sm" onClick={() => setConfirming(false)}>
              Manter enviada
            </button>
            <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Retirando…">
              Sim, retirar
            </SubmitBtn>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-ghost w-full !py-2 !text-sm" onClick={() => setConfirming(true)}>
          Enviei sem querer — retirar do envio
        </button>
      )}
    </div>
  );
}
