import { createAdminClient } from "@/lib/supabase/admin";
import { isReleased, type ReleasedGame } from "./release";

/** O jogo já está liberado pra esta pessoa? (conta de teste passa antes da data) */
export async function gameOpenFor(game: ReleasedGame, userId: string): Promise<boolean> {
  if (isReleased(game)) return true;
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin.from("profiles").select("is_test_account").eq("id", userId).maybeSingle<{ is_test_account: boolean | null }>();
  return isReleased(game, !!data?.is_test_account);
}
