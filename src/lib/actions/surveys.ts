"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Pesquisa única do Elo Masculino 16–17: "Você gostaria de ser mais generoso?" Sim = 3 XP do Elo para cada um dos outros Elos. */
export async function answerGenerosity(yes: boolean): Promise<{ error?: string; moved?: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("survey_generosity_answer", { p_yes: yes });
  if (error) return { error: "Não foi possível registrar sua resposta. Tente de novo." };
  const r = data as { error?: string; moved?: number } | null;
  if (r?.error) return { error: r.error };
  revalidatePath("/app", "layout");
  return { moved: r?.moved ?? 0 };
}
