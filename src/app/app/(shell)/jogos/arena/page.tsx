import { ArenaGame } from "@/components/arena/ArenaGame";
import { STARTER_DECK, isValidDeck } from "@/lib/arena/cards";
import { deckAllowed } from "@/lib/arena/arenas";
import { loadGate } from "@/lib/arena/gateServer";
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

  const { data: eloRows } = await supabase.rpc("arena_week_ranking");
  const eloRanking = ((eloRows ?? []) as { elo_id: string; elo_name: string; points: number }[]).map((r) => ({
    id: r.elo_id,
    name: r.elo_name,
    points: Number(r.points),
  }));
  const { data: rankRows } = await supabase.rpc("arena_trophy_ranking", { p_min: 30, p_limit: 100 });
  const trophyRanking = ((rankRows ?? []) as { user_id: string; full_name: string; avatar_url: string | null; elo_name: string | null; trophies: number }[]).map((r) => ({
    id: r.user_id,
    name: r.full_name || "Sem nome",
    avatar: r.avatar_url,
    elo: r.elo_name,
    trophies: Number(r.trophies),
  }));
  const { count: invites } = await supabase
    .from("arena_pvp")
    .select("id", { count: "exact", head: true })
    .eq("opponent_id", profile.id)
    .eq("status", "invited")
    .gte("created_at", new Date(Date.now() - 24 * 3_600_000).toISOString());
  const { data: duoInv } = await supabase
    .from("arena_duo")
    .select("players, decks")
    .eq("status", "invited")
    .gte("created_at", new Date(Date.now() - 24 * 3_600_000).toISOString())
    .contains("players", [profile.id]);
  const duoInvites = ((duoInv ?? []) as { players: string[]; decks: (string[] | null)[] }[]).filter((r) => {
    const i = r.players.indexOf(profile.id);
    return i > 0 && !Array.isArray(r.decks[i]);
  }).length;
  const gate = await loadGate(supabase, profile.id);
  const { data: stats } = await supabase.from("arena_stats").select("trophies, best, scrolls").eq("user_id", profile.id).maybeSingle<{ trophies: number; best: number; scrolls: number }>();
  const { data: owned } = await supabase.from("arena_card_levels").select("card, level").eq("user_id", profile.id);
  const levels: Record<string, number> = {};
  for (const r of (owned ?? []) as { card: string; level: number }[]) levels[r.card] = r.level;
  const { data: saved } = await supabase.from("arena_decks").select("deck").eq("user_id", profile.id).maybeSingle<{ deck: string[] }>();
  const deck = isValidDeck(saved?.deck) && deckAllowed(saved.deck, stats?.best ?? 0) ? saved.deck : STARTER_DECK;

  return (
    <ArenaGame winsToday={count ?? 0} maxWins={MAX_XP_WINS} initialDeck={deck} initialTrophies={stats?.trophies ?? 0} initialBest={stats?.best ?? 0} initialScrolls={stats?.scrolls ?? 0} initialLevels={levels} eloRanking={eloRanking} myEloId={profile.elo_id ?? null} trophyRanking={trophyRanking} myId={profile.id} missionsHref={profile.role === "leader" ? "/app/lider/missoes" : "/app/cria/missoes"} invites={(invites ?? 0) + duoInvites} gate={gate} />
  );
}
