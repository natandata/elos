"use client";

import { useActionState, useEffect, useState } from "react";
import { submitAssignment } from "@/lib/actions/missions";
import { SubmitBtn } from "@/components/forms";

type Props = {
  assignmentId: string;
  title?: string;
  description?: string | null;
  xp?: number;
};

/** Enviar pra aprovação exige duas confirmações: ler o que está sendo enviado
 *  e confirmar que a missão foi mesmo cumprida — evita envio por toque acidental. */
export function SubmitMissionButton({ assignmentId, title, description, xp }: Props) {
  const [state, action] = useActionState(submitAssignment, null);
  const [step, setStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (state?.ok) setStep(0);
  }, [state]);

  return (
    <div className="mt-3 space-y-2">
      {state?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <button
        type="button"
        className="btn btn-primary w-full !py-2 !text-sm"
        onClick={() => setStep(1)}
      >
        Enviar para aprovação
      </button>

      {step > 0 ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setStep(0);
          }}
        >
          <div className="card max-h-[90vh] w-full max-w-sm space-y-3 overflow-y-auto p-5">
            {step === 1 ? (
              <>
                <p className="text-lg font-extrabold">Você já cumpriu sua missão?</p>
                <div className="rounded-xl border border-[var(--line)] p-3">
                  <p className="font-bold">{title ?? "Missão"}</p>
                  {description ? (
                    <p className="mt-1 whitespace-pre-line text-sm text-[var(--muted)]">
                      {description}
                    </p>
                  ) : null}
                  {xp !== undefined ? (
                    <span className="chip mt-2 bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      {xp} XP
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-[var(--muted)]">
                  Leia o que a missão pede. Só continue se você realmente já fez tudo isso.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-ghost !py-2" onClick={() => setStep(0)}>
                    Ainda não
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary !py-2"
                    onClick={() => setStep(2)}
                  >
                    Sim, já cumpri
                  </button>
                </div>
              </>
            ) : (
              <form action={action} className="space-y-3">
                <input type="hidden" name="assignment_id" value={assignmentId} />
                <p className="text-lg font-extrabold">Confirmar envio?</p>
                <p className="text-sm">
                  Você vai enviar <strong>{title ?? "esta missão"}</strong> para a avaliação da
                  liderança. Se enviar sem querer, dá pra retirar enquanto ainda estiver
                  aguardando aprovação.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-ghost !py-2" onClick={() => setStep(1)}>
                    Voltar
                  </button>
                  <SubmitBtn className="btn btn-primary !py-2" pendingLabel="Enviando…">
                    Enviar agora
                  </SubmitBtn>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
