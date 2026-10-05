"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ARENA_CARD_BY_KEY, MAX_CARD_LEVEL, STARTER_DECK, isValidDeck, rankBotBoost, upgradeCost } from "@/lib/arena/cards";
import { arenaIndexFor, chestFinds, deckAllowed, isCardUnlocked } from "@/lib/arena/arenas";
import { loadOwned } from "@/lib/arena/owned";
import { CHEST_BY_KIND, rollChest, unlockedCards, type ChestKind, type CopyGrant } from "@/lib/arena/economy";
import { gateMessage } from "@/lib/arena/gate";
import { loadGate } from "@/lib/arena/gateServer";
import { abandonOpenMatches, settleArena, type ArenaFinish } from "@/lib/arena/settle";
import { MISSION_BY_KEY } from "@/lib/arena/missions";
import { loadArenaMissions, todayBR as missionDay } from "@/lib/arena/missionsServer";

const MAX_MATCHES_PER_DAY = 45;

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
export async function startArena(arenaChoice?: number): Promise<{ error?: string; matchId?: string; seed?: number; deck?: string[]; arena?: number; levels?: Record<string, number>; botBoost?: number }> {
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
  // a cada 3 batalhas: 3 jogos pra continuar
  const gate = await loadGate(supabase, userId);
  if (gate.locked) return { error: gateMessage(gate) };
  const { data: stats } = await supabase.from("arena_stats").select("trophies, best").eq("user_id", userId).maybeSingle<{ trophies: number; best: number }>();
  const current = arenaIndexFor(stats?.trophies ?? 0);
  // pode treinar em qualquer arena que já alcançou (sem mexer em troféus); fora disso vale a atual
  const reached = arenaIndexFor(Math.max(stats?.best ?? 0, stats?.trophies ?? 0));
  const training = Number.isInteger(arenaChoice) && (arenaChoice as number) >= 0 && (arenaChoice as number) <= reached && arenaChoice !== current;
  const arena = training ? (arenaChoice as number) : current;

  const { data: saved } = await supabase.from("arena_decks").select("deck").eq("user_id", userId).maybeSingle<{ deck: string[] }>();
  const found = await loadOwned(supabase, userId);
  const deck = isValidDeck(saved?.deck) && deckAllowed(saved.deck, stats?.best ?? 0, found) ? saved.deck : STARTER_DECK;

  const { data: owned } = await supabase.from("arena_card_levels").select("card, level").eq("user_id", userId);
  const levels: Record<string, number> = {};
  for (const r of (owned ?? []) as { card: string; level: number }[]) if (deck.includes(r.card)) levels[r.card] = r.level;

  // quanto mais alto no ranking, mais forte o computador
  const { data: rank } = admin ? await admin.rpc("arena_rank_of", { p_user: userId }) : { data: null };
  const botBoost = rankBotBoost(typeof rank === "number" ? rank : null);

  const seed = randomInt(1, 2 ** 31 - 1);
  // só o servidor cria partida (semente sorteada aqui, limite diário e pausa de jogos valem pra todo mundo)
  const { data, error } = await (admin ?? supabase)
    .from("arena_matches")
    .insert({ user_id: userId, seed, deck, play_date: date, arena, levels, training, bot_boost: botBoost })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: "Não foi possível começar a partida. Tente de novo." };
  return { matchId: data.id, seed, deck, arena, levels, botBoost };
}

/** Salva o baralho do jogador (8 cartas diferentes). */
export async function saveArenaDeck(deck: string[]): Promise<{ error?: string }> {
  const { supabase, userId } = await currentPlayer();
  if (!isValidDeck(deck)) return { error: "Escolha exatamente 8 cartas diferentes." };
  const { data: stats } = await supabase.from("arena_stats").select("best").eq("user_id", userId).maybeSingle<{ best: number }>();
  if (!deckAllowed(deck, stats?.best ?? 0, await loadOwned(supabase, userId))) return { error: "Tem carta aí que você ainda não liberou." };
  const { error } = await supabase
    .from("arena_decks")
    .upsert({ user_id: userId, deck, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "Não foi possível salvar o baralho." };
  return {};
}

/** Evolui uma carta (+1 nível) gastando as cópias que ela juntou. */
export async function upgradeArenaCard(card: string): Promise<{ error?: string; level?: number; copies?: number }> {
  const { supabase, userId } = await currentPlayer();
  if (!ARENA_CARD_BY_KEY.has(card)) return { error: "Carta desconhecida." };
  const { data: stats } = await supabase.from("arena_stats").select("best").eq("user_id", userId).maybeSingle<{ best: number }>();
  if (!isCardUnlocked(card, stats?.best ?? 0, await loadOwned(supabase, userId))) return { error: "Você ainda não liberou essa carta." };
  const { data: row } = await supabase.from("arena_card_levels").select("level, copies").eq("user_id", userId).eq("card", card).maybeSingle<{ level: number; copies: number }>();
  const level = row?.level ?? 1;
  const copies = row?.copies ?? 0;
  if (level >= MAX_CARD_LEVEL) return { error: "Essa carta já está no nível máximo." };
  const cost = upgradeCost(level + 1);
  if (copies < cost) return { error: `Faltam ${cost - copies} cartas pra evoluir.` };
  const admin = createAdminClient();
  if (!admin) return { error: "Não foi possível evoluir agora." };
  const { data: res } = await admin.rpc("arena_upgrade_card", { p_user: userId, p_card: card, p_cost: cost });
  if (typeof res !== "number" || res < 0) return { error: "Não foi possível evoluir (faltam cartas)." };
  return { level: res, copies: copies - cost };
}

/**
 * Abre um baú: o da Arena é grátis 1x por dia; os outros custam troféus.
 * As cartas são sorteadas aqui no servidor.
 */
export async function openArenaChest(kind: ChestKind): Promise<{ error?: string; grants?: CopyGrant[]; trophies?: number }> {
  const { supabase, userId } = await currentPlayer();
  const def = CHEST_BY_KIND.get(kind);
  if (!def) return { error: "Baú desconhecido." };
  const admin = createAdminClient();
  if (!admin) return { error: "Baús indisponíveis no momento." };

  const { data: stats } = await supabase.from("arena_stats").select("trophies, best").eq("user_id", userId).maybeSingle<{ trophies: number; best: number }>();
  const trophies = stats?.trophies ?? 0;
  if (def.cost > 0 && trophies < def.cost) return { error: `Faltam ${def.cost - trophies} 🏆 pra abrir esse baú.` };

  const { data: saved } = await supabase.from("arena_decks").select("deck").eq("user_id", userId).maybeSingle<{ deck: string[] }>();
  const deck = isValidDeck(saved?.deck) ? saved.deck : STARTER_DECK;
  const grants = rollChest(def, unlockedCards(stats?.best ?? 0, await loadOwned(supabase, userId)), deck, Math.random, chestFinds(stats?.best ?? 0));
  if (grants.length === 0) return { error: "Não foi possível abrir o baú." };

  const { data: res } = await admin.rpc("arena_open_chest", { p_user: userId, p_daily: kind === "daily", p_cost: def.cost, p_grants: grants });
  if (res === -1) return { error: "Você já abriu o Baú da Arena hoje. Volte amanhã!" };
  if (res === -2) return { error: `Faltam troféus pra abrir esse baú.` };
  if (typeof res !== "number" || res < 0) return { error: "Não foi possível abrir o baú. Tente de novo." };
  return { grants, trophies: res };
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

/** Resgata o prêmio (troféus) de uma missão da Arena já completa hoje. */
export async function claimArenaMission(key: string): Promise<{ error?: string; reward?: number; trophies?: number }> {
  const { supabase, userId } = await currentPlayer();
  const def = MISSION_BY_KEY.get(key);
  if (!def) return { error: "Missão desconhecida." };
  const admin = createAdminClient();
  if (!admin) return { error: "Missões indisponíveis no momento." };
  const state = (await loadArenaMissions(supabase, userId)).find((m) => m.def.key === key);
  if (!state || !state.done) return { error: "Essa missão ainda não foi completada." };
  if (state.claimed) return { error: "Você já resgatou essa missão hoje." };
  // a chave (jogador, missão, dia) garante um resgate só, mesmo com dois toques juntos
  const { error } = await admin.from("arena_mission_claims").insert({ user_id: userId, mission: key, day: missionDay(), trophies: def.reward });
  if (error) return { error: "Você já resgatou essa missão hoje." };
  const { data: total } = await admin.rpc("arena_apply_result", { p_user: userId, p_delta: def.reward, p_result: "draw", p_copies: 0, p_card: null });
  return { reward: def.reward, trophies: typeof total === "number" ? total : undefined };
}
