"use client";

import { useActionState, useState } from "react";
import { sendUserEmail } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";

export function SendEmailForm({ userId, email }: { userId: string; email: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(sendUserEmail, null);

  if (!email) {
    return (
      <div className="border-t border-[var(--line)] pt-4">
        <p className="text-xs text-[var(--muted)]">
          Sem e-mail cadastrado — não é possível enviar notificação.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--line)] pt-4">
      <div className="flex items-center justify-between">
        <label className="label !mb-0">Enviar e-mail</label>
        <button
          type="button"
          className="text-xs font-semibold text-[var(--accent-strong)]"
          onClick={() => setOpen(!open)}
        >
          {open ? "Fechar" : `Escrever para ${email}`}
        </button>
      </div>

      {open ? (
        <form action={action} className="mt-2 space-y-2">
          <input type="hidden" name="id" value={userId} />
          <input name="subject" className="input" placeholder="Assunto" required />
          <textarea
            name="message"
            rows={4}
            className="input"
            placeholder="Mensagem"
            required
          />
          <Feedback state={state} />
          <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Enviando…">
            Enviar e-mail
          </SubmitBtn>
        </form>
      ) : null}
    </div>
  );
}
