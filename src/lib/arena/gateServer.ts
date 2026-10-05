import type { SupabaseClient } from "@supabase/supabase-js";
import { GATE_GAME_KEYS, GATE_START, computeGate, gateBattlesFor, describeGate, gameCounts, type GateEvent, type GateGame, type GateInfo } from "./gate";

const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/**
 * Lê o que o jogador fez desde GATE_START (batalhas e jogos) e calcula a trava.
 * Funciona com o client da sessão: as tabelas já são legíveis pelo próprio jogador.
 */
export async function loadGate(supabase: SupabaseClient, userId: string): Promise<GateInfo> {
  const events: GateEvent[] = [];
  const { data: me } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle<{ role: string }>();
  const iso = (v: string | null | undefined) => (v ? new Date(v).getTime() : NaN);

  const [pve, games] = await Promise.all([
    supabase.from("arena_matches").select("finished_at").eq("user_id", userId).eq("status", "finished").gte("finished_at", GATE_START),
    supabase.from("game_plays").select("game, score, practice, difficulty, finished_at, play_date").eq("user_id", userId).eq("finished", true).in("game", [...GATE_GAME_KEYS]).gte("finished_at", GATE_START),
  ]);

  for (const list of [pve.data]) {
    for (const r of (list ?? []) as { finished_at: string }[]) {
      const t = iso(r.finished_at);
      if (!Number.isNaN(t)) events.push({ t, kind: "battle" });
    }
  }
  const today = todayBR();
  const doneToday = new Set<GateGame>();
  for (const r of (games.data ?? []) as { game: GateGame; score: number; practice: boolean; difficulty: string | null; finished_at: string; play_date: string }[]) {
    const t = iso(r.finished_at);
    // só vitória conta (e treino só no Difícil)
    if (!Number.isNaN(t) && gameCounts(r.game, r.score, r.practice, r.difficulty)) events.push({ t, kind: "game" });
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

  return describeGate(computeGate(events, gateBattlesFor(me?.role)), [...doneToday]);
}
