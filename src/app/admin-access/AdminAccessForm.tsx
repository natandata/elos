"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminSignIn } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "Verificando…" : "Entrar como administrador"}
    </button>
  );
}

export function AdminAccessForm() {
  const [state, action] = useActionState(adminSignIn, null);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="password">
          Senha administrativa
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="input"
          autoComplete="off"
        />
      </div>

      {state?.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
