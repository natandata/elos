"use client";

import { useActionState, useState } from "react";
import { adjustMissionXp } from "@/lib/actions/xpAdjust";
import { Feedback, SubmitBtn } from "@/components/forms";

/** Admin: corrige o XP que o cria já ganhou nesta missão. */
export function AdjustXpButton({ txId, xp, memberName }: { txId: string; xp: number; memberName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(adjustMissionXp, null);

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => setOpen(true)}>
        Corrigir XP
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 w-full space-y-2 rounded-xl bg-[var(--accent-soft)]/40 p-3">
      <input type="hidden" name="tx" value={txId} />
      <p className="text-xs text-[var(--muted)]">
        {memberName} ganhou <b>{xp} XP</b> nesta missão. O total dela muda pela diferença.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label" htmlFor={`xp-${txId}`}>
            Novo XP
          </label>
          <input id={`xp-${txId}`} name="xp" type="number" min={0} max={25} defaultValue={xp} className="input !w-24" required />
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="label" htmlFor={`why-${txId}`}>
            Motivo (opcional)
          </label>
          <input id={`why-${txId}`} name="reason" maxLength={300} className="input" placeholder="Ex.: a missão valia 3 XP" />
        </div>
      </div>
      <Feedback state={state} />
      <div className="flex gap-2">
        <SubmitBtn className="btn btn-primary !py-1.5 !text-xs" pendingLabel="Salvando…">
          Salvar correção
        </SubmitBtn>
        <button type="button" className="btn btn-ghost !py-1.5 !text-xs" onClick={() => setOpen(false)}>
          Fechar
        </button>
      </div>
    </form>
  );
}
