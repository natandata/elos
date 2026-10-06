"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GAME_RELEASES } from "@/lib/games/release";

async function adminCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle<{ id: string; role: string }>();
  if (me?.role !== "admin") return null;
  const admin = createAdminClient();
  return admin ? { admin, me } : null;
}

/** Libera (ou retira) o acesso antecipado de um jogo para um usuário. Só admin. */
export async function setEarlyAccess(game: string, userId: string, grant: boolean): Promise<{ error?: string }> {
  if (!(game in GAME_RELEASES)) return { error: "Jogo inválido." };
  const c = await adminCtx();
  if (!c) return { error: "Sem permissão." };
  const { error } = grant
    ? await c.admin.from("game_early_access").upsert({ game, user_id: userId, granted_by: c.me.id }, { onConflict: "game,user_id" })
    : await c.admin.from("game_early_access").delete().eq("game", game).eq("user_id", userId);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/app/admin/jogos");
  return {};
}
