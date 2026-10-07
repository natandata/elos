import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import type { GameKey } from "./catalog";
import { createClient } from "@/lib/supabase/server";
import { getEarlyAccess, getVisibilities, isHiddenFor } from "./releaseServer";
import { logGameActivity } from "./activity";
import { GAME_CATALOG } from "./catalog";
import { lockedGames } from "./storeAccess";

/** Trava de rota: se o admin escondeu o jogo, quem não é admin volta para a Sala de Jogos. */
export async function guardGame(game: GameKey): Promise<void> {
  const { profile } = await requireProfile();
  const vis = await getVisibilities();
  if (isHiddenFor(vis[game], profile.role, (await getEarlyAccess(profile.id)).has(game))) redirect("/app/jogos");
  // à venda na Loja: só entra quem comprou
  const locked = await lockedGames(await createClient(), profile.id, profile.role);
  if (locked.has(game)) redirect("/app/jogos");
  // todo jogo (atual ou futuro) passa por aqui: registra que a pessoa abriu o jogo, no painel do admin
  if (profile.role !== "admin") await logGameActivity(profile.id, game, "open", `Abriu ${GAME_CATALOG.find((g) => g.key === game)?.title ?? game}`, 30);
}
