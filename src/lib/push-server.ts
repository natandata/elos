import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const { VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PRIVATE_KEY || !NEXT_PUBLIC_VAPID_PUBLIC_KEY) return false;
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:contato@elos.app",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string };

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

/**
 * Envia push (notificação de sistema, aparece mesmo com o app fechado) pra
 * uma lista de usuários. Sem chaves VAPID configuradas, não faz nada —
 * nunca deve derrubar a ação que chamou (postar no feed, criar missão etc).
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  if (ids.length === 0) return;
  if (!ensureConfigured()) return;

  const supabase = await createClient();
  const { data } = await supabase.rpc("push_subscriptions_for", { p_user_ids: ids });
  const subs = (data ?? []) as SubRow[];
  if (subs.length === 0) return;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | null)?.statusCode;
        // Endpoint morto (usuário desinstalou/revogou) — limpa pra não tentar de novo.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.rpc("delete_stale_push_subscription", { p_id: s.id });
        }
      }
    }),
  );
}
