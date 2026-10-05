import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidDeck } from "./cards";
import { deckAllowed } from "./arenas";
import { onRoomFinished } from "./tournamentServer";
import { loadOwned } from "./owned";
import { COPIES_OTHER, COPIES_WIN, pickBattleCard, unlockedCards } from "./economy";
import { PVP_MIN_TICKS_FOR_REWARD, resolvePvp, type PvpReport } from "./pvp";

/** Passado esse tempo do 1º relatório, vale o que o único jogador presente mandou. */
const STALE_MS = 60_000;
/** Limites diários de prêmio (evita combinar partidas pra ganhar troféu). */
const MAX_REWARDED_PER_PAIR = 3;
const MAX_REWARDED_PER_USER = 10;

export type PvpRow = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  seed: number;
  arena: number;
  challenger_deck: string[];
  opponent_deck: string[] | null;
  status: "invited" | "accepted" | "finished" | "declined" | "disputed";
  reports: { challenger?: PvpReport; opponent?: PvpReport };
  first_report_at: string | null;
  result: "challenger" | "opponent" | "draw" | null;
  crowns_c: number | null;
  crowns_o: number | null;
  ticks: number | null;
  why: string | null;
  rewarded: boolean;
  tournament_match_id: string | null;
  trophy_c: number;
  trophy_o: number;
  copies_c: number;
  copies_o: number;
  card_c: string | null;
  card_o: string | null;
  xp_c: number;
  xp_o: number;
  created_at: string;
};

/** O que cada jogador vê do resultado. */
export type PvpView = {
  state: "invited" | "accepted" | "waiting" | "finished" | "disputed" | "declined";
  result?: "win" | "loss" | "draw";
  crownsMe?: number;
  crownsThem?: number;
  trophyDelta?: number;
  copies?: number;
  copyCard?: string | null;
  xp?: number;
  rewarded?: boolean;
  why?: string | null;
  trophies?: number;
  /** medalha de vitória deste 1x1 (quem ganhou) e o placar de medalhas entre os dois */
  medal?: { winner: "me" | "them" | null; mine: number; theirs: number };
};

/** Placar de medalhas de vitória entre dois jogadores (quantas cada um tem contra o outro). */
export async function medalScore(client: SupabaseClient, me: string, other: string): Promise<{ mine: number; theirs: number }> {
  const { data } = await client.from("arena_medals").select("winner_id, wins").or(`and(winner_id.eq.${me},loser_id.eq.${other}),and(winner_id.eq.${other},loser_id.eq.${me})`);
  let mine = 0;
  let theirs = 0;
  for (const r of (data ?? []) as { winner_id: string; wins: number }[]) {
    if (r.winner_id === me) mine = r.wins;
    else theirs = r.wins;
  }
  return { mine, theirs };
}

/** A visão do resultado já com as medalhas (precisa de um client que leia as medalhas). */
export async function viewWithMedals(client: SupabaseClient, row: PvpRow, userId: string): Promise<PvpView> {
  const view = viewOf(row, userId);
  if (view.state !== "finished" || row.tournament_match_id) return view;
  const other = row.challenger_id === userId ? row.opponent_id : row.challenger_id;
  const { mine, theirs } = await medalScore(client, userId, other);
  const earned = view.result !== "draw" && (row.ticks ?? 0) >= PVP_MIN_TICKS_FOR_REWARD;
  view.medal = { winner: earned ? (view.result === "win" ? "me" : "them") : null, mine, theirs };
  return view;
}

export function viewOf(row: PvpRow, userId: string): PvpView {
  const iAmC = row.challenger_id === userId;
  if (row.status === "finished") {
    const won = row.result === (iAmC ? "challenger" : "opponent");
    return {
      state: "finished",
      result: row.result === "draw" ? "draw" : won ? "win" : "loss",
      crownsMe: (iAmC ? row.crowns_c : row.crowns_o) ?? 0,
      crownsThem: (iAmC ? row.crowns_o : row.crowns_c) ?? 0,
      trophyDelta: iAmC ? row.trophy_c : row.trophy_o,
      copies: iAmC ? row.copies_c : row.copies_o,
      copyCard: iAmC ? row.card_c : row.card_o,
      xp: iAmC ? row.xp_c : row.xp_o,
      rewarded: row.rewarded,
      why: row.why,
    };
  }
  if (row.status === "accepted") {
    const mine = iAmC ? row.reports.challenger : row.reports.opponent;
    return { state: mine ? "waiting" : "accepted" };
  }
  return { state: row.status };
}

async function bestOf(admin: SupabaseClient, userId: string): Promise<number> {
  const { data } = await admin.from("arena_stats").select("best").eq("user_id", userId).maybeSingle<{ best: number }>();
  return data?.best ?? 0;
}

/**
 * Tenta fechar uma partida 1x1: confere os relatórios, refaz a partida e,
 * se tudo bate, paga troféus/cartas/XP. Seguro de chamar várias vezes:
 * fecha uma vez só (condicional no status).
 */
export async function settleArenaPvp(admin: SupabaseClient, id: string): Promise<PvpRow | null> {
  const { data: row } = await admin.from("arena_pvp").select("*").eq("id", id).maybeSingle<PvpRow>();
  if (!row || row.status !== "accepted" || !row.opponent_deck) return row;

  const stale = !!row.first_report_at && Date.now() - new Date(row.first_report_at).getTime() >= STALE_MS;
  const [bestC, bestO] = await Promise.all([bestOf(admin, row.challenger_id), bestOf(admin, row.opponent_id)]);
  const [ownC, ownO] = await Promise.all([loadOwned(admin, row.challenger_id), loadOwned(admin, row.opponent_id)]);
  const decks: [string[], string[]] = [row.challenger_deck, row.opponent_deck];
  const deckOk = isValidDeck(decks[0]) && isValidDeck(decks[1]) && deckAllowed(decks[0], bestC, ownC) && deckAllowed(decks[1], bestO, ownO);
  const outcome = deckOk ? resolvePvp(row.seed, decks, row.reports, row.arena, stale) : ({ kind: "disputed" } as const);
  if (outcome.kind === "waiting") return row;

  const now = new Date().toISOString();
  if (outcome.kind === "disputed") {
    await admin.from("arena_pvp").update({ status: "disputed", finished_at: now }).eq("id", id).eq("status", "accepted");
    const { data: fresh } = await admin.from("arena_pvp").select("*").eq("id", id).maybeSingle<PvpRow>();
    return fresh;
  }

  const result = outcome.winner === 0 ? "challenger" : outcome.winner === 1 ? "opponent" : "draw";

  // prêmio: precisa ter durado e respeitar os limites do dia
  // partida de torneio não paga troféu/XP/cartas: só vale pro chaveamento
  let rewarded = outcome.ticks >= PVP_MIN_TICKS_FOR_REWARD && !row.tournament_match_id;
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  if (rewarded) {
    const { count: pair } = await admin
      .from("arena_pvp")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .eq("rewarded", true)
      .gte("created_at", since)
      .or(
        `and(challenger_id.eq.${row.challenger_id},opponent_id.eq.${row.opponent_id}),and(challenger_id.eq.${row.opponent_id},opponent_id.eq.${row.challenger_id})`,
      );
    if ((pair ?? 0) >= MAX_REWARDED_PER_PAIR) rewarded = false;
  }
  const todayCount = async (uid: string) => {
    const { count } = await admin
      .from("arena_pvp")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .eq("rewarded", true)
      .gte("created_at", since)
      .or(`challenger_id.eq.${uid},opponent_id.eq.${uid}`);
    return count ?? 0;
  };
  if (rewarded && ((await todayCount(row.challenger_id)) >= MAX_REWARDED_PER_USER || (await todayCount(row.opponent_id)) >= MAX_REWARDED_PER_USER)) {
    rewarded = false;
  }

  const hadXp = async (uid: string) => {
    const { count } = await admin
      .from("arena_pvp")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .or(`and(challenger_id.eq.${uid},xp_c.gt.0),and(opponent_id.eq.${uid},xp_o.gt.0)`);
    return (count ?? 0) > 0;
  };
  const side = async (uid: string, mine: "challenger" | "opponent", best: number, deck: string[], owned: ReadonlySet<string>) => {
    if (!rewarded) return { trophy: 0, copies: 0, card: null as string | null, xp: 0, res: "draw" as const };
    const won = result === mine;
    const res = result === "draw" ? "draw" : won ? "win" : "loss";
    // o 1x1 não mexe em troféus: quem vence ganha uma medalha contra o adversário (veja abaixo)
    const trophy = 0;
    const copies = res === "win" ? COPIES_WIN : COPIES_OTHER;
    const card = pickBattleCard(unlockedCards(best, owned), deck);
    const xp = res === "win" && !(await hadXp(uid)) ? 1 : 0;
    return { trophy, copies: card ? copies : 0, card, xp, res };
  };
  const [pc, po] = await Promise.all([side(row.challenger_id, "challenger", bestC, decks[0], ownC), side(row.opponent_id, "opponent", bestO, decks[1], ownO)]);

  // fecha UMA vez (condicional): chamadas juntas não pagam duas vezes
  const { data: closed } = await admin
    .from("arena_pvp")
    .update({
      status: "finished",
      result,
      crowns_c: outcome.crowns[0],
      crowns_o: outcome.crowns[1],
      ticks: outcome.ticks,
      why: outcome.why,
      rewarded,
      trophy_c: pc.trophy,
      trophy_o: po.trophy,
      copies_c: pc.copies,
      copies_o: po.copies,
      card_c: pc.card,
      card_o: po.card,
      xp_c: pc.xp,
      xp_o: po.xp,
      finished_at: now,
    })
    .eq("id", id)
    .eq("status", "accepted")
    .select("id");
  if (closed && closed.length > 0 && rewarded) {
    for (const [uid, r] of [
      [row.challenger_id, pc],
      [row.opponent_id, po],
    ] as const) {
      await admin.rpc("arena_apply_result", { p_user: uid, p_delta: r.trophy, p_result: r.res, p_copies: r.copies, p_card: r.card });
      if (r.xp > 0) await admin.rpc("game_grant_xp", { p_user: uid, p_amount: r.xp, p_type: "game_arena_pvp" });
    }
  }
  // medalha de vitória contra o colega derrotado (partida de verdade, sem empate e fora de torneio)
  if (closed && closed.length > 0 && !row.tournament_match_id && result !== "draw" && outcome.ticks >= PVP_MIN_TICKS_FOR_REWARD) {
    const [w, l] = result === "challenger" ? [row.challenger_id, row.opponent_id] : [row.opponent_id, row.challenger_id];
    await admin.rpc("arena_add_medal", { p_winner: w, p_loser: l });
  }
  if (closed && closed.length > 0 && row.tournament_match_id) {
    const winners = result === "challenger" ? [row.challenger_id] : result === "opponent" ? [row.opponent_id] : [];
    await onRoomFinished(admin, row.tournament_match_id, id, winners);
  }
  const { data: fresh } = await admin.from("arena_pvp").select("*").eq("id", id).maybeSingle<PvpRow>();
  return fresh;
}
