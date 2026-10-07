import type { SupabaseClient } from "@supabase/supabase-js";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { CAMPAIGN_DECK, CAMPAIGN_MIN_SECONDS, CAMPAIGN_STAGES, CAMPAIGN_XP, stageUnlocked } from "./campaign";
import { MATCH_TICKS, type Input } from "./core";
import { MAX_INPUTS, simulate } from "./sim";

export type CampaignState = { open: boolean; admin: boolean; cleared: number[] };

/** Quem pode batalhar na campanha: admin sempre; os outros só com a campanha liberada (acesso antecipado ou habilitada para todos). */
export async function campaignState(admin: SupabaseClient, userId: string): Promise<CampaignState> {
  const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle<{ role: string }>();
  const isAdmin = prof?.role === "admin";
  const open = isAdmin || (await gameOpenFor("arenacampanha", userId));
  const { data } = await admin.from("arena_campaign_progress").select("stage").eq("user_id", userId);
  return { open, admin: isAdmin, cleared: ((data ?? []) as { stage: number }[]).map((r) => r.stage).sort((a, b) => a - b) };
}

export async function startCampaignMatch(admin: SupabaseClient, userId: string, stage: number, seed: number): Promise<{ error?: string; matchId?: string }> {
  if (!Number.isInteger(stage) || stage < 0 || stage >= CAMPAIGN_STAGES.length) return { error: "Arena inválida." };
  const st = await campaignState(admin, userId);
  if (!st.open) return { error: "A campanha ainda está bloqueada. Você pode ver as cartas e as arenas, mas só consegue batalhar quando for liberada." };
  if (!st.admin && !stageUnlocked(stage, st.cleared)) return { error: "Vença a arena anterior para liberar esta." };
  await admin.from("arena_campaign_matches").update({ status: "abandoned", finished_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "open");
  const { data, error } = await admin.from("arena_campaign_matches").insert({ user_id: userId, stage, seed }).select("id").single<{ id: string }>();
  if (error || !data) return { error: "Não foi possível começar a partida. Tente de novo." };
  return { matchId: data.id };
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

export type CampaignFinish = { error?: string; result?: "win" | "loss" | "draw"; crownsMe?: number; crownsBot?: number; xp?: number; stage?: number; firstClear?: boolean; cleared?: number[] };

/** Fecha a partida: refaz tudo no servidor; vitória libera a próxima arena e paga o XP uma vez por arena. */
export async function settleCampaign(admin: SupabaseClient, userId: string, input: { matchId: string; inputs: unknown; surrender?: boolean }): Promise<CampaignFinish> {
  const { data: match } = await admin
    .from("arena_campaign_matches")
    .select("id, user_id, stage, seed, status, started_at")
    .eq("id", input.matchId)
    .maybeSingle<{ id: string; user_id: string; stage: number; seed: number; status: string; started_at: string }>();
  if (!match || match.user_id !== userId) return { error: "Partida não encontrada." };
  if (match.status !== "open") return { error: "Essa partida já foi encerrada." };
  const stage = CAMPAIGN_STAGES[match.stage];
  if (!stage) return { error: "Arena inválida." };

  let result: "win" | "loss" | "draw" = "loss";
  let crownsMe = 0;
  let crownsBot = 0;
  if (!input.surrender) {
    const sim = simulate(match.seed, CAMPAIGN_DECK, cleanInputs(input.inputs), { botBoost: stage.botBoost }, CAMPAIGN_DECK);
    crownsMe = sim.crowns[0];
    crownsBot = sim.crowns[1];
    result = sim.winner === 0 ? "win" : sim.winner === 1 ? "loss" : "draw";
  }
  const elapsed = (Date.now() - new Date(match.started_at).getTime()) / 1000;
  if (result === "win" && elapsed < CAMPAIGN_MIN_SECONDS) result = "draw";

  const { data: closed } = await admin.from("arena_campaign_matches").update({ status: "finished", result, finished_at: new Date().toISOString() }).eq("id", match.id).eq("status", "open").select("id");
  if (!closed || closed.length === 0) return { error: "Essa partida já foi encerrada." };

  let xp = 0;
  let firstClear = false;
  if (result === "win") {
    const { data: row } = await admin.from("arena_campaign_progress").select("wins").eq("user_id", userId).eq("stage", match.stage).maybeSingle<{ wins: number }>();
    if (!row) {
      const { error } = await admin.from("arena_campaign_progress").insert({ user_id: userId, stage: match.stage, wins: 1, xp_awarded: CAMPAIGN_XP });
      // duas chamadas juntas: só a que conseguiu inserir paga
      if (!error) {
        firstClear = true;
        xp = CAMPAIGN_XP;
        await admin.rpc("game_grant_xp", { p_user: userId, p_amount: xp, p_type: "game_arena" });
      }
    } else {
      await admin.from("arena_campaign_progress").update({ wins: row.wins + 1 }).eq("user_id", userId).eq("stage", match.stage);
    }
  }
  const st = await campaignState(admin, userId);
  return { result, crownsMe, crownsBot, xp, stage: match.stage, firstClear, cleared: st.cleared };
}
