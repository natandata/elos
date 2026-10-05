"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ARENA_CARD_BY_KEY, MAX_CARD_LEVEL, STARTER_DECK, isValidDeck, upgradeCost } from "@/lib/arena/cards";
import { arenaIndexFor, deckAllowed, isCardUnlocked } from "@/lib/arena/arenas";
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
export async function startArena(): Promise<{ error?: string; matchId?: string; seed?: number; deck?: string[]; arena?: number; levels?: Record<string, number> }> {
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

  const { data: owned } = await supabase.from("arena_card_levels").select("card, level").eq("user_id", userId);
  const levels: Record<string, number> = {};
  for (const r of (owned ?? []) as { card: string; level: number }[]) if (deck.includes(r.card)) levels[r.card] = r.level;

  const seed = randomInt(1, 2 ** 31 - 1);
  const { data, error } = await supabase
    .from("arena_matches")
    .insert({ user_id: userId, seed, deck, play_date: date, arena, levels })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: "Não foi possível começar a partida. Tente de novo." };
  return { matchId: data.id, seed, deck, arena, levels };
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

/** Evolui uma carta (+1 nível) gastando Pergaminhos. */
export async function upgradeArenaCard(card: string): Promise<{ error?: string; level?: number; scrolls?: number }> {
  const { supabase, userId } = await currentPlayer();
  if (!ARENA_CARD_BY_KEY.has(card)) return { error: "Carta desconhecida." };
  const { data: stats } = await supabase.from("arena_stats").select("best, scrolls").eq("user_id", userId).maybeSingle<{ best: number; scrolls: number }>();
  if (!isCardUnlocked(card, stats?.best ?? 0)) return { error: "Você ainda não liberou essa carta." };
  const { data: row } = await supabase.from("arena_card_levels").select("level").eq("user_id", userId).eq("card", card).maybeSingle<{ level: number }>();
  const level = row?.level ?? 1;
  if (level >= MAX_CARD_LEVEL) return { error: "Essa carta já está no nível máximo." };
  const cost = upgradeCost(level + 1);
  if ((stats?.scrolls ?? 0) < cost) return { error: `Faltam ${cost - (stats?.scrolls ?? 0)} 📜 pra evoluir.` };
  const admin = createAdminClient();
  if (!admin) return { error: "Não foi possível evoluir agora." };
  const { data: res } = await admin.rpc("arena_upgrade_card", { p_user: userId, p_card: card, p_cost: cost });
  if (typeof res !== "number" || res < 0) return { error: "Não foi possível evoluir (Pergaminhos insuficientes)." };
  return { level: res, scrolls: (stats?.scrolls ?? 0) - cost };
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
