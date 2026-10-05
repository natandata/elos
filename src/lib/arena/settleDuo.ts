import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidDeck } from "./cards";
import { TROPHY_LOSS, TROPHY_WIN, deckAllowed } from "./arenas";
import { onRoomFinished } from "./tournamentServer";
import { COPIES_OTHER, COPIES_WIN, pickBattleCard, unlockedCards } from "./economy";
import { PVP_MIN_TICKS_FOR_REWARD, resolveDuo, type DuoReport } from "./pvp";

/** Passado esse tempo do 1º relatório, valem só os relatórios que chegaram. */
const STALE_MS = 60_000;
const MAX_REWARDED_PER_GROUP = 3;
const MAX_REWARDED_PER_USER = 10;

type PlayerOutcome = { res: "win" | "loss" | "draw"; trophy: number; copies: number; card: string | null; xp: number };

export type DuoRow = {
  id: string;
  host_id: string;
  players: string[];
  seed: number;
  arena: number;
  decks: (string[] | null)[];
  status: "invited" | "accepted" | "finished" | "declined" | "disputed";
  reports: Record<string, DuoReport>;
  first_report_at: string | null;
  result: "team0" | "team1" | "draw" | null;
  crowns_0: number | null;
  crowns_1: number | null;
  ticks: number | null;
  rewarded: boolean;
  tournament_match_id: string | null;
  winners: string[];
  outcome: Record<string, PlayerOutcome>;
  created_at: string;
};

export type DuoView = {
  state: "invited" | "accepted" | "waiting" | "finished" | "disputed" | "declined";
  result?: "win" | "loss" | "draw";
  crownsMe?: number;
  crownsThem?: number;
  trophyDelta?: number;
  copies?: number;
  copyCard?: string | null;
  xp?: number;
  rewarded?: boolean;
  trophies?: number;
};

/** O que cada jogador vê. */
export function viewOfDuo(row: DuoRow, userId: string): DuoView {
  const idx = row.players.indexOf(userId);
  const team = idx < 2 ? 0 : 1;
  if (row.status === "finished") {
    const o = row.outcome?.[userId];
    return {
      state: "finished",
      result: o?.res ?? (row.result === "draw" ? "draw" : row.result === `team${team}` ? "win" : "loss"),
      crownsMe: (team === 0 ? row.crowns_0 : row.crowns_1) ?? 0,
      crownsThem: (team === 0 ? row.crowns_1 : row.crowns_0) ?? 0,
      trophyDelta: o?.trophy ?? 0,
      copies: o?.copies ?? 0,
      copyCard: o?.card ?? null,
      xp: o?.xp ?? 0,
      rewarded: row.rewarded,
    };
  }
  if (row.status === "accepted") return { state: row.reports?.[String(idx)] ? "waiting" : "accepted" };
  return { state: row.status };
}

async function bestOf(admin: SupabaseClient, userId: string): Promise<number> {
  const { data } = await admin.from("arena_stats").select("best").eq("user_id", userId).maybeSingle<{ best: number }>();
  return data?.best ?? 0;
}

/**
 * Tenta fechar uma partida em duplas: confere os relatórios, refaz a partida
 * e, se tudo bate, paga troféus/cartas/XP. Seguro de chamar várias vezes.
 */
export async function settleArenaDuo(admin: SupabaseClient, id: string): Promise<DuoRow | null> {
  const { data: row } = await admin.from("arena_duo").select("*").eq("id", id).maybeSingle<DuoRow>();
  if (!row || row.status !== "accepted") return row;
  const decks = row.decks as string[][];
  if (decks.some((d) => !Array.isArray(d))) return row;

  const stale = !!row.first_report_at && Date.now() - new Date(row.first_report_at).getTime() >= STALE_MS;
  const bests = await Promise.all(row.players.map((u) => bestOf(admin, u)));
  const decksOk = decks.every((d, i) => isValidDeck(d) && deckAllowed(d, bests[i]));
  const outcome = decksOk ? resolveDuo(row.seed, decks, row.reports, stale) : ({ kind: "disputed" } as const);
  if (outcome.kind === "waiting") return row;

  const now = new Date().toISOString();
  if (outcome.kind === "disputed") {
    await admin.from("arena_duo").update({ status: "disputed", finished_at: now }).eq("id", id).eq("status", "accepted");
    const { data: fresh } = await admin.from("arena_duo").select("*").eq("id", id).maybeSingle<DuoRow>();
    return fresh;
  }

  const result = outcome.winner === 0 ? "team0" : outcome.winner === 1 ? "team1" : "draw";
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();

  // prêmio: precisa ter durado e respeitar os limites do dia
  // partida de torneio não paga troféu/XP/cartas: só vale pro chaveamento
  let rewarded = outcome.ticks >= PVP_MIN_TICKS_FOR_REWARD && !row.tournament_match_id;
  const rewardedToday = async (uid: string) => {
    const { count: pv } = await admin
      .from("arena_pvp")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .eq("rewarded", true)
      .gte("created_at", since)
      .or(`challenger_id.eq.${uid},opponent_id.eq.${uid}`);
    const { count: du } = await admin
      .from("arena_duo")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .eq("rewarded", true)
      .gte("created_at", since)
      .contains("players", [uid]);
    return (pv ?? 0) + (du ?? 0);
  };
  if (rewarded) {
    const { data: same } = await admin
      .from("arena_duo")
      .select("id, players")
      .eq("status", "finished")
      .eq("rewarded", true)
      .gte("created_at", since)
      .contains("players", row.players);
    const sameGroup = (same ?? []).filter((r: { players: string[] }) => row.players.every((p) => r.players.includes(p))).length;
    if (sameGroup >= MAX_REWARDED_PER_GROUP) rewarded = false;
  }
  if (rewarded) {
    for (const u of row.players) {
      if ((await rewardedToday(u)) >= MAX_REWARDED_PER_USER) {
        rewarded = false;
        break;
      }
    }
  }

  const hadXp = async (uid: string) => {
    const { count: pv } = await admin
      .from("arena_pvp")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .or(`and(challenger_id.eq.${uid},xp_c.gt.0),and(opponent_id.eq.${uid},xp_o.gt.0)`);
    if ((pv ?? 0) > 0) return true;
    const { data: du } = await admin.from("arena_duo").select("outcome").gte("created_at", since).contains("players", [uid]);
    return (du ?? []).some((r: { outcome: Record<string, PlayerOutcome> }) => (r.outcome?.[uid]?.xp ?? 0) > 0);
  };

  const per: Record<string, PlayerOutcome> = {};
  for (let i = 0; i < 4; i++) {
    const uid = row.players[i];
    const team = i < 2 ? 0 : 1;
    // quem saiu no meio conta como derrota, mesmo que a equipe tenha vencido
    const res: PlayerOutcome["res"] = outcome.resigned[i] ? "loss" : outcome.winner === null ? "draw" : outcome.winner === team ? "win" : "loss";
    if (!rewarded) {
      per[uid] = { res, trophy: 0, copies: 0, card: null, xp: 0 };
      continue;
    }
    const card = pickBattleCard(unlockedCards(bests[i]), decks[i]);
    per[uid] = {
      res,
      trophy: res === "win" ? TROPHY_WIN : res === "loss" ? -TROPHY_LOSS : 0,
      copies: card ? (res === "win" ? COPIES_WIN : COPIES_OTHER) : 0,
      card,
      xp: res === "win" && !(await hadXp(uid)) ? 1 : 0,
    };
  }
  const winners = row.players.filter((u) => per[u].res === "win");

  // fecha UMA vez (condicional): chamadas juntas não pagam duas vezes
  const { data: closed } = await admin
    .from("arena_duo")
    .update({
      status: "finished",
      result,
      crowns_0: outcome.crowns[0],
      crowns_1: outcome.crowns[1],
      ticks: outcome.ticks,
      rewarded,
      winners,
      outcome: per,
      finished_at: now,
    })
    .eq("id", id)
    .eq("status", "accepted")
    .select("id");
  if (closed && closed.length > 0 && rewarded) {
    for (const uid of row.players) {
      const r = per[uid];
      await admin.rpc("arena_apply_result", { p_user: uid, p_delta: r.trophy, p_result: r.res, p_copies: r.copies, p_card: r.card });
      if (r.xp > 0) await admin.rpc("game_grant_xp", { p_user: uid, p_amount: r.xp, p_type: "game_arena_duo" });
    }
  }
  if (closed && closed.length > 0 && row.tournament_match_id) {
    // quem desistiu no meio não conta como vencedor, mesmo com a equipe ganhando
    await onRoomFinished(admin, row.tournament_match_id, id, winners);
  }
  const { data: fresh } = await admin.from("arena_duo").select("*").eq("id", id).maybeSingle<DuoRow>();
  return fresh;
}
