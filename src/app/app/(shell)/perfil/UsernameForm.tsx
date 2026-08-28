"use client";

import { useActionState } from "react";
import { updateOwnUsername } from "@/lib/actions/profile";
import { Feedback, SubmitBtn } from "@/components/forms";

export function UsernameForm({ username }: { username: string | null }) {
  const [state, action] = useActionState(updateOwnUsername, null);

  return (
    <form action={action} className="space-y-2">
      <label className="label" htmlFor="username">
        Seu @ (aparece no Feed)
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-[var(--muted)]">@</span>
        <input
          id="username"
          name="username"
          className="input"
          defaultValue={username ?? ""}
          placeholder="seu.usuario"
          maxLength={20}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>
      <p className="text-xs text-[var(--muted)]">
        3 a 20 caracteres: letras minúsculas, números, ponto ou underline.
      </p>
      <Feedback state={state} />
      <SubmitBtn className="btn btn-primary !py-2 !text-sm">
        {username ? "Salvar" : "Criar @"}
      </SubmitBtn>
    </form>
  );
}
