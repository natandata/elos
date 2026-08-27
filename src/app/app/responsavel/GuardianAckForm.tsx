"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { confirmGuardianAck } from "@/lib/actions/profile";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending || disabled}>
      {pending ? "Salvando…" : "Confirmar"}
    </button>
  );
}

export function GuardianAckForm() {
  const [state, action] = useActionState(confirmGuardianAck, null);
  const [checked, setChecked] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="guardian_ack" value={checked ? "true" : "false"} />

      <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-3 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>Meu responsável autorizou o meu acesso a esta plataforma.</span>
      </label>

      {state?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <SubmitButton disabled={!checked} />
    </form>
  );
}
