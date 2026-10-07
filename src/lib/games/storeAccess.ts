import type { SupabaseClient } from "@supabase/supabase-js";
import { isGameKey, type GameKey } from "./catalog";
import { getEarlyAccess } from "./releaseServer";

/** Jogos à venda na Loja que este jogador ainda não comprou (ficam trancados até a compra). Admin não é afetado, e quem tem acesso antecipado recebe o jogo de graça. */
export async function lockedGames(supabase: SupabaseClient, userId: string, role: string): Promise<Set<GameKey>> {
  if (role === "admin") return new Set();
  const [{ data: items }, { data: bought }, early] = await Promise.all([
    supabase.from("store_items").select("id, game_key").eq("active", true).not("game_key", "is", null).not("price_coins", "is", null),
    supabase.from("game_purchases").select("item_id").eq("user_id", userId),
    getEarlyAccess(userId),
  ]);
  const owned = new Set(((bought ?? []) as { item_id: string }[]).map((b) => b.item_id));
  const out = new Set<GameKey>();
  for (const it of (items ?? []) as { id: string; game_key: string }[]) if (isGameKey(it.game_key) && !owned.has(it.id) && !early.has(it.game_key)) out.add(it.game_key);
  return out;
}
