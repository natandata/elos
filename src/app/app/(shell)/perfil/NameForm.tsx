"use client";

import { useActionState } from "react";
import { updateOwnName } from "@/lib/actions/profile";
import { Feedback, SubmitBtn } from "@/components/forms";

export function NameForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [state, action] = useActionState(updateOwnName, null);

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="first_name">
            Nome
          </label>
          <input
            id="first_name"
            name="first_name"
            className="input"
            defaultValue={firstName}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="last_name">
            Sobrenome
          </label>
          <input
            id="last_name"
            name="last_name"
            className="input"
            defaultValue={lastName}
            required
          />
        </div>
      </div>
      <Feedback state={state} />
      <SubmitBtn className="btn btn-primary !py-2 !text-sm">Salvar</SubmitBtn>
    </form>
  );
}
