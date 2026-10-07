import { WeeklyGameCard } from "@/components/games/WeeklyGameCard";
import { requireProfile } from "@/lib/auth";
import { GAME_KEYS } from "@/lib/games/catalog";
import { isReleased } from "@/lib/games/release";
import { getEarlyAccess, getVisibilities, isHiddenFor } from "@/lib/games/releaseServer";
import { lockedGames } from "@/lib/games/storeAccess";
import { WEEKLY_META, type TrophyLeader, type WeeklyGame } from "@/lib/games/weekly";
import { createClient } from "@/lib/supabase/server";

/** Domingo (Brasília) que abriu a semana atual, em dd/mm. */
function sundayLabel(): string {
  const br = new Date(Date.now() - 3 * 3600_000);
  br.setUTCDate(br.getUTCDate() - br.getUTCDay());
  return `${String(br.getUTCDate()).padStart(2, "0")}/${String(br.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Card da tela inicial: o jogo mais jogado da semana (dados do servidor; o cliente atualiza sozinho). */
export async function ArenaLaunchCard() {
  const supabase = await createClient();
  const [{ profile }, vis, res, tro] = await Promise.all([requireProfile(), getVisibilities(), supabase.rpc("weekly_games_stats"), supabase.rpc("trophy_top3")]);
  const locked = await lockedGames(supabase, profile.id, profile.role);
  const early = await getEarlyAccess(profile.id);
  const rows = (Array.isArray(res.data) ? res.data : []) as WeeklyGame[];
  const allowed = GAME_KEYS.filter((k) => k in WEEKLY_META && !isHiddenFor(vis[k], profile.role) && !locked.has(k) && (k !== "dress" || vis[k] === "visible" || isReleased("dress") || early.has("dress")) && (k !== "arenasoccer" || isReleased("arenasoccer") || profile.role === "admin" || early.has("arenasoccer"))).map(String);
  const trophies = (Array.isArray(tro.data) ? tro.data : []) as TrophyLeader[];
  return <WeeklyGameCard initial={rows} initialTrophies={trophies} allowed={allowed} since={sundayLabel()} />;
}
