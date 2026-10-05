import { ArenaGame } from "@/components/arena/ArenaGame";
import { STARTER_DECK, isValidDeck } from "@/lib/arena/cards";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MAX_XP_WINS = 1;

export default async function ArenaPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const { count } = await supabase
    .from("arena_matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("play_date", today)
    .gt("xp_awarded", 0);

  const { data: saved } = await supabase.from("arena_decks").select("deck").eq("user_id", profile.id).maybeSingle<{ deck: string[] }>();
  const deck = isValidDeck(saved?.deck) ? saved.deck : STARTER_DECK;

  return (
    <ArenaGame winsToday={count ?? 0} maxWins={MAX_XP_WINS} initialDeck={deck} />
  );
}
