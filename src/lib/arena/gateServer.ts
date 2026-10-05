import type { SupabaseClient } from "@supabase/supabase-js";
import { GATE_GAME_KEYS, GATE_START, computeGate, describeGate, type GateEvent, type GateGame, type GateInfo } from "./gate";

const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/**
 * Lê o que o jogador fez desde GATE_START (batalhas e jogos) e calcula a trava.
 * Funciona com o client da sessão: as tabelas já são legíveis pelo próprio jogador.
 */
export async function loadGate(supabase: SupabaseClient, userId: string): Promise<GateInfo> {
  const events: GateEvent[] = [];
  const iso = (v: string | null | undefined) => (v ? new Date(v).getTime() : NaN);

  const [pve, pvp, duo, games] = await Promise.all([
    supabase.from("arena_matches").select("finished_at").eq("user_id", userId).eq("status", "finished").gte("finished_at", GATE_START),
    supabase.from("arena_pvp").select("finished_at").eq("status", "finished").is("tournament_match_id", null).or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`).gte("finished_at", GATE_START),
    supabase.from("arena_duo").select("finished_at").eq("status", "finished").is("tournament_match_id", null).contains("players", [userId]).gte("finished_at", GATE_START),
    supabase.from("game_plays").select("game, finished_at, play_date").eq("user_id", userId).eq("finished", true).in("game", [...GATE_GAME_KEYS]).gte("finished_at", GATE_START),
  ]);

  for (const list of [pve.data, pvp.data, duo.data]) {
    for (const r of (list ?? []) as { finished_at: string }[]) {
      const t = iso(r.finished_at);
      if (!Number.isNaN(t)) events.push({ t, kind: "battle" });
    }
  }
  const today = todayBR();
  const doneToday = new Set<GateGame>();
  for (const r of (games.data ?? []) as { game: GateGame; finished_at: string; play_date: string }[]) {
    const t = iso(r.finished_at);
    if (!Number.isNaN(t)) events.push({ t, kind: "game" });
    if (r.play_date === today) doneToday.add(r.game);
  }

  // jogos feitos hoje antes de GATE_START também ocupam o dia (cada jogo vale uma vez por dia)
  const { data: todays } = await supabase
    .from("game_plays")
    .select("game")
    .eq("user_id", userId)
    .eq("finished", true)
    .eq("play_date", today)
    .in("game", [...GATE_GAME_KEYS]);
  for (const r of (todays ?? []) as { game: GateGame }[]) doneToday.add(r.game);

  return describeGate(computeGate(events), [...doneToday]);
}
