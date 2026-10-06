"use server";

import { revalidatePath } from "next/cache";
import { isGameKey, type Visibility } from "@/lib/games/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Admin: mostra, esconde ou volta ao automático (data de lançamento) um jogo para todos os jogadores. */
export async function setGameVisibility(game: string, visibility: Visibility): Promise<{ error?: string }> {
  if (!isGameKey(game) || !["auto", "visible", "hidden"].includes(visibility)) return { error: "Opção inválida." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sem permissão." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (me?.role !== "admin") return { error: "Sem permissão." };
  const admin = createAdminClient();
  if (!admin) return { error: "Servidor sem acesso ao banco." };
  const { error } = await admin.from("game_settings").upsert({ game, visibility, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "game" });
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/app/jogos", "layout");
  revalidatePath("/app/admin/jogos");
  return {};
}
