"use server";

import { GAME_RELEASES, type ReleasedGame } from "@/lib/games/release";
import { revalidatePath } from "next/cache";
import { isGameKey, type Visibility } from "@/lib/games/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Admin: mostra, esconde ou volta ao automático (data de lançamento) um jogo para todos os jogadores. */
/** Admin: define (ou limpa, com null) a data/hora de abertura de um jogo com lançamento. */
export async function setReleaseDate(game: string, iso: string | null): Promise<{ error?: string }> {
  if (!(game in GAME_RELEASES)) return { error: "Jogo inválido." };
  if (iso !== null && !Number.isFinite(new Date(iso).getTime())) return { error: "Data inválida." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sem permissão." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (me?.role !== "admin") return { error: "Sem permissão." };
  const admin = createAdminClient();
  if (!admin) return { error: "Servidor sem acesso ao banco." };
  const { error } = await admin.from("game_settings").upsert({ game, open_at: iso ? new Date(iso).toISOString() : null, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "game" });
  if (error) return { error: "Não foi possível salvar." };
  // A Loja mostra a contagem e libera a compra por esta mesma data: um único relógio para o jogo e para o item à venda.
  const effective = iso ? new Date(iso).toISOString() : new Date(GAME_RELEASES[game as ReleasedGame]).toISOString();
  await admin.from("store_items").update({ release_at: effective }).eq("game_key", game).eq("status", "scheduled");
  revalidatePath("/app/jogos", "layout");
  revalidatePath("/app/admin/jogos");
  revalidatePath("/app/admin/loja");
  return {};
}

export async function setGameVisibility(game: string, visibility: Visibility): Promise<{ error?: string }> {
  if (!isGameKey(game) || !["auto", "visible", "hidden"].includes(visibility)) return { error: "Opção inválida." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sem permissão." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (me?.role !== "admin") return { error: "Sem permissão." };
  const admin = createAdminClient();
  if (!admin) return { error: "Servidor sem acesso ao banco." };
  const { error } = await admin.from("game_settings").upsert({ game, visibility, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "game" });
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/app/jogos", "layout");
  revalidatePath("/app/admin/jogos");
  return {};
}
