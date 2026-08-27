"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { completeProfile } from "@/lib/actions/profile";
import { AGE_RANGE_LABEL, type AgeRange, type Gender } from "@/lib/types";

const AGES: AgeRange[] = ["12-14", "15-16", "17"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "Salvando…" : "Continuar"}
    </button>
  );
}

export function CompleteProfileForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [state, action] = useActionState(completeProfile, null);
  const [gender, setGender] = useState<Gender | "">("");

  useEffect(() => {
    document.documentElement.dataset.theme = gender || "neutral";
  }, [gender]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="gender" value={gender} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="first_name">
            Nome
          </label>
          <input
            id="first_name"
            name="first_name"
            className="input"
            defaultValue={firstName}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="last_name">
            Sobrenome
          </label>
          <input
            id="last_name"
            name="last_name"
            className="input"
            defaultValue={lastName}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="age_range">
          Idade
        </label>
        <select id="age_range" name="age_range" className="input" required defaultValue="">
          <option value="">Selecione</option>
          {AGES.map((a) => (
            <option key={a} value={a}>
              {AGE_RANGE_LABEL[a]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="label">Gênero</span>
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                gender === g
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {g === "male" ? "Masculino" : "Feminino"}
            </button>
          ))}
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
