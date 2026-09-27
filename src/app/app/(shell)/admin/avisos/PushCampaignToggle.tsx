"use client";

import { useActionState } from "react";
import { togglePushActivationCampaign } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";

export function PushCampaignToggle({
  active,
  withoutPush,
}: {
  active: boolean;
  withoutPush: number;
}) {
  const [state, action] = useActionState(togglePushActivationCampaign, null);

  return (
    <div className="card p-4">
      <p className="font-bold">🔔 Pedir pra ativar notificações</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Enquanto ativo, todo usuário sem notificação ligada vê um card pedindo pra ativar, logo depois
        de responder o status do dia. Hoje, {withoutPush} usuário(s) ainda sem push.
      </p>
      <p className="mt-2 text-sm">
        Status: {active ? "🟢 Ativo" : "⚪ Desligado"}
      </p>
      <form action={action} className="mt-3">
        <input type="hidden" name="active" value={active ? "false" : "true"} />
        <Feedback state={state} />
        <SubmitBtn className={`btn ${active ? "btn-ghost" : "btn-primary"} mt-2 w-full !py-2`}>
          {active ? "Desligar pedido" : "Ativar pedido pra todo mundo"}
        </SubmitBtn>
      </form>
    </div>
  );
}
