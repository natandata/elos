"use client";

import { useActionState } from "react";
import { approveLeader } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";
import { Avatar } from "@/components/Avatar";

export function PendingLeaderCard({
  id,
  name,
  email,
  avatarUrl,
}: {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}) {
  const [state, action] = useActionState(approveLeader, null);

  return (
    <div className="card border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar url={avatarUrl} name={name} size={40} />
          <div className="min-w-0">
            <p className="truncate font-bold">{name || "Sem nome"}</p>
            <p className="truncate text-xs text-amber-800">
              {email ?? "sem e-mail"} · quer entrar como líder
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <form action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="approve" value="true" />
            <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Aprovando…">
              Aprovar
            </SubmitBtn>
          </form>
          <form action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="approve" value="false" />
            <SubmitBtn className="btn btn-ghost !py-2 !text-sm" pendingLabel="Salvando…">
              Recusar
            </SubmitBtn>
          </form>
        </div>
      </div>

      <p className="mt-2 text-xs text-amber-800">
        Recusar não apaga a conta: ela continua ativa como cria.
      </p>
      <Feedback state={state} />
    </div>
  );
}
