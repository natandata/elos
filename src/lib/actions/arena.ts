"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STARTER_DECK, isValidDeck } from "@/lib/arena/cards";
import { arenaIndexFor, deckAllowed } from "@/lib/arena/arenas";
import { abandonOpenMatches, settleArena, type ArenaFinish } from "@/lib/arena/settle";

const MAX_MATCHES_PER_DAY = 15;

const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

async function currentPlayer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();
  if (!profile) redirect("/");
  if (profile.role !== "cria" && profile.role !== "leader") throw new Error("A Arena é só para crias e líderes.");
  return { supabase, userId: profile.id };
}

/** Abre uma partida: o servidor sorteia a semente (o computador e o baralho dependem dela). */
export async function startArena(): Promise<{ error?: string; matchId?: string; seed?: number; deck?: string[]; arena?: number }> {
  const { supabase, userId } = await currentPlayer();
  const date = todayBR();

  const { count } = await supabase
    .from("arena_matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("play_date", date);
  if ((count ?? 0) >= MAX_MATCHES_PER_DAY) {
    return { error: `Você já jogou ${MAX_MATCHES_PER_DAY} partidas hoje. Volte amanhã!` };
  }

  const admin = createAdminClient();
  if (admin) await abandonOpenMatches(admin, userId);
  const { data: stats } = await supabase.from("arena_stats").select("trophies, best").eq("user_id", userId).maybeSingle<{ trophies: number; best: number }>();
  const arena = arenaIndexFor(stats?.trophies ?? 0);

  const { data: saved } = await supabase.from("arena_decks").select("deck").eq("user_id", userId).maybeSingle<{ deck: string[] }>();
  const deck = isValidDeck(saved?.deck) && deckAllowed(saved.deck, stats?.best ?? 0) ? saved.deck : STARTER_DECK;

  const seed = randomInt(1, 2 ** 31 - 1);
  const { data, error } = await supabase
    .from("arena_matches")
    .insert({ user_id: userId, seed, deck, play_date: date, arena })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: "Não foi possível começar a partida. Tente de novo." };
  return { matchId: data.id, seed, deck, arena };
}

/** Salva o baralho do jogador (8 cartas diferentes). */
export async function saveArenaDeck(deck: string[]): Promise<{ error?: string }> {
  const { supabase, userId } = await currentPlayer();
  if (!isValidDeck(deck)) return { error: "Escolha exatamente 8 cartas diferentes." };
  const { data: stats } = await supabase.from("arena_stats").select("best").eq("user_id", userId).maybeSingle<{ best: number }>();
  if (!deckAllowed(deck, stats?.best ?? 0)) return { error: "Tem carta aí que você ainda não liberou." };
  const { error } = await supabase
    .from("arena_decks")
    .upsert({ user_id: userId, deck, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "Não foi possível salvar o baralho." };
  return {};
}

export type { ArenaFinish };

/** Fecha a partida: refaz tudo no servidor com as jogadas enviadas e só então paga XP. */
export async function finishArena(input: {
  matchId: string;
  inputs: unknown;
  surrender?: boolean;
}): Promise<ArenaFinish> {
  const { userId } = await currentPlayer();
  const admin = createAdminClient();
  if (!admin) return { error: "Não foi possível confirmar o resultado agora." };
  return settleArena(admin, userId, input);
}
