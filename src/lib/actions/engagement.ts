"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Bônus de +1 XP no primeiro acesso do dia (cria). Idempotente no banco. */
export async function claimDailyLoginBonus(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("claim_daily_login_bonus");
  if (data) revalidatePath("/app", "layout");
}

/** Destaque semanal do líder: fixa/desfixa um post no topo do Feed. */
export async function toggleFeedPin(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const postId = String(formData.get("post_id") ?? "");
  if (!postId) return { error: "Post inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_feed_pin", { p_post_id: postId });
  if (error) return { error: "Não foi possível destacar." };

  revalidatePath("/app/feed");
  return { ok: true };
}
