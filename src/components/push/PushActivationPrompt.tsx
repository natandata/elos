"use client";

import { useState } from "react";
import { getExistingSubscription, pushSupported, subscribeToPush } from "@/lib/push-client";
import { savePushSubscription } from "@/lib/actions/push";

function subToJSON(sub: PushSubscription) {
  const json = sub.toJSON();
  return { endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } };
}

/** Card pedido pelo admin (togglePushActivationCampaign), mostrado logo
 *  depois da pesquisa de status pra quem ainda não tem push ativado. */
export function PushActivationPrompt({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      if (!pushSupported()) throw new Error("Seu navegador não suporta notificações.");
      const existing = await getExistingSubscription();
      const sub = existing ?? (await subscribeToPush());
      await savePushSubscription(subToJSON(sub));
      setDone(true);
    } catch {
      setError("Não deu pra ativar agora. Você pode tentar de novo no Perfil.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-4xl">🔔</p>
        <p className="text-sm font-semibold">Notificações ativadas!</p>
        <button type="button" className="btn btn-primary w-full" onClick={onDone}>
          Continuar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-3xl">🔔</p>
      <p className="text-sm font-semibold">Quer ativar as notificações?</p>
      <p className="text-xs text-[var(--muted)]">
        Missão nova, XP, mensagens, eventos — a maioria das novidades do ELOS só chega até você por
        notificação. Leva 2 segundos pra ativar.
      </p>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button type="button" className="btn btn-primary w-full" onClick={activate} disabled={busy}>
        {busy ? "Ativando…" : "Ativar notificações"}
      </button>
      <button type="button" className="btn btn-ghost w-full !py-2 !text-sm" onClick={onDone}>
        Agora não
      </button>
    </div>
  );
}
