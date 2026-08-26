"use client";

import { useActionState } from "react";
import { updateOwnName } from "@/lib/actions/profile";
import { Feedback, SubmitBtn } from "@/components/forms";

export function NameForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(updateOwnName, null);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="full_name">
          Nome completo
        </label>
        <input id="full_name" name="full_name" className="input" defaultValue={defaultName} required />
      </div>
      <Feedback state={state} />
      <SubmitBtn className="btn btn-primary !py-2 !text-sm">Salvar</SubmitBtn>
    </form>
  );
}
