"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logGameActivity } from "@/lib/games/activity";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { MAX_PLAYERS, matchStars, type MatchReport, type QdStats } from "@/lib/quemdesenha/rules";

const MIN_GAP_MS = 30_000;

/** Fecha uma partida: o servidor limpa o relatório do aparelho, refaz a conta das estrelas (com limites) e grava. */
export async function finishQdMatch(report: MatchReport): Promise<{ error?: string; stars?: number; stats?: QdStats }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para salvar o progresso." };
  if (!(await gameOpenFor("quemdesenha", user.id))) return { error: "Jogo indisponível." };
  const admin = createAdminClient();
  if (!admin) return { error: "Progresso indisponível no momento." };

  const int = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(Number(v)) || 0));
  const players = int(report?.players, 2, MAX_PLAYERS);
  const clean: MatchReport = {
    players,
    place: int(report?.place, 1, players),
    score: int(report?.score, 0, 4000),
    drawings: int(report?.drawings, 0, 4 * 1),
    guesses: int(report?.guesses, 0, 4 * (MAX_PLAYERS - 1)),
    seconds: int(report?.seconds, 0, 7200),
  };
  // uma partida de verdade leva tempo: pelo menos uns 25 s por vez de desenho
  if (clean.seconds < 40) return { error: "Partida curta demais para contar." };

  const { data: cur } = await admin
    .from("qd_stats")
    .select("stars, matches, wins, drawings, guesses, win_streak, best_streak, updated_at")
    .eq("user_id", user.id)
    .maybeSingle<QdStats & { updated_at: string }>();
  if (cur && Date.now() - new Date(cur.updated_at).getTime() < MIN_GAP_MS) return { error: "Aguarde um pouco antes de enviar outra partida.", stats: cur };

  const stars = Math.min(400, matchStars(clean));
  const won = clean.place === 1;
  const streak = won ? (cur?.win_streak ?? 0) + 1 : 0;
  const row = {
    user_id: user.id,
    stars: (cur?.stars ?? 0) + stars,
    matches: (cur?.matches ?? 0) + 1,
    wins: (cur?.wins ?? 0) + (won ? 1 : 0),
    drawings: (cur?.drawings ?? 0) + clean.drawings,
    guesses: (cur?.guesses ?? 0) + clean.guesses,
    win_streak: streak,
    best_streak: Math.max(cur?.best_streak ?? 0, streak),
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("qd_stats").upsert(row, { onConflict: "user_id" });
  if (error) return { error: "Não foi possível salvar o progresso." };
  await logGameActivity(user.id, "quemdesenha", "play", `Quem Desenha?: ${clean.place}º de ${clean.players}, ${clean.guesses} acerto(s), +${stars} estrelas`, 0);
  revalidatePath("/app/jogos/quemdesenha");
  const { updated_at: _u, ...stats } = row;
  void _u;
  return { stars, stats: { stars: stats.stars, matches: stats.matches, wins: stats.wins, drawings: stats.drawings, guesses: stats.guesses, win_streak: stats.win_streak, best_streak: stats.best_streak } };
}
