import type { SupabaseClient } from "@supabase/supabase-js";
import { CHEST_ONLY, ownedFromRows } from "./arenas";
import { CAMPAIGN_KEYS } from "./campaignCards";

/** Heróis de baú que o jogador já achou e cartas da campanha que ele liberou (pode usar no baralho). */
export async function loadOwned(client: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data } = await client.from("arena_card_levels").select("card, level, copies").eq("user_id", userId).in("card", [...CHEST_ONLY, ...CAMPAIGN_KEYS]);
  return ownedFromRows((data ?? []) as { card: string; level: number; copies: number }[]);
}
