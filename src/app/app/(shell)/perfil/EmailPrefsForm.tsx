"use client";

import { useActionState } from "react";
import { updateEmailOptIn } from "@/lib/actions/profile";
import { Feedback, SubmitBtn } from "@/components/forms";

export function EmailPrefsForm({ optedIn }: { optedIn: boolean }) {
  const [state, action] = useActionState(updateEmailOptIn, null);

  return (
    <form action={action} className="space-y-2">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="email_opt_in"
          value="true"
          defaultChecked={optedIn}
          className="mt-0.5"
        />
        <span>
          Receber e-mails do ELOS
          <span className="block text-xs text-[var(--muted)]">
            Boas-vindas e resumos periódicos. Não afeta e-mails de segurança, como
            redefinição de senha.
          </span>
        </span>
      </label>
      <Feedback state={state} />
      <SubmitBtn className="btn btn-ghost !py-1.5 !text-xs">Salvar preferência</SubmitBtn>
    </form>
  );
}
