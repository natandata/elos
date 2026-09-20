"use client";

import { useEffect, useState } from "react";
import { getExistingSubscription, pushSupported, subscribeToPush } from "@/lib/push-client";
import { deletePushSubscription, savePushSubscription } from "@/lib/actions/push";

type Status = "loading" | "unsupported" | "unset" | "on" | "off" | "denied";

function subToJSON(sub: PushSubscription) {
  const json = sub.toJSON();
  return { endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } };
}

function todayKey() {
  // Só esconde até o fim do dia — sexta que vem, se ainda sem notificação
  // ativa, a mensagem volta (ver needsWeeklyPushNudge em src/lib/auth.ts).
  return `elos-weekly-push-dismissed-${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Empurrão semanal (toda sexta, ver needsWeeklyPushNudge) pra quem ainda não
 * ativou notificação em nenhum aparelho — diferente do PushPermissionBanner
 * (que aparece uma vez só e some pra sempre), esse volta toda sexta até a
 * pessoa realmente ativar.
 */
export function WeeklyPushNudge({ eligible }: { eligible: boolean }) {
  const [status, setStatus] = useState<Status>("loading");
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eligible) return;
    setDismissed(localStorage.getItem(todayKey()) === "1");

    let cancelled = false;
    (async () => {
      if (!pushSupported()) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const sub = await getExistingSubscription();
      if (cancelled) return;
      setStatus(sub ? "on" : "unset");
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible]);

  if (!eligible || status !== "unset" || dismissed) return null;

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const sub = await subscribeToPush();
      await savePushSubscription(subToJSON(sub));
      setStatus("on");
      localStorage.setItem(todayKey(), "1");
    } catch {
      setError("Não deu pra ativar. Você pode tentar de novo no Perfil.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(todayKey(), "1");
    setDismissed(true);
  }

  return (
    <div className="card mb-4 border-2 border-[var(--accent)] p-4">
      <p className="text-sm font-bold">🔔 Não perca as novidades do ELOS!</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Quase tudo que rola por aqui — missão nova, XP, mensagens, eventos — só chega até você por
        notificação. Sem ativar, você fica sabendo depois de todo mundo (ou nem fica). Ativa agora,
        leva 2 segundos.
      </p>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={activate}
          disabled={busy}
          className="btn btn-primary !py-2 !text-sm"
        >
          {busy ? "Ativando…" : "Ativar notificações"}
        </button>
        <button type="button" onClick={dismiss} className="btn btn-ghost !py-2 !text-sm">
          Agora não
        </button>
      </div>
    </div>
  );
}
