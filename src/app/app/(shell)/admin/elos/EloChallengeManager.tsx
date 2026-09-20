"use client";

import { useActionState, useState } from "react";
import { cancelEloChallenge, createEloChallenge, finishEloChallenge } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";
import type { Elo } from "@/lib/types";

type OpenChallenge = {
  id: string;
  title: string;
  description: string | null;
  bonus_xp: number;
};

export function EloChallengeManager({ challenge, elos }: { challenge: OpenChallenge | null; elos: Elo[] }) {
  const [createState, createAction] = useActionState(createEloChallenge, null);
  const [finishState, finishAction] = useActionState(finishEloChallenge, null);
  const [cancelState, cancelAction] = useActionState(cancelEloChallenge, null);
  const [confirming, setConfirming] = useState(false);
  const [winnerId, setWinnerId] = useState("");

  if (!challenge) {
    return (
      <div className="card mb-5 p-4">
        <p className="font-bold">Desafio entre os Elos</p>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Uma disputa por tempo limitado, com bônus de XP pra todo mundo do Elo vencedor — ex.:
          "Elo que mais confirmar presença no próximo evento".
        </p>
        <form action={createAction} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Título</label>
            <input name="title" className="input" placeholder="Ex.: Desafio da Presença" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição (o que vale pra ganhar)</label>
            <textarea
              name="description"
              rows={2}
              className="input"
              placeholder="Ex.: o Elo com mais confirmações de presença no Encontro de sábado vence."
            />
          </div>
          <div>
            <label className="label">XP de bônus pra cada cria do Elo vencedor</label>
            <input name="bonus_xp" type="number" min={0} step={1} className="input" defaultValue={50} />
          </div>
          <div className="flex items-end sm:col-span-2">
            <Feedback state={createState} />
            <SubmitBtn className="btn btn-primary w-full !py-2 !text-sm">Lançar desafio</SubmitBtn>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card mb-5 border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="chip mb-1 border-amber-300 bg-amber-100 text-amber-800">Desafio em andamento</p>
          <p className="font-bold text-amber-900">{challenge.title}</p>
          {challenge.description ? (
            <p className="mt-1 text-sm text-amber-800">{challenge.description}</p>
          ) : null}
          <p className="mt-1 text-xs font-semibold text-amber-700">+{challenge.bonus_xp} XP pro Elo vencedor</p>
        </div>
      </div>

      {!confirming ? (
        <div className="mt-3 flex gap-2 border-t border-amber-200 pt-3">
          <button
            type="button"
            className="btn btn-primary !py-1.5 !text-xs"
            onClick={() => setConfirming(true)}
          >
            Encerrar e declarar vencedor
          </button>
          <form action={cancelAction}>
            <input type="hidden" name="id" value={challenge.id} />
            <SubmitBtn className="btn btn-ghost !py-1.5 !text-xs text-red-600" pendingLabel="Cancelando…">
              Cancelar desafio
            </SubmitBtn>
          </form>
        </div>
      ) : (
        <form action={finishAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-amber-200 pt-3">
          <input type="hidden" name="id" value={challenge.id} />
          <div>
            <label className="label">Elo vencedor</label>
            <select
              name="winner_elo_id"
              className="input"
              value={winnerId}
              onChange={(e) => setWinnerId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {elos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Encerrando…" disabled={!winnerId}>
            Confirmar vencedor
          </SubmitBtn>
          <button type="button" className="btn btn-ghost !py-2 !text-sm" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
          <Feedback state={finishState} />
        </form>
      )}
      <Feedback state={cancelState} />
    </div>
  );
}
