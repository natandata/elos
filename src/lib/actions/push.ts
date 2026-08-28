"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Ativar push: grava a subscription do navegador/dispositivo atual. */
export async function savePushSubscription(sub: SubscriptionJSON): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { error: "Não foi possível ativar as notificações." };
  return {};
}

/** Desativar push: remove a subscription do navegador/dispositivo atual. */
export async function deletePushSubscription(endpoint: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) return { error: "Não foi possível desativar." };
  return {};
}
