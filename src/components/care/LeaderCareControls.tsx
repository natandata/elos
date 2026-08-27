"use client";

import { useActionState, useState } from "react";
import { resolveStatusAlert, respondCareMeeting } from "@/lib/actions/care";
import { Feedback, SubmitBtn } from "@/components/forms";
import { formatDate, type CareMeeting } from "@/lib/types";

/** Ações do líder para um alerta "Mal": registrar o que foi feito e/ou responder a um pedido de conversa. */
export function LeaderCareControls({
  statusResponseId,
  alreadyResolvedNote,
  pendingMeeting,
}: {
  statusResponseId: string;
  alreadyResolvedNote: string | null;
  pendingMeeting: CareMeeting | null;
}) {
  const [resolveState, resolveAction] = useActionState(resolveStatusAlert, null);
  const [respondState, respondAction] = useActionState(respondCareMeeting, null);
  const [rescheduling, setRescheduling] = useState(false);

  return (
    <div className="mt-3 space-y-3 border-t border-[var(--line)] pt-3">
      {pendingMeeting ? (
        <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm">
          <p className="font-semibold text-[var(--accent-strong)]">
            Pediu conversa {pendingMeeting.modality === "online" ? "online" : "presencial"} para{" "}
            {formatDate(pendingMeeting.proposed_date)}
            {pendingMeeting.proposed_time ? ` às ${pendingMeeting.proposed_time.slice(0, 5)}` : ""}.
          </p>
          {pendingMeeting.note ? (
            <p className="mt-1 text-xs text-[var(--muted)]">"{pendingMeeting.note}"</p>
          ) : null}

          {!rescheduling ? (
            <div className="mt-2 flex gap-2">
              <form action={respondAction}>
                <input type="hidden" name="id" value={pendingMeeting.id} />
                <input type="hidden" name="approve" value="true" />
                <SubmitBtn className="btn btn-primary !py-1.5 !text-xs">Aprovar</SubmitBtn>
              </form>
              <button
                type="button"
                className="btn btn-ghost !py-1.5 !text-xs"
                onClick={() => setRescheduling(true)}
              >
                Reagendar
              </button>
            </div>
          ) : (
            <form action={respondAction} className="mt-2 grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="id" value={pendingMeeting.id} />
              <input type="hidden" name="approve" value="false" />
              <input name="proposed_date" type="date" className="input !py-1.5 !text-xs" required />
              <input name="proposed_time" type="time" className="input !py-1.5 !text-xs" />
              <select name="modality" className="input !py-1.5 !text-xs" defaultValue={pendingMeeting.modality}>
                <option value="online">Online</option>
                <option value="presencial">Presencial</option>
              </select>
              <div className="sm:col-span-3 flex gap-2">
                <SubmitBtn className="btn btn-primary !py-1.5 !text-xs">Enviar nova data</SubmitBtn>
                <button
                  type="button"
                  className="btn btn-ghost !py-1.5 !text-xs"
                  onClick={() => setRescheduling(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
          <Feedback state={respondState} />
        </div>
      ) : null}

      {alreadyResolvedNote ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <strong>Já tratado:</strong> {alreadyResolvedNote}
        </p>
      ) : (
        <form action={resolveAction} className="space-y-2">
          <input type="hidden" name="status_response_id" value={statusResponseId} />
          <label className="label">O que foi feito?</label>
          <textarea
            name="note"
            rows={2}
            className="input"
            placeholder="Ex.: conversei com ele(a), está tudo bem."
            required
          />
          <Feedback state={resolveState} />
          <SubmitBtn className="btn btn-soft !py-1.5 !text-xs">Marcar como tratado</SubmitBtn>
        </form>
      )}
    </div>
  );
}
