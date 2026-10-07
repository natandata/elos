"use server";

import { revalidatePath } from "next/cache";
import { clampDifficulty } from "@/lib/arena/difficulty";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Admin: define a dificuldade geral da Arena contra o computador (vale para as próximas partidas de todos). */
export async function setArenaDifficulty(value: number): Promise<{ error?: string; value?: number }> {
  if (!Number.isFinite(value)) return { error: "Valor inválido." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sem permissão." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (me?.role !== "admin") return { error: "Sem permissão." };
  const admin = createAdminClient();
  if (!admin) return { error: "Servidor sem acesso ao banco." };
  const v = clampDifficulty(value);
  const { error } = await admin.from("arena_settings").upsert({ id: 1, bot_difficulty: v, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/app/admin/jogos");
  return { value: v };
}
