"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitStatus } from "@/lib/actions/status";
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

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending || disabled}>
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function StatusForm() {
  const [state, action] = useActionState(submitStatus, null);
  const [emotional, setEmotional] = useState<StatusLevel | "">("");
  const [spiritual, setSpiritual] = useState<StatusLevel | "">("");

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

      <SubmitButton disabled={!emotional || !spiritual} />
    </form>
  );
}
