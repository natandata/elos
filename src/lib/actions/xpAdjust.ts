"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; ok?: boolean };

/** Admin corrige o XP que um cria já ganhou numa missão cumprida (o banco confere a permissão e registra na Auditoria). */
export async function adjustMissionXp(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const txId = String(formData.get("tx") ?? "");
  const xp = Number(formData.get("xp") ?? NaN);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!txId) return { error: "Missão inválida." };
  if (!Number.isInteger(xp) || xp < 0 || xp > 25) return { error: "O XP de uma missão vai de 0 a 25." };

  const { error } = await supabase.rpc("admin_adjust_mission_xp", { p_tx: txId, p_new_xp: xp, p_reason: reason || null });
  if (error) {
    const known = /^(O XP|Esse cria|Essa linha|Apenas admin)/.test(error.message);
    return { error: known ? error.message.replace("Apenas admin", "Só a administração corrige XP.") : "Não foi possível corrigir o XP agora." };
  }

  revalidatePath("/app/admin/elos/historico");
  revalidatePath("/app/lider/historico");
  revalidatePath("/app/admin/elos");
  revalidatePath("/app/ranking");
  revalidatePath("/app/cria");
  revalidatePath("/app/cria/missoes");
  return { ok: true };
}
