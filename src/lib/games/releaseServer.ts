import { createAdminClient } from "@/lib/supabase/admin";
import { isReleased, type ReleasedGame } from "./release";

/** O jogo já está liberado pra esta pessoa? (conta de teste, admin e quem recebeu acesso antecipado passam antes da data) */
export async function gameOpenFor(game: ReleasedGame, userId: string): Promise<boolean> {
  if (isReleased(game)) return true;
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin.from("profiles").select("is_test_account, role").eq("id", userId).maybeSingle<{ is_test_account: boolean | null; role: string }>();
  if (isReleased(game, !!data?.is_test_account || data?.role === "admin")) return true;
  const { data: early } = await admin.from("game_early_access").select("user_id").eq("game", game).eq("user_id", userId).maybeSingle();
  return !!early;
}
