import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidDeck } from "./cards";
import { ARENAS, arenaIndexFor, deckAllowed, trophyDelta, TROPHY_LOSS } from "./arenas";
import { COPIES_OTHER, COPIES_WIN, pickBattleCard, unlockedCards } from "./economy";
import { MATCH_TICKS, type Input } from "./core";
import { MAX_INPUTS, simulate } from "./sim";

const MAX_XP_WINS_PER_DAY = 1;
/** Partida terminada mais rápido que isso não paga XP (script/atalho). */
const MIN_SECONDS_FOR_XP = 75;

export type ArenaFinish = {
  error?: string;
  result?: "win" | "loss" | "draw";
  crownsMe?: number;
  crownsBot?: number;
  xp?: number;
  winsToday?: number;
  trophyDelta?: number;
  trophies?: number;
  /** Cópias de carta ganhas nesta partida e qual carta recebeu. */
  copies?: number;
  copyCard?: string;
  /** Partida de treino numa arena já vencida: sem troféus e sem XP. */
  training?: boolean;
  /** Nome da arena nova, quando a partida fez o jogador subir de arena. */
  arenaUp?: string;
};

async function statsOf(admin: SupabaseClient, userId: string): Promise<{ trophies: number; best: number }> {
  const { data } = await admin.from("arena_stats").select("trophies, best").eq("user_id", userId).maybeSingle<{ trophies: number; best: number }>();
  return { trophies: data?.trophies ?? 0, best: data?.best ?? 0 };
}

/** Partida aberta e deixada pra trás (aba fechada, desistência calada) conta como derrota. */
export async function abandonOpenMatches(admin: SupabaseClient, userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 15_000).toISOString();
  const { data: open } = await admin
    .from("arena_matches")
    .select("id, training")
    .eq("user_id", userId)
    .eq("status", "open")
    .lt("started_at", cutoff);
  for (const m of (open ?? []) as { id: string; training: boolean }[]) {
    // treino numa arena antiga não mexe em troféus
    const lost = m.training ? 0 : -TROPHY_LOSS;
    const { data: closed } = await admin
      .from("arena_matches")
      .update({ status: "finished", result: "loss", crowns_me: 0, crowns_bot: 0, trophy_delta: lost, finished_at: new Date().toISOString() })
      .eq("id", m.id)
      .eq("status", "open")
      .select("id");
    if (closed && closed.length > 0 && !m.training) await admin.rpc("arena_apply_result", { p_user: userId, p_delta: lost, p_result: "loss" });
  }
}

function cleanInputs(raw: unknown): Input[] {
  if (!Array.isArray(raw)) return [];
  const out: Input[] = [];
  for (const r of raw.slice(0, MAX_INPUTS)) {
    const o = r as Partial<Input>;
    if (!o || !Number.isInteger(o.tick) || !Number.isInteger(o.slot)) continue;
    if (typeof o.x !== "number" || typeof o.y !== "number") continue;
    if ((o.tick as number) < 0 || (o.tick as number) > MATCH_TICKS) continue;
    out.push({ tick: o.tick as number, side: 0, slot: o.slot as number, x: o.x, y: o.y });
  }
  return out;
}

/**
 * Fecha uma partida: refaz tudo no servidor com as jogadas enviadas e só então
 * paga XP. `admin` é o client com chave de serviço. Separado da Server Action
 * pra poder ser testado direto contra o banco.
 */
export async function settleArena(
  admin: SupabaseClient,
  userId: string,
  input: { matchId: string; inputs: unknown; surrender?: boolean },
): Promise<ArenaFinish> {
  const { data: match } = await admin
    .from("arena_matches")
    .select("id, user_id, seed, deck, status, started_at, play_date, arena, levels, training")
    .eq("id", input.matchId)
    .maybeSingle<{ id: string; user_id: string; seed: number; deck: string[]; status: string; started_at: string; play_date: string; arena: number; levels: Record<string, number> | null; training: boolean }>();
  if (!match || match.user_id !== userId) return { error: "Partida não encontrada." };
  if (match.status !== "open") return { error: "Essa partida já foi encerrada." };
  // o jogador insere a própria partida: um baralho adulterado (ex.: 8 Jesus) não conta
  if (!isValidDeck(match.deck)) return { error: "Baralho inválido." };
  const stats = await statsOf(admin, userId);
  if (!deckAllowed(match.deck, stats.best)) return { error: "Esse baralho tem cartas que você ainda não liberou." };

  // níveis: vale o do início da partida, nunca acima do que o jogador tem de fato
  const { data: owned } = await admin.from("arena_card_levels").select("card, level").eq("user_id", userId);
  const ownedLevel = new Map((owned ?? []).map((r: { card: string; level: number }) => [r.card, r.level]));
  const levels: Record<string, number> = {};
  for (const k of match.deck) levels[k] = Math.max(1, Math.min(Number(match.levels?.[k]) || 1, ownedLevel.get(k) ?? 1));

  let result: "win" | "loss" | "draw" = "loss";
  let crownsMe = 0;
  let crownsBot = 0;
  if (!input.surrender) {
    const sim = simulate(match.seed, match.deck, cleanInputs(input.inputs), { levels, arena: match.arena ?? 0 });
    crownsMe = sim.crowns[0];
    crownsBot = sim.crowns[1];
    result = sim.winner === 0 ? "win" : sim.winner === 1 ? "loss" : "draw";
  }

  const elapsed = (Date.now() - new Date(match.started_at).getTime()) / 1000;
  let xp = 0;
  const { count: winsBefore } = await admin
    .from("arena_matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("play_date", match.play_date)
    .gt("xp_awarded", 0);
  if (!match.training && result === "win" && elapsed >= MIN_SECONDS_FOR_XP && (winsBefore ?? 0) < MAX_XP_WINS_PER_DAY) xp = 1;

  const before = stats.trophies;
  // treino numa arena antiga: cópias de derrota, seja qual for o resultado
  const copies = elapsed >= MIN_SECONDS_FOR_XP ? (result === "win" && !match.training ? COPIES_WIN : COPIES_OTHER) : 0;
  const copyCard = copies > 0 ? pickBattleCard(unlockedCards(stats.best), match.deck) : null;
  const delta = match.training ? 0 : trophyDelta(result, result === "win" && elapsed < MIN_SECONDS_FOR_XP);

  // fecha UMA vez (condicional): duas chamadas juntas não pagam duas vezes
  const { data: closed } = await admin
    .from("arena_matches")
    .update({ status: "finished", result, crowns_me: crownsMe, crowns_bot: crownsBot, xp_awarded: xp, trophy_delta: delta, copies_awarded: copyCard ? copies : 0, reward_card: copyCard, finished_at: new Date().toISOString() })
    .eq("id", match.id)
    .eq("status", "open")
    .select("id");
  if (!closed || closed.length === 0) return { error: "Essa partida já foi encerrada." };

  if (xp > 0) await admin.rpc("game_grant_xp", { p_user: userId, p_amount: xp, p_type: "game_arena" });

  await admin.rpc("arena_apply_result", { p_user: userId, p_delta: delta, p_result: match.training ? "draw" : result, p_copies: copies, p_card: copyCard });
  const after = await statsOf(admin, userId);
  const trophies = after.trophies;
  const up = arenaIndexFor(trophies) > arenaIndexFor(before) ? ARENAS[arenaIndexFor(trophies)].name : undefined;

  return { result, crownsMe, crownsBot, xp, winsToday: (winsBefore ?? 0) + (xp > 0 ? 1 : 0), trophyDelta: trophies - before, trophies, copies: copyCard ? copies : 0, copyCard: copyCard ?? undefined, training: match.training || undefined, arenaUp: up };
}
