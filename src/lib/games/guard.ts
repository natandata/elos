import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import type { GameKey } from "./catalog";
import { getVisibilities, isHiddenFor } from "./releaseServer";

/** Trava de rota: se o admin escondeu o jogo, quem não é admin volta para a Sala de Jogos. */
export async function guardGame(game: GameKey): Promise<void> {
  const { profile } = await requireProfile();
  const vis = await getVisibilities();
  if (isHiddenFor(vis[game], profile.role)) redirect("/app/jogos");
}
