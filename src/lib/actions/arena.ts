"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STARTER_DECK } from "@/lib/arena/cards";
import { MATCH_TICKS, type Input } from "@/lib/arena/core";
import { MAX_INPUTS, simulate } from "@/lib/arena/sim";

const MAX_MATCHES_PER_DAY = 15;
const MAX_XP_WINS_PER_DAY = 3;
/** Partida terminada mais rápido que isso não paga XP (script/atalho). */
const MIN_SECONDS_FOR_XP = 75;

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
export async function startArena(): Promise<{ error?: string; matchId?: string; seed?: number }> {
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

  const seed = randomInt(1, 2 ** 31 - 1);
  const { data, error } = await supabase
    .from("arena_matches")
    .insert({ user_id: userId, seed, deck: STARTER_DECK, play_date: date })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: "Não foi possível começar a partida. Tente de novo." };
  return { matchId: data.id, seed };
}

export type ArenaFinish = {
  error?: string;
  result?: "win" | "loss" | "draw";
  crownsMe?: number;
  crownsBot?: number;
  xp?: number;
  winsToday?: number;
};

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

/** Fecha a partida: refaz tudo no servidor com as jogadas enviadas e só então paga XP. */
export async function finishArena(input: {
  matchId: string;
  inputs: unknown;
  surrender?: boolean;
}): Promise<ArenaFinish> {
  const { userId } = await currentPlayer();
  const admin = createAdminClient();
  if (!admin) return { error: "Não foi possível confirmar o resultado agora." };

  const { data: match } = await admin
    .from("arena_matches")
    .select("id, user_id, seed, deck, status, started_at, play_date")
    .eq("id", input.matchId)
    .maybeSingle<{ id: string; user_id: string; seed: number; deck: string[]; status: string; started_at: string; play_date: string }>();
  if (!match || match.user_id !== userId) return { error: "Partida não encontrada." };
  if (match.status !== "open") return { error: "Essa partida já foi encerrada." };

  let result: "win" | "loss" | "draw" = "loss";
  let crownsMe = 0;
  let crownsBot = 0;
  if (!input.surrender) {
    const sim = simulate(match.seed, match.deck, cleanInputs(input.inputs));
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
  if (result === "win" && elapsed >= MIN_SECONDS_FOR_XP && (winsBefore ?? 0) < MAX_XP_WINS_PER_DAY) xp = 1;

  // fecha UMA vez (condicional): duas chamadas juntas não pagam duas vezes
  const { data: closed } = await admin
    .from("arena_matches")
    .update({ status: "finished", result, crowns_me: crownsMe, crowns_bot: crownsBot, xp_awarded: xp, finished_at: new Date().toISOString() })
    .eq("id", match.id)
    .eq("status", "open")
    .select("id");
  if (!closed || closed.length === 0) return { error: "Essa partida já foi encerrada." };

  if (xp > 0) await admin.rpc("game_grant_xp", { p_user: userId, p_amount: xp, p_type: "game_arena" });

  return { result, crownsMe, crownsBot, xp, winsToday: (winsBefore ?? 0) + (xp > 0 ? 1 : 0) };
}
