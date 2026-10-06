import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GAME_KEYS, type GameKey, type Visibility } from "./catalog";
import { isReleased, type ReleasedGame } from "./release";

/** Visibilidade definida pelo admin para cada jogo (padrão: auto, ou seja, segue a data de lançamento). */
export async function getVisibilities(): Promise<Record<GameKey, Visibility>> {
  const out = Object.fromEntries(GAME_KEYS.map((k) => [k, "auto" as Visibility])) as Record<GameKey, Visibility>;
  const supabase = await createClient();
  const { data } = await supabase.from("game_settings").select("game, visibility");
  for (const r of (data ?? []) as { game: string; visibility: Visibility }[]) if (r.game in out) out[r.game as GameKey] = r.visibility;
  return out;
}

/** O jogo está escondido pelo admin para esta pessoa? (admin sempre enxerga) */
export const isHiddenFor = (vis: Visibility, role: string): boolean => vis === "hidden" && role !== "admin";

/** O jogo já está liberado pra esta pessoa? Respeita o botão do admin (visível/oculto); no automático, conta de teste, admin e quem recebeu acesso antecipado passam antes da data. */
export async function gameOpenFor(game: ReleasedGame, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: setting } = admin ? await admin.from("game_settings").select("visibility").eq("game", game).maybeSingle<{ visibility: Visibility }>() : { data: null };
  const vis = setting?.visibility ?? "auto";
  if (vis === "visible") return true;
  if (vis === "hidden") {
    if (!admin) return false;
    const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle<{ role: string }>();
    return data?.role === "admin";
  }
  if (isReleased(game)) return true;
  if (!admin) return false;
  const { data } = await admin.from("profiles").select("is_test_account, role").eq("id", userId).maybeSingle<{ is_test_account: boolean | null; role: string }>();
  if (isReleased(game, !!data?.is_test_account || data?.role === "admin")) return true;
  const { data: early } = await admin.from("game_early_access").select("user_id").eq("game", game).eq("user_id", userId).maybeSingle();
  return !!early;
}
