import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidDeck } from "./cards";
import { deckAllowed, TROPHY_LOSS, TROPHY_WIN, SCROLLS_OTHER, SCROLLS_WIN } from "./arenas";
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
  trophy_c: number;
  trophy_o: number;
  scrolls_c: number;
  scrolls_o: number;
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
  scrolls?: number;
  xp?: number;
  rewarded?: boolean;
  why?: string | null;
  trophies?: number;
};

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
      scrolls: iAmC ? row.scrolls_c : row.scrolls_o,
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
 * se tudo bate, paga troféus/Pergaminhos/XP. Seguro de chamar várias vezes:
 * fecha uma vez só (condicional no status).
 */
export async function settleArenaPvp(admin: SupabaseClient, id: string): Promise<PvpRow | null> {
  const { data: row } = await admin.from("arena_pvp").select("*").eq("id", id).maybeSingle<PvpRow>();
  if (!row || row.status !== "accepted" || !row.opponent_deck) return row;

  const stale = !!row.first_report_at && Date.now() - new Date(row.first_report_at).getTime() >= STALE_MS;
  const [bestC, bestO] = await Promise.all([bestOf(admin, row.challenger_id), bestOf(admin, row.opponent_id)]);
  const decks: [string[], string[]] = [row.challenger_deck, row.opponent_deck];
  const deckOk = isValidDeck(decks[0]) && isValidDeck(decks[1]) && deckAllowed(decks[0], bestC) && deckAllowed(decks[1], bestO);
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
  let rewarded = outcome.ticks >= PVP_MIN_TICKS_FOR_REWARD;
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
  const side = async (uid: string, mine: "challenger" | "opponent") => {
    if (!rewarded) return { trophy: 0, scrolls: 0, xp: 0, res: "draw" as const };
    const won = result === mine;
    const res = result === "draw" ? "draw" : won ? "win" : "loss";
    const trophy = res === "win" ? TROPHY_WIN : res === "loss" ? -TROPHY_LOSS : 0;
    const scrolls = res === "win" ? SCROLLS_WIN : SCROLLS_OTHER;
    const xp = res === "win" && !(await hadXp(uid)) ? 1 : 0;
    return { trophy, scrolls, xp, res };
  };
  const [pc, po] = await Promise.all([side(row.challenger_id, "challenger"), side(row.opponent_id, "opponent")]);

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
      scrolls_c: pc.scrolls,
      scrolls_o: po.scrolls,
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
      await admin.rpc("arena_apply_result", { p_user: uid, p_delta: r.trophy, p_result: r.res, p_scrolls: r.scrolls });
      if (r.xp > 0) await admin.rpc("game_grant_xp", { p_user: uid, p_amount: r.xp, p_type: "game_arena_pvp" });
    }
  }
  const { data: fresh } = await admin.from("arena_pvp").select("*").eq("id", id).maybeSingle<PvpRow>();
  return fresh;
}
