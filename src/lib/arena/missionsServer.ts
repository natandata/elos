import type { SupabaseClient } from "@supabase/supabase-js";
import { ARENA_MISSIONS, longestWinStreak, type ArenaMissionDef } from "./missions";

/** "YYYY-MM-DD" de hoje em Brasília. */
export const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
/** Começo do dia de Brasília (UTC-3 o ano todo) em ISO. */
export const dayStartISO = (day = todayBR()) => `${day}T03:00:00.000Z`;

export type MissionState = { def: ArenaMissionDef; progress: number; done: boolean; claimed: boolean };

/**
 * Progresso das missões do dia, calculado das partidas, evoluções e baú de hoje.
 * Funciona com o client da sessão (o jogador lê as próprias linhas).
 */
export async function loadArenaMissions(supabase: SupabaseClient, userId: string): Promise<MissionState[]> {
  const day = todayBR();
  const since = dayStartISO(day);

  const [pve, pvp, duo, up, stats, claims] = await Promise.all([
    supabase.from("arena_matches").select("result, crowns_bot, finished_at").eq("user_id", userId).eq("status", "finished").eq("training", false).gte("finished_at", since),
    supabase.from("arena_pvp").select("result, challenger_id, finished_at").eq("status", "finished").is("tournament_match_id", null).or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`).gte("finished_at", since),
    supabase.from("arena_duo").select("outcome, players, finished_at").eq("status", "finished").is("tournament_match_id", null).contains("players", [userId]).gte("finished_at", since),
    supabase.from("arena_card_levels").select("card", { count: "exact", head: true }).eq("user_id", userId).gte("upgraded_at", since),
    supabase.from("arena_stats").select("chest_date").eq("user_id", userId).maybeSingle<{ chest_date: string | null }>(),
    supabase.from("arena_mission_claims").select("mission").eq("user_id", userId).eq("day", day),
  ]);

  const events: { t: number; res: "win" | "loss" | "draw"; friend: boolean }[] = [];
  let flawless = 0;
  for (const r of (pve.data ?? []) as { result: "win" | "loss" | "draw" | null; crowns_bot: number | null; finished_at: string }[]) {
    if (!r.result) continue;
    events.push({ t: new Date(r.finished_at).getTime(), res: r.result, friend: false });
    if (r.result === "win" && (r.crowns_bot ?? 0) === 0) flawless++;
  }
  for (const r of (pvp.data ?? []) as { result: "challenger" | "opponent" | "draw" | null; challenger_id: string; finished_at: string }[]) {
    if (!r.result) continue;
    const mine = r.challenger_id === userId ? "challenger" : "opponent";
    events.push({ t: new Date(r.finished_at).getTime(), res: r.result === "draw" ? "draw" : r.result === mine ? "win" : "loss", friend: true });
  }
  for (const r of (duo.data ?? []) as { outcome: Record<string, { res: "win" | "loss" | "draw" }> | null; finished_at: string }[]) {
    const res = r.outcome?.[userId]?.res;
    if (res) events.push({ t: new Date(r.finished_at).getTime(), res, friend: true });
  }
  events.sort((a, b) => a.t - b.t);

  const progress: Record<string, number> = {
    win_streak: longestWinStreak(events.map((e) => e.res)),
    flawless,
    win_friend: events.filter((e) => e.friend && e.res === "win").length,
    upgrade: up.count ?? 0,
    play5: events.length,
    chest: stats.data?.chest_date === day ? 1 : 0,
  };
  const claimed = new Set(((claims.data ?? []) as { mission: string }[]).map((c) => c.mission));
  return ARENA_MISSIONS.map((def) => {
    const p = Math.min(def.target, progress[def.key] ?? 0);
    return { def, progress: p, done: p >= def.target, claimed: claimed.has(def.key) };
  });
}
