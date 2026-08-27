"use client";

import { useActionState } from "react";
import { acceptCareMeeting, cancelCareMeeting } from "@/lib/actions/care";
import { Feedback, SubmitBtn } from "@/components/forms";
import { formatDate, type CareMeeting } from "@/lib/types";

const STATUS_TEXT: Record<CareMeeting["status"], string> = {
  pending_leader: "Aguardando seu líder confirmar",
  pending_cria: "Seu líder propôs outra data",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

export function CriaCareMeetingCard({ meeting }: { meeting: CareMeeting }) {
  const [acceptState, acceptAction] = useActionState(acceptCareMeeting, null);
  const [cancelState, cancelAction] = useActionState(cancelCareMeeting, null);

  return (
    <div className="card p-4">
      <p className="font-bold">
        Conversa {meeting.modality === "online" ? "online" : "presencial"} —{" "}
        {formatDate(meeting.proposed_date)}
        {meeting.proposed_time ? ` às ${meeting.proposed_time.slice(0, 5)}` : ""}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{STATUS_TEXT[meeting.status]}</p>

      {meeting.status === "pending_cria" ? (
        <div className="mt-3 flex gap-2">
          <form action={acceptAction}>
            <input type="hidden" name="id" value={meeting.id} />
            <SubmitBtn className="btn btn-primary !py-1.5 !text-xs">Aceitar</SubmitBtn>
          </form>
          <form action={cancelAction}>
            <input type="hidden" name="id" value={meeting.id} />
            <SubmitBtn className="btn btn-ghost !py-1.5 !text-xs">Cancelar</SubmitBtn>
          </form>
        </div>
      ) : meeting.status === "pending_leader" ? (
        <form action={cancelAction} className="mt-3">
          <input type="hidden" name="id" value={meeting.id} />
          <SubmitBtn className="btn btn-ghost !py-1.5 !text-xs">Cancelar pedido</SubmitBtn>
        </form>
      ) : null}

      <Feedback state={acceptState} />
      <Feedback state={cancelState} />
    </div>
  );
}
