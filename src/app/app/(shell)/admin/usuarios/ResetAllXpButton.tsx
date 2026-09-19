"use client";

import { useActionState, useEffect, useState } from "react";
import { resetAllXp } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";

export function ResetAllXpButton({ userCount }: { userCount: number }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action] = useActionState(resetAllXp, null);

  // Depois de zerar com sucesso, fecha a confirmação sozinho — a lista
  // atrás já revalidou e mostra todo mundo com 0 XP.
  useEffect(() => {
    if (state?.ok) setConfirming(false);
  }, [state]);

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-ghost !py-2 !text-sm text-red-600"
        onClick={() => setConfirming(true)}
      >
        Zerar XP de todos
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 p-2 pl-3"
    >
      <p className="text-xs font-medium text-red-700">
        Zera o XP de {userCount} usuário(s) pra 0. Não dá pra desfazer.
      </p>
      <Feedback state={state} />
      <SubmitBtn className="btn btn-primary !py-1.5 !text-xs" pendingLabel="Zerando…">
        Confirmar
      </SubmitBtn>
      <button
        type="button"
        className="btn btn-ghost !py-1.5 !text-xs"
        onClick={() => setConfirming(false)}
      >
        Cancelar
      </button>
    </form>
  );
}
