"use server";

import { logGameActivity } from "@/lib/games/activity";
import { isGameKey } from "@/lib/games/catalog";
import { createClient } from "@/lib/supabase/server";

/** O próprio jogador registra um evento do jogo (fase concluída, partida terminada…) para o painel do admin. */
export async function logMyGameActivity(game: string, detail: string): Promise<void> {
  if (!isGameKey(game)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const text = String(detail ?? "").trim().slice(0, 160);
  if (!text) return;
  await logGameActivity(user.id, game, "play", text, 1);
}
