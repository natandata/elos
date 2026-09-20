"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { giveEloBonusXp, setEloTotalXp } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";
import { formatXp } from "@/lib/types";

const STEPS = [-100, -10, -1, 1, 10, 100];
const BONUS_PRESETS = [10, 25, 50, 100];

/** Controle do XP TOTAL do Elo — o que o admin vê e mexe é sempre o total
 *  final, nunca o "bônus" por trás. Dá pra digitar direto, usar os botões de
 *  passo, ou rolar o scroll do mouse em cima do número (pra frente soma, pra
 *  trás desconta) — como uma barra que anda nos dois sentidos. */
function TotalXpControl({ eloId, initialTotal }: { eloId: string; initialTotal: number }) {
  const [state, action] = useActionState(setEloTotalXp, null);
  const [value, setValue] = useState(initialTotal);
  const dirty = value !== initialTotal;

  useEffect(() => {
    if (state?.ok) setValue(initialTotal);
  }, [state, initialTotal]);

  return (
    <form action={action} className="card p-4">
      <input type="hidden" name="elo_id" value={eloId} />
      <input type="hidden" name="total_xp" value={value} />

      <label className="label" htmlFor="total_xp_display">
        Quantidade de XP do Elo
      </label>
      <p className="mb-2 text-xs text-[var(--muted)]">
        O total que o Elo tem — role o scroll do mouse em cima do número, use os botões, ou digite
        direto. Salvar redefine o total exato pra esse valor.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {STEPS.slice(0, 3).map((s) => (
          <button
            key={s}
            type="button"
            className="btn btn-ghost !px-3 !py-2 !text-sm tabular-nums"
            onClick={() => setValue((v) => v + s)}
          >
            {s}
          </button>
        ))}

        <input
          id="total_xp_display"
          type="number"
          step={1}
          className="input w-32 text-center text-lg font-bold tabular-nums"
          value={value}
          onChange={(e) => setValue(Math.trunc(Number(e.target.value) || 0))}
          onWheel={(e) => {
            e.currentTarget.blur();
            setValue((v) => v + (e.deltaY < 0 ? 1 : -1));
          }}
        />

        {STEPS.slice(3).map((s) => (
          <button
            key={s}
            type="button"
            className="btn btn-ghost !px-3 !py-2 !text-sm tabular-nums"
            onClick={() => setValue((v) => v + s)}
          >
            +{s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Salvando…" disabled={!dirty}>
          Salvar {formatXp(value)} XP
        </SubmitBtn>
        {dirty ? (
          <button
            type="button"
            className="text-xs text-[var(--muted)] underline"
            onClick={() => setValue(initialTotal)}
          >
            desfazer
          </button>
        ) : null}
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Bônus rápido: soma (ou desconta, se digitar negativo) por cima do total
 *  atual — um presente de XP, não redefine nada. */
function GiveBonusControl({ eloId }: { eloId: string }) {
  const [state, action] = useActionState(giveEloBonusXp, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState<number | "">("");

  useEffect(() => {
    if (state?.ok) {
      setAmount("");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card p-4">
      <label className="label" htmlFor="bonus_amount">
        Dar bônus de XP pro Elo
      </label>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Soma essa quantidade por cima do que o Elo já tem — como um presente.
      </p>
      <input type="hidden" name="elo_id" value={eloId} />
      <div className="flex flex-wrap items-center gap-2">
        {BONUS_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className="chip border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
            onClick={() => setAmount(p)}
          >
            +{p}
          </button>
        ))}
        <input
          name="amount"
          type="number"
          step={1}
          placeholder="quantidade"
          className="input w-28"
          value={amount}
          onChange={(e) => setAmount(e.target.value === "" ? "" : Math.trunc(Number(e.target.value)))}
        />
        <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Dando bônus…">
          Dar bônus
        </SubmitBtn>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function EloXpEditor({ eloId, totalXp }: { eloId: string; totalXp: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TotalXpControl eloId={eloId} initialTotal={totalXp} />
      <GiveBonusControl eloId={eloId} />
    </div>
  );
}
