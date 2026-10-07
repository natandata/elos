import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ARENA_DIFFICULTY_DEFAULT, clampDifficulty } from "./difficulty";

/** Dificuldade geral atual (definida pelo admin). Sem banco ou sem linha, vale o padrão (+25%). */
export async function loadArenaDifficulty(db: SupabaseClient | null): Promise<number> {
  if (!db) return ARENA_DIFFICULTY_DEFAULT;
  const { data } = await db.from("arena_settings").select("bot_difficulty").eq("id", 1).maybeSingle<{ bot_difficulty: number }>();
  return data ? clampDifficulty(Number(data.bot_difficulty)) : ARENA_DIFFICULTY_DEFAULT;
}
