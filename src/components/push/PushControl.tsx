"use client";

import { useEffect, useState } from "react";
import { getExistingSubscription, pushSupported, subscribeToPush } from "@/lib/push-client";
import { deletePushSubscription, savePushSubscription } from "@/lib/actions/push";

type Status = "loading" | "unsupported" | "unset" | "on" | "off" | "denied";

const DISMISS_KEY = "elos-push-banner-dismissed";

function subToJSON(sub: PushSubscription) {
  const json = sub.toJSON();
  return { endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } };
}

function useStatus() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
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
  }, []);

  return { status, setStatus };
}

/**
 * Banner discreto pedindo permissão de push — some sozinho depois que o
 * usuário decide (ativa ou dispensa) e nunca reaparece nesse navegador.
 * Aparece no primeiro acesso ao app (pós-cadastro/login), não no cadastro.
 */
export function PushPermissionBanner() {
  const { status, setStatus } = useStatus();
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (status !== "unset" || dismissed) return null;

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const sub = await subscribeToPush();
      await savePushSubscription(subToJSON(sub));
      setStatus("on");
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      setError("Não deu pra ativar. Você pode tentar de novo no Perfil.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-[var(--accent)] p-4">
      <div className="min-w-0">
        <p className="text-sm font-bold">Ativar notificações?</p>
        <p className="text-xs text-[var(--muted)]">
          Avisamos no seu celular quando sair uma foto nova no feed ou uma missão do admin. Dá pra
          desligar quando quiser, no Perfil.
        </p>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={dismiss} className="btn btn-ghost !py-1.5 !text-xs">
          Agora não
        </button>
        <button
          type="button"
          onClick={activate}
          disabled={busy}
          className="btn btn-primary !py-1.5 !text-xs"
        >
          {busy ? "Ativando…" : "Ativar"}
        </button>
      </div>
    </div>
  );
}

/** Card de controle na tela de Perfil — liga/desliga a qualquer momento. */
export function PushToggleCard() {
  const { status, setStatus } = useStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const sub = await subscribeToPush();
      await savePushSubscription(subToJSON(sub));
      localStorage.setItem(DISMISS_KEY, "1");
      setStatus("on");
    } catch {
      setError("Não foi possível ativar. Confira a permissão de notificação do navegador.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    setError(null);
    try {
      const sub = await getExistingSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("unset");
    } catch {
      setError("Não foi possível desativar.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-xs text-[var(--muted)]">
        Seu navegador não suporta notificações push.
      </p>
    );
  }

  if (status === "loading") return null;

  return (
    <div>
      <p className="label mb-0">Notificações no celular</p>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Avisa quando sai uma foto nova no feed ou uma missão do admin.
      </p>
      {status === "denied" ? (
        <p className="text-xs text-amber-700">
          Bloqueadas nas configurações do navegador/dispositivo. Permita notificações do ELOS lá
          pra poder ativar aqui.
        </p>
      ) : (
        <button
          type="button"
          onClick={status === "on" ? deactivate : activate}
          disabled={busy}
          className={`btn !py-2 !text-sm ${status === "on" ? "btn-ghost" : "btn-primary"}`}
        >
          {busy ? "Aguarde…" : status === "on" ? "Desativar" : "Ativar"}
        </button>
      )}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
