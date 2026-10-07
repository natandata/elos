"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SoccerResult = { mode: string; level: string; goalsFor: number; goalsAgainst: number; secs: number };

/** Guarda uma partida terminada (a função do banco confere os limites e segura partidas em sequência rápida demais). */
export async function recordSoccerMatch(r: SoccerResult): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("soccer_record", {
    p_mode: r.mode,
    p_level: r.level,
    p_for: Math.round(r.goalsFor),
    p_against: Math.round(r.goalsAgainst),
    p_secs: Math.round(r.secs),
  });
  if (error || !data) return { error: "Não foi possível guardar a partida." };
  const res = data as { error?: string };
  if (res.error) return { error: res.error };
  revalidatePath("/app/jogos");
  return {};
}
