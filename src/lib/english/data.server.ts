import type { SupabaseClient } from "@supabase/supabase-js";
import { heartsNow, type DailyStats } from "@/lib/babel/economy";

// Leitura do progresso do aluno (RLS: cada um lê só o que é seu; o admin lê tudo).

export type BabelState = {
  xpTotal: number;
  gems: number;
  hearts: number;
  nextHeartAt: number | null;
  freezes: number;
  goal: number;
  boostUntil: number | null;
  bestStreak: number;
  league: number;
  today: DailyStats & { goalMet: boolean; claimed: number[] };
  /** segunda a domingo da semana atual: teve XP naquele dia? */
  week: boolean[];
  dow: number;
  dayStr: string;
};

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
  babel: BabelState;
};

const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

export async function getEnglishState(supabase: SupabaseClient, userId: string): Promise<EnglishState> {
  const today0 = todayBR();
  const dow = (new Date(today0 + "T12:00:00Z").getUTCDay() + 6) % 7;
  const monday = addDays(today0, -dow);
  const [babRes, dayRes, profRes, doneRes, misRes, runRes] = await Promise.all([
    supabase.from("babel_profile").select("xp_total, gems, hearts, hearts_at, freezes, goal, boost_until, best_streak, league").eq("user_id", userId).maybeSingle(),
    supabase.from("babel_daily").select("day, xp, lessons, perfects, roleplays, practices, goal_met, quests_claimed").eq("user_id", userId).gte("day", monday),
    supabase.from("english_profile").select("start_unit, placement_done, streak, streak_date, last_done_date, total_done, xp_day, xp_lessons, xp_roleplay").eq("user_id", userId).maybeSingle(),
    supabase.from("english_lessons_done").select("lesson_id, stars").eq("user_id", userId),
    supabase.from("english_mistakes").select("ex_id").eq("user_id", userId).is("mastered_at", null).order("last_wrong_at", { ascending: false }).limit(60),
    supabase.from("english_roleplay_runs").select("scenario, accuracy").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
  ]);
  const p = (profRes.data ?? null) as { start_unit: number; placement_done: boolean; streak: number; streak_date: string | null; last_done_date: string | null; total_done: number; xp_day: string | null; xp_lessons: number; xp_roleplay: boolean } | null;
  const today = todayBR();
  const b = (babRes.data ?? null) as { xp_total: number; gems: number; hearts: number; hearts_at: string | null; freezes: number; goal: number; boost_until: string | null; best_streak: number; league: number } | null;
  const days = (dayRes.data ?? []) as { day: string; xp: number; lessons: number; perfects: number; roleplays: number; practices: number; goal_met: boolean; quests_claimed: number[] }[];
  const td = days.find((d) => d.day === today);
  const gap = p?.streak_date ? Math.round((new Date(today).getTime() - new Date(p.streak_date).getTime()) / 86_400_000) : 99;
  const live = gap <= 1 || (gap === 2 && (b?.freezes ?? 0) > 0);
  const hh = heartsNow(b?.hearts ?? 5, b?.hearts_at ?? null);
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
    babel: {
      xpTotal: b?.xp_total ?? 0,
      gems: b?.gems ?? 30,
      hearts: hh.hearts,
      nextHeartAt: hh.nextAt,
      freezes: b?.freezes ?? 0,
      goal: b?.goal ?? 20,
      boostUntil: b?.boost_until && new Date(b.boost_until).getTime() > Date.now() ? new Date(b.boost_until).getTime() : null,
      bestStreak: b?.best_streak ?? 0,
      league: b?.league ?? 1,
      today: { xp: td?.xp ?? 0, lessons: td?.lessons ?? 0, perfects: td?.perfects ?? 0, roleplays: td?.roleplays ?? 0, practices: td?.practices ?? 0, goalMet: td?.goal_met ?? false, claimed: td?.quests_claimed ?? [] },
      week: Array.from({ length: 7 }, (_, i) => (days.find((d) => d.day === addDays(monday, i))?.xp ?? 0) > 0),
      dow,
      dayStr: today,
    },
  };
}
