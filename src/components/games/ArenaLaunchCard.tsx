import { WeeklyGameCard } from "@/components/games/WeeklyGameCard";
import { requireProfile } from "@/lib/auth";
import { GAME_KEYS } from "@/lib/games/catalog";
import { isReleased } from "@/lib/games/release";
import { getVisibilities, isHiddenFor } from "@/lib/games/releaseServer";
import { WEEKLY_META, type WeeklyGame } from "@/lib/games/weekly";
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
  const [{ profile }, vis, res] = await Promise.all([requireProfile(), getVisibilities(), supabase.rpc("weekly_games_stats")]);
  const rows = (Array.isArray(res.data) ? res.data : []) as WeeklyGame[];
  const allowed = GAME_KEYS.filter((k) => k in WEEKLY_META && !isHiddenFor(vis[k], profile.role) && (k !== "dress" || vis[k] === "visible" || isReleased("dress"))).map(String);
  return <WeeklyGameCard initial={rows} allowed={allowed} since={sundayLabel()} />;
}
