"use client";

import { useActionState } from "react";
import { applyPasswordResetRequest, dismissPasswordResetRequest } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";
import { Avatar } from "@/components/Avatar";
import { formatDateTime } from "@/lib/types";

export function PasswordResetRequestCard({
  id,
  name,
  email,
  avatarUrl,
  suggestedPassword,
  createdAt,
}: {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  suggestedPassword: string;
  createdAt: string;
}) {
  const [applyState, applyAction] = useActionState(applyPasswordResetRequest, null);
  const [dismissState, dismissAction] = useActionState(dismissPasswordResetRequest, null);

  return (
    <div className="card border-sky-300 bg-sky-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar url={avatarUrl} name={name} size={40} />
          <div className="min-w-0">
            <p className="truncate font-bold">{name || "Sem nome"}</p>
            <p className="truncate text-xs text-sky-800">
              {email ?? "sem e-mail"} · pediu em {formatDateTime(createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-sky-200 bg-white px-3 py-2">
        <p className="text-xs text-[var(--muted)]">Senha sugerida</p>
        <p className="font-mono text-sm font-bold">{suggestedPassword}</p>
      </div>

      <div className="mt-3 flex gap-2">
        <form action={applyAction}>
          <input type="hidden" name="id" value={id} />
          <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Aplicando…">
            Aplicar essa senha
          </SubmitBtn>
        </form>
        <form action={dismissAction}>
          <input type="hidden" name="id" value={id} />
          <SubmitBtn className="btn btn-ghost !py-2 !text-sm" pendingLabel="Recusando…">
            Recusar
          </SubmitBtn>
        </form>
      </div>
      <Feedback state={applyState} />
      <Feedback state={dismissState} />
    </div>
  );
}
