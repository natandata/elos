"use client";

import { useActionState } from "react";
import { setEloXp } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";

export function EloXpEditor({
  eloId,
  currentTotal,
  criaCount,
}: {
  eloId: string;
  currentTotal: number;
  criaCount: number;
}) {
  const [state, action] = useActionState(setEloXp, null);
  const disabled = criaCount === 0;

  return (
    <form action={action} className="card p-4">
      <input type="hidden" name="elo_id" value={eloId} />
      <label className="label" htmlFor="target_xp">
        Editar XP total do Elo
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="target_xp"
          name="target_xp"
          type="number"
          min={0}
          step={1}
          className="input max-w-[9rem]"
          defaultValue={currentTotal}
          disabled={disabled}
        />
        <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Salvando…" disabled={disabled}>
          Salvar
        </SubmitBtn>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {disabled
          ? "Este Elo ainda não tem crias — não há para quem distribuir XP."
          : `Redistribuído o mais igual possível entre os ${criaCount} cria(s) do Elo. Não altera o XP de líderes.`}
      </p>
      <Feedback state={state} />
    </form>
  );
}
