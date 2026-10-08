"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logGameActivity } from "@/lib/games/activity";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { LORE_BY_ID } from "@/lib/ultimatribo/data/lore";
import { matchXp, type MatchReport } from "@/lib/ultimatribo/progress";

const MIN_GAP_MS = 40_000;

/** Fecha uma partida: o servidor refaz a conta do XP (com limites) e grava o progresso. */
export async function finishTriboMatch(report: MatchReport): Promise<{ error?: string; xp?: number; total?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para salvar o progresso." };
  if (!(await gameOpenFor("ultimatribo", user.id))) return { error: "Jogo indisponível." };
  const admin = createAdminClient();
  if (!admin) return { error: "Progresso indisponível no momento." };

  // limpa o que veio do aparelho: nada fora do possível numa partida
  const int = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(Number(v)) || 0));
  const players = int(report?.players, 2, 20);
  const place = int(report?.place, 1, players);
  const clean: MatchReport = {
    players,
    place,
    won: place === 1,
    kills: int(report?.kills, 0, players - 1),
    seconds: int(report?.seconds, 0, 900),
    opened: int(report?.opened, 0, 60),
    allies: int(report?.allies, 0, 4),
    lore: Array.isArray(report?.lore) ? [...new Set(report.lore.filter((l): l is string => typeof l === "string" && LORE_BY_ID.has(l)))].slice(0, 14) : [],
  };
  // uma vitória não acontece em segundos
  if (clean.won && clean.seconds < 120) return { error: "Partida inválida." };

  const { data: cur } = await admin.from("tribo_stats").select("xp, matches, wins, kills, best_place, lore, updated_at").eq("user_id", user.id).maybeSingle<{ xp: number; matches: number; wins: number; kills: number; best_place: number | null; lore: string[]; updated_at: string }>();
  if (cur && Date.now() - new Date(cur.updated_at).getTime() < MIN_GAP_MS) return { error: "Aguarde um pouco antes de enviar outra partida.", total: cur.xp };

  const xp = matchXp(clean);
  const lore = [...new Set([...(cur?.lore ?? []), ...clean.lore])];
  const row = {
    user_id: user.id,
    xp: (cur?.xp ?? 0) + xp,
    matches: (cur?.matches ?? 0) + 1,
    wins: (cur?.wins ?? 0) + (clean.won ? 1 : 0),
    kills: (cur?.kills ?? 0) + clean.kills,
    best_place: cur?.best_place ? Math.min(cur.best_place, clean.place) : clean.place,
    lore,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("tribo_stats").upsert(row, { onConflict: "user_id" });
  if (error) return { error: "Não foi possível salvar o progresso." };
  await logGameActivity(user.id, "ultimatribo", "play", `Sobrevivência: ${clean.place}º de ${clean.players}, ${clean.kills} eliminação(ões), +${xp} XP`, 0);
  revalidatePath("/app/jogos/ultimatribo");
  return { xp, total: row.xp };
}
