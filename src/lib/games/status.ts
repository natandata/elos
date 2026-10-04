import type { SupabaseClient } from "@supabase/supabase-js";
import { todayBR } from "./engine";

export type PlayRow = {
  game: string;
  answers: unknown[];
  score: number;
  finished: boolean;
  xp_awarded: number;
};

/** Partidas do dia de quem está logado (a RLS já limita às próprias). */
export async function todaysPlays(supabase: SupabaseClient, userId: string): Promise<Map<string, PlayRow>> {
  const { data } = await supabase
    .from("game_plays")
    .select("game, answers, score, finished, xp_awarded")
    .eq("user_id", userId)
    .eq("play_date", todayBR())
    .is("duel_id", null);
  return new Map(((data ?? []) as PlayRow[]).map((p) => [p.game, p]));
}

/** Ofensiva só vale se jogou hoje ou ontem; senão já "quebrou". */
export function liveGameStreak(streak: number, streakDate: string | null): number {
  if (!streakDate || streak <= 0) return 0;
  const today = new Date(`${todayBR()}T00:00:00Z`).getTime();
  const last = new Date(`${streakDate}T00:00:00Z`).getTime();
  return (today - last) / 86_400_000 <= 1 ? streak : 0;
}
