import type { SupabaseClient } from "@supabase/supabase-js";

// Leitura do progresso do aluno (RLS: cada um lê só o que é seu; o admin lê tudo).

export type EnglishState = {
  startUnit: number;
  placementDone: boolean;
  streak: number;
  streakDate: string | null;
  doneToday: boolean;
  totalDone: number;
  xpLessons: number;
  xpRoleplay: boolean;
  /** lição (ou "uN-lendario") -> estrelas */
  done: Map<string, number>;
  /** ids de exercícios errados ainda não dominados */
  pendingMistakes: string[];
  /** cenário -> melhor precisão */
  roleplayBest: Map<string, number>;
};

const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export async function getEnglishState(supabase: SupabaseClient, userId: string): Promise<EnglishState> {
  const [profRes, doneRes, misRes, runRes] = await Promise.all([
    supabase.from("english_profile").select("start_unit, placement_done, streak, streak_date, last_done_date, total_done, xp_day, xp_lessons, xp_roleplay").eq("user_id", userId).maybeSingle(),
    supabase.from("english_lessons_done").select("lesson_id, stars").eq("user_id", userId),
    supabase.from("english_mistakes").select("ex_id").eq("user_id", userId).is("mastered_at", null).order("last_wrong_at", { ascending: false }).limit(60),
    supabase.from("english_roleplay_runs").select("scenario, accuracy").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
  ]);
  const p = (profRes.data ?? null) as { start_unit: number; placement_done: boolean; streak: number; streak_date: string | null; last_done_date: string | null; total_done: number; xp_day: string | null; xp_lessons: number; xp_roleplay: boolean } | null;
  const today = todayBR();
  const live = p?.streak_date === today || (p?.streak_date ? new Date(p.streak_date).getTime() >= new Date(today).getTime() - 86_400_000 : false);
  const rp = new Map<string, number>();
  for (const r of (runRes.data ?? []) as { scenario: string; accuracy: number }[]) rp.set(r.scenario, Math.max(rp.get(r.scenario) ?? 0, r.accuracy));
  return {
    startUnit: p?.start_unit ?? 1,
    placementDone: p?.placement_done ?? false,
    streak: live ? (p?.streak ?? 0) : 0,
    streakDate: p?.streak_date ?? null,
    doneToday: p?.last_done_date === today,
    totalDone: p?.total_done ?? 0,
    xpLessons: p?.xp_day === today ? (p?.xp_lessons ?? 0) : 0,
    xpRoleplay: p?.xp_day === today ? (p?.xp_roleplay ?? false) : false,
    done: new Map(((doneRes.data ?? []) as { lesson_id: string; stars: number }[]).map((d) => [d.lesson_id, d.stars])),
    pendingMistakes: ((misRes.data ?? []) as { ex_id: string }[]).map((m) => m.ex_id),
    roleplayBest: rp,
  };
}
