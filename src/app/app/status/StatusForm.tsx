"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { submitStatus } from "@/lib/actions/status";
import { requestCareMeeting } from "@/lib/actions/care";
import { STATUS_LABEL, type StatusLevel } from "@/lib/types";

const LEVELS: StatusLevel[] = ["bad", "ok", "good"];
const EMOJI: Record<StatusLevel, string> = { bad: "😔", ok: "😐", good: "😄" };

function Choice({
  name,
  value,
  onChange,
}: {
  name: string;
  value: StatusLevel | "";
  onChange: (v: StatusLevel) => void;
}) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${
              value === level
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            <span className="mb-1 block text-xl">{EMOJI[level]}</span>
            {STATUS_LABEL[level]}
          </button>
        ))}
      </div>
    </>
  );
}

function SubmitButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending || disabled}>
      {pending ? "Enviando…" : label}
    </button>
  );
}

/** Depois de responder "Mal", oferece marcar uma conversa com o líder. */
function CareMeetingOffer({ statusResponseId }: { statusResponseId: string }) {
  const router = useRouter();
  const [careState, careAction] = useActionState(requestCareMeeting, null);
  const [modality, setModality] = useState<"online" | "presencial" | "">("");
  const [skipped, setSkipped] = useState(false);

  if (careState?.ok || skipped) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-4xl">🙏</p>
        <p className="text-sm text-[var(--muted)]">
          {careState?.ok
            ? "Pedido enviado! Seu líder vai confirmar o dia."
            : "Tudo bem, sua liderança já foi avisada que você respondeu \"Mal\"."}
        </p>
        <button type="button" className="btn btn-primary w-full" onClick={() => router.push("/app")}>
          Continuar
        </button>
      </div>
    );
  }

  return (
    <form action={careAction} className="space-y-4">
      <input type="hidden" name="status_response_id" value={statusResponseId} />
      <div className="text-center">
        <p className="text-3xl">💛</p>
        <p className="mt-2 text-sm font-semibold">Quer marcar uma conversa com seu líder?</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Só uma sugestão de dia — seu líder confirma ou propõe outro.
        </p>
      </div>

      <div>
        <p className="label">Modalidade</p>
        <div className="grid grid-cols-2 gap-2">
          {(["online", "presencial"] as const).map((m) => (
            <button
              key={m}
              type="button"
              name="modality"
              onClick={() => setModality(m)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                modality === m
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {m === "online" ? "Online" : "Presencial"}
            </button>
          ))}
        </div>
        <input type="hidden" name="modality" value={modality} />
      </div>

      <div>
        <label className="label" htmlFor="proposed_date">
          Dia sugerido
        </label>
        <input id="proposed_date" name="proposed_date" type="date" className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="proposed_time">
          Horário (opcional)
        </label>
        <input id="proposed_time" name="proposed_time" type="time" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="note">
          Quer contar algo? (opcional)
        </label>
        <textarea id="note" name="note" rows={2} className="input" />
      </div>

      {careState?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{careState.error}</p>
      ) : null}

      <SubmitButton disabled={!modality} label="Enviar pedido" />
      <button
        type="button"
        className="btn btn-ghost w-full !py-2 !text-sm"
        onClick={() => setSkipped(true)}
      >
        Agora não
      </button>
    </form>
  );
}

export function StatusForm() {
  const [state, action] = useActionState(submitStatus, null);
  const [emotional, setEmotional] = useState<StatusLevel | "">("");
  const [spiritual, setSpiritual] = useState<StatusLevel | "">("");

  if (state?.bad && state.statusResponseId) {
    return <CareMeetingOffer statusResponseId={state.statusResponseId} />;
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <p className="label">Como você está emocionalmente?</p>
        <Choice name="emotional" value={emotional} onChange={setEmotional} />
      </div>
      <div>
        <p className="label">Como você está espiritualmente?</p>
        <Choice name="spiritual" value={spiritual} onChange={setSpiritual} />
      </div>

      {state?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <SubmitButton disabled={!emotional || !spiritual} label="Enviar" />
    </form>
  );
}
