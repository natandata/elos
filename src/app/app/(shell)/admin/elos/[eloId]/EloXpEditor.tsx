"use client";

import { useActionState } from "react";
import { setEloBonusXp } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";
import { formatXp } from "@/lib/types";

export function EloXpEditor({
  eloId,
  criasXp,
  bonusXp,
}: {
  eloId: string;
  /** Soma do XP dos crias — informativo aqui, não é editado neste form. */
  criasXp: number;
  bonusXp: number;
}) {
  const [state, action] = useActionState(setEloBonusXp, null);

  return (
    <form action={action} className="card p-4">
      <input type="hidden" name="elo_id" value={eloId} />
      <label className="label" htmlFor="bonus_xp">
        XP bônus do Elo
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="bonus_xp"
          name="bonus_xp"
          type="number"
          step={1}
          className="input max-w-[9rem]"
          defaultValue={bonusXp}
        />
        <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Salvando…">
          Salvar
        </SubmitBtn>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Um XP à parte, definido direto pra este Elo — soma por cima do XP que os crias acumulam
        (hoje {formatXp(criasXp)} XP) sem alterar o XP de ninguém. Funciona mesmo sem nenhum cria
        no Elo. Pode ser negativo pra descontar XP do total do Elo.
      </p>
      <Feedback state={state} />
    </form>
  );
}
