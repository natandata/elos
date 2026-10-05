import { ArenaGame } from "@/components/arena/ArenaGame";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MAX_XP_WINS = 3;

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

  return (
    <ArenaGame winsToday={count ?? 0} maxWins={MAX_XP_WINS} />
  );
}
