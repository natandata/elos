"use client";

import { useActionState } from "react";
import { saveGuardianDetails } from "@/lib/actions/cria-details";
import { Feedback, SubmitBtn } from "@/components/forms";
import type { CriaProfileDetails } from "@/lib/types";

export function GuardianDetailsForm({ details }: { details: CriaProfileDetails | null }) {
  const [state, action] = useActionState(saveGuardianDetails, null);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="guardian_name">
            Nome do responsável
          </label>
          <input
            id="guardian_name"
            name="guardian_name"
            className="input"
            defaultValue={details?.guardian_name ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="guardian_phone">
            Telefone do responsável
          </label>
          <input
            id="guardian_phone"
            name="guardian_phone"
            className="input"
            defaultValue={details?.guardian_phone ?? ""}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="guardian_relationship">
          Parentesco
        </label>
        <input
          id="guardian_relationship"
          name="guardian_relationship"
          className="input"
          placeholder="Ex.: mãe, pai, tio(a)…"
          defaultValue={details?.guardian_relationship ?? ""}
        />
      </div>
      <div>
        <label className="label" htmlFor="notes">
          Observações (alergia, condição de saúde, etc.)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="input"
          defaultValue={details?.notes ?? ""}
        />
      </div>
      <Feedback state={state} />
      <SubmitBtn className="btn btn-soft !py-2 !text-sm">Salvar ficha</SubmitBtn>
    </form>
  );
}
